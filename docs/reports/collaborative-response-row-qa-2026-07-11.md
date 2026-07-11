# 共同編集型・回答者行モデル QAドキュメント

- 作成日: 2026-07-11
- ステータス: **承認済み・正本反映済み（詳細QA）**
- 対象要件: [要件定義書](collaborative-response-row-requirements-2026-07-11.md)
- 完了条件: [DoD](collaborative-response-row-dod-2026-07-11.md)
- 詳細仕様: [実装仕様](collaborative-response-row-spec-draft-2026-07-11.md)

> 本書は、共同編集モデルへの破壊的切替を実DBで安全に検証するためのQA計画である。Supabase実DBのmigration・cleanup・E2Eは `.agents/skills/operate-supabase-live-db/SKILL.md` の承認ゲートを優先する。

---

## 1. QA方針

1. 正本反映と実装タスクの明示前にコード・migrationを作らない。
2. semantic tokenに基づくコードベースの仮案を作り、初回UI実装後の実画面で色・ラベル・アイコン・配置を調整する。exact visualの承認はリリース前ゲートとする。
3. 適用済みmigrationを編集せず、新規migrationだけを追加する。
4. 実DBの既存データcleanupとmigration適用は別々に承認する。
5. migration適用前に実DBE2Eを実行しない。
6. 失敗時は追加修正を重ねる前に、原因・影響・修正候補を報告する。
7. commitとpushを別ゲートにし、push後はVercel本番を人間確認する。

---

## 2. テストレイヤー

| レイヤー | 目的 | 主な対象 |
|---|---|---|
| Pure unit | 分岐と境界値を高速検証 | 4状態読取、3色判定、Candidate作成相対時刻、集約 |
| Component / browser | UI状態と操作順を検証 | セレクター、保留操作、ダイアログ、レスポンシブ |
| Playwright E2E | ユーザー主要フローを実DBで検証 | 作成、共同編集、owner回復、候補カード |
| anon DB負系 | RLS・制約をアプリ外から検証 | token境界、別event、unique、列不変、cascade |
| SQL postflight | migrationの構造を確認 | table、column、constraint、index、RLS、policy、GRANT |
| 人間確認 | 使い勝手と本番反映を確認 | 375px、1366px、Vercel、独自ドメイン |

---

## 3. 着手前・文書QA

| ID | 確認 |
|---|---|
| Q-PRE-01 | `pwd`が`/Users/shige/Projects/Where-to-Visit` |
| Q-PRE-02 | branchが`main`、remoteが意図した`origin`、ahead/behindを確認 |
| Q-PRE-03 | 作業開始前の`git status --short`を記録 |
| Q-PRE-04 | `AGENTS.md`と`CLAUDE.md`が同一 |
| Q-PRE-05 | 新要件・DoD・QA・仕様ドラフトの用語と参照先が一致 |
| Q-PRE-06 | guest_token依存、未評価＝−、owner_participant依存の旧記述を正本反映時に全件列挙 |
| Q-PRE-07 | 旧Slice文書の履歴部分と現在仕様をSUPERSEDED注記で区別 |
| Q-PRE-08 | 未決事項が0件になるまで実装を開始しない |

---

## 4. Pure unitシナリオ

### 4.1 完全読取モデル

| ID | 入力 | 期待 |
|---|---|---|
| Q-READ-01 | Participant 3件、Candidate 2件、Vote 0件 | 6セルすべて`unrated` |
| Q-READ-02 | 1セルにpositive | 対象だけ`positive`、残りは`unrated` |
| Q-READ-03 | 1セルにneutral | 対象は`neutral`、Voteなしセルは`unrated`として区別し、Vote時刻は返さない |
| Q-READ-04 | 1セルにveto | 対象は`veto`、Vote時刻は返さない |
| Q-READ-05 | 参照先のないraw Vote | FKにより通常発生しない防御ケースとして、不正状態を検出しUIへ曖昧なnullを渡さない |
| Q-READ-06 | Participant / Candidateの入力順が不定 | `created_at ASC, id ASC`の安定順で出力 |

