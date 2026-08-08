# WTV-N7-EVENT-CREATION-ABUSE-PROTECTION-HANDOFF-AND-ENTRY-CONTRACT v0.3-draft

## 0. Contract identity

- Contract ID: `WTV-N7-EVENT-CREATION-ABUSE-PROTECTION-HANDOFF-AND-ENTRY-CONTRACT`
- Version: `v0.3-draft`
- Status: `DRAFT / NOT ADOPTED / NOT EXECUTION CONTRACT AUTHORIZED / NOT IMPLEMENTATION AUTHORIZED`
- Primary technical owner: `Tech Lead`
- Future implementation owner after separate authorization: `Fullstack Engineer`
- Infrastructure／environment focused owner: `DevOps`
- Independent review owner: `Reviewer`
- Adoption authority: `Human`
- Artifact type: `docs-only Handoff／Entry Contract draft`

本artifactはN6 accepted implementation HeadからN7 Event Creation Abuse Protectionへ引き渡すための実装前契約である。N7の方式選定、Execution Contract作成、plan作成、実装、test、Git publication、Supabase／Vercel／WAF操作、Preview／Production操作またはmerge permissionを生成しない。

---

## 1. Goal

N7は、exact `POST /api/events`への濫用を抑制し、正当な利用を過度に阻害せず、rate-limitで拒否されたrequestがEventまたはdefault Criterionを一切作成しない状態を実現するためのsliceである。

後続のExecution Contractでは、少なくとも次を同時に成立させる方式を一意に決める。

- 正本のIP単位 `10分間に5件まで、6件目拒否`を満たす
- accepted requestは既存ownerless contractのままEvent＋default Criterionをatomicに作成する
- definitiveなrate-limit rejectionはDB dispatch前に確定し、business row作成0とする
- legitimate request、failed request、rate-limited request、`OUTCOME_UNKNOWN`を混同しない
- automatic retry 0、unknown outcomeの盲目的再実行0を維持する
- N6 browser historyのrecord authorityを成功したshare-page lookupから変更しない
- application codeはraw IP、forwarded header、IP digest／prefix、request本文、capability、credentialを意図的に保存・log・telemetry送信しない
- QA／evidenceはraw IP、digest／prefix、raw forwarded headerを外部転記せず、aggregate category／countだけを扱う

本Handoffは具体的な実装方式を採用しない。候補、判断基準、未決事項、QA境界、Human gateを固定する。

---

## 2. Governing inputs and authority

### 2.1 Repository and release identity

- Repository: `kcyth39/Where-to-Visit`
- Current main baseline: `87295a19f80192ffbe91c56dded86748d3a51bbd`
- N5 accepted Head: `022b85776109bae62ef21380539523bafc3e147b`
- N6 Handoff PR: `#40`
- N6 Handoff branch／Head: `codex/n6-handoff-and-entry`／`af0a6f8693dd6ec6f45e03e13319751caa7deb67`
- N6 implementation PR: `#41`
- N6 accepted implementation branch: `codex/n6-browser-history`
- N6 accepted implementation Head: `cfdc5178f73c34a535f16054dbedd6f53e722869`
- Release ancestry: `N5 → N6 → N7 → N8 → N9`

Fresh確認時点でPR #39、#40、#41はいずれも未mergeである。PR #40はdocs-only Handoffとして不変に保ち、PR #41をPR #40のbase branchへmergeしない。N7は、別Human authorization後に、exact N6 accepted Head `cfdc5178f73c34a535f16054dbedd6f53e722869`をbaseとする新しいstacked branch／PRとして開始する。

N5〜N7を個別に`main`へmergeしない。main integrationはN8／N9 final release lineのHuman gateまで行わない。topology変更には別Human rebaselineが必要である。

### 2.2 Canonical inputs

`docs/README.md`をKnowledge入口とし、次のtracked正本とaccepted ancestryを使用する。

- `AGENTS.md`
- `CLAUDE.md`
- `docs/README.md`
- `docs/00_master-plan.md`
- `docs/03_requirements.md`
- `docs/04_data-model.md`
- `docs/05_dod.md`
- `docs/06_qa-flow.md`
- `docs/contracts/README.md`
- `docs/contracts/WTV-N5-ENTRY-DECISION-CONTRACT-v0.1-draft.md`
- N5 implementation Plan identityとaccepted implementation evidence
- `docs/contracts/n6-handoff-and-entry.md`
- `docs/contracts/WTV-N6-BROWSER-HISTORY-IMPLEMENTATION-CONTRACT-v0.4-draft.md`
- `docs/plan/WTV-N6-BROWSER-HISTORY-IMPLEMENTATION-PLAN-v0.1-draft.md`
- `docs/reports/development-and-business-activity-plan-2026-07-17.md`
- `docs/reports/ui-copy-decisions.md`
- applicable ADR／role正本
- PR #39／#40／#41のfresh metadata
- N6 accepted Head上のsource、tests、local operation wrapper、tracked infrastructure設定

