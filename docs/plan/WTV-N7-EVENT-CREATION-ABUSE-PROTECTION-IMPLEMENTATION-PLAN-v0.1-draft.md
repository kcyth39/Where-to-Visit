# WTV-N7-EVENT-CREATION-ABUSE-PROTECTION-IMPLEMENTATION-PLAN v0.1-draft

## 0. Plan identity

- Plan ID: `WTV-N7-EVENT-CREATION-ABUSE-PROTECTION-IMPLEMENTATION-PLAN`
- Version: `v0.1-draft`
- Status: `DRAFT / NOT ADOPTED / NOT IMPLEMENTATION AUTHORIZED`
- Primary technical owner: `Tech Lead`
- Future implementation owner: `Fullstack Engineer`
- QA／external-operation focused owner: `DevOps`
- Lifecycle owner: `PKA`
- Adoption authority: `Human`
- Governing Contract: `WTV-N7-EVENT-CREATION-ABUSE-PROTECTION-EXECUTION-CONTRACT v0.4-draft`
- Governing Contract SHA-256: `e694757d947126375c1da07ab3f4e4f5a79f61220545aae003bc68f9153a3d5e`
- Candidate base Head: `cfdc5178f73c34a535f16054dbedd6f53e722869`
- Release topology: `N5 → N6 → N7 → N8 → N9`

このPlanは、N7のDB-independent application deltaと、後続の別Human gateへ渡す外部operation境界を定義するcandidateである。Plan作成、reviewまたはHuman adoptionから、implementation、credential access、Class R、Class M、Hosted QA、Git publication、mergeまたはProduction operationを導出しない。

---

## 1. Goal

ログイン不要の公開Event作成APIに対し、Vercel-aligned operational abuse mitigationがHTTP 429を返した場合に、clientがresponse bodyへ依存せず安全に処理できるようにする。

本Planが対象とするfuture implementation outcomeは次である。

- exact `POST /api/events`のresponseがHTTP 429の場合、body parse前にrate-limitとして分類する。
- 429 bodyをtrust、render、logしない。
- canonical messageを既存alertへ表示する。
- title／memo draftを保持する。
- navigation、automatic retry、N6 history mutationを行わない。
- 403、non-429 5xx、network failure、既存400／503 responseをrate-limitへ誤分類しない。
- application／testのDB-independent deltaをexact 2 pathsへ限定する。
- provider configuration、Hosted proof、cleanup、Production progressionを別Human gateへ分離する。

---

## 2. Non-goals

このPlanは次を設計または許可しない。

- global exact quotaまたはper-user allowance
- Vercel Firewall architectureの採用
- Firewall rule、draft、activationまたはcleanupの実行
- Class R／Class M permission
- Preview isolationまたはProduction非干渉を未確認のままPASSとすること
- Event creation API response schemaの変更
- server-side、application-sideまたはcentral authoritative limiterの追加
- JA4、Bot Protection、Challengeまたは追加WAF条件の採用
- login／account modelの追加
- DB schema、migration、role、grantまたはRLS変更
- service-role利用
- N6 history semanticsの変更
- dependency、helper、test file、CSSまたはcopy正本の追加変更
- Hosted QA、Production、Git publicationまたはmerge

---

## 3. Authority and lifecycle

### 3.1 Authority

優先するauthorityは次である。

1. tracked canonical documents、ADR、AGENTS／CLAUDEおよびrole authority
2. Human-adopted N7 Execution Contract v0.4 exact artifact as the current task-specific Execution authority
3. Human-adopted N7 Handoff／Entry Contract v0.3 as immutable entry provenance。retained safety／entry boundariesは適用するが、superseded numeric policyはv0.4を上書きしない
4. Humanによるexact Plan authorization／adoption／implementation／operation decisions。これらは上位authorityを上書きしない

Sourceとtestsはcurrent stateと必要deltaを確定するevidenceであり、Human-adopted target meaningを上書きするauthorityではない。予期しないconstraint、driftまたはscope外deltaが見つかった場合は、意味を補完せずSTOPする。

### 3.2 Current lifecycle

- N7 Handoff v0.3: `HUMAN ADOPTED / IMMUTABLE PROVENANCE`
- N7 Execution Contract v0.4: `HUMAN ADOPTED / CURRENT AUTHORITY`
- Old global-exact architecture: `REJECTED`
- Vercel-aligned architecture candidate: `NOT ADOPTED`
- This Plan: `DRAFT / NOT ADOPTED`
- Implementation: `NOT AUTHORIZED`
- Credential access: `NOT AUTHORIZED / NOT PERFORMED`
- Class M／Hosted QA: `NOT AUTHORIZED / NOT PERFORMED`
- Git publication／merge: `NOT AUTHORIZED`
- Production: `NOT AUTHORIZED`

