# 開発・事業活動 Roadmap（CURRENT ROADMAP／2026-07-17起点）

## 0. 位置づけ

本書は、2026-07-17時点の計画を起点として、一般公開（ローンチ）までの開発・事業活動と現在地を管理する **CURRENT ROADMAP** である。各仕様、ADR、QA、デザインの正本を置き換えず、それらに基づいて「何を、どの順で進めるか」と、横断作業の現在地を示す。

- 直近マイルストーン: **一般公開（ローンチ）前の必須項目を先に固める**。noindex解除・集客開始の判断は、必須項目（本書「公開ゲート」）を満たしてから行う。
- 現在の状態: Track A（PR #1〜3アプリ実装baseline `95996e4` のcloseout）は完了。戻り導線・ダッシュボードサマリー（07-15）、ブランドヘッダーB-3（07-16）も反映済み。C-P1-01はS1-aとしてcloseoutし、残る開発上のP1ブロッカーは**C-P1-02の1件**である。
- 本書は前身 `development-and-business-activity-plan-2026-07-14.md` の後継であり、07-14で「フェーズB（戻り導線・サマリー・ロゴ）」としていた項目は既に完了している。近視点をローンチ準備へ更新する。
- 内容責任は、優先順位と事業上の状態をHuman（おしげさん）、個別項目の意味を各domain ownerが持つ。PKAは配置、参照、状態表示、更新経路、重複・陳腐化のlifecycleを管理し、意味や優先順位を独自に変更しない。
- 更新契機は、関連PRのmerge／closeout、Humanの承認・優先度判断、baseline、作業状態または次のgateの変更である。更新時は確認日時と証拠を更新する。

> 本書はCURRENT ROADMAPであり、Execution Contractでも実行許可でもない。個別作業は、Tech Leadが作成するExecution ContractまたはHumanが承認した同等の実行契約に従う。スコープ厳守・停止条件・DB操作の承認gateはKnowledge入口（`docs/README.md`）から現行正本を参照する。

> **S1-a closeout（2026-07-19）:** C-P1-01は実装、local incremental migration、clean-chain replay、pgTAP 24/24、local／remote E2E、remote fixture cleanup、PR #5 merge、Vercel Production deployment一致確認、Production focused smoke、Production fixture cleanup／postcheckまで完了した。過去時点を固定した残課題レポートCは書き換えず、本書の現行トラッカーで完了を管理する。

確認baseline: PR #11 merge後の`main` `4ebda6bba2e24c3f6d0e24b83026a1d967a745bc`（2026-07-21確認）。

---

## 1. 現在地サマリー

| 区分 | 状態 |
|---|---|
| 中核機能（ADR-0006/0007） | 実装・DB・UI・E2Eまで完了。戻り導線／サマリー／B-3ブランドヘッダーも反映済み |
| Track A（baseline `95996e4` closeout） | 完了（正式local gate・Production受入・200% resize・local/Production cleanup・正本同期） |
| 未完了P1（公開拡大前の必須） | **1件** — C-P1-02 Event＋デフォルトCriterionの原子的作成。C-P1-01はS1-aとしてcloseout完了 |
| P2（ローンチ品質・安全・運用） | 8件 |
| P3（保守性・将来拡張） | 3件 |
| 07-17メモの新規機能 | 候補の複数ペースト入力＋URL→タイトル自動振り分け、Maps API／食べログ検証は**Cに未登録の新規開発**。設計から起こす |
| 依存警告 | Next経由PostCSS `GHSA-qx2v-qp2m-jg93`（moderate）。破壊的downgradeを避け保留継続 |
| PKA改善活動 | Slice 1、1b、1c、2a、2bはPR #7〜#11でmerge済みで、PR #8〜#11はtask-local closeoutまで完了。H-08の`d957938`を内容入力commitとしてSlice 2cで正本化する。実装・publicationのcurrent stateは下記固定PR URL、mainへの発効はGitHubのmerge状態を正とする |

「中核機能実装済み」と「MVPローンチ準備完了」は別物として扱う（C-P2-08）。本書はこの差分を埋める計画である。