### 2.3 Authority and baseline evidence

優先するAuthorityは、`docs/README.md`が指すtracked正本、applicable ADR、role正本、Human採用済みstacked ancestryの正本、Human採用済みHandoff／Execution Contractである。

本Handoff draftと後続のN7 Execution Contractは、上位正本に従うtask-specific inputであり、正本、ADR、role authorityを置き換えない。矛盾時は正本を推測で上書きせず、Humanまたはdomain ownerへ戻る。

N6 accepted Head上のsource、tests、tracked configurationはcurrent stateと必要deltaを確定するbaseline evidenceであり、将来変更の意味を決めるAuthorityではない。予期しないdrift、scope外delta、安全な実現不能が判明した場合はSTOPする。

未採用draft、chat要約、agent memory、未追跡fileは正本またはexecution permissionとして扱わない。

---

## 3. Confirmed current facts

### 3.1 Current application flow

- Event作成endpointはexact `POST /api/events`である。
- routeはrequest bodyをvalidationし、`created`を201、`invalid`を400、`failed`／`outcome_unknown`を503のJSONで返す。
- `CreateEventRouteResult`は`created / invalid / failed / outcome_unknown`だけで、`rate_limited`は存在しない。
- route、result type、clientにHTTP 429または`Retry-After`の明示contractはない。
- `CreateEventForm`はHTTP statusより先に`response.json()`を試みる。WAFがHTML、空body、malformed JSONを返す場合、現状は`OUTCOME_UNKNOWN`表示へ落ちる。
- clientのautomatic retryは0で、draft inputは失敗時も保持される。
- Event creator DB pathはshort-lived `pg.Client`、parameter binding、prepared statement 0、retry 0を維持する。
- DB dispatch後にtimeout／connection loss等で結果を確定できない場合は`OUTCOME_UNKNOWN`であり、盲目的再実行しない。

### 3.2 Data and atomicity

- application roleは`public.events(title, memo, share_token)`への限定INSERTだけを持つ。
- anonymous clientからのdirect Event INSERTは許可されない。
- accepted Event INSERTに対し、existing `AFTER INSERT` triggerがdefault Criterionを同じstatement transaction内で作成する。
- default Criterion生成失敗時はEvent INSERT全体もrollbackされる。
- M01〜M11はimmutable、exact 11件で、M12はない。
- existing roles、RLS、policy、GRANT、trigger、functionをN7で変更する必要はcurrent sourceから確認されていない。
- rejected requestのbusiness row 0を保証する最も強い境界は、Event creator DB dispatchより前のdefinitive rejectionである。

### 3.3 N6 history boundary

- APIの201 responseだけではN6 historyを書かない。
- share pageでtoken validation、Event lookup、stored title validationが成功してclient recorderがmountされた時点だけでrecordする。
- rate-limit rejection、validation failure、DB failure、`OUTCOME_UNKNOWN`、navigation failure、share lookup failureではhistory record 0である。
- `?created=1`は表示状態でありhistory identityではない。
- N7はN6 history key、schema、recording authority、purge、storage failure semanticsを変更しない。

### 3.4 Current infrastructure facts

- tracked `vercel.json`はNext.js framework指定だけで、WAF／Firewall／rate-limit ruleを含まない。
- repositoryにrate limiter、proxy／middleware limiter、shared counter storeまたはrate-limit dependencyはない。
- live WAF rule、draft rule、priority、counter semantics、action、response、Preview／Production scope、observability capabilityはrepositoryから確認できない。
- live platform状態は、別Human gateでexact team／project／environment／deploymentをread-only inventoryするまで未確認である。

### 3.5 Canonical product policy

tracked正本は次を確定入力としている。

- protection target: Event作成専用route
- counting axis: IP単位
- limit／window: `10分間に5件まで`
- threshold action: `6件目拒否`
- public launch前にcontrolled verificationを行う
- public launch後のthreshold変更は別Human gateとする
- rate-limit rejectionでもEvent＋default Criterionのatomicityを壊さない

これらをHandoffまたはExecution Contractで未決値へ戻さない。変更が必要な場合は正本rebaselineを別Human gateで先に行う。

採用済みrate-limit UI copyは次である。

- `短時間に多くのきめごとが作成されました。`
- `しばらくしてからもう一度お試しください。`

待ち時間数値、IP、rule identity、内部閾値、raw responseをUIへ表示する意味は採用されていない。

---

## 4. Human decisions fixed by this Handoff draft

本draftがreview／Human adoptionを経た場合でも、固定するのは次のentry boundaryだけである。