### 3.3 Repository baseline

- Worktree: `/Users/shige/.codex/worktrees/n7-event-creation-abuse-protection/Where-to-Visit`
- Branch: `codex/n7-event-creation-abuse-protection`
- Candidate base Head: `cfdc5178f73c34a535f16054dbedd6f53e722869`
- N6 implementation Head: `cfdc5178f73c34a535f16054dbedd6f53e722869`
- N5 through N7 remain a stacked release line; individual main merge is not authorized.

Implementation開始前にはrepository、worktree、branch、HEAD、upstream、dirty state、Git lock、Contract／Plan identityおよびexact implementation scopeをfresh確認する。drift時は変更せずSTOPする。

---

## 4. Adopted policy inputs

### 4.1 Classification

`VERCEL-ALIGNED ROUTE-SPECIFIC OPERATIONAL ABUSE MITIGATION`

N7はbilling quota、legal entitlement、exact per-user allowance、globally consistent distributed counterまたはglobal sixth-request guaranteeではない。

### 4.2 Protected operation

- Path: exact `/api/events`
- Method: exact `POST`

対象route／methodを拡張しない。

### 4.3 Provisional launch parameter

| Field | Initial candidate |
|---|---|
| Counting key | IP |
| Algorithm | fixed window |
| Window | 600 seconds |
| Limit | 60 requests |
| Exceed action | HTTP 429 |

このparameterはprovisional、provider-semantic、region-scoped、Human-adjustableであり、global exact、personal allowanceまたはpermanent product invariantではない。

### 4.4 Shared-IP boundary

学校、会社、イベント会場、公共Wi-Fi、家庭、NAT gateway等では、一つのpublic IPが複数の正規利用者を表し得る。429は一人のabuseを証明しない。threshold評価は、single-source burst抑制と正規の一斉利用のfalse positiveをHumanが比較して判断する。

### 4.5 Stable behavior

- login-free service model
- early enforcement intent
- global exact quota claim `0`
- 429 body parse前classification
- 429 bodyのtrust／render／log `0`
- canonical UI copy
- draft保持
- navigation `0`
- automatic retry `0`
- N6 history mutation `0`
- rejected Event／Criterion row delta intent `0`
- accepted Event＋default Criterion atomicity
- service-role use `0`
- M01〜M11 immutable
- M12 absent
- Class R／Class M separation
- Production separate Human authorization

### 4.6 Tunable parameters

counting key、limit、window、action mode、rule priority、environment scope、追加WAF条件、Bot Protection／ChallengeはHuman-controlled operational parametersである。

- `60 → 80`: routine operational tuning candidate
- `IP → JA4`: architecture／risk review
- application-side／central limiter: architecture change
- login requirement: product policy rebaseline

いずれもevidenceとbounded Human-approved operationを必要とし、Plan adoptionから変更permissionを導出しない。

---

## 5. Confirmed current implementation facts

### 5.1 Client response order

`src/components/CreateEventForm.tsx`は現在、`fetch()`完了後にHTTP statusを分類せず、先に`response.json()`を実行する。

結果として現在の429は次になる。

- empty／HTML／malformed body: JSON parse errorにより`OUTCOME_UNKNOWN`
- recognized JSON body: body内statusに従ったgeneric classification
- dedicated rate-limit classification: `0`

現在も次は成立する。

- title／memo stateはfailure後も保持される。
- navigationは`created`分岐だけである。
- retry loopはない。
- Event creation componentはN6 history APIを直接呼ばない。

### 5.2 Current API response matrix

| Current condition | HTTP | JSON status | DB dispatch |
|---|---:|---|---:|
| request body JSON parse failure | 400 | `failed` | 0 |
| parsed title／memo validation failure | 400 | `invalid` | 0 |
| exact body shape等のpre-dispatch known failure | 503 | `failed` | 0 |
| DB／configuration known failure | 503 | `failed` | condition-dependent |
| post-dispatch uncertain outcome | 503 | `outcome_unknown` | 1 |
| created | 201 | `created` | 1 |

N7 client handlingのために`src/app/api/events/route.ts`または`CreateEventRouteResult`を変更しない。