### 4.2 Candidate作成相対時刻

全ケースで現在時刻を固定し、実時間経過によるテストの揺れを防ぐ。対象は`Candidate.created_at`だけであり、Vote / Reaction / Concern / Commentの時刻を試験しない。

| ID | 経過 | 期待表示 |
|---|---:|---|
| Q-TIME-00 | Candidate作成時刻が固定clockより5分後 | 経過を0へclampし、1時間以内に追加 |
| Q-TIME-01 | Candidate作成から0秒 | 1時間以内に追加 |
| Q-TIME-02 | Candidate作成から59分59秒 | 1時間以内に追加 |
| Q-TIME-03 | Candidate作成から60分 | 1時間前に追加 |
| Q-TIME-04 | Candidate作成から23時間59分 | 23時間前に追加 |
| Q-TIME-05 | Candidate作成から24時間 | 1日前に追加 |
| Q-TIME-06 | Candidate作成から47時間59分 | 1日前に追加 |
| Q-TIME-07 | Candidate作成から48時間 | 2日前に追加 |
| Q-TIME-08 | Candidate編集 | 表示時刻が更新されず、元の作成時刻を維持 |

### 4.3 ❤️・🌀集約

| ID | 入力 | 期待 |
|---|---|---|
| Q-AGG-01 | 同一回答者が同一候補のCriterion 3件へ❤️ | 候補全体❤️=3 |
| Q-AGG-02 | 3回答者が同一Criterionへ❤️ | Criterion❤️=3、候補全体❤️=3 |
| Q-AGG-03 | 2回答者が🌀 | 候補全体🌀=2 |
| Q-AGG-04 | ❤️・🌀だけが変化 | ○数、×数、最終候補色は不変 |

### 4.4 3色判定

| ID | 候補 | 期待 |
|---|---|---|
| Q-COLOR-01 | A ○0×0、B ○0×0 | 全て通常 |
| Q-COLOR-02 | A ○5×0、B ○3×0 | A第1色、B通常 |
| Q-COLOR-03 | A ○5×0、B ○5×0 | A/Bとも第1色 |
| Q-COLOR-04 | A ○5×1、B ○3×0、C ○1×0 | A第2色、B第3色、C通常 |
| Q-COLOR-05 | A ○5×1、B ○3×0、C ○3×0 | A第2色、B/C第3色 |
| Q-COLOR-06 | A ○5×1、B ○5×1、C ○3×0 | A/B第2色、C第3色 |
| Q-COLOR-07 | A ○5×0、B ○5×1、C ○4×0 | A第1色、B第2色、C通常 |
| Q-COLOR-08 | A ○5×2、B ○3×1 | A第2色、B通常、第3色なし |
| Q-COLOR-09 | A ○1×0、B ○0×0 | A第1色、B通常 |
| Q-COLOR-10 | Q-COLOR-04へ大量の❤️・🌀 | 色はQ-COLOR-04と同じ |

---

## 5. 回答者セレクターE2E