---

## 2. 公開ゲート（ローンチ前の必須項目）

一般公開＝noindex解除・検索登録・集客開始の**前提条件**を、ここで明示的に固定する。これらが揃うまでは「中核機能は動くが未公開」の状態を維持する。ゲートは3系統に分ける。

### G-1. データ安全・悪用対策（開発ブロッカー）

| 項目 | 出典 | 必須理由 |
|---|---|---|
| Candidate URLをHTTP(S)絶対URLへ制限（scheme allowlist・最大長・credential拒否をserver/DBで強制） | C-P1-01／S1-a（完了） | 登録不要・共有編集のため、`javascript:`等の危険schemeや不正リンクを保存させない安全契約が公開の前提。Production受入・fixture cleanupまで完了 |
| Event＋デフォルトCriterionの原子的作成（RPC/transaction化、失敗時は両方0件） | C-P1-02 | 部分失敗でアクセス手段のないorphan Eventが残るのを防ぐ |
| originをtrusted production originへ固定（Host header poisoning対策） | C-P2-04 | 誤ったshare/owner URL生成・token漏れ経路を塞ぐ |
| abuse・security header方針（rate limit／異常作成の観測・alert／CSP・Referrer-Policy・frame制御／token・owner URLをlog/analyticsへ残さない制御） | C-P2-07 | 公開後のスパム・大量書込み・スクレイピングへの最低限の耐性。**メモの「セキュリティ・スパム対策」に対応** |

### G-2. ローンチ準備（法務・運用・SEO）

| 項目 | 出典 | 内容 |
|---|---|---|
| ドメイン登録完了・SSL・独自ドメイン接続の最終確認 | メモ／`docs/00_master-plan.md` Phase 4 | `kimenosuke.com`稼働は確認済み。登録・更新・SSL状態を最終点検。本ロードマップではフェーズ2に配置 |
| 利用規約・プライバシーポリシー・外部URL免責 | `docs/00_master-plan.md` Phase 4 | 投稿コンテンツの扱い、Cookie/token、解析ツール明記。事業上の意味はClaudeが整理し、Humanが判断する。最終は専門家確認推奨。本ロードマップではフェーズ2に配置 |
| アクセス解析・エラー監視・問い合わせ窓口 | `docs/00_master-plan.md` Phase 4 | プライバシーポリシーと整合。KPIベースライン取得の前提でもある。本ロードマップではフェーズ2に配置 |
| トップページ「参加中のきめのすけイベント」一覧（マイイベント一覧・Cookie） | メモ／C-P2-08 | ドメインさえ知っていればURL再確認不要で参加中イベントへ戻れる設計。**UX上の公開品質に直結** |
| noindex解除・検索登録（Google Search Console）の判断 | メモ／C-P2-08 | 上記が揃ってからnoindex解除→検索登録。集客・広告開始時期と整合させる |
| `docs/07_launch-checklist.md` の作成 | `docs/00_master-plan.md` Phase 4／C-P2-08 | master planのPhase 4由来。本ロードマップではフェーズ2に配置し、開始判定チェックリストを正本化 |

### G-3. 開発運用の足場（並行・低リスク）

| 項目 | 出典 | 内容 |
|---|---|---|
| DBを安全に操作する手段の確立 | 2026-07-17メモ／ADR-0008／`operate-supabase-live-db` Skill | localはrepository wrapper、remote／Production writeは人間のSQL Editorで実行するcleanup手順、承認境界、証跡、同一fixed scopeのwrite artifact再利用・write再実行禁止を実運用で確立 |
| Git・GitHub publication／closeout運用 | C-P3-03／`docs/06_qa-flow.md` §1.1 | 標準publicationとtask-owned worktree／local branchの通常closeoutは導入済み。既存legacy branch／worktreeは通常flowへ混ぜず個別判断する |

> 判断ポイント: **広告実装・Google広告（AdSense）手続き**はメモに含まれるが、公開ゲートには**入れない**。スパム/セキュリティ（G-1）とKPIベースライン（アクセス解析）が揃ってからの後段とする（既存方針の維持）。ただし「計画策定」と「着手可能部分の切り分け」は先行してよい（フェーズ5）。