1. N7はN6 accepted Headをbaseにするstacked sliceである。
2. exact protection targetはEvent作成routeの`POST /api/events`である。
3. canonical IP／10分／5件／6件目拒否を入力として維持する。
4. definitive rejectionはDB dispatch前、business row 0、history record 0である。
5. accepted requestのownerless creation、Event＋Criterion atomicity、least privilegeを維持する。
6. rate-limited、failed、`OUTCOME_UNKNOWN`を別分類とし、automatic retry 0を維持する。
7. architecture optionは本Handoffでは選ばない。
8. WAF／Vercel live状態、external operation、Hosted QAは別Human gateである。
9. migration、schema、RLS、GRANT、role、service-role、M01〜M11はN7 scope外である。
10. Production mutationはHuman-only gateであり、AIのProduction DB accessはread-onlyである。

---

## 5. Candidate architecture options

### 5.1 Option A — WAF／Firewall-only rejection

WAFが`POST /api/events`をapplication／DB到達前に拒否する。

成立上の利点:

- rejected requestのDB dispatch 0を構造的に実現しやすい
- application rate-limit state、dependency、migrationを追加しない
- distributed edge protectionをplatform責任へ置ける可能性がある

未解決事項:

- exact match条件、counter scope、window／burst semantics
- actual status、body、content type、`Retry-After`
- current clientがHTML／空bodyを`OUTCOME_UNKNOWN`へ分類する問題
- Previewだけへ安全に隔離できるか
- shared IP／NAT／IPv4／IPv6のfalse positive
- hosted platformなしではactual enforcementを証明できない

WAF-onlyを選ぶ場合も、採用済みcopyを確実に表示するためのclient側status normalization要否を別途決める。

### 5.2 Option B — Application route-owned limiting／429 normalization

application routeがclient identityとlimit stateを評価し、rejectionを安定した429 responseへ正規化する。

成立上の利点:

- response status／body／headerをapplication contractとしてlocal testしやすい
- rejected pathのDB dispatch 0をunit testできる
- canonical UI responseとの対応を明示しやすい

未解決事項:

- trusted client IP authority
- serverless instanceを跨ぐdurable／atomic counter
- concurrent request、multi-region correctness
- fail-open／fail-closed
- external storeまたはdependencyの要否

in-memory counterはcurrent architectureだけではglobal enforcementの保証にならない。additional dependency／external stateが必要なら、本Handoffから追加せずSTOPしてHuman scope判断へ戻る。

### 5.3 Option C — WAF enforcement＋application normalization

WAFがenforcement、applicationがstable response contractを担当する組合せを検討する。

重要な制約:

- upstream WAFがroute到達前にresponseを返す場合、route handlerはそのresponseをrewriteできない。
- WAF signalをrouteへ渡す別方式がない限り、route normalizationだけでedge rejectionを正規化できると仮定してはいけない。
- enforcement位置とnormalization位置の間に二重count、race、責任空白を作らない。

### 5.4 Option D — WAF enforcement＋client status normalization

WAFがenforcementを担当し、clientがbody parse前にconfirmed rate-limit statusを認識してcanonical copyを表示する最小候補である。

成立条件:

- platformのactual rejection statusが別gateで確認できる
- HTML／空／malformed bodyを表示・logせず安全に無視できる
- status/body不一致時の分類が一意である
- client normalization自体をenforcementと誤認しない

### 5.5 Comparison criteria for the later Execution Contract

後続の方式決定では、次を同じ候補identityで比較する。

1. exact `POST /api/events`以外へ影響しないか
2. rejectionがDB dispatch前に確定しbusiness row 0を保証できるか
3. IP／10分／5件／6件目拒否をconcurrent／distributed環境で満たせるか
4. WAF HTML／空bodyでもknown rejectionと`OUTCOME_UNKNOWN`を分離できるか
5. canonical UI copy、status、body、headerの責任位置が一意か
6. shared IP／NAT／IPv4／IPv6のlegitimate-user impactを評価できるか
7. fail-open／fail-closed時のproduct／availability riskが明示されるか
8. dependency、external store、migration、role／RLS変更を増やさず成立するか
9. localで証明する責務とHostedでしか証明できない責務が分離されるか
10. secret-free evidence、aggregate observability、rollback／cleanupが成立するか
11. Preview isolationとProduction gateを一意に証明できるか

この比較完了前に一つの方式を実装決定しない。

---

## 6. Unresolved decisions for the N7 Execution Contract

### 6.1 Protection identity and counting semantics

canonical inputを変更せず、次をHuman／domain ownerが一意に決める。

- proxy／forwarded headerの信頼元と、applicationがheaderを読む場合のauthority
- IPv4のgrouping、IPv6 address／prefixの扱い
- NAT／shared networkで複数の正当利用者が同一IPとなる場合のdisposition
- browser、bot、API clientを同じruleで扱うか
- 10分windowのfixed／sliding semantics
- 5件を超えるburst、concurrent requestのcount semantics
- 6件目以後のblocking duration
- counterのregion／deployment間共有境界
- platform conditionでexact route、method、environmentを識別できるか

### 6.2 Failure policy

- limiter／WAF／counterが利用不能な場合のfail-open／fail-closed
- target ambiguity、rule identity不明、observability欠落時の停止条件
- false positiveを検出した場合の運用とthreshold変更gate
- definitive rejection、application failure、network failure、dispatch後unknownの分類
- challenge、403、429以外のplatform responseを許容するか

