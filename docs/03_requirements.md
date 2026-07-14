# 03 要件定義（きめのすけ）

作成日: 2026-07-08 / 最終改訂: 2026-07-13 / フェーズ: Phase 1（要件定義）

正本:

- 本書
- [ADR-0003](adr/0003-evaluation-and-decision-logic.md)（評価・最終候補表示）
- [ADR-0004](adr/0004-permission-model.md)（権限）
- [ADR-0005](adr/0005-drop-attribute-dynamic-criteria.md)（属性撤廃・判断基準）
- [ADR-0006](adr/0006-collaborative-response-row-model.md)（共同編集型・回答者行モデル）
- [ADR-0007](adr/0007-event-views-and-criterion-feedback.md)（イベント画面分離・判断基準別フィードバック）
- [ADR-0008](adr/0008-local-supabase-development-workflow.md)（ローカルSupabase開発・検証とリモート適用境界）
- [共同編集型・回答者行モデル 詳細要件](reports/collaborative-response-row-requirements-2026-07-11.md)
- [Supabase CLI / Dockerローカル開発・検証リファレンス](reports/supabase-cli-docker-development-reference-2026-07-12.md)

> **実装状態（2026-07-14）:** ADR-0006 / ADR-0007の共同編集型・回答者行モデルと画面分離、ADR-0008のlocalhost bind限定・接続先分離・local / remote E2E分離はコード・DB・運用wrapperへ反映済み。local / remote E2E、Production smoke、その時点で生成されたremote／Productionの`[E2E]`データcleanupは完了済みで、当該cleanupを再計画・再実行する残作業はない。今後のQAで新たに生成される`[E2E]`データは、通常のcleanup手順で都度後処理する。旧guest_token本人モデル、候補単位の常設🌀、Event詳細1画面構造と競合する場合はADR-0007、次にADR-0006を優先する。

---

## 1. サービスの役割

きめのすけは、サービス自身が候補を確定するのではなく、候補に対するみんなの意見を少ない操作で見える化し、グループが決めやすい状態を作る。

- ログイン・会員登録なしで、共有URLから共同編集できる。
- 候補一覧ダッシュボードでCandidate全体を見渡し、候補編集画面で全回答者の○ / − / ×、判断基準別❤️ / 🌀、コメントを並べ、一つずつ吟味する。
- オーナー権限と回答者行を分離する。
- 未評価と能動−を区別する。
- 候補作成時刻を示し、早く追加された候補へ評価が集まりやすいバイアスを判断できるようにする。
- ○数と×有無から3種類の最終候補状態を示すが、確定・採択・ロックは行わない。

### 1.1 表示用語とEventデータ

- **きめること**: 候補を出し合い、みんなで決めたい対象を書く。`Event.title`へ保存する。
- **つたえておきたいこと**: 決めるときに共有しておきたい背景、希望、条件などを書く。任意入力で、`Event.memo`へ保存する。
- ユーザー向けUIでは「お題」「メモ」を入力ラベルとして使わない。内部のDB列名、Server Action入出力、フォームフィールド名は`title` / `memo`のまま維持する。

---

## 2. ユーザー・状態

| 種別・状態 | 説明 | 識別・権限 |
|---|---|---|
| オーナー | きめること・つたえておきたいことを編集できるcapability。回答者とは別概念 | `owner_token`またはEvent share path限定HttpOnly Cookie |
| 共有利用者 | 有効な共有URLを開いている人。ログイン不要 | `share_token`。同一Eventの共有要素を共同編集 |
| 回答者行（Participant） | Event内で共同編集される名前付き回答単位。人物・ブラウザの恒久IDではない | Event内のDB行 |
| 選択中回答者 | 現在の個人名義操作対象 | `kimenosuke:selected-participant:<event_id>`へParticipant IDをローカル保持。権限には不使用 |
| 未選択 | 個人名義操作の対象がない状態 | Candidate / Criterion等の共有操作は可能。個人名義操作では回答者を選択 |

