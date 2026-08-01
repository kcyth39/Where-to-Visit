# WTV-N6-BROWSER-HISTORY-IMPLEMENTATION-CONTRACT v0.4-draft

## 0. Contract identity

- Contract ID:  
  `WTV-N6-BROWSER-HISTORY-IMPLEMENTATION-CONTRACT`
- Version:  
  `v0.4-draft`
- Status:  
  `DRAFT / NOT ADOPTED / NOT PLAN AUTHORIZED / NOT IMPLEMENTATION AUTHORIZED`
- Primary technical owner:  
  `Tech Lead`
- Implementation owner after separate authorization:  
  `Fullstack Engineer`
- Independent review owner:  
  `Reviewer`
- Adoption authority:  
  `Human`
- Output form:  
  `Chat-only Execution Contract draft`
- Repository artifact:  
  `NOT CREATED`

Tech Leadはarchitecture、技術契約、実装成立性、scope、review統合、STOP判定を担当する。Tech Lead roleからcode implementation permissionを導出しない。

Fullstack Engineerは、Contract adoption、plan adoption、implementation start authorizationがそれぞれ成立した後にのみ、承認scope内の実装を担当する。

ReviewerはContractを独立判定するが採用しない。Humanはreview結果を踏まえて採用判断を行うが、Independent Reviewを代替しない。

---

## 1. Goal

同一browser profileに、最近利用したEventへの戻り道をclient-onlyで保存・表示する。

必須機能:

- トップページの「きめごと」に最新2件を表示
- 「きめごと一覧」に最大30件を表示
- Event作成成功後、有効なshare page取得が確認された時点で履歴更新
- 有効なshare page再訪時に履歴更新
- 180日sliding expiration
- 個別履歴削除
- 全履歴削除
- 履歴削除によるEvent本体削除0
- localStorage failureによるEvent作成・閲覧・共同編集の阻害0
- selected participant storageとのkey・責任分離
- client-only
- SSR HTMLのstorage非依存
- hydration mismatch 0

N6はbrowser-local historyである。server history、account同期、複数端末同期は提供しない。

---

## 2. Governing inputs

### 2.1 Repository identity

- Repository:  
  `kcyth39/Where-to-Visit`
- N5 accepted Head:  
  `022b85776109bae62ef21380539523bafc3e147b`
- N6 Handoff PR:  
  `#40`
- N6 Handoff branch:  
  `codex/n6-handoff-and-entry`
- N6 Handoff accepted Head:  
  `af0a6f8693dd6ec6f45e03e13319751caa7deb67`
- Release ancestry:  
  `N5 → N6 → N7`

N5〜N7は、N9 final release HeadのHuman merge gateまで個別に`main`へmergeしない。

後続gateではPR #40の最新metadataをfresh確認する。今回のContract修正はGitHub live stateを確定または変更しない。

### 2.2 Canonical inputs

`docs/README.md`をKnowledge入口とし、そこから指定されたstatus、owner、参照関係に従う。

最低限の正本・authority input:

- `AGENTS.md`
- `CLAUDE.md`
- `docs/README.md`
- `docs/00_master-plan.md` §0
- `docs/03_requirements.md`
- `docs/04_data-model.md`
- `docs/05_dod.md`
- `docs/06_qa-flow.md`
- `docs/contracts/README.md`
- `docs/contracts/n6-handoff-and-entry.md`
- `docs/reports/development-and-business-activity-plan-2026-07-17.md`
- `DESIGN.md`
- `docs/reports/ui-copy-decisions.md`
- applicable ADRおよびrole正本
- PR #40のaccepted Head、metadata、diff
- implementation開始時点のactual sourceおよびtests

### 2.3 Authority and evidence

#### Authority

次をN6の上位Authorityとする。

1. `docs/README.md`が指すtracked正本
2. applicable ADR
3. role正本
4. `main`またはHuman採用済みstacked ancestryにある正本
5. Human採用済みN6 Handoff Contract

Humanが採用したexact N6 Execution Contractは、これらの正本・ADR・role正本に従うtask-specific target inputである。

Execution Contractは、N6で実現するtarget、scope、guardrail、DoD、STOP条件を確定できるが、tracked正本、ADR、role authorityを置き換えない。

#### Baseline evidence

accepted Head上のsourceおよびtestsは、次を確定するためのbaseline evidenceとして扱う。

- 変更前のcurrent implementation state
- Contract targetへ到達するために必要なdelta
- 既存integration point
- regression boundary
- implementation feasibility

sourceおよびtestsは、将来変更の意味を決定するAuthorityではない。

したがって、採用済みContractが明示的に要求する変更を、現行sourceまたはtestsの現在状態だけを理由に無効化しない。

例:

- 現行selected participant storage処理がunguardedであることはcurrent-state evidenceである
- 採用済みContractが要求するfail-soft化はintended deltaである
- 現行実装との相違自体をContract conflictとは判定しない

#### Conflict and drift handling

次の場合は実装せずSTOPする。

- Contractがtracked正本、ADR、role正本と矛盾する
- baseline source／testsがContractで想定していない制約またはdriftを示す
- accepted ancestryが不一致
- Contractのtargetをexact scope内で安全に実現できない
- 必要deltaがContractのscope、permission、DoDを超える

この場合:

- source／testsでContractの意味を上書きしない
- Contractで正本の意味を上書きしない
- 矛盾またはdriftを推測で解消しない
- 対象domain ownerまたはHumanへ戻る

未採用draft、chat要約、agent memory、未追跡fileは、Authority、正本、baseline evidence、execution permissionとして扱わない。

---

## 3. Confirmed facts

### 3.1 Application flow

現在のapplicationには少なくとも次の責任位置がある。

- Event作成UI: `src/components/CreateEventForm.tsx`
- Event作成API: `src/app/api/events/route.ts`
- Event取得処理: `src/lib/events.ts`
- share page: `src/app/e/[shareToken]/page.tsx`
- Event共同編集UI: `src/components/EventApp.tsx`
- トップページ: `src/app/page.tsx`
- global style: `src/app/globals.css`

Event作成後はshare pageへ遷移する。作成直後のURLに`?created=1`が付いても、queryは履歴へ保存しない。

### 3.2 Existing browser storage

selected participantは既存のlocalStorage責任を持つ。

N6 historyはselected participantのkey、value、lifecycle、削除操作へ統合しない。

既存selected participant storageの同期的なread、write、remove failureがEvent閲覧・共同編集を阻害し得る箇所は、N6のstorage fail-soft invariantを成立させるため限定的にhardeningする。

このhardeningはN6 scopeに含み、test-only対応や別sliceへ分離しない。

### 3.3 N7 boundary

N7 Event Creation Abuse Protectionの仕様はN6へ取り込まない。

N6が維持する共有invariant:

- Event作成成功が確定した場合だけ履歴へ追加可能
- rate-limit拒否では追加しない
- validation failureでは追加しない
- server failureでは追加しない
- `OUTCOME_UNKNOWN`では追加しない
- Event取得に成功していないshare pathは追加しない
- N7がresponse contractを変更しても、記録の最終authorityをshare page取得成功に置く

---

## 4. Storage contract

### 4.1 Storage mechanism

保存先はbrowserの`localStorage`だけとする。

使用しない:

- Cookie
- sessionStorage
- IndexedDB
- Cache API
- server database
- Supabase table
- Vercel storage
- account
- analytics
- telemetry
- external synchronization

### 4.2 localStorage key

```text
kimenosuke:event-history:v1
```

history helperはこのkey以外をread、write、removeしない。

### 4.3 Schema version

```ts
type EventHistoryPayloadV1 = {
  version: 1;
  entries: EventHistoryEntryV1[];
};
```

unsupported versionは変換せずinvalid payloadとして扱う。

### 4.4 Entry shape

```ts
type EventHistoryEntryV1 = {
  pathname: string;
  title: string;
  lastVisitedAt: string;
  expiresAt: string;
};
```

保存可能fieldはこの4件だけである。

### 4.5 Timestamp and expiration

`lastVisitedAt`と`expiresAt`は、`Date.prototype.toISOString()`が生成するUTC・millisecond precisionのISO 8601形式とする。

TTL:

```text
180 days
= 15,552,000,000 milliseconds
```

有効な訪問ごとに:

```text
lastVisitedAt = now
expiresAt = now + 180 days
```

へ更新する。

---

## 5. Canonical pathname contract

### 5.1 Stored pathname

```regex
^/e/[A-Za-z0-9_-]{43}$
```

originを含まないcanonical relative pathnameだけを保存する。

### 5.2 Construction

share pageでserver-side Event取得に成功した後、validated `shareToken`から構築する。

```ts
const pathname = `/e/${shareToken}`;
```

構築後もcanonical regexへ照合する。

### 5.3 Rejected input

storage boundaryでは次をnormalizeせずrejectする。

- full URL
- origin付きURL
- protocol-relative URL
- host
- query付きpathname
- fragment付きpathname
- `?created=1`
- encoded separatorを含むpath
- token単体
- arbitrary string
- Candidate detail route
- `/e/<token>/c/<candidate-id>`

正規integrationではbrowser URL全体をhelperへ渡さず、validated route parameterからpathnameを構築する。

### 5.4 Capability-bearing locator

canonical pathnameはEvent access capabilityを含むlocatorとして扱う。