### 6.3 Response contract

- definitive rate-limit responseをexact 429とするか
- response bodyへ`rate_limited` resultを追加するか、statusを独立authorityにするか
- JSON bodyを必須にするか
- WAF HTML、空body、invalid JSON、unexpected content typeの扱い
- status/body mismatchの扱い
- `Retry-After`を必須／任意／不使用のどれにするか
- `Retry-After`形式、invalid／missing時挙動
- wait durationをUIに表示するか。採用済みcopyは数値表示を要求しない
- routeへ到達しないrejectionのUI normalization位置
- known rejectionではdraft保持、navigation 0、automatic retry 0、history record 0とする具体的client behavior
- rejectionを観測できないnetwork interruptionは既存`OUTCOME_UNKNOWN`を維持するか

### 6.4 Environment and operation policy

- local mock／testでは何をsimulateするか
- Preview WAF ruleをexact deploymentへ隔離できるか
- all-Previewへの影響が避けられない場合のHuman disposition
- Preview rule draft、publish、disable／cleanupをどの別gateにするか
- Production controlled verificationをN9、public-opening前確認をN12へ渡すexact evidence
- Hosted test requestを誰がどのnetwork identityで実行するか

canonical IP／10分／5件／6件目拒否を変更する判断は本節に含まれず、正本rebaselineが必要である。

---

## 7. Shared invariants

N7は次を変更しない。

- ownerless `/api/events` contract
- accepted requestのEvent＋default Criterion atomic creation
- rejected requestのEvent／Criterion／Participantその他business row 0
- N5 dedicated least-privilege roleとminimum grants
- M01〜M11、migration count 11、M12 absent
- schema、RLS、policy、trigger、function、role、membership、GRANT／REVOKE
- service-role key不使用
- prepared statements 0、automatic retry 0
- dispatch後の不確定結果を`OUTCOME_UNKNOWN`とする境界
- `OUTCOME_UNKNOWN`時のblind retry禁止
- N6 history record authorityはsuccessful share-page lookup
- failed／rate-limited／`OUTCOME_UNKNOWN`のhistory record 0
- raw capability／share pathname／credential／request body／IPのexternal output 0
- N5→N6→N7 stacked ancestry
- Production operationのHuman gateとAI Production DB read-only境界

rate-limit判定はaccepted Event INSERT後に行わない。DB dispatch後のrequestをrate-limit rejectionとして取り消したと主張しない。

---

## 8. Data and atomicity contract

### 8.1 Accepted request

- Event creator DB dispatch exact 1
- application INSERT exact 1
- existing triggerによりdefault Criterion exact 1
- partial Event 0
- retry 0
- successful share-page lookup後だけN6 history record

### 8.2 Definitively rejected request

- Event creator DB dispatch 0
- token／share pathname生成をdispatch pathと分離できる場合は不要生成0を確認
- events 0 delta
- criteria 0 delta
- participants／candidates／votes／reactions／concerns／comments 0 delta
- navigation 0
- N6 history record 0
- automatic retry 0
- canonical rate-limit copy以外のraw response表示0

### 8.3 Failed／unknown request

- validation failureとdispatch前definitive failureはknown failureとして既存contractを維持
- dispatch後にoutcomeを確定できない場合は`OUTCOME_UNKNOWN`
- `OUTCOME_UNKNOWN`をrate-limit rejectionへ再分類しない
- blind retry 0
- N6 history record 0。ただしHumanが後で有効share pageへ再訪し取得成功した場合は、その成功lookupが新しいhistory authorityとなる

---

## 9. Observability, security, and privacy

### 9.1 Application responsibility

application codeは次を意図的に保存、log、analytics／telemetry送信またはerror reportへ添付しない。

- raw IP、IP digest／prefix
- `x-forwarded-for`等のraw forwarded header
- Cookie、Authorization、user agent全文
- Event title、memoまたはraw request body
- share token、share pathname、full URL
- DB URL、password、CA、API key、Vercel token

N7から新しいapplication log、analytics、telemetry、raw request collectionを追加しない。

### 9.2 QA／evidence responsibility

evidence、artifact、Git、PR、screenshot、Chat／Human reportへ次を転記しない。

- raw IP、IP digest／prefix
- raw forwarded header
- raw request／response body
- Event title、memo、share token／pathname
- Cookie、Authorization、credential、URL、CA、API key

Human向けevidenceはaggregate category／countとsecret-free identityだけを扱う。

### 9.3 Managed platform unknown

- WAF／VercelはenforcementのためIPまたはforwarded headerをplatform内部で処理する可能性がある
- platform-managed log、retention、access scope、IP masking／deletion capabilityはlive inventory前は`UNKNOWN`
- 本Contractはplatform内部でIPが一切保持されないことを保証しない
- Agent／Humanはraw platform valueをreadback、export、copyまたはartifact化しない
- Execution Contractまたはexternal inventoryで、利用可能なprivacy setting、log behavior、retentionを確認する
- 未確認のplatform privacy capabilityをDoDまたはevidence根拠にしない