### 5.3 N6 history

- HTTP 201だけではhistoryを書かない。
- share pageでEvent取得成功後にだけ`EventHistoryRecorder`をrenderする。
- recorderはhydration後のeffectでhistoryを記録する。
- 429時はnavigationしないためrecorderはmountされない。

### 5.4 DB atomicity

- validated Event INSERTはparameterized statementとしてexact 1回dispatchされる。
- default CriterionはEvent INSERT triggerで生成される。
- trigger失敗時はEvent INSERTと同じtransactionで失敗する。
- known failureとpost-dispatch unknownは分離済みである。
- N7 client deltaはDB adapter、migrationまたはatomicityを変更しない。

---

## 6. Exact future implementation candidate

### 6.1 Candidate paths

1. `src/components/CreateEventForm.tsx`
2. `tests/slice-1.spec.ts`

この2 pathsはPlan上のfuture candidateであり、本Plan作成によって変更permissionを得ない。

### 6.2 Explicitly excluded paths

- `src/app/api/events/route.ts`
- `src/lib/event-types.ts`
- `src/lib/event-creator-db.ts`
- `src/lib/event-creator-db-contract.ts`
- `src/lib/event-history.ts`
- `src/components/EventHistory.tsx`
- `tests/event-history.spec.ts`
- `tests/event-creator-db.spec.ts`
- new helper／test file
- package／lockfile
- migration／Supabase file
- CSS／copy canonical document

### 6.3 Client delta design

Implementation authorization後、`fetch()`がresponseを返した直後、`response.json()`の前にexact `response.status === 429`を判定する。

429 branchは次を満たす。

- response bodyを読まない。
- response bodyをtrust、renderまたはlogしない。
- canonical copyを既存`role="alert"`へ表示する。
- title／memo stateを変更しない。
- navigationを行わない。
- retryを行わない。
- N6 historyを変更しない。
- `CreateEventRouteResult`へ429 variantを追加しない。

Canonical copy:

> 短時間に多くのきめごとが作成されました。
> しばらくしてからもう一度お試しください。

Non-429 branchは現在のbody validationとclassificationを維持する。403、non-429 5xx、network failure、malformed non-429 bodyをrate-limitと表示しない。

### 6.4 No new abstraction

429 handlingは`CreateEventForm`内の一意なresponse branchとして実装し、generic response framework、retry helper、rate-limit storage、analyticsまたはexternal dependencyを追加しない。

---

## 7. DB-independent QA design

### 7.1 Test location and mechanism

- Test path: `tests/slice-1.spec.ts`
- Existing Playwright `page.route()` mockを使用する。
- Existing Next.js local web serverを使用する。
- Supabase Data API／Postgres／Vercel／credentialを必要としないcaseとして実行する。
- new dependency、helper、configまたはtest fileを追加しない。
- automatic retryは`0`とする。

### 7.2 429 cases

最低限次の3 caseを独立確認する。

1. HTTP 429 with HTML body
2. HTTP 429 with empty body
3. HTTP 429 with malformed JSON body

各caseで次を確認する。

- canonical copy 2文が既存alertに表示される。
- body固有sentinelがUIへ表示されない。
- request count exact `1`。
- title draftが保持される。
- memo draftが保持される。
- root pageからnavigateしない。
- automatic retry `0`。
- `kimenosuke:event-history:v1`が事前値から変化しない。

### 7.3 Non-429 regression

- HTTP 403はrate-limit copyを表示しない。
- non-429 5xxはrate-limit copyを表示しない。
- network abortは既存`OUTCOME_UNKNOWN`を表示する。
- `503 / outcome_unknown`を維持する。
- `400 / failed`と`400 / invalid`をrate-limitへ統合しない。
- unrecognized successful-response shapeは既存`OUTCOME_UNKNOWN`を維持する。
- valid `201 / created` flowを維持する。

### 7.4 C1 required DB-independent candidate commands

Implementation／test executionが別途承認された場合の必須候補:

- focused Playwright cases for `tests/slice-1.spec.ts` with `--workers=1 --retries=0`
- `npm run check`
- `npm run build`
- `git diff --check`

C1はroute mockだけを使用し、DB／Supabase／Vercel／credential／external accessを`0`とする。Exact command、environmentおよびtest selectionはimplementation-start packetで固定する。本Planはtestを実行しない。

### 7.5 C2 optional existing local regression candidate

次はC1とは分離したoptional candidateであり、Plan adoption時点の必須QAではない。

