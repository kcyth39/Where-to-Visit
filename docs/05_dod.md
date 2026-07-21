# 05 DoD（きめのすけ）

作成日: 2026-07-08 / 最終改訂: 2026-07-21 / フェーズ: Phase 2（品質定義）

関連: [03_requirements.md](03_requirements.md) / [04_data-model.md](04_data-model.md) / [06_qa-flow.md](06_qa-flow.md) / [ADR-0006](adr/0006-collaborative-response-row-model.md) / [ADR-0007](adr/0007-event-views-and-criterion-feedback.md) / [ADR-0008](adr/0008-local-supabase-development-workflow.md) / [共同編集型・回答者行モデル 詳細DoD](reports/collaborative-response-row-dod-2026-07-11.md) / [ブランドヘッダー刷新DoD](reports/brand-header-refresh-dod-2026-07-16.md) / [Local DB開発リファレンス](reports/supabase-cli-docker-development-reference-2026-07-12.md)

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

- [x] Candidate URLはraw入力のU+0000〜U+001FおよびU+007Fを位置を問わずtrim前に拒否し、その後`new URL(value).href`へ正規化して保存し、非NULL時はHTTP(S)絶対URL・正規化後UTF-8 4096 bytes以下・credentialなしである
- [x] Candidate追加とURL更新が同じserver検証を使い、拒否時はDB mutationを行わず入力draftと直前状態を保持する
- [x] DBが直接INSERT / UPDATEされたCandidate URLにもscheme・authority・credential・保存値中の制御文字・UTF-8 byte length制約を強制し、既存適用済みmigrationを変更していない
- [x] 正常なHTTP(S)、NULL URL、title-only Candidateと、`javascript:` / `data:` / その他scheme、相対URL、protocol-relative URL、不正URL、空host、credential、raw入力の先頭・末尾・内部にある制御文字、4097 bytes以上の負系がlocal testでgreenである
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
- [x] オーナー初期セットアップでお名前からCandidate入力へ移っても入力を妨げず、回答者確定後もCandidate draftを保持し、Candidate追加成功時だけ入力欄をクリアする
- [x] owner URLでの再訪は回答者未選択でも候補一覧を表示し、初期セットアップを再表示しない。個人名義操作時だけ名前選択へ進む
- [x] 初期セットアップ完了フラグをDBへ追加せず、reload・再訪では候補一覧を表示する
- [x] ゲスト未選択時は名前選択だけを表示し、既存名の直下に直接入力があり、確定後に候補一覧へ進む
- [x] 有効なselected participantで再訪した場合は候補一覧ダッシュボードを直接表示する
- [x] 候補一覧ダッシュボードにきめること・つたえておきたいこととCandidate集約を表示し、回答者別編集controlと❤️／🌀反応項目編集を展開していない
- [x] 候補編集画面の上部で選択中回答者の○ / − / ×、判断基準別❤️ / 🌀、コメントを操作でき、サマリーと同じcontrol表現である
- [x] コメント入力欄が評価controlの下かつ候補タイル内にあり、候補内容・評価・コメントが同じ視覚的まとまりである
- [x] 「みんなの判断」の全回答者行がread-onlyで、コメント全文を表示し、行clickや行内編集controlを持たない
- [x] 候補内容の編集・❤️／🌀反応項目の編集・判断者名の変更／削除が「みんなの判断」の下にあり、候補内容だけをインライン表示し、残る2つはmodalで表示する。候補削除・回答者削除は対応するmenu内だけにある
- [x] 候補内容の編集は＋／−付きの開閉UIとしてmodal導線と区別し、modal導線2件はデスクトップで同一行・文言改行なし、モバイルで横幅不足時だけボタン単位・文言とも折り返せる
- [x] 反応項目編集modalでは既存項目一覧の下に追加buttonがあり、判断者名の変更／削除modalでは現在名を直接編集でき、変更・キャンセルの右端に削除buttonがある
- [x] 判断者削除の確認中は名前input・変更・削除を隠し、各確認段階に「消す」「キャンセル」だけを表示する
- [x] サマリーの反応入力から控えめな「反応項目の追加」で、候補編集と共通の❤️／🌀反応項目編集modalへ進める
- [x] Candidate×Participantを`unrated / positive / neutral / veto`へ必ず正規化し、raw row absenceをcomponentが解釈しない
- [x] Vote行なしと能動−を表示でも区別する
- [x] 候補一覧の`➖`件数がneutral Vote行数であり、unratedを含まない
- [x] Commentは1回答者・1Candidateにつき現在値1件で、会話・履歴UIがない
- [x] ❤️ / 🌀はCandidate×Participant×Criterionごとの独立状態で、同じ基準へ両方付けられる
- [x] Candidate単位の常設単一🌀がなく、Candidate全体の❤️はReaction行数、🌀はCriterion別Concern行数を単純合計し、最終候補状態へ使わない
- [x] `Candidate.created_at`だけを相対表示し、未来時刻は経過0へclampして「1時間以内に追加」とする
- [x] Vote / Reaction / Concern / Commentの時刻をユーザー表示せず、相対表示用timer・pollingを追加していない
- [x] B-1/B-2の戻り導線と操作可能サマリー表を`main`へ統合し、local E2E・Production browser QA（owner/share、主要mutation、1366×768・375×812、browser error 0）・物理モバイル端末確認・本番アプリデータcleanupを完了した

