# ADR-0006: 共同編集型・回答者行モデル

- **ステータス:** Accepted
- **日付:** 2026-07-11
- **決定者:** おしげさん
- **関連:** [ADR-0003](0003-evaluation-and-decision-logic.md) / [ADR-0004](0004-permission-model.md) / [ADR-0005](0005-drop-attribute-dynamic-criteria.md) / [ADR-0007](0007-event-views-and-criterion-feedback.md) / [詳細要件](../reports/collaborative-response-row-requirements-2026-07-11.md) / [実装仕様](../reports/collaborative-response-row-spec-draft-2026-07-11.md)
- **実装状態（2026-07-13）:** コード・DB・UIへ実装済み。local / remote E2EとProduction smokeは合格済み

> **部分SUPERSEDED（2026-07-12・ADR-0007）:** Event詳細1画面へ候補カードと全回答者行をまとめる構造、およびCandidate単位の常設単一ConcernはADR-0007で置換する。回答者行、Vote、owner分離、3状態判定、同期方式は有効。

## コンテキスト

従来はブラウザの`guest_token`をParticipantへ結び付け、Event作成や個人名義操作で「そのブラウザのParticipant」を生成していた。この方式では、同じ人物が別ブラウザから参加すると行が増え、調整さん型の「イベント内の回答行をみんなで編集する」体験と一致しない。また、Vote行なしを能動的な「−」と同一視すると、後から追加された候補が未評価なのか、明示的に中立と評価されたのか判別できない。

きめのすけは個人認証を行うサービスではなく、候補に対するみんなの意見を少ない操作で見える化する共同編集ダッシュボードとする。オーナー権限、回答者行、ブラウザ状態を分離し、候補カード内で一つずつ吟味できる構造へ改める。

## 決定

### 1. オーナーと回答者を分離する

- オーナーはお題・メモを編集できるcapabilityであり、`owner_token`だけで判定する。
- Event作成時にParticipantを作成せず、`events.owner_participant_id`と`participants.guest_token`を撤去する。
- Event作成またはowner URL検証成功時、対象Eventのshare pathに限定したHttpOnly owner Cookieを設定する。
- オーナーも○ / − / ×、❤️、🌀、コメントを入力するときは一般利用者と同じ回答者行を選択する。

### 2. Participantはイベント内の共同編集可能な回答者行とする

- Participantは実在人物の恒久IDでもブラウザIDでもなく、イベント内の名前付き回答行である。
- 共有URL保持者は既存行を選択し、名前・評価・❤️・🌀・コメントを共同編集できる。
- `display_name`は前後空白除去後1〜60文字で、同一Event内のtrim後完全一致名を禁止する。
- 同名入力時は「同じ人か」を確認する。本人なら既存行を使い、別人なら「田中2」等の異なる名前を再入力させる。
- Participant削除は2段階確認とし、Vote / Reaction / Concern / Commentをcascade削除、Candidate / Criterionの`created_by`をNULLにする。

### 3. Participant生成と選択

- 文字入力だけでは保存しない。非IME Enter、モバイル完了、回答者セレクター全体からの通常blurで名前を確定する。
- 名前だけを確定した場合も、評価やコメントがなくてもParticipantを生成する。
- 個人名義操作を未選択で始めた場合、操作を保留し、回答者の選択・作成成功後に一度だけ再開する。
- 名前確定処理はEnter用・blur用・明示操作用に分けず、単一coordinatorへ集約する。
- 優先順位は「既存回答者の明示選択 → 明示的DB操作 → 非IME Enter / モバイル完了 → 通常blur」とする。明示操作起因のblur保存は抑止する。
- trim後非空の名前draftがあるCandidate / Criterion追加は、Participant解決後に作成し、そのParticipantを`created_by`へ設定する。draftなしなら追加自体を理由にParticipantを作らない。
- 検証・DB失敗時は名前draftを保持するが保留操作を破棄する。連打時は最初の操作だけを受け付ける。
- reload、tab close、外部遷移ではbeforeunload保存を行わない。

### 4. 選択中回答者はローカルUI状態とする

- localStorageキーを`kimenosuke:selected-participant:<event_id>`へ固定し、valueはParticipant IDだけとする。
- share URLとowner URLで同じキーを使う。
- localStorageは再選択の便宜だけに使い、RLSや権限判定へ使わない。
- 行が削除済み・不在ならキーと現在選択を解除する。

### 5. 候補一覧ダッシュボードと候補編集