- existing `tests/event-creator-db.spec.ts` regression without modification
- existing `tests/event-history.spec.ts` regression without modification

C2の必要性はimplementation packetで判断し、実行する場合はexact command、environment、connection target、test isolationおよびcredential requirementを固定する。local DBを使用する場合は、別Human authorizationでexact local DB targetを明示する。external Supabase／Production接続は`0`とする。C2を実行しない場合は、source確認とC1で今回の2-path deltaを十分に検証できる理由を記録する。

---

## 8. Evidence responsibility separation

### 8.1 C1 source／DB-independent QA evidence

- status 429をbody parse前に分類する。
- 429 body内容へ依存しない。
- canonical copyを表示する。
- draft、navigation、retry、N6 history境界を維持する。
- non-429誤分類がない。
- API route、DB adapter、migrationを変更していない。
- application-level retry loopがない。
- request count exact `1`、draft保持、navigation `0`およびN6 history mutation `0`。

### 8.2 C2 optional existing local regression evidence

- existing Event creator DB adapter behaviorの回帰有無
- existing Event history behaviorの回帰有無
- 実行する場合のlocal test target、isolationおよびcredential boundary

C2はoptionalであり、Provider／Hosted evidenceを代替しない。

### 8.3 Provider documentation／read-only inventoryが必要

- exact environment predicate
- rule priority semantics
- active／draft／versions semantics
- regional counter behavior
- exact activation／cleanup endpoints
- Preview isolationのtechnical feasibility

### 8.4 Hosted QAが必要

- deployed responseがexact HTTP 429となること
- intended route／methodだけにruleがmatchすること
- pre-route／pre-DB rejection
- rejected Event／Criterion row delta `0`
- Production non-interference
- threshold／windowのprovider-observed behavior
- raw-IP-free observabilityの成立性

未確認のprovider／Hosted factをlocal resultから`PROVEN`または`PASS`へ昇格させない。

---

## 9. Plan phases

### Phase A — Design finalization

Human tasks:

- Plan candidateをreviewする。
- review結果を踏まえたadoption判断を別Human gateへ送る。

Agent tasks:

- current source／testsをfresh確認する。
- exact 2-path deltaとtest matrixを固定する。
- source driftまたはscope外dependencyを報告する。

Credential: `NOT REQUIRED / ACCESS 0`

Permission: docs review only。implementation permissionを含まない。

STOP:

- Plan／Contract identity drift
- exact 2 pathsでは要件を満たせない
- product／architecture decisionが必要
- dependency、route、DBまたはN6 history変更が必要

Output: fixed reviewed candidate identity and review verdict。Human adoptionは含まない。

Next gate: exact Plan Human adoption。review PASSからadoptionまたはimplementation startを導出しない。

### Phase B — Implementation

Human tasks:

- exact branch／Head／2-path scopeとtest permissionを承認する。

Agent tasks:

- `CreateEventForm.tsx`へ429-before-body branchを実装する。
- `tests/slice-1.spec.ts`へDB-independent testsを追加する。
- unrelated formatting／refactorを行わない。

Credential: `NOT REQUIRED / ACCESS 0`

Permission: exact implementation-start authorization後だけ。

STOP:

- source baseline drift
- new helper／dependency／pathが必要
- route schema、DB contractまたはN6 history変更が必要
- canonical copy変更が必要

Output: exact 2-path implementation candidate。

Next gate: local／DB-independent QA authorization or same bounded implementation packetで明示されたQA。

DB-independent application implementationとC1は、defensive client handlingとしてarchitecture adoption前に実行可能である。これらの結果からVercel-aligned architecture adoption、credential access、Class R、Class MまたはHosted QA permissionを導出しない。

### Phase C1 — Required DB-independent focused QA

Human tasks:

- test scopeとcandidate identityを確認する。
- QA結果とblocking findingをreviewする。

Agent tasks:

- 429 body variationsとnon-429 regressionを実行する。
- typecheck、build、static diff checkを実行する。
- source／test identityとsecret-free resultを記録する。

Credential: `NOT REQUIRED / ACCESS 0`

Permission: approved local test commands only。DB access／mutation、Supabase、Vercel、credentialおよびexternal operationを含まない。retryは`0`とする。

STOP:

- test failure
- N6、routeまたはDB regression
- testがexternal targetへ接続する
- expected resultを満たすためscope拡張が必要

Output: DB-independent QA candidate evidence。