| ID | シナリオ | 期待 |
|---|---|---|
| Q-PART-01 | Event作成 | Participant 0件、owner URLと共有URLを取得 |
| Q-PART-02 | 新名を入力し非IME Enter | Participant 1件作成、選択、入力欄クリアまたは選択表示へ遷移 |
| Q-PART-03 | IME変換中Enter | 作成されない |
| Q-PART-04 | 新名を入力しモバイル完了 | Participant 1件作成・選択 |
| Q-PART-05 | 新名を入力しセレクター全体外へblur | Participant 1件作成・選択 |
| Q-PART-06 | 入力中に候補カードの○を押す | 操作起因の通常blur保存を抑止し、単一の名前確定処理でParticipant作成後、同じ○操作を一度だけ実行 |
| Q-PART-07 | Participant作成失敗 | ○は付かず、名前入力とエラーが残り、保留した○を破棄する。後の通常確定で○が突然付かない |
| Q-PART-08 | 既存回答者を選択 | Participant件数不変、全カードの選択行が切替 |
| Q-PART-09 | trim後同名を入力 | 同じ人か確認を表示し、自動選択・重複作成しない |
| Q-PART-10 | 同名確認で本人 | 既存行を選択し保留操作を再開 |
| Q-PART-11 | 同名確認で別人 | 異なる名前の入力を求め、同名行を作らない。異なる名前の確定後に保留操作を一度だけ実行し、途中でキャンセルした場合は実行しない |
| Q-PART-12 | 2ブラウザで同名を同時作成 | 1件だけ作成され、競合側は同名確認へ遷移 |
| Q-PART-13 | 名前変更 | 変更前後の確認後、同じIDの名前だけ更新、順序不変 |
| Q-PART-14 | 空・同名への名前変更 | 拒否、既存名を維持 |
| Q-PART-15 | 回答者を2段階削除 | 行と個人配下データを削除、作成者参照NULL、現在選択解除 |
| Q-PART-16 | `kimenosuke:selected-participant:<event_id>`に選択IDを保存してshare URL / owner URLから再訪 | 両URLで同じキーを読み、行が存在すれば自動選択 |
| Q-PART-17 | localStorageの行を別ブラウザで削除後に再訪 | 選択を解除し、event ID基準のキーを削除 |
| Q-PART-18 | 同じブラウザで別eventを開く | eventごとに選択が独立 |
| Q-PART-19 | 名前入力からセレクター内の既存行へfocus移動 | blur確定せずParticipantを作成しない |
| Q-PART-20 | 空欄または空白だけで通常blur | Participantを作成せず、エラーも出さない |
| Q-PART-21 | 田中を選択中に山下という名前draftを入力し○ | 田中ではなく山下をParticipantとして解決し、山下名義で○を一度だけ保存 |
| Q-PART-22 | 名前draftと保留操作がある状態で既存回答者を明示選択 | draftを新規作成せず、選択した既存行で保留操作を一度だけ実行 |
| Q-PART-23 | 名前draftも選択行もない状態で○ | 操作を保留してセレクターを開き、既存行選択後にその行で○を一度だけ実行 |
| Q-PART-24 | 名前draftから個人名義操作を連打 | 最初の操作だけを受け付け、Participantと対象データを各1件だけ作成 |
| Q-PART-25 | 名前draftがある状態でCandidate追加 | Participant解決後にCandidateを追加し、そのParticipantを`created_by`へ設定 |
| Q-PART-26 | 名前draftがある状態でCriterion追加 | Participant解決後にCriterionを追加し、そのParticipantを`created_by`へ設定 |
| Q-PART-27 | 名前draftがある状態でEvent / Candidate / Criterionの編集または削除 | Participant解決完了後に元mutationを一度だけ実行 |
| Q-PART-28 | 名前draft入力中にURLコピー等の非DB操作 | コピーを妨げず、通常blur確定が成立する場合だけParticipantを作成 |
| Q-PART-29 | 未確定の名前draftを残してreload・tab close・外部遷移 | beforeunload保存を行わず、Participant作成を保証しない |
| Q-PART-30 | 既存回答者を選択中に空白だけのdraftを入力して個人名義操作 | draftなしとして扱い、選択中回答者名義で一度だけ実行 |

---

## 6. Owner・アクセスE2E

| ID | シナリオ | 期待 |
|---|---|---|
| Q-OWNER-01 | Event作成直後のshare URL | event path限定owner Cookieによりお題・メモ編集導線あり |
| Q-OWNER-02 | シークレットでshare URL | owner導線なし、共同編集は可能 |
| Q-OWNER-03 | シークレットでowner URLを開く | Cookie設定後、share URLでもowner導線あり |
| Q-OWNER-04 | owner Cookieを消してshare URL | owner導線なし |
| Q-OWNER-05 | Cookie消失後にowner URL | owner権限回復 |
| Q-OWNER-06 | Event A/Bのowner URLを同一ブラウザで開く | path分離Cookieにより双方のshare URLでowner導線あり |
| Q-OWNER-07 | オーナーが回答者未選択かつ名前draftなしでお題編集 | 更新可能、Participantは増えない |
| Q-OWNER-08 | オーナーが個人評価 | 一般利用者と同じ回答者選択を要求 |

