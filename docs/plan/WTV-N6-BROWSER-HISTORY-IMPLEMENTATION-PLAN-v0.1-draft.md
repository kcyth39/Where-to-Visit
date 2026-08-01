# WTV-N6-BROWSER-HISTORY-IMPLEMENTATION-PLAN v0.1-draft

## 0. Plan identity

- Plan ID:  
  `WTV-N6-BROWSER-HISTORY-IMPLEMENTATION-PLAN`
- Version:  
  `v0.1-draft`
- Status:  
  `DRAFT / NOT ADOPTED / NOT IMPLEMENTATION AUTHORIZED`
- Primary technical owner:  
  `Tech Lead`
- Future implementation owner:  
  `Fullstack Engineer`
- QA／environment focused owner:  
  `DevOps`
- Governing Contract:  
  `WTV-N6-BROWSER-HISTORY-IMPLEMENTATION-CONTRACT v0.4-draft`
- Contract status:  
  `ADOPTED / INDEPENDENT REVIEW PASS`
- Output form:  
  `Chat-only Implementation Plan draft`
- Repository artifact:  
  `NOT CREATED`

このPlan作成authorizationから、Plan adoption、branch／worktree作成、repository変更、test実行、local Supabase操作、Git publication、Hosted QA、外部操作を導出しない。

---

# 1. Baseline

## 1.1 Confirmed repository identity

- Repository:  
  `kcyth39/Where-to-Visit`
- N5 accepted Head:  
  `022b85776109bae62ef21380539523bafc3e147b`
- N6 Handoff branch:  
  `codex/n6-handoff-and-entry`
- N6 Handoff Head:  
  `af0a6f8693dd6ec6f45e03e13319751caa7deb67`
- N6 Handoff upstream:  
  `origin/codex/n6-handoff-and-entry`
- Ahead／behind:  
  `0 / 0`
- Worktree:  
  `/private/tmp/n6-handoff-and-entry/Where-to-Visit`
- Worktree／stage:  
  `clean`
- `.git/index.lock`:  
  `absent`
- `AGENTS.md == CLAUDE.md`:  
  `PASS`
- N5 accepted Head ancestry:  
  `PASS`

## 1.2 PR #40 fresh metadata

- PR: `#40`
- State: `OPEN`
- Draft: `true`
- Mergeable: `MERGEABLE`
- Base:  
  `codex/n5-ownerless-transition@022b85776109bae62ef21380539523bafc3e147b`
- Head:  
  `codex/n6-handoff-and-entry@af0a6f8693dd6ec6f45e03e13319751caa7deb67`
- Commits: `4`
- Changed paths: docs-only exact `7`

PR #40へN6 implementation commitを追加しない。

## 1.3 Expected implementation identity

Humanが別途implementation startとbranch／worktree作成を承認した場合の候補:

- Branch:  
  `codex/n6-browser-history`
- Base branch:  
  `codex/n6-handoff-and-entry`
- Exact base Head:  
  `af0a6f8693dd6ec6f45e03e13319751caa7deb67`
- Proposed worktree:  
  `/Users/shige/.codex/worktrees/n6-browser-history/Where-to-Visit`
- Future stacked PR base:  
  `codex/n6-handoff-and-entry`

branchまたはworktree pathが既に存在する場合は再利用、削除、上書きをせずSTOPする。

remote branch不存在は実行直前にfresh確認する。今回のPlan作成ではbranch／worktreeを作成しない。

## 1.4 Current source facts

- TopはServer Componentの`src/app/page.tsx`
- Event作成は`CreateEventForm`から`POST /api/events`
- 成功responseは`/e/<43-char-token>?created=1`
- Event作成responseだけではEvent取得成功を保証しない
- share pageは`getEventByShareToken()`成功後に`EventApp`をrenderする
- share page失敗時はEvent history recorderを置ける成功dataがない
- Candidate detailは別routeであり、N6 record対象ではない
- `EventApp`のselected participant storageにはunguardedな`getItem`、`setItem`、`removeItem`がある
- repositoryにReact component-test専用dependencyはない
- Playwrightと既存local target wrapperを利用可能
- migrationsはexisting 10＋N5 exact 1、合計11
- N6 HandoffはN5からpackage、migration、application source、testsを変更していない

