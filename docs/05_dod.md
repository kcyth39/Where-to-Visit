# 05 DoD（きめのすけ）

作成日: 2026-07-08 / 最終改訂: 2026-07-13 / フェーズ: Phase 2（品質定義）

関連: [03_requirements.md](03_requirements.md) / [04_data-model.md](04_data-model.md) / [06_qa-flow.md](06_qa-flow.md) / [ADR-0006](adr/0006-collaborative-response-row-model.md) / [ADR-0007](adr/0007-event-views-and-criterion-feedback.md) / [ADR-0008](adr/0008-local-supabase-development-workflow.md) / [共同編集型・回答者行モデル 詳細DoD](reports/collaborative-response-row-dod-2026-07-11.md) / [Local DB開発リファレンス](reports/supabase-cli-docker-development-reference-2026-07-12.md)

> ADR-0006移行の詳細チェック項目は上記詳細DoDを正とする。本書はリリース判断に必要な要約ゲートである。

---

## 1. 文書・スコープ

- [x] ADR-0006 / ADR-0007 / ADR-0008と`03`〜`06`、AGENTS.md / CLAUDE.mdが同期している
- [x] 旧Slice 2 / 5文書のguest_token本人モデルへ部分SUPERSEDED注記がある
- [x] 「Vote行なし＝−」「未評価と能動−を区別しない」「owner_participant_idでowner判定」という生きた正本記述がない
- [x] 「Candidate単位の常設単一🌀」「Event詳細1画面へ全機能を配置」「可視の3状態説明ラベル」という生きた正本記述がない
- [x] 既存適用済みmigrationを編集していない
- [x] Supabase Auth、service role、local JSON fallback、依存更新を追加していない

## 2. Owner・Participant

- [x] Event作成時にParticipantを生成しない
- [x] owner権限を`owner_token`だけで判定し、Event path限定HttpOnly Cookieで回復・保持できる
- [x] `events.owner_participant_id`と`participants.guest_token`を撤去している
- [x] Participantはtrim後1〜60文字・Event内完全一致名禁止・`created_at ASC, id ASC`である
- [x] 既存行選択、非IME Enter、モバイル完了、通常blur、同名確認、名前変更、2段階削除が要件どおり動く
- [x] 単一の名前確定処理と優先順位により、明示操作起因blur・連打・失敗後の保留操作を二重実行しない
- [x] `kimenosuke:selected-participant:<event_id>`をshare / owner URLで共用し、不在行を自動解除する

## 3. Data・RLS

- [x] `votes`が`text + CHECK(positive / neutral / veto)`、Candidate×Participant一意、timestamp列なしで作成されている
- [x] CommentがCandidate×Participant一意、Participant NOT NULL・ON DELETE CASCADEである
- [x] ConcernがCandidate×Participant×Criterion一意で、3参照の同一Event整合性とCriterion削除cascadeを持つ
- [x] Participant削除でVote / Reaction / Concern / Commentをcascadeし、Candidate / Criterion `created_by`をNULLにする
- [x] Candidate / Participant / Criterionの同一Event整合性をDBで保証する
- [x] exposed tableのRLS、列単位GRANT、security definer関数の固定`search_path`とEXECUTE制限がある
- [x] tokenなし、不正token、別Event ID、同名、重複、不変列更新をDBで拒否する

## 4. 画面・UI・読取モデル

- [x] トップにはEvent内の候補一覧リンクとイベント一覧を表示せず、将来イベント一覧を追加できる余地だけを残している
- [x] オーナー初期セットアップに、確定コピーの2ステップ、お名前、Candidate追加が順番どおり表示され、開始後の候補一覧ダッシュボードに2種類のURLが表示される
- [x] owner URLでの再訪は回答者未選択でも候補一覧を表示し、初期セットアップを再表示しない。個人名義操作時だけ名前選択へ進む
- [x] 初期セットアップ完了フラグをDBへ追加せず、reload・再訪では候補一覧を表示する
- [x] ゲスト未選択時は名前選択だけを表示し、既存名の直下に直接入力があり、確定後に候補一覧へ進む
- [x] 有効なselected participantで再訪した場合は候補一覧ダッシュボードを直接表示する
- [x] 候補一覧ダッシュボードにきめること・つたえておきたいこととCandidate集約を表示し、回答者別編集controlと判断基準編集を展開していない
- [x] 候補編集画面に全回答者行と判断基準を表示し、非選択行はread-only、選択行だけ編集可能である
- [x] Candidate×Participantを`unrated / positive / neutral / veto`へ必ず正規化し、raw row absenceをcomponentが解釈しない
- [x] Vote行なしと能動−を表示でも区別する
- [x] 候補一覧の`➖`件数がneutral Vote行数であり、unratedを含まない
- [x] Commentは1回答者・1Candidateにつき現在値1件で、会話・履歴UIがない
- [x] ❤️ / 🌀はCandidate×Participant×Criterionごとの独立状態で、同じ基準へ両方付けられる
- [x] Candidate単位の常設単一🌀がなく、Candidate全体の❤️はReaction行数、🌀はCriterion別Concern行数を単純合計し、最終候補状態へ使わない
- [x] `Candidate.created_at`だけを相対表示し、未来時刻は経過0へclampして「1時間以内に追加」とする
- [x] Vote / Reaction / Concern / Commentの時刻をユーザー表示せず、相対表示用timer・pollingを追加していない