実pathnameを次へ出力しない。

- console
- analytics
- telemetry
- error report
- evidence
- test report
- CI annotation
- screenshot名
- snapshot名
- fixture名
- commit message
- PR本文
- documentation example

testはsynthetic tokenだけを使う。

---

## 6. Validation, purge, upsert and ordering

### 6.1 Entry validation

entryは次のすべてを満たす場合だけvalidとする。

- plain object
- exact fieldsが`pathname`、`title`、`lastVisitedAt`、`expiresAt`
- pathnameがcanonical regexに一致
- titleがstring
- titleをtrimした結果がnon-empty
- trim後のtitleがUnicode scalar value countで1〜80
- timestampがexact ISO形式
- timestampをfinite dateとしてparse可能
- `expiresAt = lastVisitedAt + 180 days`
- future clock skew policyに適合
- expirationしていない

titleのscalar countはUTF-16 code unit数ではなく、Unicode scalar value列として数える。

保存時にはtrim後のvalidated titleを使用する。

表示時:

- React text nodeとしてrender
- HTMLとして解釈しない
- `dangerouslySetInnerHTML`を使用しない
- markupへ変換しない

recording時のtitle sourceは、share pageで取得成功したstored `Event.title`だけとする。URL、query、localStorage内の別fieldからtitleを生成しない。

### 6.2 Root payload and read-result classification

状態を次の3種類へ分ける。

#### A. Confirmed empty

次の場合:

- `getItem`が`null`
- valid payloadのentriesが0
- sanitize／purge後のvalid entriesが0

UIはhydration後にconfirmed empty stateを表示できる。

#### B. Unavailable

次の場合:

- `getItem`が例外を投げる
- `SecurityError`等によりstorage read outcomeを取得できない

この場合:

- emptyとは判定しない
- unavailable stateとする
- cleanupを試みない
- Event機能を継続する
- automatic retryを行わない

#### C. Malformed payload

次の場合:

- JSONでない
- rootがplain objectでない
- `version !== 1`
- `entries`がarrayでない

この場合:

- sanitize結果をemptyとする
- N6 keyのcleanupを1回試行できる
- cleanup failureをEvent機能へ伝播しない
- cleanup成功が不明な場合、storage修復成功を主張しない
- UI上のhistory resultはsanitized emptyとして扱う

### 6.3 Entry-level purge

次をpurgeする。

- malformed entry
- invalid pathname
- emptyまたはinvalid title
- titleのUnicode scalar value countが1〜80外
- invalid timestamp
- expired entry
- future skew limit超過
- schema外fieldを持つentry
- duplicate entry
- 30件を超えるoverflow entry

purge後のsanitized in-memory resultは表示に使用できる。

cleanup write failureでもEvent機能を継続し、storage修復成功を主張しない。

### 6.4 Future clock skew

許容future clock skewは最大5分。

- `lastVisitedAt > now + 5 minutes`: purge
- `now < lastVisitedAt <= now + 5 minutes`: `lastVisitedAt = now`へnormalize
- normalize時: `expiresAt = now + 180 days`
- `expiresAt`だけが不整合: purge

### 6.5 Same Event identity

同一Event判定はcanonical pathnameのexact equalityだけで行う。

titleやtimestampでは判定しない。

### 6.6 Upsert

1. payloadをfail-softでread
2. invalid、expired、duplicate entryをpurge
3. 同一pathnameの既存entryを除外
4. stored `Event.title`由来のvalidated title、`now`、`now + 180 days`でentry追加
5. deterministic sort
6. 先頭30件へtruncate
7. N6専用keyへ保存

再訪時にstored Event titleが変更されていれば、取得成功した現在のtitleへ更新する。

read resultがunavailableの場合はwriteへ進まない。

### 6.7 Duplicate repair

同一pathnameが複数ある場合:

1. `lastVisitedAt`が新しいentry
2. 同値ならtitleのUnicode code point lexical ascendingで小さいentry

を残す。

### 6.8 Display order

1. `lastVisitedAt` descending
2. 同値なら`pathname` ascending

### 6.9 Limits

- 保存・一覧表示上限: `30`
- トップページ表示上限: `2`
- 31件目以降: sort後に除去

---

## 7. Recording boundary

### 7.1 Sole recording authority

履歴更新のauthorityは、share pageでserver-side Event取得成功が確定した後のclient-side recorderとする。

### 7.2 Event creation success

Event作成API成功responseだけでは履歴を書かない。

遷移先share pageで次が成立した場合に初めて記録する。

- share token validation PASS
- Event lookup PASS
- stored `Event.title`取得PASS
- title validation PASS
- share pageの有効表示成立

これにより、navigation failureやshare lookup failureを履歴成功と扱わない。

