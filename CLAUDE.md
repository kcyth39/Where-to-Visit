# きめのすけ — AI共通コンテキスト（AGENTS.md / CLAUDE.md 同期）

> このファイルは `AGENTS.md` と `CLAUDE.md` で**同一内容**を保つ。片方を更新したら必ずもう片方も同期する。

## サービス概要

きめのすけ: グループ意思決定支援サービス。候補カードごとに○/−/×・❤️・🌀・コメントを共同編集し、みんなの意見を見える化する。サービス自身は確定せず、3種類の最終候補状態を自動ハイライトする。登録不要・URL共有。

## 確定ロジックの正確な仕様

- 評価は回答者×候補ごとに`unrated / positive / neutral / veto`の4状態。Vote行なし＝未評価、`neutral`行＝能動−として表示でも区別する。
- ❤️と🌀はいずれも判断基準ごとの非決定・意見可視化。互いに独立し、同じ回答者が同じ判断基準へ両方付けられる。確定判定に影響しない。
- 確定行為・確定状態・ロックは扱わない。○数と×有無から`clear / discussion / fallback / none`を算出する。候補カードへ状態の説明ラベルは表示せず、控えめなsemantic colorと支援技術向けの名前を用いる。
- `clear`: ○最多・×なし。`discussion`: ○最多・×あり。`fallback`: clearが0件のときだけ、○最多未満・×なし候補のうち○最多。その他はnone。
- 同条件・同数は並列ハイライト。○最多同数で×なしと×ありが混在する場合はclearとdiscussionへ分ける。全候補○0はnone。
- clearが1件以上ある場合、○最多未満の×なし候補をfallbackにしない。全候補はブラックアウト・非表示にせず常時可視。
- ×→−変更は誰でも可（性善説・履歴なし）。
- 可視性: ○・−・× いずれも付与者を全員公開（参加者×候補マトリクス）。❤️・🌀も付与者公開。
- 判定は○数と×有無のみ。未評価と−はいずれも集計0で、❤️・🌀・コメントも判定へ入れない。
- ❤️集約はCandidate配下のReaction行数、🌀集約はCandidate配下のCriterion別Concern行数の単純合計。

## 判断基準（Criterion）と❤️・🌀 ※ADR-0005（属性撤廃）

- **属性は撤廃**（ADR-0005）。お題は種別に縛られない**自由テキスト**（作成時に属性選択なし）。
- **判断基準（Criterion）**: お題ごとの共有リスト。**共有URLを知る全員が誰でも追加/編集/削除**（性善説・削除は2重確認）。**デフォルト「興味ある？」**＋プリセット「価格どう？／雰囲気どう？／場所はどう？／色はどう？」＋**自由記述**。更新可能な業務列はlabelのみ。表示は `created_at ASC, id ASC` の作成順で、編集後も位置不変・並び替えなし。自由記述の同一label重複は許容し、同label存在中のプリセット追加ボタンだけ隠す。
- ❤️と🌀は選択中の回答者行名義で、Candidate×Criterionごとに独立して付ける/付けない。Candidate単位の常設単一🌀は廃止する。いずれも共有URL保持者が回答者行を選んで共同編集できる（ADR-0007）。
- **Slice 5即時反映**: サーバー成功後に操作画面へページ再読み込みなしで反映し、失敗時は成功表示を残さない。別ブラウザ・別端末・別タブへのRealtime自動同期はSlice 5対象外。
- 属性撤去とSlice 5実装は完了済み。共同編集型・回答者行モデルは[ADR-0006](docs/adr/0006-collaborative-response-row-model.md)で承認済みだが、コードとDBは未移行。

## 共同編集型・回答者行モデル ※ADR-0006

- オーナーは`owner_token`で判定するcapability。Participantとは独立し、Event作成時にParticipantを作らない。
- Participantはブラウザ本人ではなく、イベント内で共同編集する名前付き回答者行。`guest_token`による本人識別は撤廃する。
- ゲスト未選択時は名前選択だけを表示し、候補編集では選択中回答者だけに個人名義controlを表示する。非選択行はread-onlyで、行選択時は値を変更しない。
- 名前は非IME Enter、モバイル完了、セレクター外blurで確定する。個人名義操作は回答者解決後に一度だけ再開し、明示操作起因のblurとの二重実行を防ぐ。
- 選択記憶キーは`kimenosuke:selected-participant:<event_id>`。権限には使用しない。
- Candidate追加自体はParticipantを生成しない。名前draftがあれば先にParticipantを解決し、その行を`created_by`へ設定する。
- CommentはCandidate×Participantにつき現在値1件。会話・履歴・通知は持たない。
- ユーザーへ表示する時刻は`Candidate.created_at`だけ。未来時刻は経過0へclampし「1時間以内に追加」とする。
- Event画面は「オーナー初期セットアップ / ゲスト名前選択 / 候補一覧ダッシュボード / 候補編集」に分ける。トップへEvent内の候補一覧リンクは置かない。
- 3ステップのオーナー初期セットアップはEvent作成直後だけ。owner URLでの再訪は回答者未選択でも候補一覧を表示し、個人名義操作時だけ名前選択へ進む。
- トップ下部のイベント一覧は、同じブラウザに保存した複数Eventへ再訪する将来機能であり、ADR-0006/0007移行スライスでは実装しない。

## 技術スタック（ADR-0002）

Next.js（App Router）+ Supabase（Postgres/Realtime、**Authは使わない**）+ Vercel Pro。
ドメイン: kimenosuke.com。

## 識別方式（ログイン不要）

- share_token（共有アクセス）とowner_token（お題・メモ編集、Cookie消失時の権限回復）は推測困難なtokenとする。
- owner tokenはEventのshare path限定HttpOnly Cookieへ保存する。選択中回答者はevent ID単位のlocalStorageへParticipant IDだけを保持する。
- Participantの権限・本人性をCookie/localStorageで証明しない。共有URL保持者による共同編集モデルとする。
- ログイン・会員登録・端末横断はMVP外。マイイベント一覧はCookieベース（そのブラウザ内）。

## MVP境界

- In: お題作成(自由テキスト・属性なし)・候補管理・4状態総合評価・最終候補3状態・判断基準(Criterion)別❤️/🌀・1回答者1コメント・URLコピー・マイイベント一覧(Cookie)・広告実装・オーナー編集URL・noindex・無期限保存・モバイル/デスクトップ同格。
- Out: ログイン/会員登録/端末横断一覧・プレミアム(AI解説)・通知・複数お題グルーピング・外部AI相談プロンプト・イベント削除・×解消履歴。

## docs/参照先

docs/03_requirements.md / 04_data-model.md / 05_dod.md / 06_qa-flow.md / adr/0006-collaborative-response-row-model.md / adr/0007-event-views-and-criterion-feedback.md。
（docs/07_launch-checklist.md はPhase 4で作成予定）

## 実装の規約と制約

- 実装ツール: Codex。コンテキストファイルはAGENTS.md/CLAUDE.md（両方同期・同一内容）。
- 仕様を勝手に変えない。矛盾・曖昧さを見つけたら実装せず質問して停止。
- 指示書外の実装（例: local JSON fallback）を追加しない。Supabase前提。
- 依存はバージョン固定（latest禁止）。
- スコープ厳守: 今回のスライス以外の機能に触れない。

## 着手前チェック（必須）

- 着手前に `git status` で作業フォルダとrepo状態を確認する。
- 作業フォルダが指示と異なる、またはGit未初期化の場合は、実装せず停止して報告する。
- 指示書のスコープ・停止条件を最優先する。
