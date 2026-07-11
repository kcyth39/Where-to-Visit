# 共同編集型・回答者行モデル DoD

- 作成日: 2026-07-11
- ステータス: **承認済み・正本反映済み（詳細DoD）**
- 対象要件: [共同編集型・回答者行モデル 要件定義書](collaborative-response-row-requirements-2026-07-11.md)
- 詳細仕様: [実装仕様](collaborative-response-row-spec-draft-2026-07-11.md)
- QA: [QAドキュメント](collaborative-response-row-qa-2026-07-11.md)

> 本書は今回の基盤再編＋Slice 3＋Slice 4を同一リリースで完了と判断するための基準である。チェックが1つでも未達の場合は完了扱いにしない。

---

## 1. 文書DoD

- [ ] 本要件、仕様、DoD、QAの相互参照と用語が一致している
- [ ] 新規ADR-0006に、オーナーと回答者の分離、回答者行の共同編集、guest_token撤廃理由が記録されている
- [ ] `AGENTS.md` と `CLAUDE.md` が完全一致している
- [ ] `03_requirements.md`、`04_data-model.md`、`05_dod.md`、`06_qa-flow.md`へ承認内容が反映されている
- [ ] ADR-0003の評価4状態・3色ロジック、ADR-0004の共同編集権限が更新されている
- [ ] ADR-0005の旧current participant / guest_token依存記述が更新されている
- [ ] 旧Slice 2 / 5文書は履歴として残し、現在仕様ではない箇所へ部分SUPERSEDED注記がある
- [ ] `ui-copy-decisions.md`に承認済みワイヤーフレームの文言が反映されている
- [ ] 「未評価＝−」「Vote行なし＝−」「ブラウザ＝Participant」「owner_participant_idでオーナー判定」という生きた正本記述が残っていない

---

## 2. データモデルDoD

### Event / Owner

- [ ] Event作成時にParticipantを生成しない
- [ ] `events.owner_participant_id`が撤去されている
- [ ] オーナー権限が`owner_token`だけで判定されている
- [ ] Event作成とowner URLアクセスの成功時、event share path限定のHttpOnly owner Cookieが設定される
- [ ] owner Cookie消失後もowner URLで回復できる
- [ ] 複数イベントのowner Cookieがpath分離により共存できる

### Participant

- [ ] Participantがイベント内の名前付き回答行として定義されている
- [ ] `participants.guest_token`と`UNIQUE(event_id, guest_token)`が撤去されている
- [ ] `display_name`はtrim後1〜60文字かつNOT NULLである
- [ ] `UNIQUE(event_id, display_name)`相当のDB制約でtrim後完全一致の同名を拒否する
- [ ] Participant表示順が`created_at ASC, id ASC`で安定している
- [ ] Participant削除時にVote / Reaction / Concern / Commentがcascade削除される
- [ ] Participant削除時にCandidate / Criterionの`created_by`がNULLになる

### Vote

- [ ] `votes`テーブルが新規migrationで作成されている
- [ ] `candidate_id × participant_id`が一意である
- [ ] `value`が`text + CHECK`で定義され、`positive / neutral / veto`だけを受け付ける
- [ ] Vote専用Postgres enumを追加していない
- [ ] Vote行なしを`unrated`として読める
- [ ] Voteの作成・更新時刻を表示目的で追加管理していない
- [ ] アプリの`setVote`を繰り返してもupsert / updateにより同一Candidate×ParticipantのVoteが1行に保たれる
- [ ] anon clientから同一Candidate×Participantを重複INSERTすると2回目がUNIQUE制約で拒否される
- [ ] CandidateとParticipantが同一eventに属することをDBが保証する
- [ ] CandidateまたはParticipant削除時にVoteがcascade削除される
- [ ] VoteのFK列とevent単位読取に必要なindexがある

### Candidate / Criterion / Feedback