---

## 3. 統合ロードマップ（時系列）

各フェーズは前フェーズの本番反映・実機確認をもって次へ進む。フェーズ0はリスクが低く独立しているため即着手・並行可。

### フェーズ0：足場づくり（即着手・並行）

DB安全操作手順の確立（S0-a）は完了した。実装担当はdiscovery・証跡準備・SQL下書き・結果評価を支援し、local cleanupはrepository wrapper経由で実行できる。remote／Production writeはHumanが確認済みSupabase SQL Editorで実行し、Codexは本番DBへ直接writeしない。過去にCOMMIT済みのfixed scopeを新しいcleanupやwrite実行へ再利用せず、ROLLBACK／COMMIT SQLとCOMMIT authorizationは再実行しない。保存済みmanifestからのSELECT-only postcheckは、診断目的で再生成・再実行できる。将来生成される`[E2E]`データはfresh discoveryから新しいscopeを固定し、ROLLBACK検証と別承認を経て通常cleanupする。Git／GitHubの標準publicationとtask-owned worktree／local branchの通常closeout（S0-b／C-P3-03）はPR #8、#9で導入済みである。導入前から残るlegacy branch／worktreeは自動cleanup対象にせず、ownership、未保存変更、残作業を個別確認する。

### フェーズ1：データ安全・悪用対策（公開ブロッカー・最優先）

C-P1-01（S1-a URL契約）はProduction受入・fixture cleanupまで完了した。次の公開ブロッカーはC-P1-02（S1-b 原子的Event作成）であり、最初のスライスを**正本契約の確定**に限定する。Eventとdefault Criterionを同一transactionで作る境界、RPCの入力・返却値、default Criterionの初期値・順序、owner／share tokenの生成・返却境界、`SECURITY INVOKER`／`SECURITY DEFINER`の選択理由、anon／RLSで必要な最小権限、RLSを迂回するかとその厳密な範囲、権限なし・不正入力・内部失敗時の負系test、成功時1件＋1件／失敗時0件＋0件、UI draft・エラー保持、既存owner／share／Participant契約の非変更、local／remote／ProductionのDB承認境界を一意化する。`SECURITY DEFINER`を採用する場合はschema明示・固定`search_path`・`PUBLIC`からのEXECUTE revoke・`anon`への最小GRANT・想定外table／functionへアクセスできないこと・RLS迂回範囲の負系testを必須とし、権限エラー回避だけを理由に採用しない。方式は正本で比較・選択して人間承認を得た後、S1-b単独で実装・DB検証・Production closeoutする。

S1-cはS1-bへ同梱せず、canonical origin／Host poisoning対策、security headers／token非記録、rate limit／abuse観測・alertの3領域へ実装前に分割し、それぞれ別設計・別承認のスライスとして扱う。

### フェーズ2：ローンチ準備（公開ゲート仕上げ）

トップページのマイイベント一覧（C-P2-08）を実装。法務3点（規約・プライバシー・外部URL免責）、アクセス解析、エラー監視、問い合わせ窓口を整備。`07_launch-checklist.md`を作成し、noindex解除→検索登録（Search Console）の判断をチェックリストで固める。**ここまでが「一般公開可」の到達点**。

### フェーズ3：入力体験の強化（公開後でも可・体験の核）

フェーズ2の公開ゲート完了後に着手する。候補入力欄を複数ペースト対応のテキストボックス化し、貼り付けた行をURL／タイトルへ自動振り分ける。Google Maps URLからのタイトル取得（Places API等）と、食べログ等の外部サイトURLの実用性を検証・連携する。§4に設計論点を分離し、入力体験強化によって公開ゲートを遅らせない。

### フェーズ4：品質・運用の底上げ

CI/lint/coverage導入（C-P2-05）、cross-browser/a11y回帰の拡充（C-P2-06）、data-model型・UI copy・入力長契約の整理（C-P2-01/02/03）、性能budget定義と実機計測（C-P3-01、メモの「レスポンス改善」）、`EventApp.tsx`の責務分割（C-P3-02）。公開後に継続的に回す品質スライス群。