### 7.3 Share page revisit

既存share URL再訪時は、Event lookup成功後に同一pathnameをupsertし、title、`lastVisitedAt`、`expiresAt`を更新する。

### 7.4 Do not record

- Event API validation failure
- rate-limit rejection
- Event API failure
- `OUTCOME_UNKNOWN`
- invalid share token
- Event not found
- Event lookup error
- invalid stored Event title
- RLS／permission error
- DB connection failure
- navigation未完了
- Candidate detail routeだけを開いた場合
- valid Event dataがclient recorderへ渡らなかった場合

### 7.5 `created=1`

`created=1`はhistory identityに使用しない。

- pathnameへ含めない
- duplicate判定へ使用しない
- Event作成成功の独立authorityにしない
- queryをlocalStorageへ渡さない

---

## 8. Client-only and hydration contract

### 8.1 localStorage access

localStorageへアクセスできるのはclient componentまたはclient-side helper invocationだけとする。

禁止:

- Server Component render中のlocalStorage参照
- module evaluation時の`window`参照
- server-side storage value推定
- Cookieやrequest headerによるhistory復元
- SSR HTMLへのhistory entry埋込み

### 8.2 Neutral initial state

SSRと最初のclient renderは同一のneutral stateを出力する。

hydration前にhistory contentまたはconfirmed emptyを主張しない。

mount後のeffectでreadし、次のいずれかへ遷移する。

- valid history entries
- confirmed empty state
- fail-soft unavailable state

状態対応:

- key absent／valid entry 0: confirmed empty
- read exception: unavailable
- malformed payload: sanitized empty
- cleanup failure: Eventへ非伝播、storage修復成功の主張0

### 8.3 Hydration mismatch prevention

初回render中に次を行わない。

- `Date.now()`によるentry判定
- localStorage read
- browser-only path判定
- storage値によるelement count変更

storage-dependent UI更新はmount後に行う。

---

## 9. Failure behavior

### 9.1 General rule

storage failureによって次を失敗させない。

- Event creation
- share page display
- Event viewing
- Participant operations
- Candidate operations
- Reaction operations
- Comment operations
- memo collaboration
- route navigation

### 9.2 History read failure

- unavailable stateとする
- emptyと主張しない
- exceptionをEvent flowへthrowしない
- retry loop 0
- pathname、token、raw storage value出力0
- Event表示継続

### 9.3 History write failure

- Event作成または閲覧を失敗扱いにしない
- 履歴保存成功を主張しない
- internal error、pathname、tokenを表示しない
- automatic retry 0
- fallback key 0

### 9.4 Individual removal failure

- 削除成功を表示しない
- UI上の確定済みentryを成功扱いで除去しない
- generic failure stateのみ
- Event本体変更0
- automatic retry 0

### 9.5 Remove-all failure

- 全削除成功を主張しない
- success stateへ遷移しない
- N6専用key以外の変更0
- `localStorage.clear()`使用0

### 9.6 Selected participant fail-soft hardening

`EventApp`内の既存selected participant storage accessを、必要最小限の`try/catch`でfail-soft化する。

#### Read failure

- selected participantは未選択状態で開始
- storage initializationはready状態へ進める
- Event表示・共同編集を継続
- automatic retry 0
- error、key、value、participant ID、share token出力0

#### Write failure

- React上でHumanが選択したparticipant stateを維持
- 永続化だけを断念
- Event操作を継続
- automatic retry 0
- error出力0

#### Remove failure

- React上のselected participant stateは解除
- 永続storageから除去できたとは主張しない
- Event操作を継続
- automatic retry 0
- error出力0

#### Normal behavior

正常時は次を変更しない。

- existing key
- stored value format
- participant selection semantics
- Event switching semantics
- history keyとの分離

selected participant以外の機能を再設計しない。

---

## 10. UI contract

### 10.1 Structure

トップページ:

- recent history section
- 最大2件
- full history pageへの導線

full history page:

- route: `/history`
- 最大30件
- 個別削除
- 全削除
- privacy explanation

各entry:

- display title
- canonical share pageへの内部link
- individual removal control

最終訪問時刻は利用者向けUIへ表示しない。`lastVisitedAt`はordering、dedupe、expirationの内部情報としてのみ使用する。

tokenまたはpathnameをvisible labelとして表示しない。

### 10.2 Responsive behavior

- `DESIGN.md`のspacing、color、typography、button hierarchyに整合
- mobileでtitleと操作がviewport外へoverflowしない
- long titleでlayoutを壊さない
- desktopで既存top-page hierarchyを崩さない
- hoverだけに意味を依存しない
- touch targetを既存design基準へ合わせる

### 10.3 Accessibility