- [ ] 名前draftなしのCandidate追加はParticipantを生成せず、選択中回答者があれば`created_by`、なければNULLになる
- [ ] 名前draftなしのCriterion追加はParticipantを生成せず、選択中回答者があれば`created_by`、なければNULLになる
- [ ] trim後非空の名前draft付きCandidate / Criterion追加は、名前確定後に解決したParticipantを`created_by`へ設定する
- [ ] Candidate / Criterionの`created_by`はNULLまたは同一event Participantだけを許可する
- [ ] Candidateカードに既存の`Candidate.created_at`を基準とする追加時刻が表示される
- [ ] Candidateのタイトル・URL・提案者・回答編集で`created_at`が変わらない
- [ ] Reaction / Concern / Commentは選択対象の同一event Participant名義で共同編集できる
- [ ] Commentの`participant_id`はNOT NULLかつParticipant削除時CASCADEである
- [ ] `UNIQUE(candidate_id, participant_id)`により1回答者・1候補・1コメントを保証する
- [ ] 空コメント保存はアプリ上DELETEとなり、空text行はDBに残らない
- [ ] 既存Slice 1 / 2 / 5 migrationを編集せず、新規migrationだけで変更している

### Supabase / RLS

- [ ] exposed schemaの対象テーブルでRLSが有効である
- [ ] anon roleの権限は必要なテーブル・列・関数だけに限定されている
- [ ] SELECTは有効なshare tokenまたはowner tokenに限定される
- [ ] 共同編集mutationは有効なshare tokenに限定される
- [ ] Event title / memo更新はowner tokenに限定される
- [ ] tokenなし、不正token、別event ID、同名重複、不変列更新がDBで拒否される
- [ ] security definer関数を使う場合、固定`search_path`、PUBLICからのEXECUTE剥奪、必要roleへの明示GRANTがある
- [ ] Supabase Auth、service role、local JSON fallbackを導入していない

---

## 3. 回答者セレクターDoD

- [ ] イベント詳細上部で選択中回答者が常に確認できる
- [ ] 既存行を選択してもParticipantは増えない
- [ ] 非IME Enter、モバイル完了、セレクター外blurで新規Participantが作成される
- [ ] IME変換中Enter、キー入力単位、debounce、タブ終了だけでは作成されない
- [ ] 名前入力だけでも確定契機でParticipantが作成される
- [ ] trim後完全一致名では同じ人か確認され、自動選択されない
- [ ] 同じ人を選ぶと既存行へ切り替わる
- [ ] 別人を選ぶと異なる名前の再入力を求め、同名行を作らない。保留操作は再入力の確定まで維持し、キャンセル時だけ破棄する
- [ ] 同時同名作成のunique競合でも同名確認へ復帰できる
- [ ] 名前変更は変更前後を示す1段階確認を経て、空・同名を拒否する
- [ ] 回答者削除は2段階確認を経る
- [ ] 回答者削除後、現在選択とlocalStorageが解除される
- [ ] 回答者選択は`kimenosuke:selected-participant:<event_id>`へParticipant IDだけを保存する
- [ ] share URLとowner URLが同じevent ID基準のlocalStorageキーを使う
- [ ] event単位localStorageが、現存する行だけを再選択し、不在時はキーを削除する
- [ ] 未選択時の個人名義操作は、選択成功後に一度だけ自動再開する
- [ ] 名前入力中の個人名義操作では、その操作起因の通常blur保存を抑止し、単一の名前確定処理がParticipant解決と元操作を直列実行する
- [ ] 名前確定の優先順位が「既存回答者の明示選択 → 明示操作 → 非IME Enter / モバイル完了 → 通常blur」で固定されている
- [ ] 既存回答者を選択中でも新しい名前draftがあれば、個人名義操作は旧選択行ではなくdraftを解決して実行する
- [ ] 名前draftがある状態のCandidate / Criterion追加は、Participant解決後に追加し、新Participantを`created_by`へ設定する
- [ ] 名前draftがある状態のEvent / Candidate / Criterion編集・削除等のDB mutationはParticipant解決後に実行し、非DB操作は妨げない
- [ ] 空またはtrim後空白だけのdraftはdraftなしとして扱い、選択中回答者がいればその行を維持する
- [ ] 既存回答者を明示選択した場合は名前draftを新規作成せず、その行で保留操作を一度だけ実行する
- [ ] 連打・複数eventでは最初の処理だけを受け付け、Participant作成と継続操作を各1回にする
- [ ] キャンセル・検証失敗・DB失敗時は名前draftを保持しつつ保留操作を破棄し、後から実行しない
- [ ] reload・tab close・外部遷移時にbeforeunload保存を行わない