### 4.1 B-3 ブランドヘッダー刷新（実装・正式受入済み）

- [x] トップとEventの5 view modeが、タグライン・ブランドリンク・常設右スロットの共通DOM契約を用いる
- [x] 1366×768・375×812・320 CSS pxで、タグラインは上段左、ナビは上段右、ブランドは下段中央の全文表示を維持し、200% resizeの手動確認もPASSした
- [x] root metadata titleがサイト全体で`きめのすけ | Clarity Before Choice`となり、description・noindex・robotsを維持する
- [x] [B-3詳細DoD](reports/brand-header-refresh-dod-2026-07-16.md)の実装・QA・Production受入項目を満たす

### 4.2 owner-sessionナビゲーション安全対策（実装・local／remote受入・Production成功経路受入済み）

- [x] owner-session pending中は「候補一覧」とCandidate名の表示・配置・classを維持し、`href`と暗黙のlink roleを出さず、`aria-disabled="true"`のfocus可能な状態でclick・Enter・中クリック・別タブ操作による遷移を防ぐ。Spaceはlink activationを起こさず、標準scrollを許容する
- [x] owner-session success後だけ正しい共有画面／Candidate detailの`href`と通常操作を復元し、owner Cookieとowner権限を維持する
- [x] owner-session failure時はエラーを表示し、owner Cookieを作らずfail-closedを維持して自動retryしない。再読み込みまたはowner URLの再オープンでのみ再試行するため、新しいretry UIを追加していない
- [x] owner tokenを持たない共有閲覧は最初から通常リンクで、dashboardの右ナビ非表示を維持する。Candidate名はowner-session未確立時に加えて既存の対象mutation pending中も無効化する

> **証拠区分:** pending／success／failure、`href`・link role・`aria-disabled`・focus、click・Enter・中クリック、Cookie・owner権限、Candidate detailで保留したVoteの1回だけの再開はlocal／remote E2Eで確認した。Spaceの非activationと標準scroll、自動retryなし、再読み込み／owner URL再オープンによる再試行は、確定契約と実装の静的照合で確認した。Productionではsuccess後のowner setup遷移、owner Cookie・owner権限、「直す」、share側の非owner境界を確認した。pending／failureはProductionで人工再現していない。

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
- [x] S1-aはlocal incremental migration、clean-chain replay、pgTAP 24/24、local／remote E2E、remote fixture cleanup、PR #5 merge、Production deployment一致確認、Production focused smokeを完了した
- [x] S1-aの固定Production fixture 1件をCOMMIT 1回で永久削除し、固定UUID残存0件、`[E2E]%`残存0件のSELECT-only postcheck 2件をretry 0で完了した。cleanup COMMITは再実行しない
- [x] remote適用を人間のSQL Editor全文実行に限定し、CLI remote接続・`db push`・history repairを行っていない
- [x] コードベースワイヤーフレームと実画面を人間確認し、exact color・評価chip・追加時刻コピーを承認
- [x] remote／Productionで生成済みの`[E2E]`データを、承認済みSQLでcleanup済み。今後のQAで新たに生成される`[E2E]`データは通常のcleanup手順で都度後処理する
- [x] Git publicationを含む承認済みExecution Contractでは、標準実装担当がcommit、作業branch push、Draft PR作成・更新、DoD後Ready化まで行い、Reviewerがexact Headを判定し、Humanだけがmergeする。Vercel Production確認、E2E cleanup、未merge PR close、remote branch削除は別gateとする
- [x] 標準実装担当がmerge後closeoutを提案し、Humanが共有branchの利用終了を明示してremote branchを削除する。remote不在確認後、安全条件を満たす自身のtask-owned worktreeとlocal branchだけを標準実装担当が通常削除し、不成立時は保持して報告する