Next gate: focused implementation review。Plan adoptionまたはlocal QAからClass Mを導出しない。

### Phase C2 — Optional existing local regression

Human tasks:

- C2が必要と判断された場合だけ、exact command、environment、connection target、test isolationおよびcredential boundaryを承認する。

Agent tasks:

- authorized packetに含まれる場合だけ、既存`tests/event-creator-db.spec.ts`および／または`tests/event-history.spec.ts`を変更せず実行する。
- C1 evidenceと分離して結果を記録する。

Credential: `NOT REQUIRED / ACCESS 0`をfresh確認する。credentialが必要ならC2を実行せず別Human authorizationへ戻す。

Permission: optional candidate。local DBを使用する場合はexact local targetを指定した別authorizationが必要。external Supabase／Production接続は`0`。

STOP:

- exact command、target、isolationまたはcredential boundaryが不明
- external targetへの接続可能性がある
- existing regressionを通すためにscope拡張が必要

Output: optional local regression evidence。C2はHosted QAの代替ではない。

### Architecture decision gate — `N7_VERCEL_ALIGNED_ARCHITECTURE_HUMAN_ADOPTION`

Focused implementation review後、HumanはVercel-aligned architecture candidateをadoptまたはrejectする。adoptionはarchitecture decisionだけであり、credential access、Class R、Class M、Firewall mutationまたはHosted QA permissionを生成しない。

Humanは次を判断する。

- Vercel-aligned route-specific operational abuse mitigationを採用するか。
- provisional 60／600／IP parameterをlaunch candidateとして維持するか。
- unresolved provider／Hosted factsを後続Class M packet設計で解消する方針を受容するか。
- old global-exact architectureをrejectedのまま維持し、architecture adoptionがClass M permissionではないことを確認する。

Architectureがrejectされた場合、Phase Dへ進まずClass M packetまたはFirewall mutationを行わない。実装済みのsafe 429 handling candidateの保持、変更または不採用のdispositionをHumanへ戻す。

### Phase D — Class M packet design

Preconditions:

- focused implementation review: `PASS`
- exact implementation identity: fixed
- `N7_VERCEL_ALIGNED_ARCHITECTURE_HUMAN_ADOPTION`: `PASS`
- separate Class M packet design authorization: `AUTHORIZED`

Human tasks:

- 追加Class R、credential accessまたはpacket作成scopeを別途承認する。
- full threshold testとtemporary lower threshold candidateを比較する。

Agent tasks:

- exact Team／Project／environment／branch／commitを固定する。
- active baseline、draft state、versions、rule priority、environment predicateをread-onlyで確認する。
- intended semantic diff、M1〜M4、read-back、outcome-unknown、cleanupを設計する。
- Production non-interferenceとraw-IP-free evidence pathを評価する。

Credential: packet設計だけなら原則不要。live inventoryが必要な場合は別authorizationとexact profileが必要。

Permission: design only。mutation `0`。

STOP:

- unknown／unowned draft
- active version drift
- target／credential identity mismatch
- Production影響が不明
- raw IP取得が必要
- exact diff／correlation／cleanupを設計できない
- architectureが未採用またはrejectされた

Output: review-ready exact Class M operation packet candidate。

Next gate: Class M packet review。review結果からcredential accessまたはClass M authorizationを導出しない。

### Phase E — Preview mutation

Human tasks:

- token必要性、scope、expiry、retentionを確認する。
- credential safety preflightを確認する。
- exact mutation count、target、STARTを承認する。

Agent tasks:

- identity-first preflightを行う。
- authorized M1 draft create／updateをexact 1回実行する。
- draft exact diffをread-backする。
- authorized M2 activation／publishをexact 1回実行する。
- active configurationをread-backする。

Credential: Human-managed exact project-scoped profileが必要。ambient fallback禁止。

Permission: separate exact Class M authorizationだけ。

STOP:

- target、profile、active baselineまたはdraft drift
- unrelated semantic delta
- Production requestへmatchする可能性
- mutation outcome unknown
- retryが必要
- secretまたはraw sensitive evidenceの保存が必要

Output: M1／M2 result、active read-back、mutation ledger。

Next gate: separately authorized Hosted QA。

### Phase F — Hosted QA

Human tasks:

- exact deployment、test design、fixture upper bound、cleanup boundaryを承認する。
- Hosted QA結果とshared-IP false-positive assessmentを確認する。

Agent tasks:

- authorized controlled boundary testを行う。
- exact 429、draft／navigation／retry／history、business row deltaを確認する。
- Production non-interferenceとprivacy-safe evidenceを確認する。

Credential: operation packetが定義する必要最小限だけ。raw IP、Cookieまたはdefault account fallbackは使用しない。

Permission: separate Hosted QA authorizationだけ。

STOP:

- target ambiguity
- 429／route／method mismatch
- rejected row deltaが0でない
- Production影響
- privacy-safe proof不能
- outcome unknownまたはretryが必要

Output: Hosted QA evidenceとcleanup／retention decision input。

Next gate: Human cleanup／retention decision。

### Phase G — Cleanup／retention

Human tasks:

- Preview ruleをcleanupするかretainするか決定する。
- cleanup時はexact M3／M4を別途承認する。
- token retention／revokeを再判断する。
- threshold tuningまたはlayered protectionの要否を判断する。

Agent tasks:

- cleanup承認時だけM3 cleanup draft create／updateを実行する。
- exact cleanup diffをread-backする。
- M4 cleanup activation／publishを実行する。
- final active semantic stateをread-backする。
- retention時はmutationせずrule identity、review condition、known limitationを記録する。

Credential: M3／M4実行時だけ必要。

Permission: exact cleanup packet authorizationだけ。

STOP:

- rule／version correlation不能
- unrelated draft／active drift
- exact cleanup diff不能
- sensitive comparisonが`UNCOMPARABLE`
- outcome unknownまたはretryが必要
- Production operationが必要

Output: final active postcheckまたはretention record、credential disposition。

Next gate: Head review／acceptance preparation。Productionは別gate。

### Phase H — Head review／acceptance

Human tasks:

- focused／Independent Review結果を確認する。
- exact Headをaccept／rejectする。
- later Git publication／mergeを別途承認する。

Agent tasks:

- exact Head、scope、QA、external evidence、remaining gatesを統合する。
- permission inflation、secret leakage、unresolved blockerを確認する。

Credential: `NOT REQUIRED`。review中のcredential access `0`。

Permission: reviewだけ。automatic publication／merge `0`。

STOP:

- Head／scope／evidence drift
- blocking review finding
- cleanup／retention disposition不明
- Production permissionが必要

Output: exact Head review candidate and Human acceptance input。

Next gate: separately authorized publication／merge／Production progression as applicable。

---

## 10. Human work sequence

Humanは次を時系列で判断する。

1. Plan candidateをreviewする。
2. Planをadopt／rejectする。
3. implementation STARTを別途承認する。
4. application implementationを実施する。
5. required C1 DB-independent QA結果を確認する。
6. focused implementation review結果を確認する。
7. `N7_VERCEL_ALIGNED_ARCHITECTURE_HUMAN_ADOPTION`でarchitectureをadopt／rejectする。
8. architecture adoptionとは別にClass M packet design authorizationを判断する。
9. Class M packetをreviewする。
10. token必要性、scope、expiryとcredential safety preflightを確認する。
11. exact credential／Class M packetをauthorize／rejectする。
12. Preview mutationを承認する。
13. Hosted QA結果を確認する。
14. cleanup／retentionを判断する。
15. threshold tuningとlayered protection追加の要否を判断する。
16. exact Headをaccept／rejectする。
17. Git publicationを別途承認する。
18. later mergeを別途承認し、token retention／revokeを再判断する。

Review PASS、Plan adoption、implementation resultまたはHosted resultから次のHuman permissionを自動導出しない。

---

## 11. Credential lifecycle

### 11.1 Plan drafting and DB-independent phases

- Token required: `NO`
- Credential access: `0`
- Vercel API／CLI: `0`
- Browser Cookie／ambient CLI login／default account fallback: `0`

### 11.2 Current credential fact

- project-scoped Vercel tokenが存在する。
- exact Project readは過去のbounded Class RでPASSしている。
- selected Projectは`where-to-visit-kimenosuke`である。
- tokenはtechnically write-capableである可能性がある。
- capabilityはoperation permissionではない。
- Humanはpre-launch development中の保持を許容しているが、保持はAPI利用authorizationではない。

### 11.3 Future credential-dependent tasks

各taskは次を明示する。

- tokenが必要か
- Humanが行う作業
- exact scope／target
- expiry／fresh validity
- profile mode、type、approved keys
- safety preflight
- permitted operationとmutation upper bound
- exact START
- output／evidence secret boundary
- post-operation retention／revoke review