オーナーも意見を入力するときは、一般利用者と同じ回答者セレクターを使う。Event作成時にParticipantは作成しない。

---

## 3. 機能要件

### 3.1 Event作成・共有・オーナー権限

| ID | 受け入れ条件 |
|---|---|
| AC-1.1 きめること作成 | **Given** トップ画面 **When** きめることと任意のつたえておきたいことを入力して作成 **Then** Eventを作成し、Participantを作成しない。属性選択とお名前欄は置かない |
| AC-1.2 URL発行 | **Given** Event作成成功 **When** オーナー候補一覧ダッシュボードを表示 **Then** 推測困難な共有URLとあなた専用URLをCandidate追加欄の下へ表示し、検索エンジンへ非インデックスとする |
| AC-1.3 未ログイン閲覧 | **Given** 共有URL保持者 **When** Eventを開く **Then** ログイン・登録なしできめること・つたえておきたいことを確認できる。回答者未選択なら名前選択、選択後は候補一覧ダッシュボードを表示する |
| AC-1.4 オーナーCookie | **Given** Event作成またはowner URL検証成功 **When** オーナー権限を保存 **Then** 対象Eventのshare path限定HttpOnly Cookieへowner tokenを保持する |
| AC-1.5 オーナー編集 | **Given** 有効なowner token **When** きめること・つたえておきたいことを編集 **Then** 「変更します、よろしいですか？」の確認後に保存できる |
| AC-1.6 権限回復 | **Given** Cookie消失または別ブラウザ **When** owner URLを開く **Then** きめること・つたえておきたいことの編集権限を回復する |
| AC-1.7 URLコピー | **Given** Event詳細 **When** コピー操作 **Then** 共有URLをワンクリックでコピーできる |
| AC-1.8 オーナー初期セットアップ | **Given** Event作成成功 **When** オーナー画面へ進む **Then** Event情報の下にお名前と候補の初期入力を表示し、完了後は候補一覧ダッシュボードを別タブで開く |
| AC-1.9 owner再訪 | **Given** 別ブラウザまたは後日のowner URLアクセス **When** owner token検証に成功 **Then** 回答者未選択でも初期セットアップを再表示せず候補一覧ダッシュボードを表示し、きめること・つたえておきたいことを編集できる。個人名義操作時だけ名前選択を求める |

### 3.2 回答者セレクター

| ID | 受け入れ条件 |
|---|---|
| AC-P.1 未選択画面 | 共有URLを開き有効な選択中回答者がないゲストには「あなたのお名前」、既存名の選択肢、その直下の「直接入力」だけを表示する |
| AC-P.2 既存選択 | 既存回答者行を選択してもDB行を増やさず、入力欄へ同じ名前を反映してその行を選択する。ゲストは候補一覧ダッシュボードへ進む |
| AC-P.3 新規作成 | 新名を非IME Enter、モバイル完了、またはセレクター全体外への通常blurで確定し、trim後1〜60文字のParticipantを作成・選択する。ゲストは候補一覧ダッシュボードへ進む |
| AC-P.4 名前だけの参加 | コメント・評価がなくても、名前の確定契機だけでParticipantを作成する |
| AC-P.5 同名 | trim後完全一致名があれば同じ人か確認する。本人なら既存行を使い、別人なら異なる名前の再入力を求める |
| AC-P.6 名前変更 | 選択行の名前だけを1段階確認後に変更する。空・同名・別行との統合を拒否する |
| AC-P.7 削除 | 2段階確認後にParticipantと配下のVote / Reaction / Concern / Commentを削除し、Candidate / Criterionの`created_by`をNULLにする |
| AC-P.8 選択記憶 | event ID固定localStorageキーをshare URL / owner URLで共用し、行が不在なら選択とキーを解除する |
| AC-P.9 オーナー継続 | オーナー初期セットアップで名前を選択・作成した場合は同じ画面に残り、ステップ2のCandidate追加へ続く |
| AC-P.10 再訪 | localStorageのParticipant IDが同一Eventに現存する場合、共有URLから候補一覧ダッシュボードへ直接進む |