### 9.4 Recordable aggregate evidence

別Human gate後のQA／operation evidenceには、必要な場合だけ次をsecret-freeに記録できる。

- target team／project／environment／deployment／commit identity
- WAF rule ID／name／revision identity
- route categoryとmethod
- allowed／rejected aggregate count
- HTTP status category
- controlled window start／end
- execution count／retry count
- DB dispatch count
- before／after business row counts
- other-route hit count
- cleanup result
- final verdict

### 9.5 New observability

Production log、analytics、log drain、new telemetry、raw request collectionを本Handoffから追加しない。platformのaggregate metric availabilityは将来preflightで確認し、未確認のcapabilityをDoD根拠にしない。

Human運用指標の候補は、rule別allow／reject集計、legitimate controlled request成功率、false-positive報告、shared-network影響、other-route hit 0、response category、business-row-zero violation 0である。exact retention、alert、threshold変更手順は後続Contractで決める。

---

## 10. Local／Preview／Production boundaries

### 10.1 Local

Localはapplication response、client UI、DB dispatch 0、atomicity、history record 0、fixture cleanupの主要authorityとする。実platform WAF enforcement、actual counter、real edge responseは証明しない。

Local Supabase操作は別Human gate後にrepository wrapperと`operate-supabase-live-db` Skillを使用する。target不明時はDB操作を行わない。

### 10.2 Preview／Hosted

実WAFのroute／method match、1〜5 allow、6th reject、window recovery、actual status／body／header、concurrency、other-route non-interference、actual DB row 0はHosted環境でしか証明できない可能性が高い。

Hosted QAは本Handoffから許可しない。exact team、project、environment、deployment、commit、WAF rule、scope、operation count、retry 0、fixture、cleanup、evidence pathを別Human gateで固定する。

Preview conditionがexact Git branchだけへ隔離できると推測しない。all-Previewへ影響する可能性をread-only preflightで解消できなければSTOPする。

### 10.3 Production

- Production WAF／Vercel／DB mutationは本Handoffで0
- AIのProduction DB accessはread-only
- Production SQLはHuman-only boundaryを維持
- N9 internal acceptanceまでProduction WAF controlled verificationを実行しない
- N12 public-opening gateまでVercel Authenticationを解除しない
- public launch後のthreshold変更は別Human gate

---

## 11. Non-optional N7 local QA bootstrap handoff

N7 implementation／QA担当は、次を再設計せずoperational inputとして満たす。

### 11.1 Worktree bootstrap

- N7はaccepted N6 Headから新規専用worktreeを作る。作成には別Human authorizationが必要
- 他worktreeの`.env.supabase.local`をコピーしない
- `npm run supabase:start`でN7 worktree専用profileを生成する
- profileはlocalhost-only、anon key only、regular file、non-symlink、mode 0600、Git ignored
- profile本文、anon key、raw URLをevidenceへ出さない
- stop／startでlocal volumeを削除せず、`db reset`を実行しない

### 11.2 Stack ownership

- local stack ownerがN7 worktreeと一致すること
- fixture作成前にcleanup owner guardが`CURRENT / PASS`であること
- `FOREIGN / ORPHANED / INDETERMINATE`はfixture作成前にSTOPし、Human dispositionで解消すること
- start成功だけからcleanup ownershipを推定しない
- fixed local network／localhost port boundaryを維持する

### 11.3 Event Creator credential

- `.env.n5-event-creator.local`はN7 worktreeごとにabsentからprovisionする
- 他worktreeからcopy、rename、reuseしない
- dedicated role existence、attributes、membership、password state、ownership、minimum grantsをsecret-freeにinventoryする
- profileはregular、non-symlink、mode 0600、Git ignored、exact approved keyだけ
- login postcheckでexact local role／database／host／portを確認する
- service-role keyを使用しない
- outcome不明のmutationをblind retryせず、state確認前のoverwrite／delete、他worktreeのcredential copy、unreviewed手順によるpassword／profile変更を行わない
- partial stateでは、role／membership／password、profile、loginをread-only inventoryして既知状態とunknown stateを分離する
- 後続Execution Contractまたは明示Human authorizationが、対象partial state、reviewed helper／procedure identity、local-only target、mutation上限、retry 0、expected result、postcheck、rollback／failure boundary、secret非出力をexactに固定した場合だけ、同一authorization scope内でdeterministic recoveryを実行できる
- deterministic recoveryはautomatic retryではない。例として`password PRESENT / profile absent`からprofileだけを生成するのは、そのstateを安全に扱うreviewed helperが明示採用されている場合だけであり、current helperが対応すると推定しない
- `password PRESENT / valid profile / login PASS`等、inventoryでready stateを確認できた場合はmutation 0で再利用できる
- recovery条件を満たさないpartial、outcome unknown、correlation不能、current helper非対応のstateはHumanへ戻る

