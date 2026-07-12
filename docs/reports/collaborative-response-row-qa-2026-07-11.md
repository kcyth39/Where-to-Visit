# 共同編集型・回答者行モデル QAドキュメント

- 作成日: 2026-07-11
- 最終改訂: 2026-07-12（Supabase CLI / Docker開発手順追補・レビュー待ち）
- ステータス: **既存QAは承認済み。開発手順追補はレビュー待ち**
- 対象要件: [要件定義書](collaborative-response-row-requirements-2026-07-11.md)
- 完了条件: [DoD](collaborative-response-row-dod-2026-07-11.md)
- 詳細仕様: [実装仕様](collaborative-response-row-spec-draft-2026-07-11.md)
- 開発環境: [Supabase CLI / Docker開発リファレンス](supabase-cli-docker-development-reference-2026-07-12.md)

> 本書は、共同編集モデルへの破壊的切替をlocal Docker DBとremote実DBで段階的に検証するQA計画である。Supabase CLI / Docker追補は第一段階のレビュー対象であり、正本・運用Skillへの反映前である。remote migration・cleanup・E2Eでは `.agents/skills/operate-supabase-live-db/SKILL.md` の承認ゲートを優先する。

---

## 1. QA方針

1. 正本反映と実装タスクの明示前にコード・migrationを作らない。
2. semantic tokenに基づくコードベースの仮案を作り、初回UI実装後の実画面で色・評価chip・配置を調整する。可視の状態説明ラベルは追加せず、exact visualの承認はリリース前ゲートとする。
3. 適用済みmigrationを編集せず、固定版CLIで生成した新規migrationだけを追加する。
4. localhost bindと接続先分離を検証するまでlocal stackを本筋開発へ使わない。
5. local増分適用と空DBからのclean-chain replayを通過するまでremoteへ適用しない。
6. local E2Eとremote E2Eを別profile・別command・別報告にする。
7. remote既存データcleanup、advisor訂正、本筋migration、remote E2Eを別々に承認する。
8. 失敗時は追加修正を重ねる前に、原因・影響・修正候補を報告する。
9. commitとpushを別ゲートにし、push後はVercel本番を人間確認する。

---

## 2. テストレイヤー

| レイヤー | 目的 | 主な対象 |
|---|---|---|
| Pure unit | 分岐と境界値を高速検証 | 4状態読取、3色判定、Candidate作成相対時刻、集約 |
| Component / browser | UI状態と操作順を検証 | セレクター、保留操作、ダイアログ、レスポンシブ |
| Playwright E2E | ユーザー主要フローを実DBで検証 | 作成、共同編集、owner回復、候補カード |
| Local migration | remote変更前に全履歴とschemaを検証 | migration up/reset、pgTAP、advisor、RLS |
| anon DB負系 | RLS・制約をアプリ外から検証 | token境界、別event、unique、列不変、cascade |
| SQL postflight | migrationの構造を確認 | table、column、constraint、index、RLS、policy、GRANT |
| 人間確認 | 使い勝手と本番反映を確認 | 375px、1366px、Vercel、独自ドメイン |

---

## 3. 着手前・文書QA

| ID | 確認 |
|---|---|
| Q-PRE-01 | `git rev-parse --show-toplevel`で検出したリポジトリルートを作業場所としている |
| Q-PRE-02 | branchが`main`、remoteが意図した`origin`、ahead/behindを確認 |
| Q-PRE-03 | 作業開始前の`git status --short`を記録 |
| Q-PRE-04 | `AGENTS.md`と`CLAUDE.md`が同一 |
| Q-PRE-05 | ADR-0007、新要件・DoD・QA・実装仕様の用語と参照先が一致 |
| Q-PRE-06 | guest_token依存、未評価＝−、owner_participant依存、Candidate単位常設🌀、Event詳細1画面の旧記述を正本反映時に全件列挙 |
| Q-PRE-07 | 旧Slice文書の履歴部分と現在仕様をSUPERSEDED注記で区別 |
| Q-PRE-08 | 未決事項が0件になるまで実装を開始しない |
| Q-PRE-09 | Supabase CLIが`2.109.1`で、local PostgreSQL 17・Auth無効・seed無効である |
| Q-PRE-10 | 既存5 migrationのファイル名とSHA-256を記録し、差分がない |
| Q-PRE-11 | local stackが通常stop状態で、起動前に専用networkとlocalhost bind検査を準備している |
| Q-PRE-12 | remote CLI接続がなく、`login / link / db pull / db push`を使用しない |

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

