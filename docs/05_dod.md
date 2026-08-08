# 05 DoD（きめのすけ）

作成日: 2026-07-08 / 最終改訂: 2026-07-30 / フェーズ: Phase 2（品質定義）

> **N5／N6 current lifecycle sync（2026-08-01）:** N5 H5 accepted Headは`022b85776109bae62ef21380539523bafc3e147b`で、N6 handoffは`HANDOFF READY / NOT IMPLEMENTATION AUTHORIZED`である。下記の2026-07-31 N5記述は同期前snapshotとして保持し、current statusは本注記とN6 handoff正本を優先する。N6実装は未許可である。

関連: [03_requirements.md](03_requirements.md) / [04_data-model.md](04_data-model.md) / [06_qa-flow.md](06_qa-flow.md) / [ADR-0006](adr/0006-collaborative-response-row-model.md) / [ADR-0007](adr/0007-event-views-and-criterion-feedback.md) / [ADR-0008](adr/0008-local-supabase-development-workflow.md) / [ADR-0009](adr/0009-ownerless-collaborative-model.md) / [共同編集型・回答者行モデル 詳細DoD](reports/collaborative-response-row-dod-2026-07-11.md)（既存実装の詳細。owner固有部分はADR-0009でSUPERSEDED） / [ブランドヘッダー刷新DoD](reports/brand-header-refresh-dod-2026-07-16.md) / [Local DB開発リファレンス](reports/supabase-cli-docker-development-reference-2026-07-12.md)

> ADR-0006移行の維持対象に関する詳細チェック項目は上記詳細DoDを参照する。owner固有部分はADR-0009が置換し、本書をownerless targetの完了ゲートとする。
>
> **N5 lifecycle（2026-07-31・Layer 2 complete／H5 pending／not main-integrated）:** 有効なmain baseline `87295a19f80192ffbe91c56dded86748d3a51bbd`は旧owner modelで、branch `codex/n5-ownerless-transition`のownerless変更は実装候補である。QA resource `where-to-visit-qa`（ref `twcbycyyrxbovtgiqaun`）は`COMPLETE_BY_HUMAN`、hosted Event creator credentialは`PRESENT / VERIFIED`、minimum-privilege probeとPreview REST target bindingは`PASS`である。M01〜M11のimmutable migration exact 11件をreplayし、M12は作成していない。Preview basic-function QAとfixture cleanupは完了し、Production operationは0件である。Vercel Runtime Logsだけではoutbound REST hostを直接証明できないため、branch-specific override、deployment identity、QA-only Event表示／共同編集、postflightの複合証拠をHuman accepted evidence limitationとして記録する。full CRUD coverageは主張せず、coverage limitationはnon-blockingとして受容する。canonical docs synchronizationは本PRでbranch上のcurrent statusを同期し、main統合はHuman merge待ちとする。same-SHA `H5` acceptanceは後続gateであり、Layer 2完了をmain実装済み・Production受入済みとは扱わない。

---

## 1. 文書・スコープ

- [x] ADR-0006 / ADR-0007 / ADR-0008 / ADR-0009と`03`〜`06`、AGENTS.md / CLAUDE.mdの正本関係が同期している
- [x] 旧Slice 2 / 5文書のguest_token本人モデルへ部分SUPERSEDED注記がある
- [x] 「Vote行なし＝−」「未評価と能動−を区別しない」「owner_participant_idでowner判定」という生きた正本記述がない
- [x] 「Candidate単位の常設単一🌀」「Event詳細1画面へ全機能を配置」「可視の3状態説明ラベル」という生きた正本記述がない
- [x] 既存適用済みmigrationを編集していない
- [x] Supabase Auth、service role、local JSON fallbackを追加していない。dependency変更はN5で承認された`pg@8.22.0`／`@types/pg@8.20.0`だけをtask branchへ追加している

## 2. Ownerless model・Participant

本節の未完了checkはmain統合済みかつ受入済みの状態を表す。N5 task branchのLayer 2完了は別記録として下記3.6へ反映し、main実装済み・H5受入済みとは扱わない。