Agentはcredentialをcreate、copy、overwrite、delete、rotate、revokeまたはbroadenしない。ambient login、saved default token、browser Cookie、別Team／Projectはfallbackにしない。

---

## 12. Class R／Class M and external-operation boundary

### 12.1 Class R

Class Rは別Human authorizationのexact target、Goal、resource categories、credential、privacy、request、pagination、retry、timeout、wall-clockおよびSTOP条件内のread-only investigationである。

Class R result、credential capabilityまたはPlan adoptionはClass M permissionを生成しない。

### 12.2 Class M

| Mutation | Meaning |
|---|---|
| M1 | N7 draft create／update |
| M2 | N7 draft activation／publish |
| M3 | cleanup draft create／update |
| M4 | cleanup activation／publish |

各mutationは独立したexternal mutationで、retry `0`とする。PATCH successはactive enforcement完了ではない。draft read-back、activation、active read-backを分離する。

Timeout、connection loss、5xx、response parse failure等の`OUTCOME_UNKNOWN`後はblind retryせず、別途許可されたread-only reconciliationでmutation 0、draft-only、activated、cleanup-draft-only、cleanup-activated、partial／unknownを分類する。

### 12.3 Production

Preview-targeted ruleであってもproject-level configuration mutationである。Production非干渉を証明できない場合はSTOPする。Production operationは常に別の明示Human authorizationを必要とする。

---

## 13. Hosted QA strategy

### 13.1 Boundary design

Candidateは次のいずれかを後続Human decisionへ提示する。

1. configured launch thresholdに対するthreshold−1／threshold／threshold＋1 test
2. separately authorized temporary lower QA thresholdでのbounded test

60件の恒久Event作成を自動要求しない。temporary thresholdもPlan adoptionだけでは許可しない。

### 13.2 Required packet decisions

- request upper bound
- accepted fixture upper bound
- Event／Criterion row expectation
- DB／function cost
- threshold window waiting policy
- cleanup exact target
- temporary thresholdからlaunch値へ戻す方法
- M3／M4がrule removalかlaunch-value restorationか
- Production non-interference
- retry `0`
- outcome-unknown disposition

### 13.3 Hosted assertions

- exact Preview target／deployment／commit
- exact route／method
- browser-visible HTTP 429 handling
- 429 body非依存
- draft／navigation／retry／N6 history mutation `0`
- rejected Event／Criterion row delta `0`
- accepted atomicity
- region-scoped resultをglobal exact保証へ拡張しない
- shared-IP false-positive Human assessment
- raw IP evidence `0`
- privacy-safe evidence
- cleanup／retention Human decision

---

## 14. Observability and tuning

Privacy-safe signal candidates:

- 429 count
- rule match count
- time bucket
- route
- environment
- support inquiry
- business row growth
- function／cost anomaly
- false-positive incident
- school／workshop context

raw IP、raw Firewall event、request、header、Cookie、per-value digestまたはreversible surrogateをpersistent evidenceの前提にしない。

Loosen candidate:

- school／workshopでlegitimate 429
- shared-IP false positive
- support inquiry
- legitimate burst approaching threshold

Tighten／layer candidate:

- repeated junk Event
- persistent single-IP saturation
- cost／DB anomaly
- scripted behavior
- distributed botまたはthreshold probing

Signalはconfigurationを自動変更しない。Humanがevidence quality、false-positive risk、shared-IP context、change classおよびexact operation packetをreviewする。

---

## 15. STOP conditions

次の場合はscopeを拡張せずSTOPする。

- Contract、Plan、branch、Headまたはtarget identity drift
- exact implementation 2 pathsではGoalを満たせない
- exact Plan artifact／canonical routing scope外の変更が必要
- Requirements、DoD、QA Flow、ADRまたはcopy正本変更が必要
- API route、event type、DB adapter、N6 historyまたはmigration変更が必要
- dependency、helper、test fileまたはconfig追加が必要
- architectureまたはproduct policy decisionが必要
- unapproved credential accessまたはexternal requestが必要
- unknown／unowned Firewall draft
- active baseline driftまたはunrelated semantic delta
- Preview isolation／Production非干渉を証明できない
- raw IPまたはsecret保存が必要
- mutation／Hosted outcome unknown
- retryが必要
- business row、atomicity、M01〜M11、M12 absenceまたはservice-role boundaryが崩れる
- blocking review findingがある

Scope外findingは修正せず、owner／Humanへ報告する。

---

## 16. Definition of Done

### 16.1 Plan candidate DoD