### 11.4 Fixture and cleanup

- fixture作成前にexact target、cleanup可能性、cleanup owner、cleanup authority、cleanup SQL strategyを固定する
- unique fixture identityとexecution identityを使い、title／memo／share pathnameをevidenceへ出さない
- fixture create requestのautomatic retry 0
- `OUTCOME_UNKNOWN`時はsame request／same execution identity／same mutationをblind retryせず、read-only inventoryで永続状態を確認する
- fixture 0を確認でき、既承認scopeが新規executionを許可する場合だけ、新しいexecution identity、execution count 1、retry 0で独立executionを行える。これはretryではない
- complete fixtureが存在する場合はduplicateを作成せず、そのfixtureでQAを続行する
- safely cleanable partialはContract／authorizationがcleanup対象とmutation上限を一意に許可する場合だけcleanupへ進む
- partial、unknown、duplicate、prior executionとのcorrelation不能、cleanup不能はHumanへ戻る
- ROLLBACK validationとCOMMIT authorization／executionを分離する
- cleanupはtarget fixtureだけを対象とし、unrelated business rowを変更しない
- cleanup後はtarget fixture 0、dangling／orphan 0、schema／role／grant／migration history不変を確認する

---

## 12. QA direction

### 12.1 DB-independent unit／contract QA

- protection targetはexact `POST /api/events`
- other method／route非干渉
- 429／candidate rejection response classification
- HTML、空body、malformed JSON、unexpected content type
- status/body mismatch
- `Retry-After`を採用する場合のvalid／invalid／missing
- canonical copyだけを表示しraw bodyを出力しない
- draft input保持
- navigation 0
- automatic retry 0
- DB dispatch 0
- N6 history helper call／history key mutation 0
- `OUTCOME_UNKNOWN`との分類分離
- raw IP／header／capability／credential output 0

### 12.2 Local component／E2E QA

- legitimate requestはexisting create flowを維持
- known rate-limit rejectionはcanonical copy、navigation 0、history record 0
- malformed WAF responseを安全に処理
- failed／unknown pathのexisting copyとretry 0を回帰
- valid share page lookup時だけN6 history record
- selected participant／collaboration回帰
- mobile／desktopでcopyとform stateが破綻しない

### 12.3 Local Supabase integration QA

別Human gateと§11 bootstrap成立後だけ行う。

- accepted request exact 1でEvent＋default Criterion atomicity PASS
- rejected requestのDB dispatch 0
- rejected request前後で全business row delta 0
- failed／rate-limited／unknownでhistory record 0
- fixture unique identity
- cleanup ROLLBACK validation
- Human-authorized cleanup COMMIT
- final business rows 0、dangling／orphan 0
- migration exact 11、M12 absent、schema／role／RLS／GRANT不変

### 12.4 Hosted Preview QA

別Human gate後、actual WAF方式を選んだ場合だけ行う。

- exact WAF rule／environment／deployment identity
- requests 1〜5 allow
- request 6 reject
- window expiry後のrecovery
- other routes non-interference
- actual status／body／headers
- concurrent request behavior
- shared IP／IPv4／IPv6のcontrolled evidence
- rejection時application route／DB dispatch 0を確認できる範囲
- QA DB business row delta 0
- N6 history record 0
- retry 0
- fixture cleanupとpostcheck

Hosted QAでWAF ruleを作成、publish、変更、disableする各operationは、Execution Contract adoptionやQA gate名から自動導出しない。

Hosted rejected requestのbusiness row 0を証明する方式は、後続Execution Contractの必須決定事項とする。global row deltaまたはshare tokenだけをcorrelation authorityにせず、次を一意に固定する。

- exact hosted target currentness
- sequential／exclusive execution windowと、他agent／他QA／他利用者trafficの禁止または影響分離
- accepted control requestsとrejected target requestの識別
- rejected requestはshare tokenを得ない前提のsafe correlation strategy
- route未到達またはDB dispatch 0のsecret-free evidence
- controlled before／after inventoryのexact scope
- allowed requestごとのEvent＋default Criterion expected delta
- threshold超過requestの8 business table delta exact 0
- unrelated business row delta 0
- synthetic request batch、route invocation aggregate、DB dispatch aggregate、WAF outcome categoryの組合せ
- fixture identity、cleanup identity、query／artifact identity、execution count、retry 0
- 証明不能時のlimitationまたはSTOP

どの証明方式を採用するかは本Handoffで固定しない。

### 12.5 Production QA handoff

N7はProduction WAFを有効化しない。N9へexact implementation Head、WAF candidate identity、controlled verification手順、expected response、local／Preview evidence、known limitationsを渡す。N9とN12のHuman gateを維持する。

---

## 13. Evidence contract

後続実行のevidenceはGit外、secret-free、no-replace、mode 0700 directory／0600 fileを原則とし、exact pathとretentionはExecution Contractまたはoperation gateで固定する。