Participant作成は単一の名前確定処理へ集約し、優先順位を次に固定する。

1. 既存回答者の明示選択
2. ○ / − / ×、❤️、🌀、コメント保存、Event / Candidate / Criterionの明示的DB操作
3. 非IME Enter / モバイル完了
4. 通常blur

明示操作起因のblurでは通常blur保存を抑止する。名前draftがある明示操作はParticipant解決後に一度だけ続行し、失敗時はdraftを保持して保留操作を破棄する。reload・tab close・外部遷移でbeforeunload保存は行わない。

### 3.3 候補・判断基準

| ID | 受け入れ条件 |
|---|---|
| AC-2.1 候補追加 | タイトルまたはURLの少なくとも一方でCandidateを追加できる。候補追加フォームにお名前欄を置かない |
| AC-2.2 提案者 | 名前draftがなければselected participantを`created_by`へ設定し、未選択ならNULL。非空draftがあればParticipant解決後にその行を設定する |
| AC-2.3 候補編集 | 共有URL保持者がタイトル・URL・提案者を要素ごとの確認後に編集できる。提案者は同一EventのParticipantまたはNULLだけ |
| AC-2.4 候補削除 | 共有URL保持者が2段階確認後に物理削除し、配下データをcascade削除する |
| AC-2.5 追加時刻 | `Candidate.created_at`から「1時間以内に追加 / N時間前に追加 / N日前に追加」を表示する。未来時刻は経過0へclampする |
| AC-2.6 判断基準 | デフォルト「興味ある？」、4プリセット、自由記述を作成順に表示し、共有URL保持者が追加・label編集・2段階削除できる |
| AC-2.7 判断基準作成者 | 名前draftなしではselected participantまたはNULL、非空draftありでは解決したParticipantを`created_by`へ設定する |

Candidate / Criterion追加自体は、名前draftもselected participantもない利用者のParticipantを暗黙生成しない。

### 3.4 ○ / − / ×

| ID | 受け入れ条件 |
|---|---|
| AC-3.1 4状態 | Candidate×Participantを`unrated / positive / neutral / veto`のいずれかとして必ず読む |
| AC-3.2 未評価 | Vote行なしを未評価、`neutral`行を能動−として表示でも区別する |
| AC-3.3 保存 | 選択中回答者名義で`positive / neutral / veto`を保存・更新し、Candidate×ParticipantにつきVoteを1件に保つ |
| AC-3.4 共同編集 | 共有URL保持者は任意の回答者行を選択し、その行の現在評価を変更できる |
| AC-3.5 同値再押下 | 選択済みの同じ値を再度押した場合はno-opとし、server actionやDB mutationを実行しない |
| AC-3.6 可視性 | 各候補カードに全回答者の未評価・○・−・×を表示する |
| AC-3.7 時刻 | Vote時刻は保存・表示目的で追加しない。ユーザーへ表示する時刻はCandidate作成時刻だけ |
| AC-3.8 一覧集約 | 候補一覧の`➖`件数は`neutral` Vote行だけを数え、Vote行なしの`unrated`を含めない。未評価は候補編集の回答者行で別表示する |

### 3.5 ❤️・🌀・コメント

| ID | 受け入れ条件 |
|---|---|
| AC-5.1 ❤️ | 選択中回答者名義でCandidate×Criterionへ付け外しし、判断基準ごとの件数と付与者を表示する |
| AC-5.2 🌀 | 選択中回答者名義でCandidate×Criterionへ付け外しし、判断基準ごとの件数と付与者を表示する。Candidate単位の常設単一🌀は置かない |
| AC-5.3 独立性 | 同じ回答者が同じCandidate×Criterionへ❤️と🌀を両方付けられる |
| AC-5.4 集約 | Candidate全体の❤️はReaction行数、🌀はCriterion別Concern行数を単純合計する。どちらも最終候補判定へ入れない |
| AC-5.5 コメント | Candidate×Participantにつき現在値を最大1件保持し、1〜500コードポイントを明示的な保存だけで確定する |
| AC-5.6 コメント共同編集 | 任意の回答者行を選択して現在コメントを上書きできる。空保存は削除とし、会話・返信・履歴・通知・既読を持たない |