全ケースで現在時刻を固定し、実時間経過によるテストの揺れを防ぐ。対象は`Candidate.created_at`だけであり、Vote / Reaction / Criterion別Concern / Commentの時刻を試験しない。

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
| Q-AGG-03 | 2回答者が同一Criterionへ🌀 | Criterion🌀=2、候補全体🌀=2 |
| Q-AGG-04 | ❤️・🌀だけが変化 | ○数、×数、最終候補色は不変 |
| Q-AGG-05 | 同じ回答者が同じCriterionへ❤️と🌀 | 両方1、候補全体❤️=1・🌀=1 |
| Q-AGG-06 | 同じ回答者がCriterion 3件へ🌀 | 候補全体🌀=3 |

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
| Q-PART-01 | Event作成 | Participant 0件、owner初期セットアップに3ステップ、owner URLと共有URLを取得 |
| Q-PART-02 | 未選択ゲストが新名を入力し非IME Enter | Participant 1件作成・選択、候補一覧へ遷移 |
| Q-PART-03 | IME変換中Enter | 作成されない |
| Q-PART-04 | 未選択ゲストが新名を入力しモバイル完了 | Participant 1件作成・選択、候補一覧へ遷移 |
| Q-PART-05 | 未選択ゲストが新名を入力しセレクター全体外へblur | Participant 1件作成・選択、候補一覧へ遷移 |
| Q-PART-06 | 入力中に候補カードの○を押す | 操作起因の通常blur保存を抑止し、単一の名前確定処理でParticipant作成後、同じ○操作を一度だけ実行 |
| Q-PART-07 | Participant作成失敗 | ○は付かず、名前入力とエラーが残り、保留した○を破棄する。後の通常確定で○が突然付かない |
| Q-PART-08 | 未選択ゲストが既存回答者を選択 | 名前が直接入力へ反映、Participant件数不変、候補一覧へ遷移 |
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
| Q-PART-31 | 有効なselected participantを保持してshare URLへ再訪 | 名前選択を省略し候補一覧を直接表示 |
| Q-PART-32 | オーナー初期セットアップで名前確定 | 同じ画面に残り、Candidate追加とURL共有へ続く |

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
| Q-OWNER-09 | 初期セットアップの3ステップ | 3タイトルと承認済み説明文が順序どおり表示される |
| Q-OWNER-10 | 別ブラウザでowner URLを開き回答者未選択 | 3ステップを再表示せず候補一覧を表示し、お題・メモ編集導線あり |
| Q-OWNER-11 | Q-OWNER-10から個人名義操作 | 名前選択へ進み、解決後に元操作を一度だけ再開 |
| Q-OWNER-12 | Event作成直後の3ステップをreload | `setup_completed`等を永続化せず、owner再訪として候補一覧を表示 |

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
| Q-ITEM-08 | Candidate 2段階削除 | 配下Vote/Reaction/Criterion別Concern/Commentをcascade削除 |
| Q-ITEM-09 | 回答者未選択かつ名前draftなしでCriterion追加 | Participantを作らず`created_by=NULL` |
| Q-ITEM-10 | 回答者選択後にCriterion追加 | 選択行を`created_by`へ設定 |
| Q-ITEM-11 | Criterion編集・2段階削除 | 共同編集成功、Reaction / Concern cascade |
| Q-ITEM-12 | 作成時刻の異なるCandidateを表示 | 各カードヘッダに`created_at`由来の相対追加時刻を表示 |

---

## 8. 候補一覧・候補編集・評価E2E

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
| Q-VOTE-15 | 候補一覧を表示 | お題・メモとCandidate集約があり、判断基準・回答者別編集control・コメント入力はない |
| Q-VOTE-16 | Candidate名を選択 | 対象の候補編集へ進み、判断基準と全回答者行を表示 |
| Q-VOTE-17 | 候補一覧のCandidateカード | Candidate名横に`⭕️ / ➖ / ❌`の別chip、下にURL、追加時期・提案者、さらに下に小さな❤️ / 🌀合計を表示 |
| Q-VOTE-18 | clear / discussion / fallback / noneを表示 | 可視の説明ラベルなし。semantic style、支援技術向け状態名、評価実数を確認 |
| Q-VOTE-19 | neutral 2件・unrated 3件のCandidateを候補一覧へ表示 | `➖ 2`。unrated 3件は候補編集の回答者行で未評価表示 |

---

## 9. ❤️・🌀・コメントE2E