---

## 7. Candidate / Criterion E2E

| ID | シナリオ | 期待 |
|---|---|---|
| Q-ITEM-01 | 回答者未選択かつ名前draftなしでCandidate追加 | Participant 0件、`created_by=NULL` |
| Q-ITEM-02 | 回答者選択後にCandidate追加 | 選択行を`created_by`へ設定 |
| Q-ITEM-03 | Candidate追加フォーム表示 | お名前入力欄なし |
| Q-ITEM-04 | proposerを同一event行へ変更 | 確認後に更新 |
| Q-ITEM-05 | proposerを「ー」へ変更 | `created_by=NULL` |
| Q-ITEM-06 | 別event Participantをproposer指定 | DB拒否 |
| Q-ITEM-07 | Candidateタイトル/URL編集 | 既存確認フロー後に更新 |
| Q-ITEM-08 | Candidate 2段階削除 | 配下Vote/Reaction/Concern/Commentをcascade削除 |
| Q-ITEM-09 | 回答者未選択かつ名前draftなしでCriterion追加 | Participantを作らず`created_by=NULL` |
| Q-ITEM-10 | 回答者選択後にCriterion追加 | 選択行を`created_by`へ設定 |
| Q-ITEM-11 | Criterion編集・2段階削除 | 共同編集成功、Reaction cascade |
| Q-ITEM-12 | 作成時刻の異なるCandidateを表示 | 各カードヘッダに`created_at`由来の相対追加時刻を表示 |

---

## 8. 候補カード・評価E2E

| ID | シナリオ | 期待 |
|---|---|---|
| Q-VOTE-01 | 回答者3人・候補2件・Voteなし | 各カードに3行、全て未評価 |
| Q-VOTE-02 | 未評価から○ | Vote positiveを作成し、○数増加 |
| Q-VOTE-03 | 未評価から− | Vote neutralを作成し、未評価表示から−へ変更。Vote時刻は表示しない |
| Q-VOTE-04 | 未評価から× | Vote vetoを作成し、×数増加 |
| Q-VOTE-05 | ○→−→× | 同じVote行を更新し、行数を増やさず現在値だけが変わる |
| Q-VOTE-06 | 別回答者行を選んで評価 | 対象行だけ更新、操作者用Participantは増えない |
| Q-VOTE-07 | 後からCandidate追加 | 既存全回答者について新候補は未評価 |
| Q-VOTE-08 | 後からParticipant追加 | 既存全候補について新回答者は未評価 |
| Q-VOTE-09 | Candidateカードの非選択行をクリック | 回答値を変更せず、全カードの選択中回答者だけが切替 |
| Q-VOTE-10 | Voteを作成・変更 | 回答者行に評価時刻を表示せず、Candidate追加時刻だけを表示 |
| Q-VOTE-11 | 別event Candidate/ParticipantでVote | DB拒否 |
| Q-VOTE-12a | アプリの`setVote`で同一Candidate/Participantを繰り返し保存 | upsert / updateで現在値を更新し、Vote行数は1 |
| Q-VOTE-12b | anon clientから同一Candidate/ParticipantをINSERTのみで2回保存 | 2回目をDB UNIQUE制約で拒否 |
| Q-VOTE-13 | 選択済みの同じ○ / − / ×を再度押す | 値と行数が変わらず、server action / DB mutationを呼ばない |
| Q-VOTE-14 | 非選択回答者行を表示 | 現在値は読めるが個人名義controlはなく、行選択後にだけcontrolを表示 |

---

## 9. ❤️・🌀・コメントE2E