### 3.6 候補一覧ダッシュボード・候補編集

候補一覧ダッシュボード:

- 共有URLの通常閲覧先とし、Eventのきめること・つたえておきたいことと全Candidateを表示する。
- Candidate名の横へ総合評価`⭕️ / ➖ / ❌`を別々の小さな表示単位で置き、各件数を明示する。`➖`は能動`neutral`だけを数える。
- Candidate名の下へURL、その下へ追加時期と提案者、その下へ❤️ / 🌀の単純合計を小さな補助情報として表示する。
- `clear / discussion / fallback / none`の説明ラベルは表示せず、控えめなsemantic colorと支援技術向けの名前で状態を表す。
- Candidate名から候補編集画面へ進む。判断基準編集、回答者別の編集control、コメント入力は一覧へ展開しない。

候補編集画面:

- Candidate情報と集約表示に加え、判断基準と全回答者行を表示する。
- 非選択行はread-onlyで、現在値だけを表示する。行を選択するclickでは値を変更しない。
- 選択行だけに○ / − / ×、判断基準別❤️ / 🌀、コメントの編集controlを表示し、「〇〇として判断中」と示す。
- 判断基準ごとに❤️ / 🌀、件数、付与者を表示し、「＋ 判断基準」と各基準の「…」メニューから追加・label編集・2段階削除を行う。
- 375pxでは回答者行を縦配置して非選択情報を簡潔にし、1366pxでは比較しやすい表形式に近い配置とする。操作モデルは共通にする。
- 非選択行の長いコメントは初期案3行clampとし、選択後に全文と編集欄を表示する。
- MVPではイベント全体の一括回答マトリクスとの表示切替を作らない。

### 3.7 最終候補表示

候補ごとの○数を`P`、×数を`X`、全候補の○最多数を`M`とする。

| 状態 | 条件 | 意味 |
|---|---|---|
| `clear` | `M > 0`, `P = M`, `X = 0` | 議論なしで決めやすい最有力候補 |
| `discussion` | `M > 0`, `P = M`, `X > 0` | 人気は最多だが議論が必要な候補 |
| `fallback` | clearが0件で、`0 < P < M`, `X = 0`の候補群における○最多 | 消去法で残る安全な代替候補 |
| `none` | 上記以外、または`M = 0` | 通常表示 |

- 同条件・同数は同じ状態で並列表示する。
- ○最多同数で×なしと×ありが混在する場合は、それぞれ`clear`と`discussion`にする。
- clearが1件以上あれば、○最多未満の×なし候補をfallbackにしない。
- 説明ラベルは表示しない。カードのsemantic colorに加え、支援技術向けの状態名と常時表示する○ / − / ×の実数で状態を確認できるようにする。
- 全候補を常時表示・編集可能にし、確定ボタン、確定状態、ロックを追加しない。

### 3.8 同期・失敗

- 初期表示で完全EventStateを取得する。
- ローカルmutation成功後、ページ再読み込みなしで完全EventStateを再取得して置換する。
- 別タブ・別ブラウザの変更は、次のローカル成功操作または手動再読み込み・再訪で反映する。
- Realtime、定期polling、focus復帰時の自動取得はMVP外とする。
- 同時編集はlast-write-wins。失敗時は直前状態と入力draftを維持し、対象付近へエラーを表示する。

---

## 4. 非機能要件