- sectionとheadingの関係を維持
- history linkに理解可能なaccessible name
- icon-only削除操作には明示的label
- failure stateを色だけで表現しない
- keyboardで個別削除・全削除を操作可能
- hydration後の不必要なfocus移動0
- titleはReact textとして扱い、HTMLとして解釈しない

### 10.4 Required semantic meaning

UI copyは少なくとも次を伝える。

- 履歴はbrowser-local
- shared browser profileでは他利用者に見える可能性がある
- 履歴削除はEvent本体削除ではない
- storage failureでもEvent作成・閲覧・共同編集は継続
- failure時に内部値、pathname、tokenを表示しない
- 保存・削除が不確定なとき成功を主張しない

この意味はContract invariantであり、最終copy調整時にも弱めない。

### 10.5 UI copy status

heading、label、empty copy、failure copy、privacy copyはすべて:

```text
IMPLEMENTATION CANDIDATE / FINAL PRODUCT COPY NOT ADOPTED
```

とする。

候補:

- `最近のきめごと`
- `きめごと一覧`
- `履歴から削除`
- `履歴をすべて削除`
- `このブラウザには、まだきめごとの履歴がありません。`
- `履歴はこのブラウザに保存されます。同じブラウザを使う人に表示されることがあります。履歴を削除しても、きめごと自体は削除されません。`
- `履歴を更新できませんでした。きめごとはそのまま利用できます。`
- `履歴を削除できませんでした。削除されたとは扱っていません。`

これらは実装・QA用候補であり、Contract adoptionだけでfinal product copyにならない。

Humanは安全上必須の意味を維持したうえで、次の段階で文言を調整できる。

- 実装後の実機QA
- exact implementation Headの受入
- リリース前のUI／UX最終調整

copy専用gateは追加しない。

### 10.6 UI copy canonical documentation

将来`docs/reports/ui-copy-decisions.md`を更新する場合、Humanがexact wordingを最終承認するまでは:

```text
IMPLEMENTATION CANDIDATE / FINAL PRODUCT COPY NOT ADOPTED
```

として記録する。

Contract adoptionだけを根拠にfinal、accepted、canonical product copyと記録しない。

---

## 11. Removal contract

### 11.1 Individual removal

- identityはcanonical pathname
- N6 payloadから対象entryだけを除去
- DB operation 0
- Event本体は存続
- selected participant storage変更0
- 他Event entry変更0
- storage write成功後だけ削除完了と扱う

### 11.2 Remove-all

- N6専用keyだけを`removeItem`
- `localStorage.clear()`禁止
- selected participant key変更0
- DB operation 0
- Event本体は存続
- remove成功後だけempty stateへ遷移

### 11.3 Confirmation

全削除は誤操作防止の確認を必要とする。

browser-native confirmationまたは既存designに沿った限定UIを使用できるが、汎用modal frameworkを追加しない。

---

## 12. Security and privacy boundary

### 12.1 Allowed stored data

- canonical relative pathname
- validated display title
- `lastVisitedAt`
- `expiresAt`
- schema version

### 12.2 Prohibited stored data

- share token単体field
- token hash／digest／prefix
- full URL
- origin／host
- query／fragment
- `?created=1`
- Event／Participant／Candidate／Criterion ID
- owner情報
- selected participant情報
- memo
- Candidate details
- Reaction
- Comment
- title以外のEvent business data
- credentials
- Supabase key
- Vercel metadata

### 12.3 Rendering and output

localStorageはuntrusted inputとして扱う。

- titleはstrict validation後にReact textとしてrender
- HTML解釈0
- `dangerouslySetInnerHTML`使用0
- actual pathname／tokenのexternal output 0
- errorはsecret-free categoryのみ

### 12.4 Shared browser profile

同一browser profileを共有する利用者は履歴titleを閲覧し、履歴linkからEventへアクセスできる可能性がある。

この意味をUIで説明する。exact wordingはfinal product copyとして未採用とする。

---

## 13. Authorized implementation scope

Contract adoptionだけでは実装permissionは発生しない。

別のimplementation start authorization後に限り、次のexact 10 pathsを変更候補とする。

### 13.1 NEW — 4 paths

1. `src/lib/event-history.ts`
2. `src/components/EventHistory.tsx`
3. `src/app/history/page.tsx`
4. `tests/event-history.spec.ts`

### 13.2 UPDATE — 6 paths

5. `src/app/page.tsx`
6. `src/app/e/[shareToken]/page.tsx`
7. `src/components/EventApp.tsx`
8. `src/app/globals.css`
9. `DESIGN.md`
10. `docs/reports/ui-copy-decisions.md`

### 13.3 Responsibilities

`src/lib/event-history.ts`:

- schema
- pathname／title validation
- timestamp validation
- purge／dedupe／sort／upsert
- individual removal／remove-all
- fail-soft storage adapter

`src/components/EventHistory.tsx`:

- client-only read
- neutral initial state
- recent／full modes
- deletion controls
- privacy／failure semantics
- hydration-safe rendering
- titleのtext rendering

`src/app/history/page.tsx`:

- full history route
- maximum 30 entries

`src/app/page.tsx`:

- latest 2
- full list link

`src/app/e/[shareToken]/page.tsx`:

- Event取得成功後だけstored `Event.title`とvalidated route inputをrecorderへ渡す
- failed lookupではrecorderをrenderしない

`src/components/EventApp.tsx`:

- selected participant storageの限定fail-soft hardening
- normal key／value／semantics不変

`src/app/globals.css`:

- recent／full history layout
- responsive state
- failure／privacy state
- accessible interaction state

`DESIGN.md`:

- N6 UI structure
- responsive behavior
- privacy semantics
- exact wordingはcandidate status

`docs/reports/ui-copy-decisions.md`:

- N6 candidate copy
- required semantic meaning
- final product copy未採用status

`tests/event-history.spec.ts`:

- storage logic
- pathname／title validation
- time／order
- failure semantics
- security invariants
- capability-bearing pathname external output 0

### 13.4 Read-only integration references

変更候補ではない。

- `src/components/CreateEventForm.tsx`
- `src/app/api/events/route.ts`
- `src/lib/events.ts`
- `src/components/BrandHeader.tsx`
- existing test helpers

変更が必要ならscopeを広げずSTOPする。

### 13.5 Server and database boundary

N6では、API response contract、database、migration、RLS、GRANT、Supabase configuration、Vercel environment、server-side Event lifecycleを変更しない。

---

## 14. Out of scope

- browser／device間同期
- login／Auth／account
- server-side history
- DB history table
- analytics／telemetry
- Event recommendation
- pinned Event
- search／sort option
- configurable retention
- 30件超保存
- import／export
- full URL storage
- token masking digest
- generic storage framework
- unrelated storage abstraction
- new dependency
- migration／RLS／GRANT変更
- hosted Supabase QA
- Vercel operation
- Preview deployment
- Production operation
- N7 implementation
- N8以降
- PR Ready化
- merge
- 最終訪問時刻のUI表示

---

## 15. Implementation invariants

1. historyはclient-only
2. SSR HTMLはhistory非依存
3. hydration mismatch 0
4. history helperによるN6 key以外の変更0
5. selected participant keyと分離
6. canonical relative pathnameのみ保存
7. token単体field 0
8. full URL、query、fragment保存0
9. actual pathname外部出力0
10. titleはtrim後Unicode scalar 1〜80
11. titleはstored `Event.title`由来
12. titleのHTML解釈0
13. Event取得成功前のrecord 0
14. failure、rate-limit、`OUTCOME_UNKNOWN` record 0
15. revisitでTTL sliding更新
16. latest 2／maximum 30
17. deterministic dedupe／sort
18. read exceptionはunavailableでありemptyではない
19. storage failureでEvent機能を阻害しない
20. selected participantのReact stateは確定semanticsに従う
21. 削除失敗を成功表示しない
22. 履歴削除によるEvent本体削除0
23. final visit timestampのUI表示0
24. candidate copyをfinal product copyと主張しない
25. N7仕様を取り込まない

---

## 16. QA contract

N6はlocal QAを原則とする。

hosted Preview QAまたはSupabase QA projectは、localで確認不能な事項が証拠付きで発見され、別Human authorizationがある場合だけ利用できる。

### 16.1 Unit tests

最低限:

- canonical pathname valid／invalid
- token length／character
- token単体、full URL、query、fragment reject
- `?created=1`非保存
- schema version／exact fields
- title trim
- whitespace-only title reject
- Unicode scalar count 1／80 accept
- scalar count 0／81 reject
- stored title normalization
- HTML-like titleをplain text dataとして保持
- duplicate upsert
- revisit title更新
- latest 2
- max 30
- 31件目除去
- deterministic tie-break
- exact 180日expiration
- expired purge
- malformed payload
- malformed entry
- unsupported version
- invalid timestamp
- future skew normalize／purge
- key absentはconfirmed empty
- valid entry 0はconfirmed empty
- read exceptionはunavailable
- malformed payloadはsanitized empty
- malformed cleanup failure非伝播
- write／individual remove／remove-all failure
- N6 key以外の非変更
- `localStorage.clear()`不使用
- actual pathname／token error output 0

### 16.2 Component tests