## 1.5 Operations not authorized now

- implementation start
- branch／worktree作成
- repository file変更
- dependency操作
- test実行
- local Supabase start／query／fixture／cleanup
- stage／commit／push／PR変更
- Hosted QA
- Supabase／Vercel／Production操作
- N7開始

---

# 2. Implementation strategy

## 2.1 General approach

実装は次の依存順で行う。

1. fresh implementation preflight
2. pure history domain logic
3. client history UIとrecorder
4. Top／history route integration
5. share page recording integration
6. selected participant fail-soft hardening
7. scoped CSS
8. design／copy candidate synchronization
9. DB-independent QA
10. separate authorization後のlocal Supabase integration QA
11. focused review
12. publication gate前停止

並行化は目的にしない。

pure logicのcontractとtestsが安定した後でUI integrationへ進み、UI behaviorが確定した後にdesign／copyを同期する。

---

# 3. Implementation sequence

## Step 0 — Fresh implementation preflight

Implementation start authorization後、変更前に確認する。

- accepted Contract identity
- adopted Plan identity
- repository／worktree root
- branch／HEAD
- actual `origin/codex/n6-handoff-and-entry`
- PR #40 base／head／Draft／docs-only
- exact base SHA
- N5 ancestry
- target local／remote branch不存在
- target worktree path不存在
- worktree parent identity
- dirty／staged／untracked 0
- Git lockなし
- `AGENTS.md == CLAUDE.md`
- exact 10-path scope
- owner-unknown change 0
- dependency ownership conflict 0
- package／lockfile baseline
- `supabase/` tree baseline
- current migrations exact 11

driftがあればbranch／worktreeを作成せずSTOPする。

別 authorizationがexact branch／worktree作成を許可した場合だけ、`af0a6f…`から専用branch／linked worktreeを作成する。

## Step 1 — Pure history domain logic

対象:

- `src/lib/event-history.ts`
- `tests/event-history.spec.ts`

実装責任:

- key、version、TTL、future skew、max count
- entry／payload TypeScript shape
- canonical pathname construction／validation
- title normalization／validation
- ISO timestamp validation
- root payload classification
- entry purge
- dedupe
- deterministic sort
- upsert
- individual removal
- remove-all
- fail-soft storage adapter

固定値:

- key: `kimenosuke:event-history:v1`
- version: `1`
- TTL: `15,552,000,000ms`
- future skew: `300,000ms`
- maximum: `30`
- recent: `2`

設計:

- module evaluation時に`window`、`localStorage`、`Date.now()`へ触れない
- storageとcurrent timeをcallerから渡せる小さなinterfaceにする
- N6専用helperに限定し、generic storage framework化しない
- console、analytics、retry、fallback keyを持たない
- `localStorage.clear()`を提供しない
- share token単体を受ける汎用保存APIを作らない

title:

- sourceは取得成功したstored `Event.title`
- trim後non-empty
- Unicode scalar value count 1〜80
- React textとして使用
- HTML変換0

root read result:

```text
neutral
ready(entries)
unavailable
```

- key absent: `ready([])`／confirmed empty
- valid entries 0: `ready([])`
- `getItem`例外: `unavailable`
- malformed root: sanitized empty＋N6 key cleanupをbest-effortで1回
- entry repair failure: sanitized in-memory resultは使用可能、storage修復成功は主張しない

## Step 2 — Client history UI and recorder

対象:

- `src/components/EventHistory.tsx`
- `tests/event-history.spec.ts`

同一client module内に、責任を分けたcomponentを置く。

### EventHistory

propsはrecent／fullの表示modeだけに限定する。

state:

- `neutral`: SSRと最初のclient render
- `ready`: valid entries。0件ならconfirmed empty
- `unavailable`: read outcome不明
- explicit mutation failure: 直前の確定entriesを維持

behavior:

- storage readはmount後のeffectだけ
- recentは先頭2件
- fullは最大30件
- titleはReact text node
- pathname／tokenをvisible labelにしない
- `lastVisitedAt`を表示しない
- unavailableをemptyと呼ばない
- deleteはstorage成功後だけReact stateへ反映
- delete failureではentryをoptimisticに消さない
- remove-allはN6 keyだけ
- full deleteは誤操作防止確認を持つ
- retry loopなし
- hydration後のfocus移動なし