- [x] Event作成時にParticipantを生成しない
- [ ] Event作成者へ共有URLだけを提示し、owner固有token、Cookie、session、権限状態を作成しない
- [ ] owner URL／token／Cookie／owner-sessionを撤去し、旧owner情報を閲覧またはmutationの認証・認可根拠にしない
- [ ] UI、server、DBの全境界でEvent titleを作成後変更不可とし、作成mutation前に確定済み確認文を表示する
- [ ] 「つたえたいこと」をshare token保持者の共同編集対象とする
- [x] `events.owner_participant_id`と`participants.guest_token`を撤去している
- [x] Participantはtrim後1〜60文字・Event内完全一致名禁止・`created_at ASC, id ASC`である
- [x] 既存行選択、非IME Enter、モバイル完了、通常blur、同名確認、名前変更、2段階削除が要件どおり動く
- [x] 単一の名前確定処理と優先順位により、明示操作起因blur・連打・失敗後の保留操作を二重実行しない
- [x] `kimenosuke:selected-participant:<event_id>`を共有URLで使用し、不在行を自動解除する

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

### 3.1 S1-b Eventとdefault Criterionの原子的作成（実装・dev remote検証完了）

- [x] Event作成成功時、Event 1件、label「興味ある？」・`source='default'`・`created_by=NULL`・同一`event_id`のdefault Criterion 1件、Participant 0件となる
- [x] Criterion作成失敗時、失敗した作成試行に対応するEvent／Criterion／Participantがすべて0件となり、不完全Eventを残さない
- [x] private schemaの`AFTER INSERT` trigger functionが限定的`SECURITY DEFINER`、固定`search_path`、静的SQLであり、default Criterion以外のtable・labelを任意に操作せず、PUBLIC／anonから直接EXECUTEできない
- [x] アプリ側token生成、share／owner token、URL、owner-session、Cookie、redirect、Criterion CRUD、Participant非生成を回帰させない。失敗時は「イベントを作成できませんでした。」だけを表示し、DB詳細・constraint名・tokenを露出せず、redirect・Cookie作成をせずform draftを保持する
- [x] 自動retryとidempotencyを追加しない。通信曖昧成功後の手動再送による完全なEvent重複は受容済み残余riskとして記録し、不完全Event残存と混同しない
- [x] pgTAPのtest transaction内のtest専用failure triggerでCriterion INSERT失敗を注入し、rollback後にtest triggerその他test資産が残らないことを確認する
- [x] 新規migrationをlocal-firstで増分適用・clean-chain replay・RLS／GRANT／trigger負系・E2E回帰まで検証し、dev remote適用後のschema／security postflight、focused smoke、fixture cleanupまで完了した

S1-bは`implemented and dev-remote verified`である。remote E2E、Production migration／smoke、migration history reconciliationは未実施の別scopeであり、idempotencyは導入しない。

### 3.2 S1-c1a trusted origin契約／S1-c1b Host poisoning対策（closeout完了）

- [x] HumanがS1-c1aの`S1-C1A-TRUSTED-ORIGIN-CONTRACT-v1.0`を採用し、Production application canonical originを`https://www.kimenosuke.com`、local許可originを`http://localhost:<port>`または`http://127.0.0.1:<port>`、Previewの優先順位を検証済み`APP_ORIGIN`、未設定時のみ検証済みVercel Preview deployment URL、取得不能時fail-closedとして確定した
- [x] 正本5文書（ADR・要件・DoD・QA・Roadmap）への同期がPR #23（merge `beefd3c869f88e5164f855ebcf8e3475bd6ffe23`）でmainへ統合されている
- [x] `APP_ORIGIN`をserver-onlyのtrusted originとし、`NEXT_PUBLIC_`を付けず、requestの`Host`、`X-Forwarded-Host`、`Forwarded`、`X-Forwarded-Proto`をabsolute URL生成のtrusted sourceにしない契約を確定する
- [x] S1-c1bの`S1-C1B-HOST-POISONING-PROTECTION-v1.0`をPR #24（merge `763fcd1eaa7126fc2f97f6abda678cf44e3cfe20`）で実装し、単一trusted origin resolver、正規化後origin、環境別許可値、credential／path／query／fragment／token／secretなし、設定値末尾slashなしを検証した
- [x] trusted originが不正・未設定の場合はowner／share URLを表示せずcopy buttonを無効化し、「URLを生成できませんでした。しばらくしてからもう一度お試しください。」だけを表示する。request Hostへのfallback、token・env値・origin候補の利用者表示は行わない
- [x] owner／share URL、relative redirect、Cookie、owner-session、token形式・生成、既存権限境界を回帰させず、Production scopeの`APP_ORIGIN=https://www.kimenosuke.com`設定、Production deployment／smoke `PASS`、local／Production fixture cleanup `PASS`を別Human gateで完了した。Production-serving DBはdisplay name `where-to-visit-dev`、ref `ehmivhmsnhcrynvuahaq`、database／role `postgres`、schema `public`としてsmoke Eventで確認したが、project rename、環境分離、Production専用DBを主張しない
- [x] cleanup generatorのfail-closed安全化をPR #25（merge `666c150ad648c9516fd46283813d9c25afe8d163`）で統合し、Legacy 56件・rescoped 64件、計120件のrepository validationをPASSした。公式`quick_validate.py`はPyYAML不足により未実行であり、公式validator PASSとは主張しない