- SSR／initial client neutral state一致
- mount前localStorage access 0
- hydration後history表示
- top latest 2
- history page max 30
- confirmed empty
- unavailable
- malformed sanitized empty
- individual removal success／failure
- remove-all success／failure
- failure時success claim 0
- privacy semantics
- Event削除を示す表現0
- candidate copy status
- pathname／token visible text 0
- titleのHTML interpretation 0
- last visited表示0

### 16.3 Integration tests

- Event lookup成功後だけrecord
- fetched stored `Event.title`だけをrecord
- invalid stored titleでrecord 0
- lookup failure／not-found／invalid tokenでrecord 0
- `created=1`非保存
- revisit sliding update
- Candidate detailだけではupdate 0
- selected participant read failure:
  - 未選択
  - ready
  - Event表示継続
- selected participant write failure:
  - React selection維持
  - persistence断念
  - Event操作継続
- selected participant remove failure:
  - React selection解除
  - storage除去成功の主張0
  - Event操作継続
- selected participant normal key／value／semantics不変
- selected participant keyとhistory keyの分離

### 16.4 E2E

local browser E2Eで最低限:

- Event作成成功後、share page取得成功によりhistory反映
- failure responseで追加0
- top latest 2
- 一覧max 30
- revisitで順序更新
- 個別削除後も元Eventを直接閲覧可能
- 全削除後もEvent本体存続
- reload後history保持
- storage unavailableでもEvent作成・閲覧・共同編集継続
- selected participant回帰
- mobile／desktop
- hydration warning 0
- actual pathname／token console output 0

synthetic capabilityだけを使用し、reportへ実pathnameを出さない。

### 16.5 Static QA

- `npm run check`
- `npm run build`
- focused tests
- applicable browser tests
- `git diff --check`
- `AGENTS.md == CLAUDE.md`
- exact path scope
- unexpected path 0
- dependency change 0
- migration change 0
- server／DB change 0
- secret scan
- actual capability-bearing pathname output 0

---

## 17. Definition of Done

- exact localStorage key
- schema version 1
- exact entry fields 4
- canonical pathnameのみ
- full URL、query、fragment、token別field 0
- title trim／Unicode scalar 1〜80
- title sourceがstored `Event.title`
- React text rendering
- HTML interpretation 0
- top latest 2
- history page max 30
- 180日sliding expiration
- malformed、expired、duplicate、overflow purge
- future skew contract PASS
- deterministic ordering
- key absent／empty／unavailable／malformed classification PASS
- Event取得成功後だけrecord
- failure、rate-limit、`OUTCOME_UNKNOWN` record 0
- client-only
- SSR localStorage access 0
- hydration mismatch 0
- storage read／write／remove failure fail-soft
- selected participantの確定failure semantics PASS
- selected participant normal semantics不変
- N6 key以外の変更0
- individual removal／remove-all PASS
- Event本体削除0
- last visited表示0
- privacy semantics PASS
- candidate copyをfinalと主張0
- mobile／desktop／accessibility PASS
- actual pathname external output 0
- dependency追加0
- Supabase／Vercel／Production操作0
- exact 10-path scope
- unexpected path 0
- required local QA PASS
- focused review blocking finding 0

---

## 18. Evidence contract

保存可能:

- branch
- Head
- test command identity
- exit code
- test count
- PASS／FAIL
- storage key name
- schema version
- retention duration
- entry count
- invalid category count
- error category
- changed paths
- artifact SHA
- copy status
- final verdict

保存禁止:

- actual canonical pathname
- raw token
- token hash／digest／prefix
- full Event URL
- origin
- real Event title
- Event／Participant／Candidate ID
- selected participant value
- raw localStorage value
- browser profile contents
- password
- DB URL
- Supabase key
- environment dump

test evidenceはsynthetic tokenとsynthetic titleだけを使う。

---

## 19. Focused responsibilities

### 19.1 Tech Lead

- primary technical ownership
- architecture
- Contract整合
- recording boundary
- storage lifecycle
- SSR／hydration成立性
- exact scope統合
- QA方針
- focused review統合
- STOP判定

Tech Leadはcode implementationを担当せず、roleからimplementation permissionを導出しない。

### 19.2 Fullstack Engineer

separate implementation start authorization後に:

- exact scope内のcode implementation
- history helper
- component／route integration
- selected participant fail-soft
- UI／responsive／accessibility
- unit／component／integration／E2E実装
- application feasibility確認

### 19.3 DevOps

- dependency change 0
- external operation 0
- evidence secret boundary
- local QA environment
- Git publication boundary
- hosted QA必要性の限定判定

### 19.4 PKA

- 正本／ADR／role authority
- Contract／Plan lifecycle
- N5→N6→N7 ancestry
- canonical docs status
- candidate copyとfinal copyの分離
- Human gate

### 19.5 Independent Reviewer