### EventHistoryRecorder

- visual outputなし
- serverでEvent lookup成功した場合だけmount
- inputはcanonical pathnameとvalidated stored titleだけ
- mount effect内でread／sanitize／upsert／write
- EventAppへerrorを伝播しない
- write失敗を成功表示しない
- duplicate effectでも同一pathnameを2 entryへ増やさない
- query／fragmentを受け取らない

## Step 3 — Top and full history route

対象:

- `src/app/page.tsx`
- `src/app/history/page.tsx`
- `src/app/globals.css`
- `tests/event-history.spec.ts`

Top:

- existing `BrandHeader`
- intro
- `CreateEventForm`
- `home-grid`

を維持する。

既存作成UIの下にrecent historyを追加する。

- heading candidate: `最近のきめごと`
- maximum 2
- full listへの導線
- neutral SSR shell
- CreateEventForm behavior変更0

`/history`:

- existing `BrandHeader`を再利用
- heading candidate: `きめごと一覧`
- maximum 30
- individual delete
- all delete
- privacy semantics
- server-side storage read 0

BrandHeader自体は変更しない。

## Step 4 — Share-page recording integration

対象:

- `src/app/e/[shareToken]/page.tsx`
- `src/components/EventHistory.tsx`
- `tests/event-history.spec.ts`

sequence:

1. route param取得
2. canonical share-token shape確認
3. canonical pathname構築
4. `getEventByShareToken()`実行
5. lookup success確認
6. stored `Event.title`取得
7. title validation
8. recorderへpathname／titleを渡す
9. `EventApp`を従来どおりrender

recordしない:

- invalid token
- not found
- lookup error
- DB／RLS／network failure
- invalid stored title
- Candidate detail route
- Event API responseだけが成功した状態
- navigation未完了
- `OUTCOME_UNKNOWN`
- rate-limit拒否

`created=1`は既存の`initialSetup`処理にだけ使用し、recorderへ渡さない。

変更しない:

- `getEventByShareToken()`のDB contract
- `EventApp` propsの既存意味
- sharing link生成
- not-found copy
- Candidate detail route
- API route
- Event creation response contract

## Step 5 — Selected participant fail-soft hardening

対象:

- `src/components/EventApp.tsx`
- `tests/event-history.spec.ts`

変更はexisting selected participant storage access周辺だけに限定する。

### Read failure

- `getItem`をcatch
- selected participantは`null`
- `selectionReady`は`true`
- Event表示／共同編集を継続
- retry 0
- error／key／value出力0

### Write failure

- React上の新しいselectionを維持
- persistenceだけ断念
- participant-dependent操作を継続
- persistence成功を主張しない
- retry 0

### Remove failure

- React上のselectionを解除
- storageから消えたとは主張しない
- Event操作を継続
- retry 0

### Invalid stored selection

- React上は未選択
- existing cleanup removeをbest-effortで行う
- remove failureでも`selectionReady = true`
- Event flowを停止しない

変更しない:

- key prefix
- event IDとのkey構成
- value format
- normal selection semantics
- event switching
- participant resolution
- pending operation
- mutation behavior
- UI hierarchy

## Step 6 — Scoped styling

対象:

- `src/app/globals.css`

追加するもの:

- recent list
- full list
- list entry
- privacy note
- confirmed empty
- unavailable
- failure
- delete actions
- responsive arrangement
- focus-visible state

維持するもの:

- existing design token
- typography
- color hierarchy
- button hierarchy
- 8px radius基準
- minimum touch target
- existing top layout
- Event screens

確認viewport:

- `320px`
- `375px`
- `1366px`

実Event pathnameを含むscreenshotは作らない。

## Step 7 — Design and copy candidate synchronization

対象:

- `DESIGN.md`
- `docs/reports/ui-copy-decisions.md`

`DESIGN.md`:

- recent／full history UI構造
- responsive behavior
- privacy meaning
- deletionはEvent deletionではないこと
- storage failure isolation

`ui-copy-decisions.md`:

- candidate headings／labels
- empty／unavailable／failure／privacy candidate
- required safety semantics
- status:

```text
IMPLEMENTATION CANDIDATE / FINAL PRODUCT COPY NOT ADOPTED
```

Human final approval前に`FINAL`、`ACCEPTED`、確定copyと記録しない。

`docs/README.md`のstatus、owner、referenceは変更しない。現状のKnowledge Mapに両正本が登録済みであり、副索引変更は不要。

## Step 8 — DB-independent QA

test実行を明示的に許可する後続gateの範囲で実施する。

順序:

1. focused pure tests
2. DB-independent browser tests
3. `npm run check`
4. `npm run build`
5. `git diff --check`
6. exact scope check
7. dependency／migration／server contract diff check
8. capability／secret leak check

failure時は原因なく同一commandを再実行しない。

## Step 9 — Local Supabase integration QA

local Supabase操作、fixture作成、cleanupを含むHuman authorization後だけ実行する。

必要理由:

- actual Event作成成功
- server-side `getEventByShareToken()`成功
- create→share page→history record
- valid Event再訪
- selected participant regression
- 履歴削除後もEvent本体が存在する証明
- storage unavailable時も共同編集が継続する証明

N6はDB schemaを変更しないため、次は不要。

- migration generation
- migration apply
- db reset
- pgTAP
- advisor
- remote Supabase
- Hosted QA

local QA targetはlocalhostで一意に確認する。remote profileまたはtarget ambiguityがあればfixture作成前にSTOPする。

## Step 10 — Focused review and publication handoff

全required QA完了後:

- Tech Lead review
- Fullstack implementation review
- DevOps evidence／boundary review
- PKA lifecycle review
- Independent Reviewer review

を同一candidate Headへ紐付ける。

blocking finding 0の場合だけGit publication gateへ提示し、stage／commit／push／PR作成前に停止する。

---

# 4. Expected changed paths

## NEW — exact 4

| Path | 変更するもの | 変更しないもの |
|---|---|---|
| `src/lib/event-history.ts` | N6 schema、validation、purge、dedupe、sort、upsert、remove、storage failure classification | generic storage framework、selected participant storage、server／DB logic、logging |
| `src/components/EventHistory.tsx` | recent／full UI、neutral hydration state、delete UI、privacy／failure state、null-render recorder | DB fetch、analytics、cross-tab sync、last-visited表示 |
| `src/app/history/page.tsx` | full history page shell、BrandHeader、最大30件表示位置 | server storage read、DB lookup、new navigation framework |
| `tests/event-history.spec.ts` | pure、browser component、integration、E2E、selected participant回帰 | raw path evidence、snapshot、real-path screenshot、helper framework追加 |

## UPDATE — exact 6

| Path | 変更するもの | 変更しないもの |
|---|---|---|
| `src/app/page.tsx` | Top recent history placement | intro、CreateEventForm、existing dynamic behavior |
| `src/app/e/[shareToken]/page.tsx` | lookup成功後だけrecorderを配置 | DB query contract、EventApp behavior、sharing links、not-found semantics |
| `src/components/EventApp.tsx` | existing selected participant get／set／removeのfail-soft guard | normal key／value／selection semantics、共同編集architecture |
| `src/app/globals.css` | N6 UIに必要な限定style／responsive／focus | global token変更、既存画面restyle、unrelated cleanup |
| `DESIGN.md` | N6 UI構造とprivacy／failure semantics | unrelated design rule、final copy確定 |
| `docs/reports/ui-copy-decisions.md` | candidate copyとstatus | unrelated copy、final approval claim |

## Read-only paths

変更しない。

- `src/components/CreateEventForm.tsx`
- `src/app/api/events/route.ts`
- `src/lib/events.ts`
- `src/components/BrandHeader.tsx`
- `src/app/e/[shareToken]/c/[candidateId]/page.tsx`
- `tests/helpers.ts`
- `package.json`
- `package-lock.json`
- `playwright.config.ts`
- `supabase/**`

これらの変更が必要ならSTOPする。

---

# 5. Data and state flow

## 5.1 Recording