### 3.3 S1-c2a security header baseline（Production accepted）

- [x] security headerの設定箇所を`next.config.mjs`の`headers()`へ一本化し、全pathへCSP、`X-Content-Type-Options: nosniff`、`Referrer-Policy: no-referrer`、承認済みPermissions Policy、`X-Frame-Options: DENY`を付与する
- [x] Production CSPはToolbar sourceを含まず、Preview CSPだけが承認済みVercel Toolbar sourceを許可し、Development CSPはProduction baselineへ`'unsafe-eval'`とlocalhost／127.0.0.1 WebSocketだけを追加する
- [x] frame embeddingの正本をCSP `frame-ancestors 'none'`とし、互換headerとして`X-Frame-Options: DENY`を維持する
- [x] HSTSをアプリ側で設定せず、local HTTP responseにHSTSがないことを確認する
- [x] 環境別CSPのexact値、共通header、ProductionのToolbar source不在、Previewの必要source、local response、CSP violationなしを自動testで確認する
- [x] Preview deploymentでCSP、主要機能、CSP violationなし、Vercel標準HSTSを確認する
- [x] Production deploymentでCSP、主要機能、CSP violationなし、Vercel標準HSTSを確認する
- [x] HSTSはHeader存在、整数`max-age >= 63072000`をsemanticに判定し、追加directiveを許容して環境別実測値を記録する。アプリ側HSTS設定は0件である
- [x] Production browser QAとfixture cleanupを完了する

S1-c2aは`Production accepted`である。旧S1-c2b／S1-c3a／S1-c3bは旧構造のまま開始せず、N2 v4のN4／N7へ再編する。

### 3.4 N1 ownerless collaborative model（Design Decision Accepted／main未実装／N5 task-branch candidate）

- [x] ADR-0009がAcceptedで、Decision owner、lifecycle owner、`Implementation authorization: None`、N2への確定入力を保持する
- [ ] ownerless modelをapplication／DBへ実装する
- [ ] owner関連schema／route／Cookie／sessionを撤去する
- [ ] 既存Eventを別Human gateでcleanupする

N1の採用と正本同期は実装、migration、cleanupまたはN2開始を許可しなかった。N2は後続の別Human decisionで採用され、N5 implementation startはさらに後続の別Human gateでtask branchに限って承認された。unchecked項目はmain統合・受入未完了を示し、candidateの存在を否定しない。

### 3.5 N2 Launch Roadmap Rebaseline v4（N2 CANONICALIZED / CLOSED）

- [x] Humanがstandalone v4を採用し、N3〜N13の責務、依存関係、launch blocker、Human gateを確定した
- [x] Lean Canvas、要件、データモデル、DoD、QA、UI copy、Current Roadmapのexact 7文書がPR #34（Head `e6429d1de2cb15ce3821ae04e443b4a0be8a9e83`、merge `ef84dcd0e63b709ba566c6330e1da6fff11e81a6`）でmainへ統合され、N2 canonicalizationを完了している
- [x] N2 canonicalization時点のN3〜N13を`PLANNED / NOT IMPLEMENTATION AUTHORIZED`として同期し、各sliceのExecution Contract採用と実装開始承認を別gateにしている。後続のN5 current lifecycleは§3.6を正とする
- [ ] N5〜N7をstacked release lineとして受入し、N9のfinal release Head固定までmainへ個別mergeせず、N11を同lineへ混入させない
- [x] N8でProduction Webのpublic reachabilityを維持し、Vercel Authenticationを導入・変更せず、Data API停止、fresh discovery、必要なHuman承認済みcleanup、postcheck、N9 handoff準備を完了する
- [ ] N9でmigration、application deployment、必要なData API再開、creator route activation、WAF controlled verification、Production smokeを別Human gateで実行し、internal Production acceptanceを完了する
- [ ] N9のProduction access protection方式およびVercel Authentication lifecycleは、N9開始前の別Human decisionで確定する。N8の完了条件、handoff stateまたはN8から導出される既定状態として扱わない
- [ ] N11はprovider非依存の広告slot境界だけを準備し、provider code、広告通信、publisher ID／slot ID、CSP／CMP／ads.txtの有効化をN13まで導入しない
- [ ] N12は広告無効でも一般公開でき、public pagesだけをindex対象にしてEvent pagesの`noindex`を維持する
- [ ] N13は一般公開後の独立Human gateであり、完了を一般公開のblockerにしない