### フェーズ5：事業化・グロース

広告宣伝・マーケティングプランの再整理と段階実行、広告実装（計画策定→着手可能部分の切り分け）、Google広告（AdSense）手続きの確認・実施、KPIダッシュボード設計（**ゲスト関連機能が一通り完了後に着手**）。プレミアム（広告なし＋AI解説、Anthropic API従量課金）は、無料版で「×解消フローが使われているか」を計測してから判断。

---

## 4. 新規機能の設計論点（フェーズ3）

メモの機能項目はCに未登録のため、実装前に設計・正本反映が必要。現時点の開いた論点を記録する（**要確認**は着手時に確定）。

### 4-1. 候補の複数ペースト入力＋URL→タイトル自動振り分け

- 入力欄を単一candidate用から複数行テキストボックスへ変更。1行＝1候補として分解し、行がURLか判定して`url`列、それ以外を`title`列へ振り分ける。
- **要確認**: URLとタイトルが同一行に混在する場合の扱い（例「新宿の店 https://…」）。行内でURLを抽出しタイトルを残すか、行単位で二択にするか。
- **要確認**: 既存のcandidate作成フロー・上限（C-P2-03の入力長契約）・DESIGNとの整合。C-P1-01のURL検証を必ず通す。
- 依存: フェーズ1のURL契約が先に固まっていること。

### 4-2. URLからのタイトル自動取得

- **Google Maps**: Places API（Place Details）で名称取得が定石。URL形式（`maps.app.goo.gl`短縮、`/maps/place/…`、座標付き等）ごとにplace_id解決が必要で、**要確認**（短縮URLの解決可否、API課金・キー管理）。
- **食べログ等の一般サイト**: 公式APIがなく、OGP/`<title>`取得はサイトのToS・スクレイピング制限に触れうる。**法務・ToS確認を先に**行い、可否と代替（ユーザーが手動でタイトル補完できるフォールバック）を決める。動作確認は「取得できる／できない」の実用性検証として位置づける。
- サーバー側フェッチはタイムアウト・失敗時フォールバック・レート制御を設計に含める（G-1のabuse対策と同じ観点）。

> これらは外部依存・法務論点があるため、フェーズ2の公開ゲート完了後、設計と小さな検証から開始する。

---

## 5. スライストラッカー（何を終えたら次へ）