## 8. MVP共通

- [x] 375pxとデスクトップで表示崩れ・横overflow・重なりなし
- [x] エラー時にユーザー向けメッセージを表示し、白画面にならない
- [x] `noindex` metadataと`robots.txt`を維持する
- [x] オーナー編集URLでCookie消失・別ブラウザから権限回復できる
- [ ] 利用規約・プライバシーポリシー・広告・計測は各対象スライスのリリースDoDで確認する

## 9. 開発遂行共通DoD

### 9.1 共通遂行原則

| ID | 客観的完了条件 |
|---|---|
| WP-01 | 着手前に正本、証拠、前提、曖昧さ、複数解釈、重要なtrade-offを確認し、意味・scope・riskの不明点が残る場合は停止している |
| WP-02 | より単純な方法を検討し、Goal、Scope、DoDを満たす必要十分な成果物へ限定している |
| WP-03 | 未依頼の機能、記述、抽象化、柔軟性、設定、将来対応、例外規則を追加していない |
| WP-04 | 承認scopeに必要なpath、行、節だけを変更し、既存の用語、style、構造へ合わせている |
| WP-05 | scope外問題は報告に留め、自身の変更が生じさせた参照切れや不要物だけを承認scope内で解消している |
| WP-06 | 各変更行・変更節をGoal、要件、DoDへ追跡できる |
| WP-07 | 採用するteam ruleが外部URLだけに依存せず、local正本で意味を確認できる |

### 9.2 Human gate

| ID | 客観的完了条件 |
|---|---|
| HG-01 | Humanの操作または承認が必要になった時点で該当する実行を停止している |
| HG-02 | 停止時に、Human判断が必要な理由、選択肢と各影響、必要な操作、実行後に起きること、停止条件と再開条件を説明している |
| HG-03 | おしげさんが判断・実行できる日本語を使い、必要な識別子・技術用語へ短い意味説明を添えている |
| HG-04 | 方針承認、計画承認、実行承認、Git publication、Production操作を相互に拡張せず、各gateの承認状態を分けている |

### 9.3 Execution Contract

| ID | 客観的完了条件 |
|---|---|
| EC-01 | Humanが`draft-execution-contract`を明示指定するか、agentの利用提案を明示承認した場合だけSkillを発動している |
| EC-02 | STOP RULEにより契約生成を停止する場合を除き、Goal、Scope、前提条件、参照先、禁止事項、DoD、STOP RULES、ESCAPE HATCH、Human判断事項の9項目がある。生成停止時はpartial contractを作らず停止理由を報告している |
| EC-03 | Scopeに計画策定scope、実行scope、実行role、許可成果物・変更種別、対象外、付随操作、許可されないrole・操作・成果物があり、role名からpermissionを推定していない |
| EC-04 | Skill発動、契約採用・plan作成許可、planに基づく実装開始が別gateであり、実行agentがread-only確認後にplan draftを提示して停止している |
| EC-05 | chat出力ではfile変更がなく、Markdown出力ではHumanが承認したexact pathだけを安全に作成・更新している。現在のtracked／untracked状態、将来のGit追跡候補とするか、Git publication scopeを区別し、Markdown作成・追跡候補の指定をstage権限へ拡張していない |
| EC-06 | Humanが採用したexact版が一意である。chatは全文引用、contract ID／digest、または直前の全文を指す明示、Markdownはexact pathとcommit SHA／file hash等で識別し、採用後の変更時は再採用までplan作成を停止している |
| EC-07 | 詳細手順を過剰固定せず、既存正本で必須の手順と、実行agentがplanで提案する方法を区別している |
| EC-08 | Git publicationを含む場合、Reviewerが採用済み契約とexact Headを照合できる証拠の引渡し条件がある |
| EC-09 | 独立助言はHumanへ提示できる任意選択肢で、自動起動、承認者・実装担当への昇格、必須化をしていない |
| EC-10 | Production DB操作を目的とする契約を生成せず、現行Supabase正本と`operate-supabase-live-db`へ案内している |