有効なmainのapplication／DBは旧owner modelのままで、N5 task branchにownerless implementation candidateがある。本節はRoadmapの完了条件を定義するだけで、N3〜N13、Git publication、Supabase／Vercel／WAF／DNS／Search Console／広告provider／Production操作のpermissionを生成しない。

### 3.6 N5 Ownerless Core Implementation lifecycle（Layer 2 complete／H5 accepted／N6 handoff ready）

- [x] QA project resource `where-to-visit-qa`（ref `twcbycyyrxbovtgiqaun`）の作成を`COMPLETE_BY_HUMAN`として記録している
- [x] QA creation record SHA-256 `cca7c110c7152574c689ac10d01a4e4c85e105d7f3331755982bfbc741569f76`のHuman reviewを`APPROVED_BY_HUMAN`として記録している
- [x] Entry decision採用、implementation start、dependency install、Git publication、DB、Layer 2、H5／N6 handoff、merge、Productionを別gateとしている
- [x] current mainのowner model、ownerless target、N5 task-branch candidateを分離し、candidateをmain実装済みまたは受入済みと表現していない
- [x] N3のdependency security、N6のbrowser history、N7のWAF／rate limit、N8の既存Event cleanupをN5の完了条件へ混入させていない。N5 migrationは8 business tableのrow 0をfail-closed preconditionとして観測するだけで既存dataを変換・削除しない
- [x] 本6文書のLayer 2 current statusをbranch上で同期し、main統合待ちとして保持する
- [x] M01〜M11のimmutable migration exact 11件をreplayし、M12を作成せず、migration countを11に維持する
- [x] hosted Event creator credentialを`PRESENT / VERIFIED`として確認し、minimum-privilege role／grant probeをPASSする。raw secretは記録しない
- [x] Preview REST target bindingとPreview basic-function QAをPASSする。Event作成、share page表示、回答者登録、候補追加、default Criterion反応、コメント保存、reload後保持を確認し、full CRUD coverageは主張しない
- [x] Vercel Runtime Logsだけではoutbound REST hostを直接証明できない既知のevidence limitationと、Human受容済みcoverage limitationをnon-blockingとして記録する
- [x] QA fixture cleanupをexact 1回・retry 0・errorなしで完了し、postflightのbusiness row、owner artifact、dangling childを0、schema／policy／role／grant changeを0、Production operationを0とする
- [x] C5から変更0のsame-SHA `H5`をacceptし、N6 handoffを別branchへ固定している

N5単独のmain mergeは完了条件ではなく禁止境界である。N6とN7を同じstacked release lineへ積み、final N5〜N7 Headだけを後続のHuman merge判断へ渡す。

### 3.7 N8 Production Maintenance（CLOSED）

N8は2026-08-05にHuman closeout acceptanceを完了した。final evidence generationは`/Users/shige/Projects/Where-to-Visit-Evidence/N8-production-maintenance/20260805T124529Z-n8-final-closeout/`（`COMPLETE` SHA-256 `61835b3b13237e1fc1d32f4e11d4b1568fc55fa86166b24805cda17aac179965`）、Human decision `N8_OLD_OWNER_MISMATCH_REBASELINE_ACCEPTED`のadditive disposition evidenceは`/Users/shige/Projects/Where-to-Visit-Evidence/N8-production-maintenance/20260805T130247Z-n8-old-owner-mismatch-disposition/`（`COMPLETE` SHA-256 `4ab63a3ed41a6df7080c43cb90545e9dde23498f9c604dbf6c1d51d8364c00f7`）である。prior generationは変更していない。本節はProduction read、mutationまたはN9のpermissionを生成しない。