| ID | シナリオ | 期待 |
|---|---|---|
| Q-FB-01 | 同じ回答者が3Criterionへ❤️ | 候補全体❤️=3、各Criterion=1 |
| Q-FB-02 | 別回答者行を選んで❤️ | 対象行名義でReaction作成 |
| Q-FB-03 | 同じ回答者が🌀 | 候補全体🌀=1 |
| Q-FB-04 | 別回答者行の🌀解除 | 共同編集成功 |
| Q-FB-05 | ❤️・🌀を増減 | 最終候補色は不変 |
| Q-FB-06 | コメント新規保存 | 対象回答者名義で1件作成 |
| Q-FB-07 | 同じ回答者が再保存 | 2件目を作らず本文上書き |
| Q-FB-08 | コメントEnter | 改行し、保存されない |
| Q-FB-09 | コメントblur | 保存されずドラフト保持 |
| Q-FB-10 | 空文字保存 | 既存コメント行を削除 |
| Q-FB-11 | 500コードポイント | 保存成功 |
| Q-FB-12 | 501コードポイント | UIとDBで拒否 |
| Q-FB-13 | 別回答者行のコメント編集 | 対象行の1件だけ更新 |
| Q-FB-14 | 保存失敗 | 旧本文表示とドラフトを保持しエラー表示 |
| Q-FB-15 | 同一Candidate/ParticipantのComment重複INSERT | unique拒否 |

---

## 10. 状態同期E2E

| ID | シナリオ | 期待 |
|---|---|---|
| Q-SYNC-01 | ローカルmutation成功 | ページ再読み込みなしで完全最新状態へ置換 |
| Q-SYNC-02 | mutation中にsentinelをwindowへ設定 | 成功後もsentinelが残り、reloadなし |
| Q-SYNC-03 | Browser A変更後、Browser Bを放置 | Bは自動更新されない |
| Q-SYNC-04 | Bが別のmutation成功 | Bが全最新状態を取得しAの変更も反映 |
| Q-SYNC-05 | Bを手動reload | Aの変更を反映 |
| Q-SYNC-06 | DBエラー | 楽観的成功表示を残さず、直前状態を維持 |
| Q-SYNC-07 | 連続操作 | 前mutationの確定表示を待ってから次を受け付ける |

---

## 11. anon DB・RLS負系

| ID | 試験 | 期待 |
|---|---|---|
| Q-DB-01 | tokenなしSELECT | 拒否または0件 |
| Q-DB-02 | 不正share tokenのmutation | 拒否 |
| Q-DB-03 | owner token単独で子要素mutation | 拒否 |
| Q-DB-04 | owner tokenでEvent title / memo更新 | 許可 |
| Q-DB-05 | share tokenでEvent title / memo更新 | 拒否 |
| Q-DB-06 | 別event ParticipantをCandidate/Criterion.created_byへ指定 | 拒否 |
| Q-DB-07 | 別event Candidate/ParticipantでVote/Reaction/Concern/Comment | 拒否 |
| Q-DB-08 | trim後同名Participant | unique拒否 |
| Q-DB-09 | Participant空名 | CHECK / NOT NULL拒否 |
| Q-DB-10 | Voteへ`positive / neutral / veto`以外のtext | CHECK制約で拒否 |
| Q-DB-11 | Vote不変列のUPDATE | 拒否 |
| Q-DB-12 | Reaction/Concern不変列のUPDATE | 拒否 |
| Q-DB-13 | Commentのparticipant/candidate変更 | 拒否 |
| Q-DB-14 | Participant削除 | Vote/Reaction/Concern/Comment cascade、Candidate/Criterion.created_by set null |
| Q-DB-15 | Candidate削除 | 全feedback cascade |
| Q-DB-16 | Criterion削除 | 対応Reactionだけcascade |
| Q-DB-17 | votes.valueのschema確認 | データ型がtextで、3値CHECK制約が存在し、Vote専用enumが存在しない |

---