最低限記録する候補:

- operator、UTC timestamp
- Contract／Plan／candidate Head identity
- local／Preview target alias
- application／WAF candidate identity
- command／operation identity
- execution count、retry count
- request classification集計
- response status category
- DB dispatch count
- business row before／after count
- history mutation count
- fixture／cleanup result
- secret audit
- final verdict

raw IP、forwarded header、Event title／memo、share token／pathname、request／response body、credential、URL、CA、API key、Cookie、user agent全文、environment dumpを保存しない。

---

## 14. Expected future implementation scope

本Handoffはexact changed pathsを採用しない。方式決定後のExecution Contractで、current sourceと必要deltaに基づきexact scopeを固定する。

current integration候補は次である。

- `src/components/CreateEventForm.tsx`
- `src/app/api/events/route.ts`（route normalizationを採用する場合だけ）
- `src/lib/event-types.ts`（typed result変更を採用する場合だけ）
- existing Event creation／slice tests
- WAF configuration artifactまたはexternal operation packet（方式とrepository正本に応じる）
- design／copy正本（意味変更またはcandidate implementation同期が必要な場合だけ）

次はcandidate scopeに含めない。

- Supabase migration
- schema、table、trigger、function、RLS、policy、role、membership、GRANT／REVOKE
- service-role credential
- N6 history schema／key／recording authority
- N8 cleanup
- N9 Production operation

additional dependency、external store、新migration、scope外pathが必要なら、実装せずHumanへ戻る。

---

## 15. DoD for the later Execution Contract

N7 Execution Contractは、実装開始前に最低限次を判定可能にする。

- selected architectureと非採用optionの理由
- canonical IP／10分／5件／6件目拒否との一致
- exact protected route／method／identity authority
- proxy／IPv4／IPv6／NAT／shared network semantics
- burst、concurrency、block duration、counter scope
- fail-open／fail-closed、false-positive handling
- exact HTTP status／body／content type／`Retry-After` contract
- malformed／unexpected WAF response behavior
- application routeへ到達しないrejectionのnormalization責任
- accepted／rejected／failed／unknown state matrix
- rejected DB dispatch 0、business row 0、history record 0
- accepted Event＋default Criterion atomicity
- automatic retry 0、unknown blind retry 0
- exact application／test／configuration path scope
- local bootstrap、credential、fixture、cleanup sequence
- local QAとHosted QAの責任分離
- WAF external operationのHuman gate
- secret-free observability／evidence
- Hosted row-zero proofのtarget、exclusive window、correlation、scoped DB inventory、cleanup、limitation／STOP
- Production／N8／N9 handoff

未決事項を実装担当へ丸投げしたままimplementation startへ進まない。

---

## 16. STOP conditions

次のいずれかで進行を停止し、Humanまたはdomain ownerへ戻る。

- N6 accepted Head、PR identity、stacked ancestry、topology drift
- PR #41をPR #40 baseへmergeする必要
- canonical IP／10分／5件／6件目拒否を無断で変更する必要
- architecture、response、failure policyを一意に決められない
- actual WAF status／body／header不明のままclient contractを固定する必要
- upstream WAF rejectionをroute handlerだけでrewriteできると仮定する必要
- WAF target team／project／environment／deployment／rule identity不明
- Preview isolationを証明できずProductionまたはunrelated Previewへ影響する可能性
- additional dependency、external store、migration、schema、RLS、GRANT、role変更が必要
- M01〜M11変更またはM12追加が必要
- service-role keyが必要
- local stack ownerが`CURRENT`でない
- local profile／credentialを他worktreeからcopyする必要
- credential stateがunknown、またはreviewed deterministic recovery条件を満たさない
- fixture target／cleanup authority／row count不明
- same request／same execution identityのblind retryが必要
- read-only inventory後もfixture stateがpartial／unknown／duplicate／correlation不能、またはcleanup不能
- Hosted QA／WAF operationが必要だが別Human gateがない
- raw IP、header、request body、capability、credential出力が必要
- false-positive risk、shared network impact、fail modeを評価できない
- Production DB／Vercel／WAF mutationが必要
- N8／N9／N12 scopeをN7へ混入する必要
- focused review conflict

---

## 17. Human gates

次を論理的なpermission／DoD／evidence boundaryとして分離し、前工程の完了だけから次工程のpermissionを自動導出しない。ここでいうgateは責任境界であり、必ずしもHuman messageの回数を意味しない。

Humanは、exact scope、target、operation、execution上限、retry、evidence、STOP条件を明記した1つのbounded authorization packetで、複数の隣接工程をまとめて許可できる。包含候補は、implementation＋DB-independent QA、read-only live inventory＋bounded operation plan作成、local bootstrap＋credential provisioning＋local QA、Hosted read-only inventory＋controlled QA preparationである。