- [x] N5→N6→N7 release lineage、current N8 identityおよびPR stateを固定し、merge／main integrationが0である
- [x] exact Production project／database／schema／environmentを証明し、QA targetを除外している
- [x] current Productionがpre-ownerless／old-owner familyかつData API-based write pathであり、required old-owner markers present、ownerless target absent、expected structure digestは`OLD_OWNER_MISMATCH`であることを確定し、Humanが未解明factのままN9 entry baselineとして受容している
- [x] Production Webのpublic reachabilityを維持し、N8によるVercel Authentication、DNS、aliasおよびdeploymentの変更が0である
- [x] Data APIがOFFで、REST／GraphQLの8 business tablesへのaccessがblockedである
- [x] 8 business tablesへの全mutation surfaceを`BLOCKED 3 / HUMAN_ONLY 1 / VERIFIED_N/A 8 / UNKNOWN 0`へ分類している
- [x] Data API OFF read-back後の最初のfresh observationで、exact 8-table counts、foreign-key dependencies、delete actions、triggers、external dependencies、old-owner schema fingerprintおよびbaseline branchを固定している
- [x] authoritative baseline後のunexpected business-row increaseが0である
- [x] nonzero branchのapproved cleanup、ROLLBACK validation、Human COMMITおよびpostcheckが完了している
- [x] exact 8 business tablesとrelevant dangling／orphan rowsが0である
- [x] ownerless final migrationがN8 entryとexitの双方で未適用である
- [x] N8 executionによるschema、security、role、grantおよびmigration application／historyのdeltaが0である。受容済みentry baselineの`OLD_OWNER_MISMATCH`をdelta 0へ読み替えない
- [x] final authorized chainのSQL error、retryおよびoutcome unknownが0である。先行fingerprint queryの失敗3件（SQLSTATE `42883`、`42P01`、`42883`）はmutation 0、retry 0、authority 0のhistorical diagnosticsとして分離している
- [x] deployment、environment、Firewall、DNS、mergeおよびmain integrationのmutationが0である
- [x] raw business dataとsecretを含まないN8 final evidence generationがcompleteである
- [x] pre-ownerless／old-owner family、required old-owner markers present、未解明の`OLD_OWNER_MISMATCH`、ownerless target absent、8-table row 0、Data API OFF、surface `UNKNOWN 0`を含むN9 entry stateをHuman decision `N8_OLD_OWNER_MISMATCH_REBASELINE_ACCEPTED`として受入れている

N8のDoDはcreator role mutation、`NOLOGIN`、creator active-session verification、ownerless migration、application deployment、Data API再開、Firewall mutation、positive Production smoke、merge、main integrationまたはN9 executionを含まない。creator route activationはN9の別Human gateで扱う。

### 3.8 N9 ownerless Production release（not execution authorized）