## 12. レスポンシブ・目視QA

3色のexact color、状態ラベル、アイコン、Candidate追加時刻の見せ方は初回コード実装では仮案とする。自動テストはsemantic stateと非色情報の存在を確認し、exact visualは375×812 / 1366×768のスクリーンショットと人間確認で調整する。確定後にUI copyと必要な文字列assertionを更新する。

### 375×812

- [ ] ページ全体の横スクロールなし
- [ ] 回答者セレクターの名前、操作、エラーが重ならない
- [ ] 候補カードは1列で、回答者行を縦に追える
- [ ] ○ / − / ×、Candidate追加時刻、❤️、🌀、コメントの表示・操作対象を誤認しない
- [ ] 非選択回答者の長いコメントが初期案3行で省略され、専用の展開操作がない
- [ ] その回答者行を選択するとコメント全文と編集欄を確認できる
- [ ] 3色状態が背景色だけに依存しない
- [ ] 同名確認、名前変更、2段階削除ダイアログがviewport内に収まる

### 1366×768

- [ ] 候補カード幅が過度に狭くない
- [ ] 回答者行を表形式に近い配置で比較できる
- [ ] 候補ヘッダ、集約値、回答行、コメントが視線順に並ぶ
- [ ] 複数候補をスクロールしながら状態比較できる
- [ ] 既存Event編集・URLコピー導線が共同編集UIに埋もれない

スクリーンショット対象:

1. トップのお題作成
2. 回答者未選択のイベント詳細
3. 回答者選択済み＋複数候補
4. 第1色 / 第2色 / 第3色 / 通常候補の混在
5. 同名確認
6. 名前変更確認
7. 回答者削除1段階目・2段階目
8. コメント編集状態

---

## 13. Migration・実DB QAゲート

### Gate A: cleanup preflight

- Event、Participant、Candidate、Criterion、Reaction、Concern、Commentの件数を取得する
- Event IDとtitle、依存行数を記録する
- 対象が全削除承認済みデータだけであることを人間確認する
- `events.owner_participant_id`の循環参照を解消するcleanup順を提示する
- この時点ではDELETE / COMMITしない

### Gate B: cleanup

- SQL Editorでtransactionを開始する
- `owner_participant_id`をNULLへ更新する
- 記録済みEventだけをID指定で削除する
- 影響件数を確認する
- まずROLLBACKして手順を検証する
- 再実行後、明示承認を受けてCOMMITする
- 全対象tableが0件になったことを確認する

### Gate C: migration

- Event件数0のDBガードがあることを確認する
- 新規migrationだけをSQL Editorで適用する
- destructive operationを事前列挙する
- migration Successを人間確認する

### Gate D: postflight

- Eventのowner参照撤去
- Participantのguest token撤去、name制約・unique
- Vote table、value制約、timestamp列なし、unique、FK、index
- CommentのNOT NULL、unique、FK CASCADE
- 全対象tableのRLS enabled
- policy一覧とCRUD
- anonのtable / column GRANT
- trigger / function本文とEXECUTE権限
- FK delete action

### Gate E: 実DB E2E

- `npm run test:e2e`
- Slice 1 / 2 / 5回帰と新規シナリオを実行
- 総数 / PASS / FAIL / SKIPを報告
- skip対象名と理由を報告
- E2E作成データのevent ID / title / 件数を報告

---

## 14. 最終検証と報告

実装完了後に次を実行する。

```text
npm run check
npm run build
npm run test:e2e
git diff --check
```

報告内容:

- 変更ファイル一覧
- 新規migration名
- 文書・実装・DBの整合状況
- E2E総数 / PASS / FAIL / SKIP
- Slice 1 / 2 / 5回帰結果
- 375px / 1366px目視結果とスクリーンショット
- 実DB postflight結果
- 作成した`[E2E]`データ
- 未解決事項
- commit前の`git status --short`

全項目成功後もcommitせず、commit承認を待つ。commit後もpushせず、push承認を待つ。