| スライス | フェーズ | 次に行うこと | 完了条件 | 依存 |
|---|---|---|---|---|
| S0-a DB安全操作手順 | 0 | **運用基盤整備完了**。将来cleanupはfresh discoveryから開始 | localはrepository wrapper、remote／Production writeは人間のSQL Editorで実運用済み。過去にCOMMIT済みのfixed scopeは新しいcleanupやwriteへ再利用せず、ROLLBACK／COMMIT SQLとCOMMIT authorizationは再実行しない。保存済みmanifestからのSELECT-only postcheckは診断目的で再生成・再実行可 | 完了 |
| S0-b Git/GitHub publication／closeout | 0 | **標準flow導入完了**。導入前のlegacyは個別判断 | PR #8のReady・review・merge責任境界と、PR #9のtask-owned worktree／local branch通常closeout Skillが現行正本から参照できる | 標準flow完了／legacyは別承認 |
| S1-a URL安全契約（C-P1-01） | 1 | **closeout完了** | UI/server/DB契約一致、local incremental・clean-chain・pgTAP 24/24・local／remote E2E・PR #5 merge・Production smoke・全fixture cleanup／postcheck PASS | 完了 |
| S1-b Event原子的作成（C-P1-02） | 1 | **次の承認対象は正本契約の確定**。INVOKER／DEFINER、最小権限、RLS迂回範囲を比較・選択し、承認後にRPC／migration＋server委譲＋原子性負系testを単独実装 | 成功時はEvent 1件＋Criterion 1件、失敗時は両方0件。権限負系とtoken／RLS／owner-share／Participant回帰green | DBあり・別承認 |
| S1-c origin・security・abuse対策 | 1 | canonical origin／Host poisoning、security headers／token非記録、rate limit／abuse観測・alertへ分割 | 各領域を別設計・別承認で検証し、S1-bへ同梱しない | C-P2-04/07 |
| S2-a マイイベント一覧 | 2 | トップページに参加中イベント一覧（Cookie）を新設 | ドメイン既知でURL再確認不要に参加中イベントへ戻れる。モバイル/デスクトップ確認 | Cookie方式・noindex維持 |
| S2-b ローンチ準備一式 | 2 | 規約/プライバシー/免責、解析、エラー監視、問い合わせ、`07_launch-checklist.md` | チェックリスト全項目が判断済み、noindex解除→検索登録の判断が固定 | 法務は専門家確認推奨 |
| S3-a 複数ペースト入力 | 3 | 入力欄を複数行化しURL/タイトル自動振り分け | 貼り付けから候補群が正しく分解・保存され、URLはC-P1-01検証を通る | S1-a完了＋フェーズ2公開ゲート完了 |
| S3-b URL→タイトル取得 | 3 | Maps Places API／一般サイトOGPの可否をToS込みで検証 | Maps取得の可否・食べログ実用性・フォールバックが判明し方針確定 | フェーズ2公開ゲート完了＋法務／ToS確認 |
| S4 品質・性能 | 4 | CI/lint/coverage、cross-browser/a11y、型/copy/入力長整理、性能計測、EventApp分割 | 各項目が正本化・自動化され、性能の重い箇所が実機で特定 | 公開後に継続 |
| S5 事業化・グロース | 5 | マーケ再整理、広告実装（計画→切り分け）、AdSense手続き、KPI設計 | 広告の目的・計測・安全対策・配置と、ゲスト機能完了後のKPI設計が合意 | 前提: 解析・スパム対策 |

### 5-1. 作業単位とGitHub／Git対応表（試行）

この表は、進行中、承認済み未実装、着手待ちの作業について、Task／Issue、Execution Contract、branch、worktree、PR、次の行動を一か所から追跡する。2026-07-21の確認可能なGit／GitHub情報に基づき、未確認事項は推測しない。本表は各Execution ContractやGitHub証拠を置き換えず、実行許可を付与しない。