本節は、current [要件 §3.13](03_requirements.md#313-n9-ownerless-production-release)に基づく完了状態を定義する。文書作成、review、adoptionまたはcheck更新をsystem stateの代替にしない。本節のdrafting／review／adoptionからExecution Contract、Plan、Operation Packetのdrafting／adoption authority、QA／Production read、migration、credential、provider mutation、deployment、Data API toggle、smoke、cleanup、Git publicationまたはN9 executionのpermissionを生成しない。

#### Current lifecycle and environment policy

- Stage 0は`N9_STAGE_0_COMPLETE_ZERO_DELTA`としてHuman accepted、Stage 1は`N9_STAGE_1_COMPLETE_ZERO_SOURCE_DELTA`としてtechnical completeである。GraphQLは`OUT OF SCOPE / NOT REQUIRED`、Stage 2は`NOT STARTED / NOT AUTHORIZED`、Production N9 executionは`NOT STARTED / NOT AUTHORIZED`である。Stage 1 technical completeはStage 2、Git publication、Production operationまたはN9 closeoutをauthorizeしない。
- `N9_SOURCE_DELTA_ZERO_CONFIRMED`は、N9 product behaviorの新規application feature delta、Production ownerless migration body deltaおよびN9 architecture deltaが0であることを意味する。Stage 1を成立させたtracked isolation／runtime-routing／creator-profile tooling、testsおよびoperational documentationのdeltaが存在しないという意味ではない。Stage 2でfresh inventoryし、product／migration／tooling／test／documentation／secret／generated artifactとcommit対象を分類する。
- Localは、target／ownershipが確認できる場合、Agentがruntime、DB、migration、SQL、schema／role／grant／policy、fixture、destructive test、credential provisioning、cleanupおよびbounded retryを実行できる。QAはHuman承認済みbounded validation scope内で、Agentが通常のread／write、approved migration validation／適用、fixture、REST／Data API／RLS／permission、creator path、retryおよびcleanupを実行できる。個々のQA read／mutationごとにmicro-gateを分けない。Production SQL／migration、credential、provider mutation、deployment、Data API toggle、Production smoke mutation、destructive cleanup、merge／publicationはHuman-onlyである。
- QA target ambiguity、Production separation不能、ownership不明data、QA全体reset、共有QAへの広範囲影響、credential発行／rotation、provider／environment binding変更、Data API／Auth／network設定変更またはProduction operationはHumanへ戻す。Local／QA policyをProductionへ拡張しない。

#### Completed Stage 0／Stage 1 evidence

- Local: isolated N9 runtime、N6 delta 0、creator path、`/api/events`、clean reset／M01–M11、M12 absent、catalog／RLS／creator permission、pgTAP 118、N6 history 20/20、N7 429 10/10、regression、check／buildがPASS。
- QA: exact target／profiles、catalog／RLS、Preview→QA Human confirmation、positive／negative authorization、REST／Data API、creator route、fixture cleanup、final exact 8 tables zeroがPASS。GraphQL未導入は未達ではない。application／migration defectは残っていない。

#### A. Entry integrity

- [ ] N8が`CLOSED`であり、Production ref `ehmivhmsnhcrynvuahaq`とQA ref `twcbycyyrxbovtgiqaun`が別targetとして相関している
- [ ] 最初のN9 Production mutation前にProduction Data APIがOFF、exact 8 business tablesが全件0、QAも同8 tablesが全件0である
- [ ] exact cumulative release Headとancestryが固定され、QA／Production credential reuse 0、application source／bundleでservice-role credentialのbinding、import、fallbackおよびuseが0である

#### B. QA security state

- [ ] QAのcurrent catalogがM11 ownerless stateであり、M11を再適用せずfresh bounded SELECT-only observationで確認している
- [ ] `kimenosuke_event_creator`が`LOGIN / NOINHERIT / CONNECTION LIMIT -1`、database direct grantはCONNECTだけ、direct TEMP grant／database CREATE／elevated attribute／runtime-capable membership／object ownership 0である。database PUBLIC／provider default由来のeffective TEMPはapplication authorizationへ昇格せず、applicationのarbitrary SQL／temporary object作成は0である
- [ ] creatorは`events.title`／`memo`／`share_token`のcolumn INSERTだけを持ち、Event SELECT／UPDATE／DELETE／TRUNCATE、他7 tables、sequenceおよび不要function accessが拒否される
- [ ] exact Event policies、exact 8 tablesのRLS、authenticated-applicable policy 0とbounded effective business-access denial、old-owner marker absent、ownerless marker present、bounded external dependencyがapproved stateである
- [ ] directly relevant functionのowner、`SECURITY DEFINER`、volatility、fixed search pathおよびEXECUTE境界が§3.13と一致し、QA business rowsがrelease test前に0である

#### C. Migration

- [ ] QAで確認したexact approved M11 bodyと同一identityのbodyをProductionで使用し、preconditionがPASSしている
- [ ] Production migrationがatomicに完了し、exact 8 tablesは全件0、ownerless catalog present、old-owner object absentである
- [ ] creator roleはpassword nullで作成され、security postcheckがPASS、execution retry 0、unresolved `OUTCOME_UNKNOWN` 0である

#### D. Credential and binding

- [ ] QA creator credentialはPreviewだけ、Production creator credentialはProductionだけへbindingされ、cross-environment reuse 0である
- [ ] creator credentialはserver-side onlyでclient bundle exposure 0、CA／TLS verificationが有効であり、`SUPABASE_URL`、`SUPABASE_ANON_KEY`、`KIMENOSUKE_EVENT_CREATOR_DATABASE_URL`、`KIMENOSUKE_EVENT_CREATOR_DATABASE_CA_PEM`がexact scope／targetへ相関している
- [ ] Preview／Productionのservice-role bindingはabsentであり、credential operationはpasswordのPRESENT／ABSENT分類だけを変更し、role privilege、password以外のattributeおよびmembership deltaが0である
- [ ] `APP_ORIGIN`はDB credentialと分離され、Productionではexact canonical origin、Previewではvalidated source contractと一致している

#### E. Application deployment

- [ ] exact cumulative N9 Headが固定され、creator route、N6 historyおよびN7 abuse behaviorを含む
- [ ] Production deploymentがexact N9 Headで`READY`となり、Production alias／domain／project／environmentが相関している
- [ ] usable creator credentialを持つexact deploymentのactivation直前にProduction exact 8 tablesをfresh確認して全件0であり、nonzeroまたはtarget未相関ならactivation 0でSTOPする
- [ ] deployment後にenvironment bindingをexact commitへ再相関し、Preview evidenceをProduction proofへ代用していない

#### F. Production isolation and abuse control

- [ ] Vercel Authenticationのcurrent stateをfresh確認し、OFF時だけ別Human authorizationでenableしてretry 0、ON read-back、exact Production project／environment／deployment／alias相関、external access denialおよびunresolved outcome 0が成立する
- [ ] Production Firewallのactive／draft／versions inventoryでunknown／unowned draft 0を確認し、exact intended diffとactivation対象versionを固定してdraft mutationとactivationを別工程で完了している。PATCH／draft mutation成功だけをactive enforcementと扱わず、activation後active read-backを完了している
- [ ] exact `POST /api/events`のProduction Firewall ruleがHuman-approved current parameterでactiveである
- [ ] unrelated Firewall semantic delta 0、controlled 429 behavior PASS、rejected Event／Criterion row delta 0である

#### G. Data API activation

- [ ] post-migration security、deployment／binding／isolation、Data API再開前のcreator-route negative／readinessおよびProduction Firewall active／controlled verificationがPASSした後、別Human authorizationでProduction Data APIをexact 1回ONにしている
- [ ] Dashboard ON read-backがPASSし、toggle retry 0、ambiguous outcome後のblind retry 0、unresolved `OUTCOME_UNKNOWN` 0である
- [ ] REST／Data APIを確認し、direct Event INSERTとunexpected authenticated business accessが拒否される。GraphQLは`OUT OF SCOPE / NOT REQUIRED`である

#### H. Functional Production acceptance

- [ ] creator routeによるEvent 1件とdefault Criterion 1件のatomic creation、`201 / created`およびParticipant 0がPASSする
- [ ] injected default Criterion failure時に同じ作成試行のEvent／Criterion／Participant deltaが0となるatomicity negativeをLocal／QAでPASSし、Production fault injection 0である
- [ ] exact cumulative Headについて、malformed JSON `400 / failed`、parsed body shape failure `503 / failed`、validated input failure `400 / invalid`、known failure `503 / failed`、post-dispatch uncertainty `503 / outcome_unknown`をLocal／QAで区別し、dispatch／retry境界が維持される。Productionはfault injectionを行わずbounded `201`と別controlled `429`だけを確認する
- [ ] Local／QAでParticipant、Candidate、Criterion、Vote、Reaction、Concern、Commentのrequired operation familyと、missing／wrong token、cross-Event ID、不許可column／CRUDおよびimmutable title changeのrequired negative boundaryがPASSする。Productionはshare-page read、代表collaboration path 1件およびbounded REST／Data API negative 1件に限定する。GraphQLは`OUT OF SCOPE / NOT REQUIRED`である
- [ ] browser／anon／authenticatedのdirect Event INSERT、creatorのEvent read／update／deleteと他7 tables accessが拒否され、application service-role use 0である
- [ ] N6 historyはsuccessful share-page lookup後だけ更新され、failed／rate-limited／unknown history mutation 0である
- [ ] N7 429はbody parse前に分類され、body read／trust／render／log 0、canonical copy、draft保持、navigation／automatic retry／history mutation 0である

#### I. Fixture cleanup

- [ ] Production smoke fixtureのexact identityとrow graphが固定され、correlated fixtureだけを削除してnon-correlated row delta 0である
- [ ] cleanup COMMITとpostcheckがPASSし、exact 8 tablesが全件0、cleanup retry 0である

#### J. Closeout

- [ ] final Production target correlation、Data API ON、Vercel Authentication ON、ownerless catalog present、exact 8 tables全件0が同一closeout stateとして確認される
- [ ] unresolved `OUTCOME_UNKNOWN` 0、unexpected schema／ACL drift 0である。既知のpre-existing／provider-managed ACL varianceは別のdocumented classificationとeffective denial PASSを持ち、unexpected driftの受容には用いない
- [ ] secret-free／target-correlated evidenceとcanonical lifecycle syncがcompleteで、N9 closeoutをHumanがacceptしている
- [ ] N9 closeoutからpublic launch、N12、N13、mergeその他のpermissionを生成していない

#### Terminal classification

- `N9_COMPLETE`: A〜Jの全checkが同一accepted release stateで成立し、partial success、未確認またはunresolved outcomeが0である
- `N9_STOP`: known target／scope／security／state mismatch、unauthorized operationまたはrequired denial failureがあり、後続operationを停止してHumanへ戻す
- `N9_OUTCOME_UNKNOWN`: mutation outcome、target correlation、result completenessまたはfinal stateを一意に確定できず、PASS／未適用／cleanup済みと推測せず停止する

Current lifecycleは`STAGE 1 TECHNICALLY COMPLETE / CANONICAL RE-ADOPTION PENDING`である。Human re-adoption orderはRequirements → DoD／QA → Execution Contract → Execution Planとし、4層のre-adoption後の次Human decisionは`N9_STAGE_2_GIT_INTEGRATION_AUTHORIZATION`である。DoD再採用からStage 2、Git publication、Production operationまたはcloseout permissionを自動生成しない。

## 4. 画面・UI・読取モデル

- [x] トップにはEvent内の候補一覧リンクとイベント一覧を表示せず、将来イベント一覧を追加できる余地だけを残している
- [ ] Event作成前に「この内容で作成してもよろしいですか？」「作成後に『きめること』は変更できません。」を表示する
- [ ] Event作成成功後は共有URLだけを提示し、作成者も同じ共有URLからEventへアクセスする
- [ ] 候補一覧ダッシュボードに不変のきめること、共同編集可能なつたえたいこと、Candidate集約を表示する
- [ ] 同一ブラウザの「きめごと」最新2件と「きめごと一覧」最大30件を、180日sliding expirationの権限非依存localStorage履歴として提供する。個別／全削除でEvent本体を削除せず、保存不能でもEvent機能を阻害しない
- [ ] N6履歴はcanonical relative pathname `^/e/[A-Za-z0-9_-]{43}$`、表示用title、`lastVisitedAt`、`expiresAt`だけを保存し、titleを再訪UIに必要な限定例外として扱う。title以外のEvent business dataを保存せず、capability-bearing pathnameをraw token単体／派生識別子／full URL／query／fragmentとして保存・外部転記しない
- [ ] 同一pathnameのduplicate 0、expired／malformed／invalid／overflow entryのpurge、latest 2表示、max 30保持、180日sliding更新を確認する
- [ ] localStorage accessはclient-onlyで、server render／SSR中の参照0、初期HTMLのstorage依存0、read前neutral state、hydration mismatch 0とする
- [ ] read failure（`getItem`例外・storage unavailable）、write failure（quota・`setItem`例外）、remove failure（`removeItem`例外）を個別に検証し、各caseでEvent機能を阻害せずhistory UIをneutral／disabled／emptyへfallbackする。N6履歴key以外の変更、selected participant keyの変更、Event本体DB mutation、localStorage全体clearを0とする。JSON parse／schema／date failureとprivate browsing差異も同じ非阻害境界で扱う
- [ ] capability-bearing pathnameをconsole／server log／analytics／telemetry／error／evidence／artifact／Git／test snapshot／fixture名へ出力せず、shared browser profileのprivacy boundaryを説明する
- [ ] Event主要操作後の単一広告slot境界は、flag OFF時にcontainer、空白、third-party requestを残さず、provider codeを含まないrepository管理fixtureでlayoutとfailure isolationを検証できる
- [x] 初期セットアップ完了フラグをDBへ追加せず、reload・再訪では候補一覧を表示する
- [x] ゲスト未選択時は名前選択だけを表示し、既存名の直下に直接入力があり、確定後に候補一覧へ進む
- [x] 有効なselected participantで再訪した場合は候補一覧ダッシュボードを直接表示する
- [x] 候補一覧ダッシュボードのCandidate集約で、回答者別編集controlと❤️／🌀反応項目編集を展開していない
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

### 4.2 owner-sessionナビゲーション安全対策（SUPERSEDED実装証跡）

> 以下はADR-0009採用前の実装・受入証跡である。owner URL／Cookie／owner-sessionをcurrent requirementとして維持せず、ownerless modelが実装済みであるとも扱わない。

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
- [x] Humanがtask／shared branchの利用終了を明示し、local安全条件を満たすtask-owned worktree／local branchをremote状態に依存せず通常closeoutできる。local closeout完了時は`LOCAL_CLOSED_REMOTE_PENDING`とし、remote branch削除はHumanが実施し、actual remote不在をfresh確認した後だけ`FULLY_CLOSED`とする。network failure、remote未削除、stale remote-tracking refはsafe local closeoutを妨げず、remote pruneを通常closeout要件にしない

## 8. MVP共通

- [x] 375pxとデスクトップで表示崩れ・横overflow・重なりなし
- [x] エラー時にユーザー向けメッセージを表示し、白画面にならない
- [x] 一般公開までは全pageの`noindex`を維持する
- [ ] N12でpublic pagesのindexを許可し、Event pagesの`noindex`を維持してrobots／canonical／sitemapを整合させる
- [ ] owner URL／owner Cookieによる権限回復を撤去し、共有URLへ一本化する
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