- exact adopted Contract identityとbase Headを記録
- status `DRAFT / NOT ADOPTED / NOT IMPLEMENTATION AUTHORIZED`
- exact implementation candidate 2 paths
- application deltaとnon-goalsが一意
- required C1 DB-independent QAとoptional C2 existing local regressionを分離
- source／provider／Hosted evidence責務を分離
- Phase A〜HでHuman／Agent／credential／permission／STOP／output／next gateを記載
- Human work sequenceを明示
- architecture adoption gateをClass M packet design前の必須条件として明示
- credential lifecycleを明示
- Class R／Class M、M1〜M4、Production separate gateを維持
- unresolved live factsをPASS化しない
- architecture adoption `0`
- implementation／external permission `0`

### 16.2 Future implementation DoD candidate

- exact 2-path delta
- 429 before body parse
- 429 body trust／render／log `0`
- canonical copy
- title／memo draft保持
- navigation／retry／N6 history mutation `0`
- non-429誤分類 `0`
- 201、400、403、503、network regression PASS
- required C1 typecheck／build／focused tests PASS
- optional C2の実行有無、target、isolationおよび結果を別分類
- DB／migration／dependency／copy変更 `0`

### 16.3 External progression DoD candidate

- focused implementation review PASS
- exact implementation identity fixed
- `N7_VERCEL_ALIGNED_ARCHITECTURE_HUMAN_ADOPTION` PASS
- separate Class M packet design authorization
- exact Class M packet Human authorization
- target、credential、active／draft／versions identity PASS
- exact intended diff、M1〜M4、outcome-unknown、cleanup一意
- Preview isolation／Production非干渉 PASS
- active read-back PASS
- separately authorized Hosted QA PASS
- rejected business row delta `0`
- privacy-safe evidence PASS
- Human cleanup／retention and credential disposition complete

このexternal progression DoDはPlan review、Plan adoptionまたはDB-independent implementationをblockしないが、Class M／Hosted／Production progression前には必須である。

---

## 17. Evidence

Persistent evidenceはsecret-freeとし、最低限次を記録する。

- Contract／Plan／Head identity
- exact changed paths
- test command identityとretry count
- 429 body category（本文は保存しない）
- client classification result
- draft／navigation／retry／history result
- C1／C2／provider／Hosted evidence classification
- Class M operation countとread-back identity
- business row postcheck
- Production operation count
- credential access／output count
- cleanup／retention disposition
- review verdictsとremaining gates

保存しないもの:

- Vercel token
- Authorization header
- browser Cookie
- raw IP／CIDRまたはper-value derivative
- raw Firewall event／request／header
- database URL／password／CA body
- share token／capability-bearing pathname
- environment dump

---

## 18. Human gates and handoff

Required gates remain separate.

1. `N7_IMPLEMENTATION_PLAN_REVIEW`
2. exact Plan Human adoption
3. implementation-start authorization
4. application implementation
5. required C1 DB-independent QA
6. focused implementation review
7. `N7_VERCEL_ALIGNED_ARCHITECTURE_HUMAN_ADOPTION`
8. Class M packet design authorization
9. Class M packet review
10. credential／Class M packet authorization
11. Preview mutation authorization
12. Hosted QA authorization
13. cleanup／retention decision and optional M3／M4 authorization
14. exact Head review／Human acceptance
15. Git publication authorization
16. later merge authorization
17. Production authorization

このPlan candidateの次gateは`N7_IMPLEMENTATION_PLAN_REVIEW`である。

---

## 19. Candidate lifecycle

- Plan: `DRAFT / NOT ADOPTED / NOT IMPLEMENTATION AUTHORIZED`
- Independent Review: `NOT RUN`
- Human adoption: `NOT COMPLETED`
- Architecture: `NOT ADOPTED`
- Implementation: `NOT AUTHORIZED / NOT STARTED`
- Test execution: `NOT AUTHORIZED / NOT RUN`
- Credential access: `0`
- Vercel／Firewall operation: `0`
- Class M: `NOT AUTHORIZED / NOT RUN`
- Hosted QA: `NOT AUTHORIZED / NOT RUN`
- Git publication／merge: `NOT AUTHORIZED`
- Production: `NOT AUTHORIZED`
- Next gate: `N7_IMPLEMENTATION_PLAN_REVIEW`

Plan review PASSからHuman adoption、implementation、credential access、Class R、Class M、Hosted QA、Git publication、mergeまたはProductionを導出しない。