| ID | シナリオ | 期待 |
|---|---|---|
| Q-FB-01 | 同じ回答者が3Criterionへ❤️ | 候補全体❤️=3、各Criterion=1 |
| Q-FB-02 | 別回答者行を選んで❤️ | 対象行名義でReaction作成 |
| Q-FB-03 | 同じ回答者がCriterionへ🌀 | Criterion🌀=1、候補全体🌀=1 |
| Q-FB-04 | 別回答者行のCriterion別🌀解除 | 共同編集成功 |
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
| Q-FB-16 | 同じCandidate/Participant/Criterionへ❤️と🌀 | Reaction / Concernが各1件存在し、両方表示 |
| Q-FB-17 | 同じCandidate/Participant/CriterionへConcernを重複INSERT | 2回目をunique拒否 |
| Q-FB-18 | Criterionに紐付かないConcern INSERT | NOT NULL / FKで拒否し、候補単位の常設🌀を作らない |

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
| Q-DB-07 | 別event Candidate/Participant/CriterionでVote/Reaction/Concern/Comment | 拒否 |
| Q-DB-08 | trim後同名Participant | unique拒否 |
| Q-DB-09 | Participant空名 | CHECK / NOT NULL拒否 |
| Q-DB-10 | Voteへ`positive / neutral / veto`以外のtext | CHECK制約で拒否 |
| Q-DB-11 | Vote不変列のUPDATE | 拒否 |
| Q-DB-12 | Reaction/Concern不変列のUPDATE | 拒否 |
| Q-DB-13 | Commentのparticipant/candidate変更 | 拒否 |
| Q-DB-14 | Participant削除 | Vote/Reaction/Concern/Comment cascade、Candidate/Criterion.created_by set null |
| Q-DB-15 | Candidate削除 | 全feedback cascade |
| Q-DB-16 | Criterion削除 | 対応Reaction / Concernをcascade |
| Q-DB-17 | votes.valueのschema確認 | データ型がtextで、3値CHECK制約が存在し、Vote専用enumが存在しない |
| Q-DB-18 | concerns schema確認 | `criterion_id NOT NULL`、3FK、`UNIQUE(candidate_id, participant_id, criterion_id)`が存在 |

---

## 12. レスポンシブ・目視QA

3色のexact color、評価chip、Candidate追加時刻の見せ方は初回コード実装では仮案とする。可視の状態説明ラベルは置かず、自動テストはsemantic stateの支援技術向け名前と評価実数を確認する。exact visualは375×812 / 1366×768のスクリーンショットと人間確認で調整し、確定後にUI copyと必要な文字列assertionを更新する。

### 375×812

- [ ] ページ全体の横スクロールなし
- [ ] ゲスト名前選択で既存名と直下の直接入力が離れず、操作とエラーが重ならない
- [ ] 候補一覧カードは1列、候補編集の回答者行は縦に追える
- [ ] ○ / − / ×、Candidate追加時刻、❤️、🌀、コメントの表示・操作対象を誤認しない
- [ ] 非選択回答者の長いコメントが初期案3行で省略され、専用の展開操作がない
- [ ] その回答者行を選択するとコメント全文と編集欄を確認できる
- [ ] 3色状態に可視の説明ラベルがなく、支援技術向け状態名と評価実数がある
- [ ] 同名確認、名前変更、2段階削除ダイアログがviewport内に収まる

### 1366×768

- [ ] 候補一覧と候補編集の幅が過度に狭くない
- [ ] 回答者行を表形式に近い配置で比較できる
- [ ] 候補ヘッダ、集約値、回答行、コメントが視線順に並ぶ
- [ ] 候補一覧でお題・メモを確認し、複数候補をスクロールしながら状態比較できる
- [ ] 既存Event編集・URLコピー導線が共同編集UIに埋もれない

スクリーンショット対象:

1. トップのお題作成
2. オーナー初期セットアップ
3. ゲスト名前選択
4. 候補一覧ダッシュボード（第1色 / 第2色 / 第3色 / 通常候補の混在）
5. 候補編集（判断基準別❤️ / 🌀と回答者行）
6. 同名確認
7. 名前変更確認
8. 回答者削除1段階目・2段階目
9. コメント編集状態

---

## 13. Local migration・E2E QAゲート

### Gate L1: localhost bind

- 専用Docker networkを使用してlocal stackを起動する
- API / DB / Studio / Mailpit / Analyticsの全公開portについて`HostIp=127.0.0.1`を確認する
- `0.0.0.0`、`::`、空値、想定外portがあれば即stopし、後続ゲートへ進まない
- Auth containerが存在せず、tokenなしREST参照が行を返さないことを確認する
- `supabase status`のraw key / passwordを報告へ貼らない