---

## 4. 候補カード・共同編集DoD

- [ ] 候補追加フォームにお名前欄がない
- [ ] 回答者未選択かつ名前draftなしでもCandidate / CriterionをParticipant生成なしで追加・編集・削除できる
- [ ] 候補ごとに全回答者行が表示される
- [ ] 回答者行に、名前、評価、❤️、🌀、コメントが表示される
- [ ] 非選択回答者行は現在値の閲覧専用で、個人名義の編集controlを表示しない
- [ ] 非選択行を選んだ最初の操作では回答値を変更せず、選択中回答者だけを切り替える
- [ ] 選択中回答者行だけに○ / − / ×、❤️、🌀、コメントの編集controlが表示される
- [ ] 選択中回答者が全候補カードで同じように強調される
- [ ] 別回答者行を選ぶと、画面全体の選択中回答者が切り替わる
- [ ] 選択した回答者名義で○ / − / ×、❤️、🌀、コメントを共同編集できる
- [ ] コメントは1回答者・1候補につき現在値1件で、複数コメントや会話UIがない
- [ ] コメントは明示的な「保存」でのみ確定し、Enterは改行、blurは未保存である
- [ ] 保存失敗時に旧DB状態と入力ドラフトが保持される
- [ ] Candidate / Criterion削除は2段階確認、Participant削除も2段階確認である
- [ ] Candidate / Criterionは既存仕様の作成順を維持する

---

## 5. 評価・集約DoD

### 4状態とCandidate作成時刻

- [ ] 読取境界で全Candidate×全Participantの組み合わせを生成する
- [ ] 各セルが`unrated / positive / neutral / veto`のいずれかを必ず持つ
- [ ] UIがraw Vote行の有無や`null / undefined`を直接解釈しない
- [ ] 未評価と能動−が表示上区別される
- [ ] 選択済みの同じ○ / − / ×を再度押してもno-opで、server actionやDB mutationが発生しない
- [ ] 回答者ごとの評価時刻を保存・表示していない
- [ ] Candidateカードヘッダに、60分未満、1〜23時間、1日以上の作成時刻が仕様どおり表示される
- [ ] `Candidate.created_at`がクライアント時計より未来でも負の相対時刻を表示せず、「1時間以内に追加」へclampする
- [ ] 相対時刻表示のためにtimerやDB pollingを追加していない

### 3色ロジック

- [ ] `M=0`では全候補が通常表示になる
- [ ] ○最多・×なし候補が第1色になる
- [ ] ○最多・×あり候補が第2色になる
- [ ] ○最多同率で×有無が異なる場合、第1色と第2色へ分かれる
- [ ] 第1色が存在する場合、○最多未満の×なし候補に第3色を付けない
- [ ] 第1色が存在しない場合だけ、○1以上・×なし候補群の○最多へ第3色を付ける
- [ ] 各分類で同率候補をすべて同じ色にする
- [ ] 色付け対象外候補も非表示・ブラックアウトされない
- [ ] 色以外のラベルまたはアイコンで3状態を識別できる
- [ ] 確定ボタン、確定済み状態、ロックが存在しない

### ❤️・🌀

- [ ] 候補全体の❤️数がReaction行の単純合計である
- [ ] 同じ回答者が複数Criterionへ付けた❤️をそれぞれ1件として数える
- [ ] Criterionごとの❤️数も表示される
- [ ] 候補全体の🌀数がConcern行の単純合計である
- [ ] ❤️・🌀・コメントが3色判定へ混入しない

---

## 6. 状態同期・エラーDoD