```text
validated route shareToken
→ canonical pathname construction
→ server-side Event lookup
→ lookup success
→ stored Event.title validation
→ EventHistoryRecorder mount
→ localStorage read
→ root classification
→ purge／dedupe
→ same-path upsert
→ deterministic sort
→ truncate 30
→ N6 key write
```

lookup failure以前ではrecorderをrenderしない。

## 5.2 Top／history display

```text
SSR fixed neutral shell
→ identical first client render
→ mount effect
→ localStorage read
├─ valid entries → ready
├─ absent／0 entries → confirmed empty
└─ read exception → unavailable
```

- Top: ready entriesの先頭2件
- `/history`: ready entriesの先頭30件
- entry link: canonical pathname
- visible text: titleのみ
- lastVisitedAt: UI非表示

## 5.3 Malformed／repair flow

```text
raw payload
→ strict root／entry validation
→ malformed／expired／invalid／duplicate／overflow除去
→ sanitized in-memory result
→ N6 keyだけをbest-effort repair
```

repair write失敗でもsanitized UIを利用できる。storage修復成功は主張しない。

## 5.4 Individual removal

```text
Human delete intent
→ current history read
→ exact pathname entry除外
→ N6 key write
├─ success → React state更新
└─ failure → entry維持＋generic failure
```

## 5.5 Remove-all

```text
Human confirmation
→ N6 key removeItem
├─ success → confirmed empty
└─ failure → previous state維持＋generic failure
```

`localStorage.clear()`は使用しない。

## 5.6 Selected participant separation

```text
EventApp selected participant state
↔ kimenosuke:selected-participant:<event_id>
```

と:

```text
EventHistory state
↔ kimenosuke:event-history:v1
```

は別module／別key／別failure stateとする。

一方のfailureによって他方のkeyを変更しない。

---

# 6. Failure behavior matrix

| Case | History UI result | Event behavior | Persistence claim | Retry |
|---|---|---|---|---:|
| key absent | confirmed empty | 継続 | empty confirmed | 0 |
| `getItem` exception | unavailable | 継続 | emptyとは主張しない | 0 |
| malformed root | sanitized empty | 継続 | repair成功は結果依存 | 0 |
| invalid／expired entry | valid entryだけ表示 | 継続 | cleanup失敗時は修復成功を主張しない | 0 |
| unsupported version | sanitized empty | 継続 |変換成功を主張しない | 0 |
| upsert write failure | previous history state | 作成／閲覧継続 | 保存成功0 | 0 |
| individual remove failure | entry維持 | Event存続 | 削除成功0 | 0 |
| remove-all failure | previous state維持 | Event存続 | 全削除成功0 | 0 |
| selected read failure | 未選択＋ready | 閲覧／共同編集継続 | 復元成功0 | 0 |
| selected write failure | React selection維持 | 操作継続 | 永続化成功0 | 0 |
| selected remove failure | React selection解除 | 操作継続 | storage除去成功0 | 0 |
| invalid share token | record 0 | existing not-found flow | 保存0 | 0 |
| Event lookup failure | record 0 | existing error flow | 保存0 | 0 |
| rate limit／creation failure | record 0 | existing create error | 保存0 | 0 |
| `OUTCOME_UNKNOWN` | record 0 | existing warning | 保存0 | 0 |

failure時にraw pathname、token、storage value、Event ID、participant IDを出力しない。

---

# 7. QA mapping

## 7.1 Pure unit

- Purpose: domain contractのdeterministic検証
- Target: `src/lib/event-history.ts`
- Dependency: DBなし、networkなし
- Fixture: fixed synthetic pathname／title／clock／Storage double
- Expected:
  - schema、field、pathname、title、timestamp PASS
  - full URL／query／fragment／token単体 reject
  - TTL／future skew
  - purge／dedupe／sort／30件
  - empty／unavailable／malformed分離
  - write／remove failure
  - N6 key以外の操作0
- Evidence:
  - command
  - exit code
  - PASS／FAIL count
  - synthetic case count
  - actual locator valueは保存しない

## 7.2 Browser component-level QA

専用component testing dependencyを追加せず、local Next.js＋Playwrightで`/`と`/history`を検証する。