### Gate L2: 接続先分離

- local / remote profileに必要な2 keyがあることだけを確認し、値を表示しない
- localは`127.0.0.1:54321`、remoteはtracked allowlistのHTTPS hostnameと一致する
- `dev:local` / `test:e2e:local`と`:remote`が正式commandで、`dev` / `test:e2e`がlocalへの互換aliasである
- target不明、host不一致、必要key不足でNext.jsとPlaywrightが起動前停止する
- Playwrightが`reuseExistingServer: false`で、test runnerとwebServerへ同じprofileを渡す
- specが`.env.local` / `.env`を独自に読み込まない

### Gate L3: Advisor訂正migration

- `npx supabase migration new <request_header訂正名>`で生成する
- `request_header`だけを固定`search_path`へ訂正し、権限と返却挙動を維持する
- `migration up --local`後、function定義とadvisor結果を確認する
- Participantの既知2警告は本筋migration前の既知残存として明記する

### Gate L4: 本筋migration増分適用

- `npx supabase migration new <共同編集モデル名>`で生成する
- Event件数0ガードとdestructive operation一覧を確認する
- `migration up --local`後、table、column、constraint、index、RLS、policy、GRANT、function、trigger、FKを確認する
- pgTAPとanon clientでtokenなし、不正token、別Event、unique、不変列、cascadeを検証する
- advisor既知3件の解消と新規警告の有無を確認する

### Gate L5: Clean-chain replay

- localデータ破棄可否を確認してから`db reset --local --no-seed`を実行する
- `migration list --local`で既存5本と新規migrationが順番どおり適用済みである
- Gate L3 / L4のpostflight、pgTAP、advisorを空DB再現後にも通す

### Gate L6: Local E2E

- focused DB / E2Eを先に実行する
- `npm run test:e2e:local`でSlice 1 / 2 / 5回帰と新規シナリオを実行する
- 総数 / PASS / FAIL / SKIP、skip対象名と理由、接続targetを値非表示で報告する
- `npm run check`、`npm run build`、`git diff --check`を通し、最後にlocal stackをstopする

---

## 14. Remote cleanup・migration・E2E QAゲート

### Gate R1: Remote target確認

- 人間がSupabase project、database、SQL Editor role、PostgreSQL majorを確認する
- CLIのlink、remote migration history、remote DB URLを使用しない

### Gate R2: 旧schema cleanup

- 現行cleanup profileでEvent、Participant、Candidate、Criterion、Reaction、Concern、Commentをinventoryする
- Event ID、title、依存件数、循環参照解消順を記録する
- discovery、ROLLBACK SQL提示、復元確認、COMMIT SQL提示、COMMIT実行をそれぞれ別承認にする
- 全対象tableが0件になったことを確認する

### Gate R3: Advisor訂正migration

- 新しいSQL Editor queryへ全文を貼り、検索・選択範囲を解除して一度だけ実行する
- Success後に`request_header`のfunction定義、権限、既知挙動をpostflightする
- error時は再実行せず、新しいSELECT-only queryで永続状態を確認する

### Gate R4: 本筋migration

- Event件数0、destructive operation、既存migration不変を再確認する
- 新しいSQL Editor queryへ本筋migration全文を貼り、一度だけ実行する
- owner参照、guest token、Vote、Criterion別Concern、Comment、RLS、policy、GRANT、trigger、FK、advisorをpostflightする

### Gate R5: Remote E2E

- 全remote postflight通過後に別承認を得る
- `npm run test:e2e:remote`で全回帰と新規シナリオを実行する
- 総数 / PASS / FAIL / SKIP、skip名と理由、E2E event ID / title / 件数を報告する
- remote E2E成功後にだけcommitゲートへ進む

---

## 15. 最終検証と報告

実装完了後に次を実行する。

```text
npm run check
npm run build
npm run test:e2e:local
npm run test:e2e:remote
git diff --check
```

報告内容:

- 変更ファイル一覧
- 新規migration名
- 文書・実装・DBの整合状況
- E2E総数 / PASS / FAIL / SKIP
- Slice 1 / 2 / 5回帰結果
- 375px / 1366px目視結果とスクリーンショット
- local migration list / postflight / advisor結果
- remote postflight結果
- 作成した`[E2E]`データ
- 未解決事項
- commit前の`git status --short`

全項目成功後もcommitせず、commit承認を待つ。commit後もpushせず、push承認を待つ。