| 作業単位 | Task／Issueまたは代替情報 | Execution Contract | branch | worktree | PR | 担当 | 状態 | 次の行動 | 確認日時 |
|---|---|---|---|---|---|---|---|---|---|
| PKA Slice 1：作業ライフサイクル可視化 | PR #7本文（pilot contract・Human別承認の記録） | PR #7本文。1ファイル限定のpilot | `codex/pka-slice1-lifecycle-register` | 専用worktreeあり、確認時clean | #7（MERGED、Head `64e34f1`、merge `9c509b4`） | PKA：実装／Reviewer：独立判定／Human：merge | 実装・受入完了。remote branchは現存 | 今後利用しないとHumanが判断した場合、remote削除後に通常closeout | 2026-07-21 |
| PKA Slice 1b／1c：publication・local closeout | PR #8、#9本文 | 各PR本文の承認済みscope。詳細は`docs/06_qa-flow.md` §1.1とrepo Skill | なし | closeout済み | #8、#9（MERGED） | PKA：実装／Reviewer：独立判定／Human：merge・remote削除 | 実装・受入・closeout完了 | 現行運用を観測し、改善が必要な場合は別提案 | 2026-07-21 |
| PKA Slice 2a：7 role正本化 | PR #10本文 | `docs/00_master-plan.md` 1ファイル限定 | なし | closeout済み | #10（MERGED、Head `3a4d452`、merge `a751ec45`） | PKA：実装／Reviewer：独立判定／Human：merge・remote削除 | 実装・受入・closeout完了 | 現行role正本を維持し、変更時は別契約とする | 2026-07-21 |
| PKA Slice 2b：Knowledge入口・Knowledge Map | PR #11本文 | 承認済み5ファイル限定。code／DB／CI／Skill変更なし | なし | closeout済み | #11（MERGED、Head `6c36378`、merge `4ebda6b`） | PKA：実装／Reviewer：独立判定／Human：merge・remote削除 | 実装・受入・closeout完了 | Knowledge入口とRoadmapを更新契機に従って維持する | 2026-07-21 |
| H-08：Claude／Codex共同worktree運用 | branch `codex/claude-codex-collaboration-governance`（Head `d957938`）。対象：`.agents/skills/coordinate-claude-codex-worktree/SKILL.md`、`.agents/skills/coordinate-claude-codex-worktree/agents/openai.yaml`、`AGENTS.md`、`CLAUDE.md` | `d957938`を内容入力commitとするSlice 2c正本化対象。現branchをmergeせず最新正本へ内容単位で再適用する | `codex/claude-codex-collaboration-governance` | 専用worktreeあり、確認時clean。今回削除しない | Slice 2cの固定PR URLを追跡先とする | PKA：Slice 2c実装／Reviewer：独立判定／Human：merge | baseline `4ebda6b`時点で2 ahead／27 behindのsnapshot。current divergenceはGitで再確認 | Slice 2cの実装・publication・main発効は固定PR URLとGitHubのmerge状態で確認 | 2026-07-21 |
| PKA Slice 2c：専用worktree標準・承認済みArchive | Human承認済みV2.5 §6.15.6 | exact 12ファイル。coordination Skill、agent pointer、Knowledge索引、Roadmap、Archive 5件 | `codex/pka-slice2c-governance-archive` | 専用worktree | Draft PR作成後に固定URLを記録 | PKA：実装／Reviewer：独立判定／Human：merge・remote削除 | current stateは固定PR URLのGitHub表示を正とする | Reviewerのexact Head判定後、Humanがmergeを判断。PKA改善programの次gateはSlice 3の別review・別承認 | 2026-07-21 |
| S1-b：Event原子的作成（C-P1-02） | 本書 §3、§5、§6 | 未作成。テックリードが正本契約案を作成し、人間承認後に実装へ進む | なし | なし | なし | テックリード：契約案／人間：契約承認 | 着手待ち | INVOKER／DEFINER、最小権限、RLS迂回範囲等を含む正本契約案を作成 | 2026-07-21 |

#### Closeout状態とlegacyの境界

PR #8、#9、#10、#11の作業branch／worktreeは、Humanによるmerge・remote branch削除後に通常closeout済みである。PR #7はmerge済みだがremote branchが現存するため、Humanの終了意思を推定せず保持する。`codex/claude-codex-collaboration-governance`と対応worktreeはSlice 2cの入力証拠として今回保持し、旧branch自体をmergeまたは削除しない。次の導入前legacyは通常closeout Skillの対象へ自動昇格せず、個別確認を要する。特に`codex/track-a-baseline-closeout`のprimary worktreeにはowner混在の未commit変更があるため、整理対象として確定しない。

| branch | 対応PR | 現在の分類 | worktree | 判断 |
|---|---|---|---|---|
| `feat/dashboard-summary-and-back-nav` | #1、#2（merge済み） | 導入前legacy | なし | local branchの扱いを個別判断 |
| `codex/fix-owner-setup-candidate-draft` | #3（merge済み） | 導入前legacy | なし | local branchの扱いを個別判断 |
| `codex/track-a-baseline-closeout` | #4（merge済み） | owner混在／保護対象 | primary、未commit変更あり | 所有関係と残作業を確認するまで保持 |
| `codex/s1a-url-safety` | #5（merge済み） | 導入前legacy | 専用worktreeあり | ownership・未保存変更・残作業を個別確認 |
| `codex/s1a-production-closeout` | #6（merge済み） | 導入前legacy | 専用worktreeあり | ownership・未保存変更・残作業を個別確認 |
| `codex/claude-codex-collaboration-governance` | なし | Slice 2c入力証拠 | 専用worktreeあり、clean | `d957938`を内容入力commitとして保持。current divergenceはGitで確認し、今回削除しない |