- Purpose: client state、SSR、hydration、UI
- Target:
  - `EventHistory`
  - Top
  - `/history`
- Dependency: local Next.js、DBなし
- Fixture: navigation前にsynthetic localStorageを投入
- Expected:
  - neutral initial state
  - hydration warning 0
  - latest 2／max 30
  - confirmed empty／unavailable
  - plain-text title
  - delete success／failure
  - Event deletion claim 0
  - timestamp表示0
- Evidence:
  - viewport
  - assertion count
  - PASS／FAIL
  - raw storage／pathnameなし

## 7.3 Integration

- Purpose: share lookup成功とrecord boundary
- Target:
  - share page
  - recorder
  - EventApp
- Dependency: local Supabase authorization
- Fixture:
  - synthetic Event 1件
  -必要最小Participant
- Expected:
  - create success→share lookup success→record
  - revisit→title／sliding update
  - invalid／not-found／lookup failure→record 0
  - `created=1`非保存
  - Candidate detailだけではupdate 0
  - selected participant failure semantics
- Evidence:
  - outcome category
  - counts
  - retry 0
  - raw URL、path、token、ID、titleなし

## 7.4 Local browser E2E

- Purpose: user-visible N6 flowとEvent非削除
- Dependency: local Supabase authorization、fixture cleanup authority
- Expected:
  - Event作成→share page→Top／一覧
  - reload保持
  - individual／all delete
  - valid URL再訪で再登録
  - history削除後もEvent本体存続
  - storage unavailableでもEvent作成／閲覧／共同編集継続
  - selected participant正常／失敗回帰
- Retry: `0`
- Workers: `1`
- Trace／video／screenshot: capabilityを扱うrunでは`off`
- Evidence: secret-free summaryのみ

## 7.5 Responsive／accessibility

- Viewports:
  - `320×812`
  - `375×812`
  - `1366×768`
- Expected:
  - horizontal overflow 0
  - keyboard操作
  - accessible name
  - focus-visible
  - color-only failure 0
  - hydration後focus移動0
  - title／delete controlsのlayout維持
- Screenshot:
  - synthetic historyだけに限定可能
  - real Event pathnameを含むpageは撮影しない

## 7.6 Static checks

- `npm run check`
- `npm run build`
- `git diff --check`
- `cmp -s AGENTS.md CLAUDE.md`
- exact changed paths
- NEW 4／UPDATE 6
- dependency diff 0
- migration／Supabase diff 0
- API／server contract path diff 0
- `localStorage.clear()` 0
- analytics／telemetry追加0
- console secret output 0

## 7.7 Capability／secret leak check

禁止対象:

- actual canonical pathname
- raw token
- full Event URL
- Event／Participant／Candidate ID
- real Event title
- raw localStorage
- env／credential

controls:

- actual locatorをtest title、fixture名、screenshot名、snapshot、attachmentへ入れない
- `console.*`で出さない
- retries 0
- trace off
- video off
- real Event screenshot 0
- raw failing browser outputをevidenceへ転載しない
- leak scanはfilename、count、exit resultだけを保存
- `test-results`／`playwright-report`にcapability疑いがあればpublication前にSTOP

---

# 8. Local fixture and cleanup boundary

local integration QAではbusiness row mutationが発生するため、別Human authorizationが必要である。

許可後も:

- exact localhost target
- remote variables absent
- synthetic fixture
- fixture count guard
- unrelated rowsへの影響0
- retry 0
- cleanup target一意
- cleanup後business row postcheck

を要求する。

cleanup方針:

- repositoryへcleanup SQLを追加しない
- Git外owner-only artifact
- exact fixture guard
- ROLLBACK validation
- authorization範囲内のCOMMIT exact 1
- postcheck
- `db reset`でunrelated local dataを破壊しない

cleanup permissionがなければfixture作成前にSTOPする。

---

# 9. DoD traceability