- [ ] 初回表示でイベントの完全な読取モデルを取得する
- [ ] 各mutation成功後に完全な最新状態を取得して置換する
- [ ] mutation成功後の反映でページ再読み込み、redirect、router.refreshを使わない
- [ ] 別タブ・別ブラウザ・別端末へのRealtime同期を追加していない
- [ ] focus復帰fetchや定期pollingを追加していない
- [ ] last-write-winsで動作し、楽観ロックや履歴を追加していない
- [ ] mutation失敗時に成功状態を表示せず、再試行可能なエラーを出す
- [ ] 同時mutationの二重送信を防ぐ

---

## 7. UI・アクセシビリティDoD

- [ ] semantic tokenと状態の意味を固定した上で、CodexがコードベースのUI仮案を実装している
- [ ] トップ、未選択、選択済み、候補カード、同名確認、名前変更、回答者削除、3色状態を確認できる
- [ ] 375×812でページ全体の横overflowがない
- [ ] 1366×768で候補間・回答者間を比較しやすい
- [ ] デスクトップとモバイルで、非選択行は閲覧専用・選択行だけ編集可能という操作モデルが一致する
- [ ] モバイルで候補カード内情報が重ならず、操作対象が明確である
- [ ] モバイルの非選択行コメントは初期案3行clampで、専用の展開操作を追加せず、行選択後に全文を確認できる
- [ ] 375px実画面確認で2行／3行を調整しても、データ・操作仕様へ影響しない
- [ ] ボタン・入力・ダイアログに適切なaccessible nameがある
- [ ] 色だけで意味を伝えない
- [ ] 選択中回答者と編集対象が誤認されない
- [ ] 375×812 / 1366×768の実画面を人間確認し、色・状態ラベル・アイコン・Candidate追加時刻表示を調整している
- [ ] リリース前に確定した文言とdesignを`ui-copy-decisions.md`へ反映している

---

## 8. テストDoD

- [ ] [QAドキュメント](collaborative-response-row-qa-2026-07-11.md)の全必須シナリオが自動化または手動ゲート化されている
- [ ] Slice 1 / 2 / 5の回帰E2Eがgreenである
- [ ] 回答者セレクター、共同編集、Vote、3色ロジックの新規E2Eがgreenである
- [ ] anon clientによるRLS・DB負系テストがgreenである
- [ ] 同名同時作成、別event参照、cascade、unique、列不変を検証している
- [ ] 375×812と1366×768のスクリーンショットを目視確認している
- [ ] E2E作成データへ`[E2E]`マーカーが付く
- [ ] E2Eデータは自動削除せず、承認済みcleanup手順で後処理する
- [ ] `npm run check`がPASS
- [ ] `npm run build`がPASS
- [ ] `npm run test:e2e`がFAIL 0
- [ ] Slice 5を含む新規対象テストに意図しないskipがない
- [ ] `git diff --check`がPASS

---

## 9. Migration・実DBゲートDoD

- [ ] 適用済みmigrationを編集していない
- [ ] 新規migrationはSupabase CLIの`migration new`で作成している
- [ ] cleanup前に対象行数・対象ID・依存件数を記録している
- [ ] cleanup SQLはトランザクション、preflight、rollback確認、commit承認を分離している
- [ ] Event全削除の明示確認後にだけmigrationを適用する
- [ ] migration内のEvent 0件ガードが、残存データがある場合に停止する
- [ ] migration後に列、制約、FK delete action、index、RLS、policy、GRANT、functionを確認している
- [ ] 実DB E2Eはmigration適用確認後にだけ実行する
- [ ] 失敗時に既存migration編集、逆migration、追加修正を勝手に行わず停止する

---

## 10. Commit・Push・本番DoD

- [ ] docs正本反映を実装と別commitにする
- [ ] 実装・migration・E2Eのcommit境界が事前計画どおりである
- [ ] commit前に全検証結果と変更ファイルを報告し、承認を得る
- [ ] push前にbranch、upstream、ahead/behind、clean statusを確認する
- [ ] 明示承認なしにpushしない
- [ ] force push、amend、rebase、既存migration改変を行わない
- [ ] Vercel反映後に独自ドメインで主要フローを人間確認する
- [ ] 実DBの`[E2E]`データを承認済み手順でcleanupし、最終件数を確認する