WAF／Vercel mutation、Hosted controlled request execution、cleanup／disable／rollback mutationは原則として明示的に分離する。ただしHumanがexact operation packetで作成、検証、cleanupを具体的に承認した場合、同一の非Production Hosted targetに対するWAF／Vercel lifecycleは、そのbounded packet内で完了できる。Production operation、Git publication、mergeはこの包含対象ではなく、それぞれ別の明示Human authorizationを必要とする。広いgate名、前工程PASSまたはartifact adoptionだけからoperation permissionを推定しない。

1. `N7_HANDOFF_ENTRY_CONTRACT_INDEPENDENT_REVIEW`
2. `N7_HANDOFF_ENTRY_CONTRACT_HUMAN_ADOPTION`
3. `N7_EXECUTION_CONTRACT_AUTHORIZATION`
4. N7 Execution Contract independent review
5. N7 Execution Contract Human adoption
6. N7 Implementation Plan authorization／adoption
7. N7 implementation branch／worktree creation and implementation start authorization
8. DB-independent QA
9. local Supabase integration QA authorization
10. Hosted Preview／WAF inventory and operation authorization
11. Hosted controlled QA and cleanup acceptance
12. Git publication authorization
13. exact N7 Head acceptance
14. N8／N9 handoff and later release gates

Review PASSはHuman adoption、Execution Contract作成、plan、implementation、test、external operation、publicationを許可しない。

---

## 18. Git publication boundary

- 本Handoff draft作成はstage、commit、push、PR作成／変更を許可しない
- N6 accepted branch／Headをこのdocs-only draftの存在だけで変更済みacceptanceと扱わない
- N7 implementation branch／worktreeは別Human authorization後にexact N6 accepted Headから作る
- PR #39／#40／#41へ無断でcommitを追加しない
- N7 publicationはexact scope、QA、secret scan、focused review後の別Human gate
- Ready化、merge、rebase、retarget、force pushは別authority
- N5〜N7を個別に`main`へmergeしない

---

## 19. N6 dependency and N8／N9 handoff

### 19.1 N6 dependency

N7はN6 accepted implementationを壊さず、その上に積む。

- successful share-page lookupだけがhistory record authority
- rate-limited／failed／unknownではhistory record 0
- Event作成UIの429 handlingを変更してもhistory helperをrate-limit判定に利用しない
- N6 localStorage key、schema、privacy、failure semanticsを変更しない
- N6 accepted Head以後のdriftはfresh preflightでSTOPする

### 19.2 N8 handoff

N8へ渡すもの:

- exact N7 accepted Head and ancestry
- selected architecture／response contract
- local／Hosted QA resultとknown limitations
- WAF candidate／rule identity。ただしProduction active状態を主張しない
- fixture cleanup resultとbusiness row 0
- N5〜N7 final stacked release identity

N7はN8のexisting Event cleanup、Data API停止、maintenance、release preparationを実行しない。

### 19.3 N9／N12 handoff

N9はVercel Authentication下のinternal Production acceptanceでProduction WAF controlled verificationを行う。N12はpublic-opening前のblock確認とHumanによるAuthentication解除を扱う。

N7 evidenceからProduction WAF active、public launch ready、threshold currentness、merge permissionを導出しない。

---

## 20. Out of scope

- N7 Execution Contract／Implementation Planの作成
- N7 implementation、test実行、branch／worktree作成
- dependency追加、external store、analytics／telemetry追加
- migration、schema、RLS、GRANT、role、credential変更
- local Supabase start／query／fixture／cleanup
- Vercel／WAF read／write、rule draft／publish／disable
- Preview deployment／QA
- Production DB／Vercel／WAF／deployment
- N6 PR merge、PR #40へのimplementation統合
- stage、commit、push、PR作成／変更、Ready化、merge
- N8 existing Event cleanup
- N9 Production acceptance
- N12 public opening
- Supabase Auth、login、session、Cookie、service-role採用
- unrelated endpoint rate limit
- broad abuse／bot platform、CAPTCHA、account reputation

---

## 21. Lifecycle and next gate

- N5: `H5 ACCEPTED / NOT MAIN-INTEGRATED`
- N6: `IMPLEMENTATION HEAD ACCEPTED / NOT MAIN-INTEGRATED`
- N7 Handoff: `DRAFT / NOT ADOPTED`
- N7 Execution Contract: `NOT AUTHORIZED / NOT CREATED`
- N7 Plan: `NOT AUTHORIZED / NOT CREATED`
- N7 implementation: `NOT AUTHORIZED / NOT STARTED`
- N7 Git publication: `NOT AUTHORIZED`
- Hosted QA／external operation: `NOT AUTHORIZED`
- Production: `0 operation / NOT AUTHORIZED`
- N8／N9: `NOT STARTED`

次のHuman gateは、exact artifact identityを固定したうえでの

`N7_HANDOFF_ENTRY_CONTRACT_INDEPENDENT_REVIEW`

である。

本draftの作成完了からHuman adoption、Execution Contract作成、plan、implementation、QA、Git publication、Hosted／Production operationを自動継続しない。