| Contract DoD | Implementation step | QA |
|---|---|---|
| exact key／version／4 fields | Step 1 | pure unit／static |
| canonical pathnameのみ | Step 1、4 | pure unit／integration／leak scan |
| title validation／text render | Step 1、2、4 | pure／browser |
| latest 2／max 30 | Step 1〜3 | pure／browser／E2E |
| 180日sliding | Step 1、4 | pure／integration |
| purge／dedupe／sort | Step 1 | pure |
| Event取得成功後だけrecord | Step 2、4 | integration／E2E |
| failure／rate-limit／OUTCOME_UNKNOWN record 0 | Step 4 | pure boundary／integration |
| client-only／SSR非依存 | Step 1〜3 | browser／build |
| hydration mismatch 0 | Step 2、3 | browser |
| read／write／remove fail-soft | Step 1、2 | pure／browser |
| selected participant fail-soft | Step 5 | integration／E2E |
| N6 key以外変更0 | Step 1、5 | Storage spy／static |
| `localStorage.clear()` 0 | Step 1 | pure／static |
| individual／all delete | Step 2 | browser／E2E |
| Event本体削除0 | Step 2 | local Supabase E2E |
| shared-browser privacy | Step 2、7 | browser／doc review |
| responsive／accessibility | Step 3、6 | viewport／keyboard |
| actual pathname external output 0 | 全step | static／artifact audit |
| dependency／DB／migration変更0 | 全step | tree／diff check |
| exact 10 paths | 全step | Git name-status |
| Hosted QA不要 | Step 8、9 | local evidence completeness |

---

# 10. Plan-specific STOP conditions

ContractのSTOP条件に加えて、次で停止する。

- PR #40のbase／head／Draft／docs-only identity drift
- N6 Handoff Head drift
- target branch／worktree path既存
- branchが別worktreeで使用中
- dirty／staged／Git lock／ownership不明
- exact 10-path外変更が必要
- `events.ts`変更が必要
- `CreateEventForm.tsx`変更が必要
- API route／response contract変更が必要
- Candidate detail route変更が必要
- `tests/helpers.ts`変更が必要
- `playwright.config.ts`変更が必要
- dependency追加が必要
- migration／schema／RLS／GRANT変更が必要
- generic storage abstractionが必要
- cross-tab synchronizationが必要
- local targetがlocalhostと一意に確認できない
- local fixture／cleanup authorizationなしでintegration DoDへ進む必要
- cleanup target／countを一意に確定不能
- test／trace／report／artifactへcapability-bearing pathnameが出る
- selected participant normal semanticsを維持不能
- QA failureのroot cause不明
- Hosted QAでしか検証できない事項が発見される
- PR #40へimplementation commitを積む必要がある
- implementation candidate Headを一意に固定不能
- Product copyの最終決定が必要

---

# 11. Implementation handoff

Fullstack Engineerへ、次の実行単位で渡す。

## Unit A — History domain

成果物:

- `src/lib/event-history.ts`
- pure focused tests

報告:

- schema
- algorithm
- failure union
- test result
- changed paths
- unresolved issue

## Unit B — Client UI

成果物:

- `EventHistory`
- recorder
- Top
- `/history`
- scoped CSS

報告:

- SSR／hydration
- state transitions
- delete semantics
- responsive／accessibility
- actual pathname output 0

## Unit C — Share recording

成果物:

- share-page success integration
- no-record failure boundary

報告:

- exact recorder placement
- failed paths
- Candidate route non-impact
- API／DB contract change 0

## Unit D — Selected participant hardening

成果物:

- read／write／remove guards
- focused regression

報告:

- React state
- persistence state
- normal semantics
- retry／error output 0

## Unit E — Canonical docs

成果物:

- `DESIGN.md`
- `ui-copy-decisions.md`

報告:

- candidate status
- required safety meaning
- final copy claim 0

## Unit F — QA candidate

成果物:

- all focused tests
- local QA results
- cleanup evidence
- static checks
- exact scope manifest

報告形式:

1. baseline
2. changed paths
3. implementation unit results
4. artifact identities
5. test commands／exit／counts
6. local target
7. fixture／cleanup disposition
8. capability leak audit
9. dependency／migration／DB diff
10. blocking／advisory findings
11. candidate Head
12. verdict

raw pathname、token、ID、real title、credentialは報告しない。

---

# 12. Evidence plan

Git外secret-free evidenceに保存可能:

- operator
- UTC timestamp
- branch／Head／base
- Contract／Plan identity
- changed path manifest
- file SHA／bytes
- command identity
- exit code
- PASS／FAIL／SKIP counts
- retry count
- viewport
- storage key name
- schema version
- TTL
- entry count
- failure category
- cleanup count／verdict
- final scope
- final verdict

保存禁止:

- actual pathname
- token
- token派生値
- full URL
- Event／Participant／Candidate ID
- real title／memo／participant name
- raw localStorage
- browser trace containing capability
- credential／profile／environment dump

SKIPまたはNOT RUNをPASSとしない。

---

# 13. Publication boundary

Plan adoption後も、別Human implementation start authorizationまでは何も変更しない。

Implementation／QA完了後も、別Human Git publication authorizationまでは次を行わない。

- stage
- commit
- push
- PR作成
- PR #40変更
- Ready化
- merge

publication前にfresh確認:

- PR #40 unchanged
- implementation PR baseが`codex/n6-handoff-and-entry`
- exact candidate Head
- exact 10 paths
- QA all required PASS
- fixture cleanup PASS
- dependency diff 0
- migration／Supabase diff 0
- API／server contract diff 0
- capability／secret leak 0
- generated evidenceがGit非追跡
- unresolved blocker 0

---

# 14. Sub-agent integration

## 14.1 Fullstack Engineer result

- Read-only source／test analysis: `COMPLETE`
- Exact 10-path feasibility: `PASS`
- Current blocking finding: `0`
- Recommended design:
  - pure injected storage／clock helper
  - neutral／ready／unavailable client state
  - null-render recorder
  - successful share lookup後だけrecord
  - selected participant exact 3-operation hardening
  - Playwright内のpure＋browser＋integration分割
- Source／test change: `0`
- Test execution: `0`

## 14.2 DevOps result

- Read-only baseline／PR／environment analysis: `COMPLETE`
- Local-only QA feasibility: `PASS`
- Hosted QA requirement: `0`
- Migration／DB contract change requirement: `0`
- Local Supabase integration requirement:  
  `YES — only for actual create／lookup／Event persistence／selected participant integration`
- Required future boundary:  
  `separate local QA authorization including fixture and cleanup`
- Branch／worktree／Git／DB／Vercel mutation: `0`
- Current blocking finding for Plan creation: `0`

---

# 15. Unresolved issues

- Plan authoring blocker: `0`
- Product decision required now: `0`
- Expected path conflict: `0`
- Dependency decision: `0`
- Hosted QA decision: `0`

Execution-time authorization dependency:

- branch／worktree／implementation permission
- DB-independent test permission if not included in implementation gate
- local Supabase fixture／cleanup QA permission
- Git publication permission

これらは未解決仕様ではなく、既存Contractが分離した後続Human gateである。

---

# 16. Final lifecycle

```text
N6 EXECUTION CONTRACT ADOPTED
/
N6 IMPLEMENTATION PLAN v0.1 DRAFTED
/
PLAN ADOPTION NOT COMPLETED
/
IMPLEMENTATION NOT AUTHORIZED
/
TEST EXECUTION NOT AUTHORIZED
/
LOCAL SUPABASE QA NOT AUTHORIZED
/
GIT PUBLICATION NOT AUTHORIZED
/
HOSTED QA AND EXTERNAL OPERATIONS NOT AUTHORIZED
/
N7 NOT STARTED
```

- Contract identity:  
  `WTV-N6-BROWSER-HISTORY-IMPLEMENTATION-CONTRACT v0.4-draft`
- Fullstack Engineerサブエージェント利用結果:  
  `PASS / EXACT 10-PATH IMPLEMENTATION FEASIBLE / BLOCKER 0`
- DevOpsサブエージェント利用結果:  
  `PASS / LOCAL-ONLY QA FEASIBLE / HOSTED QA NOT REQUIRED / BLOCKER 0`
- Unresolved issue:  
  `0`
- Plan adoption:  
  `NOT COMPLETED`
- Implementation:  
  `NOT AUTHORIZED`
- Git publication:  
  `NOT AUTHORIZED`
- Hosted QA／external operation:  
  `NOT AUTHORIZED`
- 次のHuman gate:  
  `N6_IMPLEMENTATION_PLAN_ADOPTION`