| 区分 | 要件 |
|---|---|
| 対応幅 | 375×812と1366×768でモバイル・デスクトップを同格に扱う |
| セキュリティ | tokenは推測困難。RLS、列権限、同一EventガードをDBでも強制する。Supabase Authとservice roleは使わない |
| データ | 無期限保存。イベント削除機能なし。FK、UNIQUE、CHECK、triggerで整合性を保証する |
| 性能 | Event単位で完全状態を取得し、CandidateカードごとのN+1照会を避ける |
| アクセシビリティ | 可視の説明ラベルを増やさず、支援技術向けの状態名と○ / − / ×の実数でsemantic colorを補完する |
| 検索 | `noindex` metadataと`robots.txt`を維持する |
| Local DB公開範囲 | Docker local stackの全公開portを`127.0.0.1`へ限定し、起動後のHostIp検査に失敗したら停止する |
| 接続先分離 | Git非追跡のlocal / remote profileとtracked `config/supabase-targets.json`を照合し、target不明・URL不一致ではNext.js / Playwrightを起動しない |
| Migration再現性 | 固定CLIで新規migrationを生成し、remote適用前にlocal増分適用、postflight、advisor、空DBからのclean-chain replayを完了する |
| E2E分離 | `test:e2e:local`と`test:e2e:remote`を別証跡として実行し、test runnerと新規Next.js serverへ同じprofileを渡す |
| 秘密情報 | `SUPABASE_URL` / `SUPABASE_ANON_KEY`の値、CLI statusのkey・password、service role・DB passwordをログ・画面・報告へ出さない |
| Remote DB適用 | 別承認後に人間がSQL Editorでmigration全文を実行する。CLI remote接続やmigration history repairへ暗黙に切り替えない |

---

## 5. MVP境界

### In Scope

きめること作成・共有 / オーナー初期セットアップ / オーナー編集URL / 回答者セレクター / 候補一覧ダッシュボード / 候補編集 / ○・−・× / 最終候補3状態 / Criterion別❤️・🌀 / 1回答者1コメント / URLコピー / noindex / モバイル・デスクトップ対応 / 無期限保存。

### Out of Scope

- ログイン、会員登録、Participantの端末横断本人認証
- 確定ボタン、確定状態、ロック
- イベント全体の一括評価マトリクスと表示切替
- 操作履歴、変更者履歴、コメント履歴
- Realtime、polling、通知、既読
- 回答者行の並び替え
- イベント削除
- owner tokenのローテーション、排他的な権限移譲

トップ下部のイベント一覧（同じブラウザに保存した複数Eventへの再訪導線）、広告、AI機能はMVP全体の別スライスで扱い、共同編集型・回答者行モデル移行の実装範囲には含めない。トップは将来イベント一覧を追加できるレイアウトとするが、本スライスでは一覧・保存処理・導線を実装しない。

---

## 6. 画面一覧

| 画面 | 内容 |
|---|---|
| Event作成 | きめること・任意のつたえておきたいこと → 作成。属性・お名前・候補一覧リンク・イベント一覧は置かない |
| オーナー初期セットアップ | きめること・つたえておきたいこと / お名前 / Candidate追加 / 「さあ、きめよう！」。URL共有は候補一覧ダッシュボードへ置く |
| ゲスト名前選択 | あなたのお名前 / 既存名選択 / 直下の直接入力。確定後は候補一覧へ |
| 候補一覧ダッシュボード | きめること・つたえておきたいこと / Candidateごとの総合評価・URL・追加時期・提案者・❤️ / 🌀集約。通常閲覧先 |
| 候補編集 | 1 Candidateの情報 / 判断基準 / 全回答者行 / 選択行の○・−・×・判断基準別❤️ / 🌀・コメント編集 |
| ダイアログ | 同名確認 / 名前変更 / Participant・Candidate・Criterionの2段階削除 / 既存要素変更確認 |

詳細な受け入れ条件、名前確定状態機械、UI構造は[共同編集型・回答者行モデル 詳細要件](reports/collaborative-response-row-requirements-2026-07-11.md)と[実装仕様](reports/collaborative-response-row-spec-draft-2026-07-11.md)を参照する。