## 5. 最終候補状態

- [x] `clear / discussion / fallback / none`をpure functionまたは読取モデル境界で一意に算出する
- [x] clearがある場合、○最多未満の×なし候補をfallbackにしない
- [x] clearがなく、○最多に×があり、○最多未満に×なし候補がある場合だけ安全候補群の○最多をfallbackにする
- [x] 同率は並列、○最多同率の×なし / ×ありはclear / discussionへ分ける
- [x] 全候補○0はnone
- [x] 可視の状態説明ラベルを表示せず、控えめなsemantic color、支援技術向け状態名、常時表示する`⭕️ / ➖ / ❌`の実数で補完する
- [x] 全候補を常時表示する
- [x] 確定ボタン、確定状態、ロックを追加していない

## 6. 同期・失敗

- [x] 初期表示とローカルmutation成功後に完全EventStateを取得する
- [x] 成功時はページ再読み込みなしで置換し、失敗時は直前状態・入力draft・エラーを保持する
- [x] 別タブ・別ブラウザの変更は次のローカル成功操作または手動再読み込み・再訪で取り込む
- [x] Realtime、定期polling、focus復帰時の自動取得を追加していない

## 7. QA・リリース

- [x] Supabase CLIが`2.109.1`へ固定され、使用するlocal subcommand / flagを固定版の`--help`で確認している
- [x] `supabase:start`と`supabase:db:reset`がDocker create前後の二重検査で全公開portを`127.0.0.1`へ限定し、network外container・想定外port・DB create未観測をfail-closedで拒否する
- [x] `.env.supabase.local` / `.env.supabase.remote`とtracked `config/supabase-targets.json`を照合し、target不明・URL不一致・key不足で子processを起動しない
- [x] `dev:local` / `dev:remote`と`test:e2e:local` / `test:e2e:remote`が接続先を分離し、Playwrightが`reuseExistingServer: false`でtest runnerと新規serverへ同じprofileを渡す
- [x] 既存migrationのSHA-256が基準値と一致し、新規migrationをCLIで生成している
- [x] 新規migrationをlocalへ増分適用し、schema / RLS / policy / GRANT / function / trigger / FK / index / 負系 / advisorをpostflightしている
- [x] localデータ破棄を確認後、`npm run supabase:db:reset`で全履歴を空DBから再現し、同じpostflightを再実行している。生のCLI resetを使用していない
- [x] `npm run test:e2e:local`がgreenで、総数・PASS・FAIL・SKIP、skip名と理由を記録している
- [x] `npm run check`、`npm run build`、`git diff --check`がPASS
- [x] 新規pure unit、DB/RLS負系、375×812 / 1366×768 E2Eがgreen
- [x] Slice 1 / 2 / 5回帰がgreenで、意図しないskipがない
- [x] migration前remote cleanup discovery（対象0件のためROLLBACK／COMMIT skip）、advisor訂正migration、本筋migration、`npm run test:e2e:remote`をそれぞれ別承認で行い、各migrationのremote postflightとremote E2Eがgreen
- [x] remote適用を人間のSQL Editor全文実行に限定し、CLI remote接続・`db push`・history repairを行っていない
- [x] コードベースワイヤーフレームと実画面を人間確認し、exact color・評価chip・追加時刻コピーを承認
- [x] remote／Productionで生成済みの`[E2E]`データを、承認済みSQLでcleanup済み。今後のQAで新たに生成される`[E2E]`データは通常のcleanup手順で都度後処理する
- [x] commit / push / Vercel本番確認をそれぞれ明示承認ゲートで行う

## 8. MVP共通

- [x] 375pxとデスクトップで表示崩れ・横overflow・重なりなし
- [x] エラー時にユーザー向けメッセージを表示し、白画面にならない
- [x] `noindex` metadataと`robots.txt`を維持する
- [x] オーナー編集URLでCookie消失・別ブラウザから権限回復できる
- [ ] 利用規約・プライバシーポリシー・広告・計測は各対象スライスのリリースDoDで確認する