- 候補一覧ダッシュボードはEventのお題・メモと全Candidateの集約を眺める通常閲覧先とし、Candidate名から候補編集画面へ進む。
- 候補編集画面で、対象Candidateの全回答者行、判断基準別❤️ / 🌀、コメントを表示・共同編集する。
- 非選択行はread-onlyとし、行選択では値を変えずselected participantだけを切り替える。選択行だけに編集controlを表示する。
- デスクトップとモバイルで同じ操作モデルを使う。MVPではイベント全体の一括回答マトリクスとの切替を作らない。
- コメントはCandidate×Participantにつき現在値1件とし、会話、返信、履歴、通知、既読を持たない。
- オーナー初期セットアップ、ゲスト名前選択、候補一覧、候補編集の入口と遷移はADR-0007を正とする。

### 6. Voteは未評価を含む4状態とする

- 読取状態は`unrated / positive / neutral / veto`の4状態とする。
- Vote行なしは`unrated`、Vote行の`neutral`は能動的な「−」とし、表示でも区別する。
- `votes.value`は`text + CHECK`で`positive / neutral / veto`だけを許可し、Vote専用enumとtimestamp列は作らない。
- アプリの`setVote`はupsert / updateでCandidate×Participantにつき1行を保つ。raw duplicate INSERTはUNIQUE制約で拒否する。
- 選択済みの同じ値を再押下した場合はno-opとし、server actionやDB mutationを呼ばない。
- 判定に使うのは○数と×有無だけで、未評価と−はどちらも0として扱う。

### 7. Candidate作成時刻だけを表示する

- 時刻をユーザーへ表示する対象は`Candidate.created_at`だけとする。Vote / Reaction / Concern / Commentの時刻は表示・追加管理しない。
- 60分未満は「1時間以内に追加」、24時間未満は切り捨てた「N時間前に追加」、24時間以上は切り捨てた「N日前に追加」とする。
- クライアント時計より`created_at`が未来なら、`max(0, now - created_at)`で経過を0へclampし、「1時間以内に追加」とする。
- timer、pollingは追加せず、初期取得とローカルmutation成功後の完全状態取得時に計算する。

### 8. 最終候補は3種類の状態で可視化する

候補ごとの○数を`P`、×数を`X`、全候補の○最多数を`M`とする。

1. `M > 0`, `P = M`, `X = 0`: `clear`。議論なしで決めやすい最有力候補。
2. `M > 0`, `P = M`, `X > 0`: `discussion`。人気は最多だが議論が必要な候補。
3. `clear`が0件のとき、`0 < P < M`, `X = 0`の候補群における○最多: `fallback`。安全な代替候補。
4. 上記以外、または`M = 0`: `none`。

- 同条件・同数は並列表示する。○最多同数で×なしと×ありが混在する場合は、それぞれ`clear`と`discussion`にする。
- `clear`が1件以上ある場合、○最多未満の×なし候補を`fallback`にしない。
- 可視の状態説明ラベルは表示せず、控えめなsemantic color、支援技術向け状態名、常時表示する○ / − / ×の実数を用いる。確定、採択、ロック、候補非表示は行わない。
- ❤️はCandidateに属するReaction行数、🌀はCriterion別Concern行数を単純合計して表示するが、3状態判定には使わない。

### 9. 同期方式

- 初期表示で完全EventStateを取得する。
- ローカルmutation成功後、ページ再読み込みなしで完全EventStateを再取得し置換する。
- 別タブ・別ブラウザの変更は、次のローカル成功操作または手動再読み込み・再訪で取り込む。
- Realtime、定期polling、focus復帰時の自動取得はMVP外とし、同時編集はlast-write-winsとする。

## 置換範囲と優先順位

本ADRは、次の旧仕様を置換する。

- ブラウザの`guest_token`をParticipant本人識別・新規行名義へ使う設計。
- Event作成時にowner Participantを生成し、`owner_participant_id`でオーナー判定する設計。
- Candidate追加や個人名義操作でブラウザ用Participantを暗黙生成する設計。
- Vote行なしを「−」と読み、未評価と能動−を区別しない設計。
- ×あり候補を一律にハイライト対象外とする旧2分類。
- Commentを1回答者あたり複数件持てる設計。

競合時の優先順位は、**ADR-0007 > ADR-0006 > ADR-0003 / ADR-0004 / ADR-0005の上記置換範囲 > 旧Slice 2 / 5詳細文書**とする。属性撤廃、Criterionの動的化、share tokenによる性善説共同編集は維持する。

## 影響

- 既存適用済みmigrationは編集せず、新規migrationで破壊的なモデル切替を行う。
- 実DBの通常Eventデータは保持する。`[E2E]`など明示的なcleanup対象だけを、承認済みcleanup手順と人間確認ゲートを経てmigration外で削除する。
- Supabase Auth、service role、local JSON fallback、依存更新は導入しない。
- 詳細なデータ型、RLS、状態機械、ワイヤーフレーム、DoD、QAは関連文書を正とする。