評価指標は、表へ載せると合意したactive／approved-not-implemented／waiting作業について、必須10項目を欠落なく追跡できる割合とする。目標は対象集合の100%である。表が陳腐化する、Execution Contractと誤認される、または保守負担が効果を上回る場合は、この節だけをrevertし、必要な事実は各既存正本とGitHub／Gitから再確認する。

---

## 6. 直近アクション（次の1〜2週間の推奨着手順）

1. **PKA Slice 2c**: `d957938`を最新正本と突合して専用worktree標準Skill、agent pointer、Knowledge索引、承認済みArchive 5件をexact 12ファイルで正本化する。実装・publicationのcurrent stateは下記固定PR URL、mainへの発効はGitHubのmerge状態を正とする。完了後のPKA改善programにおける次gateはSlice 3「共通遂行原則・Human gate」の実装準備reviewと別Human承認とし、以下のproject優先順位は変更しない。
2. **S1-b正本契約の確定**: 次の公開ブロッカーC-P1-02について、transaction境界、RPC契約、default Criterion、token、INVOKER／DEFINERの選択理由、最小権限、RLS迂回範囲、権限負系、成功／失敗原子性、UI状態保持、既存契約の非変更、DB承認境界を一意化し、Humanの承認を得る。
3. **S1-b単独実装・closeout**: 承認済み契約に基づきRPC／migration、server委譲、原子性負系testを実装し、local DB検証後、remote適用は人間のSQL Editorによる別承認とし、Production smoke／cleanupで閉じる。
4. **S1-cの別設計・別承認**: canonical origin、security headers／token非記録、rate limit／abuse観測・alertを分割し、S1-bとは別スライスで扱う。
5. **S2-a マイイベント一覧**: トップページ実装で公開UX品質を満たす。
6. **S2-b ローンチ準備＋`07_launch-checklist.md`**: 法務・運用・解析を整え、noindex解除→検索登録の判断を固定＝**公開ゲート到達**。
7. 以降、フェーズ3（入力体験）→フェーズ4（品質）→フェーズ5（事業化）へ。広告・KPIは前提条件が揃ってから。

---

## 7. 停止・確認ゲート（実装に入る前の約束）

- 仕様を勝手に変えない。矛盾・曖昧さ（本書の**要確認**含む）は実装せず質問して停止する。
- スコープ厳守。今回のスライス以外へ触れない。指示書外の実装（local JSON fallback等）を足さない。
- DBを伴う作業は、target（local/remote）・profile・接続先検証・次の承認境界を明示。target不明時はDB操作を行わない。remoteはSQL Editor人間実行（承認ゲート）。
- 正本またはrepository Skillを追加・変更したら、Knowledge入口（`docs/README.md`）のpurpose、authority/status、owner、参照、更新契機と齟齬がないか確認する。`AGENTS.md`と`CLAUDE.md`はbyte-for-byteで同期する。
- 依存（PostCSS `GHSA-qx2v-qp2m-jg93`）は破壊的Next downgradeを避け保留継続。再評価時はcheck/build/full E2E/Production確認を必須にする。

---

## 8. 参照

- 2026-07-17時点の残課題スナップショット: `docs/reports/fixes-and-remaining-tasks-C-2026-07-17.md`（当時P1×2／P2×8／P3×3。以後の完了状態は本書を参照）
- PR #1〜3 baseline仕様スナップショット: `docs/reports/current-service-specification-A-2026-07-17.md` ／ `docs/reports/current-technical-specification-and-pr1-3-implementation-B-2026-07-17.md`。最新の実装・QA状態は`docs/03_requirements.md`／`docs/05_dod.md`／`docs/06_qa-flow.md`を正とする
- 前身計画: `docs/reports/archive/development-and-business-activity-plan-2026-07-14.md`（`SNAPSHOT / HISTORICAL`）
- Track A証拠: `docs/reports/development-and-business-activity-status-2026-07-16.md`
- 立ち上げ手順（Phase 4/5）: `docs/00_master-plan.md`
- 起点資料: 2026-07-17のlocal memo（非正本・Git非追跡。現在の判断根拠には使わない）
- DB運用: `docs/adr/0008-local-supabase-development-workflow.md` ＋ `operate-supabase-live-db` Skill