- exact Contract／candidate Head
- authority／permission
- scope
- privacy
- fail-soft behavior
- title validation
- SSR／hydration
- N7 boundary
- DoD
- unresolved conflict

Independent ReviewerはContractまたはimplementationを採用しない。

---

## 20. STOP conditions

- governing baseline drift
- PR #40／accepted Handoff identity drift
- N5→N6→N7 ancestry不一致
- Contractと正本／ADR／role正本の矛盾
- exact 10-path scope外変更が必要
- dependency追加が必要
- DB、migration、RLS、GRANT変更が必要
- API response contract変更が必要
- generic storage frameworkが必要
- server-side historyが必要
- localStorage以外のpersistenceが必要
- canonical pathname以外の保存が必要
- token別fieldが必要
- actual pathname external outputが必要
- Event取得成功前のrecordが必要
- N7仕様の取り込みが必要
- SSR HTMLのstorage依存が必要
- storage failureでEvent flow停止が必要
- selected participant key／value schema変更が必要
- last visited表示が必要
- candidate copyをHuman判断なしにfinal化する必要
- hosted QA／external operationが必要
- Product判断が追加で必要
- focused review conflict
- required QA failure
- root cause unresolved
- implementation Headを一意に固定不能

---

## 21. Escape condition

exact scope内でGoalを安全に実現できないことが証明された場合:

- fallback persistenceを追加しない
- scopeを自動拡張しない
- dependencyを追加しない
- server／DB実装へ切り替えない
- hosted QAを自動実行しない
- Product要件を弱めない
- evidenceを添えてHumanへ戻る

---

## 22. Human gates

1. `N6_EXECUTION_CONTRACT_INDEPENDENT_REVIEW`
2. `N6_EXECUTION_CONTRACT_HUMAN_ADOPTION`
3. N6 plan creation authorization
4. N6 implementation plan adoption
5. N6 implementation start authorization
6. 必要なlocal QA authorization
7. focused review
8. Git publication authorization
9. exact implementation Head acceptance
10. 後続slice／release gate

### 22.1 Review and adoption separation

Independent Reviewerはexact `v0.4-draft`を判定する。

- PASS
- CHANGES_REQUIRED
- BLOCKED

Reviewer PASSはContract adoptionではない。

Humanはreview結果を踏まえ、exact Contractを採用するか判断する。

### 22.2 Non-derivation

次は相互に自動導出しない。

- Independent Review PASS
- Human Contract adoption
- plan作成authorization
- plan adoption
- implementation start
- local QA
- Git publication
- exact Head acceptance
- hosted QA
- external operation
- merge
- Production

Contract review PASSからHuman adoption、plan作成、実装、Git publicationを導出しない。

Human adoptionからplan作成、実装、QA、publicationを導出しない。

---

## 23. Git publication boundary

別Human authorizationなしでは次を行わない。

- stage
- commit
- amend
- rebase
- push
- PR作成／更新
- PR Ready化
- merge
- branch削除

implementation branch候補:

```text
codex/n6-browser-history
```

想定baseline:

```text
af0a6f8693dd6ec6f45e03e13319751caa7deb67
```

想定stacked PR base:

```text
codex/n6-handoff-and-entry
```

PR #40はdocs-only Handoff identityとして維持し、implementation commitを追加しない。

---

## 24. Hosted QA and external operation boundary

N6はlocal QA中心とする。

このContractから次を許可しない。

- Supabase local／remote DB operation
- Supabase QA project
- migration
- credential
- Vercel env mutation
- Preview binding／redeploy
- hosted browser QA
- Production operation
- external evidence upload

hosted QAが必要になった場合、localで代替できない対象、exact target、operation count、secret boundary、STOP条件を示し、別Human gateへ戻る。

---

## 25. Final lifecycle state

```text
N6 HANDOFF ADOPTED
/
N6 EXECUTION CONTRACT v0.4 DRAFTED
/
INDEPENDENT REVIEW NOT YET PASSED
/
HUMAN ADOPTION NOT COMPLETED
/
PLAN NOT AUTHORIZED
/
IMPLEMENTATION NOT AUTHORIZED
/
GIT PUBLICATION NOT AUTHORIZED
/
HOSTED QA AND EXTERNAL OPERATIONS NOT AUTHORIZED
```

- Independent Review: `NOT YET PASSED FOR v0.4`
- Human adoption: `NOT COMPLETED`
- Plan creation: `NOT AUTHORIZED`
- Implementation: `NOT AUTHORIZED`
- Git publication: `NOT AUTHORIZED`
- Hosted QA／external operation: `NOT AUTHORIZED`
- 次のgate:  
  `N6_EXECUTION_CONTRACT_INDEPENDENT_REVIEW`