# WTV-N7-EVENT-CREATION-ABUSE-PROTECTION-EXECUTION-CONTRACT

## 0. Identity

- Contract ID: `WTV-N7-EVENT-CREATION-ABUSE-PROTECTION-EXECUTION-CONTRACT`
- Version: `v0.3-draft`
- Status: `CURRENT CORRECTION CANDIDATE / NOT ADOPTED / NOT PLAN AUTHORIZED / NOT IMPLEMENTATION AUTHORIZED`
- Primary technical owner: `Tech Lead`
- Architecture candidate: `PROVISIONAL OPTION D CANDIDATE / NOT ADOPTED`
- Current adopted authority: `v0.2-draft`
- Current adopted authority SHA-256: `f022d1ef1bb2e6896ff7be18840917ce959c7b187e798f80b52e12e739591bc1`
- Candidate base Head: `cfdc5178f73c34a535f16054dbedd6f53e722869`
- Candidate creation does not authorize REST API access, Plan creation, implementation, external mutation, Git publication, or Production operation.

This candidate does not supersede the Human-adopted v0.2. It can supersede v0.2 only after Independent Review and a separate Human adoption decision for this exact artifact.

## 1. Goal

Protect user information, credentials, external environments, and existing configuration while allowing a specialist role to perform the read-only investigation needed to determine whether N7 is feasible, within an exact Human-specified target and an authorized operation class.

No operation that can change external state may run without a separate exact Human authorization.

The Contract leaves bounded professional discretion for investigating unknown live facts. It does not require every endpoint, response field, schema, or result to be known before a read-only investigation begins. It also does not turn that discretion into unbounded discovery or weaken privacy protection.

## 2. Authority and release position

### 2.1 Authority hierarchy

1. Tracked canonical documents, ADRs, role rules, and repository governance remain the highest authority.
2. The Human-adopted N7 Handoff／Entry Contract defines the N7 entry boundary.
3. Human-adopted v0.2 remains the current task-specific Execution Contract authority until this exact v0.3 is independently reviewed and Human-adopted.
4. Source, tests, official documentation, and live read-only results are evidence of current state and required delta; they do not independently grant permission.

If a Contract conflicts with canonical authority, or evidence reveals an unexpected constraint that prevents safe realization within scope, the operation stops and returns to Human or the responsible domain owner.

### 2.2 Release ancestry

- N5 accepted Head: `022b85776109bae62ef21380539523bafc3e147b`
- N6 Handoff Head: `af0a6f8693dd6ec6f45e03e13319751caa7deb67`
- N6 accepted implementation Head／N7 future base: `cfdc5178f73c34a535f16054dbedd6f53e722869`
- Release topology: `N5 → N6 → N7 → N8 → N9`
- N5 through N7 remain one stacked release line until the N9 final release Head Human merge gate.
- Ready state, review PASS, or Contract adoption does not authorize merge or main integration.

### 2.3 Roles do not grant permission

- Tech Lead owns technical coherence, architecture evaluation, scope, and review integration.
- DevOps owns specialist judgment for bounded control-plane investigation after a separate Class R authorization.
- Fullstack Engineer owns application implementation only after separate implementation authorization.
- PKA owns lifecycle and canonical synchronization, not product or technical meaning.
- Independent Reviewer reviews a fixed artifact and does not adopt it.
- Human alone grants the gates defined by this Contract.

## 3. Confirmed current facts

### 3.1 Current Event creation response matrix

| Current condition | HTTP | JSON status | DB dispatch |
| --- | ---: | --- | ---: |
| Request body JSON parse failure | 400 | `failed` | 0 |
| Parsed request validation failure | 400 | `invalid` | 0 |
| Later pre-dispatch／known application failure | 503 | `failed` | 0 |
| Known DB rollback failure | 503 | `failed` | attempted |
| Post-dispatch uncertain result | 503 | `outcome_unknown` | possible |
| Successful atomic creation | 201 | success response | 1 |

The current client parses the response body before classifying a rate-limit status. A platform 429 with HTML, an empty body, or an unexpected body therefore cannot yet be assumed to map safely to the N7 rate-limited UI state. This is a live feasibility question, not an adopted implementation change.

### 3.2 Database and migration boundary

- M01 through M11 are immutable.
- M12 is absent and remains absent.
- Accepted creation keeps Event plus default Criterion atomic.
- Service-role use is `0`.
- Rejected business row delta must be `0`.

## 4. Canonical product policy

The policy is unchanged:

| Field | Contract |
| --- | --- |
| Protected operation | exact `POST /api/events` |
| Counting axis | IP |
| Window | 600 seconds |
| Maximum allowed | 5 |
| Rejection | 6th request |
| Enforcement point | before application／DB dispatch for a definitive rejection |
| Rejected business rows | 0 |
| Automatic retry | 0 |
| Blind retry | 0 |

The policy is not weakened to “approximately five,” per-region five, or best effort. If provider semantics cannot establish the policy, Option D remains unadopted and the architecture decision returns to Human.

### 4.1 Canonical UI meaning and copy

For a definitive rate-limit rejection, the adopted copy remains:

- `短時間に多くのきめごとが作成されました。`
- `しばらくしてからもう一度お試しください。`

The draft remains, navigation is `0`, automatic retry is `0`, and N6 history mutation is `0`. A non-429 platform error, network failure, malformed response, or otherwise ambiguous response must not be mislabeled as rate-limited.

## 5. Architecture status

### 5.1 Current status

Option D, Vercel Firewall rate limiting, is a `PROVISIONAL OPTION D CANDIDATE / NOT ADOPTED`.

Read-only inventory exists to obtain live facts needed to decide the architecture. It does not begin by presuming that Option D works.

### 5.2 Minimum feasibility questions

The later inventory should determine, where available:

- whether exact path and exact POST method matching are supported;
- whether a Preview-only condition can be proven not to match Production traffic;
- whether rejection occurs before route／Function and DB dispatch;
- whether a stable browser-visible 429 can be configured and distinguished;
- whether the algorithm, window, limit, IP key, priority, and concurrency semantics meet the policy;
- whether counters are regional, distributed, or otherwise incapable of a global exact limit;
- whether active／draft／version lifecycle and cleanup can be controlled safely;
- whether raw-IP-free evidence can establish accepted 5, rejected 1, and business row delta 0.

A same-IP, same-region test does not prove a global exact limit if counters are regional. Missing or conflicting facts remain `UNKNOWN` or `CONFLICT`; they are not inferred.

## 6. Protected assets

### 6.1 Credentials and secrets

The following are prohibited:

- displaying a bearer token, Authorization header, or credential value;
- storing them in chat, evidence, tracked or untracked files, argv, shell history, clipboard, logs, or an environment dump;
- agent creation, copy, overwrite, deletion, rotation, revocation, or scope change of credentials;
- fallback to ambient CLI login, saved CLI token, browser Cookie, default account, or another account;
- using authentication capability as proof of operation permission.

The formal control-plane remains the Vercel REST API. `@vercel/sdk` is not added as a dependency. A later packet may use Node.js standard `fetch` or an existing CLI transport only when the exact credential profile is read directly by a short-lived process and no ambient authentication fallback exists.

### 6.2 User and request data

The following must not be printed, copied to chat, persisted in evidence, or saved in a permanent file:

- raw client IP;
- request body, header, or Cookie;
- Event title or memo;
- share token or share pathname;
- personal profile;
- raw Firewall event, action, traffic sample, or runtime log.

Raw traffic-event endpoints are not called when their documented response can contain client identifiers and no server-side projection or aggregation prevents those fields from reaching the agent process. Fetching raw traffic data and discarding fields afterwards does not satisfy this boundary.

### 6.3 External state

Without a separate Human authorization, the following are prohibited:

- Vercel or Firewall configuration mutation;
- activation, publish, deployment, or environment-variable change;
- Supabase or database write;
- Hosted fixture creation;
- dependency or external-service addition;
- Git publication, Ready change, merge, or Production operation.

## 7. Receipt, processing, and persistence

These activities are distinct:

| Activity | Boundary |
| --- | --- |
| Temporarily receive an official control-plane response in process memory | May be permitted for an authorized Class R purpose after exact target and bounds are verified |
| Temporarily parse, compare, or normalize the response | May be permitted only to the minimum extent needed for the Goal; persistent digest input is limited to the non-sensitive projection |
| Print or persist raw values in console, chat, evidence, logs, cache, clipboard, or files | Prohibited |

### 7.1 Management configuration

An authorized Class R process may temporarily receive and process configured IP／CIDR values that are part of the existing management configuration when necessary to verify complete enforcement semantics. It must:

- never output or persist a raw IP／CIDR;
- never save the raw configuration response;
- discard volatile data when the short-lived process ends;
- persist only the non-sensitive semantic projection digest defined in §12.1 plus the sensitive field count, structural position classification, and comparison result defined in §12.2;
- never store a per-IP digest, prefix, surrogate, or reversible representation.

This permission is for configuration integrity. It does not authorize collection of general user traffic or request-source IPs.

### 7.2 Unexpected sensitive fields

If an otherwise legitimate configuration or identity response unexpectedly includes a sensitive field:

- do not output, persist, hash, or record its raw size;
- record only `UNEXPECTED_SENSITIVE_FIELD`, a count, and the endpoint category;
- stop using that source unless a safer server-side projection is confirmed within the authorized Class R bounds;
- do not mechanically classify temporary process-memory receipt itself as evidence leakage.

No promise of perfect JavaScript memory zeroization is made. Short process lifetime, minimum object retention, no debug capture, and process exit are the disposal controls.

## 8. Operation classes

Operation semantics, not the HTTP verb alone, determine the class. An endpoint with unknown side effects is Class M or STOP.

### 8.1 Class R — Goal-driven read-only investigation

Purpose:

- verify exact target identity;
- inspect current configuration;
- confirm feature and capability facts;
- evaluate architecture feasibility;
- obtain facts required for a safe mutation design.

Possible activities after a separate Human Class R authorization:

- official REST API GET／HEAD against the exact Human-specified Team and Project;
- official documentation review;
- temporary response parsing and comparison;
- allowlisted sanitized summaries, counts, versioned non-sensitive projection digests, and sensitive comparison classifications;
- bounded pagination, documented query／path variations, and same-resource GET comparisons;
- bounded transient retry;
- selection and ordering of necessary read-only endpoints by DevOps within the approved Goal, target, privacy boundary, and numerical bounds.

An authorization packet does not need to enumerate every endpoint or field in advance. It must define the resource families and exploration bounds sufficiently to prevent unrelated discovery.

### 8.2 Class M — External mutation

Class M includes:

- POST, PATCH, PUT, or DELETE that can change provider state;
- draft creation or update;
- activation or publish;
- rule create, update, disable, remove, or cleanup;
- environment, deployment, credential, database, or repository state changes;
- any endpoint whose side effects are unknown.

Each Class M operation requires a separate Human authorization containing:

- exact target;
- intended semantic change;
- operation class and exact mutation upper bound;
- expected diff and protected baseline;
- verification and read-back;
- outcome-unknown handling;
- exact cleanup／rollback authority, if any;
- Preview／Production impact.

Class R results, credential capability, Contract adoption, or Option D feasibility do not authorize Class M.

## 9. Class R authorization model

Defining Class R in this Contract does not authorize its execution. A later Human authorization must fix at least:

- exact Team and Project expected identity, including provenance of those expected identifiers;
- exact Goal and permitted resource categories;
- Class R only;
- approved credential source and execution profile identity;
- request, pagination, retry, per-request timeout, and wall-clock upper bounds;
- raw-output and evidence prohibitions;
- STOP and completion conditions.

### 9.1 Credential profile conditions

A later operation may use only the exact approved execution profile:

`/Users/shige/.codex/worktrees/<N7-worktree>/Where-to-Visit/.env.vercel-control.local`

Expected keys are:

- `VERCEL_TOKEN`
- `VERCEL_TEAM_ID`
- `VERCEL_PROJECT_ID`

Before reading values, it must verify without outputting contents:

- regular file and non-symlink;
- mode `0600`;
- Git ignored, untracked, and unstaged;
- exact approved key set;
- no environment dump or child-process credential export.

Human alone copies from any Human-managed source to the execution profile. The agent does not create, copy, overwrite, delete, or rotate it.

### 9.2 Identity-first fail-closed target verification

The current expected N7 target identity is:

- Team display name: `Oparea`
- Team ID: `team_s6kdrQKwUrfIS492bFKY8u1k`
- Project name: `where-to-visit-kimenosuke`
- Project ID: `prj_DUfRBf8jhqCRH2LfqRoQitJpaan1`

These identifiers are expected identity, not live proof or access permission. A later Class R packet must bind them to the Human-provided source／provenance and re-confirm them without using another target as fallback.

The later process must establish:

- expected Team ID and Project ID from the Human authorization;
- authenticated principal is usable for the expected target;
- request URL and query are bound to those exact identifiers;
- no fallback to default scope or discovery of another Team／Project;
- Production ambiguity is `0`.

Not every endpoint must echo every identifier. Correlation may use official target-binding semantics plus the exact request identity and a prior identity check. If correlation remains ambiguous, STOP.

If an identity endpoint returns a personal profile, it may be processed temporarily only for authentication matching. No raw profile is persisted; evidence is limited to match result and the minimum Human-approved stable identifier classification.

### 9.3 Credential capability is not permission

A bearer credential may technically be write-capable. A Class R packet still authorizes only its explicit read-only methods and bounds. If Vercel offers a safely verifiable project-scoped read-only credential, it is preferred. If not, Class R is possible only after Human explicitly accepts the credential capability risk and the technical process enforces GET／HEAD-only behavior. Read success is not evidence of write permission and mutation probes are prohibited.

## 10. Bounded exploration and continuation

### 10.1 Allowed adaptation

Within a Human-authorized Class R packet, DevOps may adapt to minor documentation or schema differences by using:

- the official current endpoint;
- a documented replacement endpoint;
- documented query or path variations;
- bounded schema inspection on the same exact target;
- bounded same-resource GET comparisons;
- the response cursor of the same resource for bounded pagination.

The packet fixes numerical request, page, retry, timeout, and wall-clock limits. Endpoint ordering is a specialist decision inside those limits.

### 10.2 Read result handling

- A documented candidate GET returning 400 or 404 is a discrepancy result and may lead to the next bounded documented variant.
- 401 or 403 stops alternate-target exploration and is classified as credential／scope failure.
- An undocumented redirect is not followed.
- A transient retry is allowed only for the same exact read request and only for timeout, connection reset, 5xx, or an official 429 wait condition, within the Human-approved bound.
- Schema mismatch, target mismatch, 401, and 403 have retry `0`.

### 10.3 Prohibited exploration

- another Team, Project, organization, or account;
- ID brute force or broad 403／404 enumeration;
- mutation probes;
- inferring credential scope by mutation;
- unrelated resource discovery;
- unbounded alternate endpoint or pagination attempts;
- raw traffic, Firewall action, Audit Log, or runtime-log substitution for a privacy-safe source.

The first endpoint mismatch alone does not invalidate the inventory. Exhausting the approved bounds produces a valid partial or blocked result.

## 11. Evidence boundary

### 11.1 Allowed evidence

- operation and packet identity;
- Contract and repository Head;
- UTC timestamp;
- endpoint category and HTTP method／status;
- attempt, page, and retry count;
- target match result;
- configuration version and active／draft presence;
- rule count and sanitized rule classification;
- condition, action, and rate-limit parameter classifications;
- `N7_FIREWALL_NON_SENSITIVE_JCS_RFC8785_V1` digest of the non-sensitive semantic projection;
- sensitive field count, structural position classification, and `MATCH`, `CHANGED`, `ADDED`, `REMOVED`, or `UNCOMPARABLE` comparison result;
- sensitive comparison algorithm／canonicalization version;
- `PASS`, `FAIL`, `UNKNOWN`, `CONFLICT`, `PARTIAL`, or `BLOCKED`;
- discrepancy, remaining unknown, and decision reason.

### 11.2 Prohibited evidence

- token, Authorization header, credential, raw URL with secret, or profile body;
- raw response or raw-response SHA／bytes;
- raw IP／CIDR or any per-IP digest／prefix;
- a digest covering sensitive configuration values, a public salted hash, or any other offline-enumeration oracle;
- raw request, header, Cookie, event, traffic sample, Audit Log, or runtime log;
- personal profile;
- Event title, memo, share token, or pathname;
- unrelated project data.

Evidence storage, when later authorized, is no-replace, secret-free, root mode `0700`, file mode `0600`, and never produced by tee, debug trace, or raw capture.

Provider-side audit or access logging may exist and is not represented as agent-side persistence `0`. Provider Audit Logs, if safely available, are supplementary only and never the sole mutation authority.

## 12. Semantic integrity

Configuration integrity uses two separate layers. Persistent evidence never contains a digest whose input includes a sensitive value.

### 12.1 Non-sensitive semantic projection

The persistent non-sensitive projection includes, where present:

- Firewall enabled state;
- ordered rule structure and priority;
- rule enabled state;
- non-sensitive condition type, operator, and classification;
- actions;
- rate-limit algorithm, window, limit, key class, and response action;
- managed rules and rulesets;
- other enforcement semantics after sensitive leaf values have been separately classified under §12.2.

The canonicalization contract is `N7_FIREWALL_NON_SENSITIVE_JCS_RFC8785_V1`. After the field classification and projection defined by this Contract, the projection is serialized exactly by RFC 8785 JSON Canonicalization Scheme（JCS）:

- require I-JSON-compatible input and reject duplicate object keys before a parser can apply last-key-wins behavior;
- serialize as UTF-8 JSON with no BOM and no insignificant whitespace;
- sort object property names recursively by the RFC 8785 lexicographic UTF-16 code-unit rule;
- preserve array element order;
- serialize strings using the RFC 8785／ECMAScript escaping rules, with no optional slash escape, alternate `\uXXXX` spelling, or Unicode normalization;
- serialize finite IEEE 754 numbers using the RFC 8785／ECMAScript shortest deterministic representation, including its rules for `-0`, decimal form, and exponent form;
- serialize boolean and null using their lowercase JSON literals;
- classify a non-I-JSON value, lone surrogate, non-finite number, unsupported representation, or serialization failure as `UNCOMPARABLE`.

An unsupported or unknown provider field is not silently omitted: it makes the projection `UNCOMPARABLE` and stops integrity PASS. Provider-generated ID, version, `updatedAt`, and other metadata remain separately classified from enforcement semantics.

The persistent digest is SHA-256 over the exact UTF-8 bytes of that canonical non-sensitive projection. Evidence records the algorithm and canonicalization version. No new dependency is required.

### 12.2 Sensitive configuration fields

Sensitive fields include configured IP, CIDR, header value, Cookie value, secret-like condition value, personal／tenant-specific identifier, and any other value with practical offline-enumeration risk.

Within one authorized short-lived process, before and after values may be compared directly using `N7_FIREWALL_SENSITIVE_COMPARE_V1`. The comparison is type-sensitive and position-sensitive: it compares each classified sensitive leaf by its non-secret structural position and exact in-memory value. It persists only:

- sensitive field count;
- non-secret structural position classification;
- `MATCH`, `CHANGED`, `ADDED`, `REMOVED`, or `UNCOMPARABLE`;
- comparison algorithm／canonicalization version.

It does not persist a raw value, raw-value digest, per-value digest, prefix, public salted hash, reversible surrogate, or a whole-configuration digest that contains a sensitive value. Raw values are released with the short-lived process.

For the N7 intended rule diff, existing sensitive fields must be `MATCH` and sensitive values added or removed must be `0`. Any other result stops activation. Equivalent-looking textual rewrites are conservatively `CHANGED` unless a separately reviewed in-memory canonicalizer establishes equivalence; no public normalization hash is used.

### 12.3 Cross-run sensitive comparison

Cross-run comparison is permitted only by one of these designs:

1. baseline and post-state are compared within a single short-lived process belonging to the same authorized operation packet;
2. in a later authorized run, the exact baseline version and current version are both fetched into the same short-lived process and their sensitive fields are directly compared under §12.2; provider identity must first be proven immutable and target-bound;
3. if a keyed digest is indispensable, a separate Human decision adopts key custody, generation, storage, retention, access, rotation, and comparison scope.

Provider version／configuration identity and the non-sensitive projection digest may locate and verify the configurations, but they do not by themselves establish sensitive equality. If the exact baseline or current version cannot be fetched together, provider identity immutability or target binding is not confirmed, or direct comparison cannot complete, the result is `UNCOMPARABLE` and no `MATCH` claim is made.

This Contract does not adopt a keyed digest. It does not create a persistent secret key, salt file, digest helper, credential, or dependency.

## 13. Inventory purpose and valid outcomes

The purpose of inventory is to obtain live facts for deciding whether Option D or another N7 architecture can satisfy the canonical policy. It is not to pre-prove Option D.

Each of the following is a valid inventory result:

- Option D is feasible;
- Option D is not feasible;
- canonical policy conflicts with platform semantics;
- some facts are confirmed and a Human product／risk decision is required;
- another architecture must be considered;
- a further bounded read-only investigation has identifiable value and risk;
- permission, target, privacy, or correlation blocks the investigation.

An inventory may complete as `PARTIAL` when it records confirmed facts, source category, remaining unknowns, and the value and risk of another bounded read. It need not answer every question in one run.

Technical facts and Human decisions remain separate. Regional／distributed counter behavior, exact limit and window behavior, pre-dispatch rejection, browser-visible 429, Preview predicate behavior, Production non-interference, configuration lifecycle, cleanup semantics, and observability availability are `CONFIRMED` only through appropriate technical evidence. Contract adoption, risk acceptance, or architecture preference cannot convert an unknown technical fact into `PROVEN` or `PASS`.

Human may choose an architecture, reject Option D, authorize another bounded investigation, accept a clearly recorded residual risk, rebaseline canonical policy through a separate decision, or decide scope／cost／schedule／launch. Risk acceptance is not technical proof. Its record separates confirmed facts, unknown facts, accepted risk, affected requirement, expiry／review condition, and operation permission.

Configuration inventory remains valid when optional raw-IP-free traffic observability is unavailable. However, Option D adoption, Plan-ready status, Hosted proof, and claims about route invocation／DB dispatch remain blocked if the necessary aggregate evidence cannot be obtained through another raw-IP-free authorized source.

## 14. Goal-driven STOP conditions

Class R stops when:

- target identity is ambiguous or wrong;
- the repository, branch, Head, environment, or profile differs from the authorization;
- credential safety checks fail;
- a mutation or side-effect-unknown endpoint is required;
- another Team／Project or an out-of-scope resource is required;
- privacy cannot be protected;
- bounds are exhausted or unbounded discovery would be needed;
- a Production change or possible Production impact is required;
- provider response and operation cannot be correlated;
- an unknown sensitive response source has no safer projection;
- a Human product, policy, credential-risk, or architecture decision is required.

A read timeout or incomplete response after bounded retry is `READ_INCOMPLETE / NO MUTATION CLAIMED`. It does not infer state or authorize Class M.

## 15. Client and N6 invariants

### 15.1 Required future classification if Option D becomes feasible

- A definitive `response.status === 429` must be classified before body parsing.
- The 429 body is not trusted, rendered, or logged and may be HTML or empty.
- The canonical copy is shown, the draft remains, navigation is `0`, retry is `0`, and N6 history mutation is `0`.
- 403, challenge, non-429 5xx, network failure, or malformed response is not classified as rate-limited unless a later adopted architecture proves an exact mapping.
- Success response alone does not record N6 history. History is recorded only after a successful share-page lookup.

### 15.2 Preserved state matrix

| State | HTTP／status | DB dispatch | Business row delta | Navigation | N6 history |
| --- | --- | ---: | ---: | ---: | ---: |
| Request parse failure | `400 / failed` | 0 | 0 | 0 | 0 |
| Validated input failure | `400 / invalid` | 0 | 0 | 0 | 0 |
| Definitive rate-limit rejection | expected `429` if architecture proves it | 0 | 0 | 0 | 0 |
| Later known failure | `503 / failed` | 0 or rolled back | 0 | 0 | 0 |
| Post-dispatch unknown | `503 / outcome_unknown` | possible | unknown pending reconciliation | 0 | 0 |
| Accepted creation | `201` | 1 | Event 1 + default Criterion 1 atomically | share navigation | only after successful lookup |

No application or test implementation is authorized by this candidate. The provisional minimum application paths remain candidates only:

- `src/components/CreateEventForm.tsx`
- `tests/slice-1.spec.ts`

The final scope is decided after inventory and separate Plan authorization.

## 16. Strict Class M lifecycle

Read-only discretion does not relax mutation safety.

### 16.1 Configuration lifecycle

- Configuration inventory distinguishes active configuration, draft configuration, and versions.
- PATCH or draft update success is not active enforcement.
- Activation／publish completion is required before a configuration can be treated as active.
- After activation／publish, Firewall configuration may take effect without an application redeploy; this does not mean PATCH alone is active.
- Active read-back verifies enforcement state.

### 16.2 External mutation ledger

Each is a separate external mutation:

| Mutation | Meaning |
| --- | --- |
| M1 | N7 draft create／update |
| M2 | N7 draft activation／publish |
| M3 | N7 cleanup draft create／update |
| M4 | N7 cleanup activation／publish |

Each has execution count `1`, automatic retry `0`, and an exact precondition, expected diff, read-back, and outcome classification in a later Human-approved operation packet.

### 16.3 Shared draft and drift guard

Before M1 and before every activation or cleanup mutation:

- record the active provider version, §12.1 non-sensitive projection digest, and §12.2 sensitive comparison evidence without persisting a sensitive-value digest;
- require no draft, or an exact N7-owned draft correlated to the authorized operation;
- require no unrelated draft delta;
- compare the active baseline with the expected baseline;
- require the activation target version and N7 rule identity to be unique;
- prove that Production traffic cannot match the N7 rule before treating the operation as non-Production.

An unknown or unowned draft is never discarded, overwritten, or activated. Whole-configuration replacement is prohibited by default. Existing unrelated changes are never bundled with N7 activation.

### 16.4 Mutation outcome unknown

For timeout, connection loss, 5xx, response parse loss, or other uncertain mutation result:

- blind mutation retry is `0`;
- only separately authorized Class R active／draft／versions reconciliation may run;
- classify `NO_MUTATION_CONFIRMED`, `COMPLETED_CONFIRMED`, `N7_OWNED_REVERSIBLE_PARTIAL`, `UNKNOWN`, or `CORRELATION_IMPOSSIBLE`;
- do not cleanup or repair unless its exact mutation and bound were pre-authorized;
- unrelated state, ambiguous correlation, or Production impact returns to Human disposition.

When reconciliation must compare sensitive fields across process runs, a new authorized Class R process must fetch the recorded exact baseline version and current active／draft version together and compare them in memory under §12. If the baseline version cannot be re-read, or its immutability and target binding cannot be established, sensitive equality is `UNCOMPARABLE`; unchanged state is not inferred and activation／cleanup stops.

## 17. Preview and Production separation

Vercel Firewall configuration is project-level. A rule described as Preview-only still changes the active project configuration.

It may be treated as non-Production only if read-only inventory and official semantics prove that its environment predicate, priority, and conditions cannot match Production traffic. STOP for separate Human authorization if:

- no reliable environment predicate exists;
- Preview／Production matching semantics are unknown;
- Production requests may match;
- rule priority can affect Production;
- activation includes a non-N7 change;
- Production non-interference cannot be proven.

Production mutation always requires its own explicit Human authorization. A bounded non-Production packet never includes Production operation, Git publication, or merge.

## 18. Hosted proof and observability

Configuration inventory and traffic observability are separate.

- Active／draft／versions inventory is mandatory for operation design and is performed without intentional raw traffic-IP acquisition.
- Traffic／action aggregate observability is an optional source and may be used only if server-side aggregation, projection, or redaction prevents raw client identifiers, requests, headers, and Cookies from reaching the agent process.
- A response that can contain raw client identifiers is not fetched and sanitized afterwards.
- Unavailable aggregate observability does not invalidate configuration inventory.
- It does block Hosted proof, Option D adoption, and Plan-ready status when route invocation, DB dispatch, selected-rule enforcement, or row-zero evidence cannot be obtained by another raw-IP-free source.
- Audit Logs, runtime raw logs, and Firewall raw events are not substitutes.

A later Hosted operation, if separately authorized, must demonstrate within its exact packet:

- five accepted requests and a sixth definitive rejection under the policy conditions;
- rejected route／DB dispatch `0` or another accepted pre-dispatch proof;
- rejected business row delta `0`;
- accepted Event plus default Criterion atomicity;
- fixture cleanup and final business row state;
- no Production operation and no raw traffic identifier evidence.

## 19. QA and Definition of Done for a later implementation

This section is a future verification contract, not test authorization.

### 19.1 DB-independent QA

- current `400 / failed`, `400 / invalid`, `503 / failed`, and `503 / outcome_unknown` classifications remain distinct;
- malformed JSON is `400 / failed`, validated invalid is `400 / invalid`, and each has DB dispatch `0`;
- 429 is classified before body parsing;
- HTML, empty, or malformed 429 body does not cause unknown classification;
- non-429 errors are not mislabeled as rate-limited;
- draft, navigation, retry, and N6 history invariants hold;
- automatic and blind retry loops are absent;
- canonical UI copy is unchanged.

### 19.2 Inventory DoD

A later Class R inventory is complete when it reports:

- exact target and credential-safety verification;
- numeric operation counts and bounds;
- confirmed, unavailable, unknown, and conflicting facts separately;
- active／draft／versions and provider configuration identity where safely available;
- non-sensitive projection digest and sensitive count／comparison evidence under §12;
- Option D feasibility without weakening the product policy;
- remaining unknowns and any next Human decision;
- secret-free, raw-IP-free persisted evidence;
- mutation `0`.

Partial or blocked inventory is a valid outcome when its facts and limits are explicit.

### 19.3 Architecture adoption DoD

Option D cannot be adopted or made Plan-ready until appropriate technical evidence confirms all policy-relevant facts required by the current canonical policy, including:

- exact route and method matching;
- pre-dispatch rejection;
- stable browser-visible rate-limit status;
- Preview isolation and Production non-interference;
- 600-second, IP, limit-five, sixth-rejection semantics;
- regional／distributed counter implications;
- safe active／draft lifecycle and exact cleanup;
- adequate raw-IP-free Hosted evidence.

Human judgment alone cannot mark an unconfirmed technical fact as `PROVEN` or `PASS`. If evidence shows that Option D cannot satisfy the canonical policy, Option D is `FAIL` or remains `NOT ADOPTED`; return to Human for another architecture, another bounded investigation, or a separate canonical policy-rebaseline decision. Residual-risk acceptance is recorded separately and does not substitute for technical proof. This Contract does not change the policy.

## 20. Scope and prohibited work

This candidate creation changes documentation only. It does not authorize:

- Class R inventory execution;
- Class M mutation;
- Plan creation or adoption;
- branch／worktree creation;
- application, test, helper, package, lockfile, migration, or configuration change;
- credential access or operation;
- Vercel REST API／CLI use;
- Firewall read or mutation;
- Hosted request or QA;
- Supabase operation;
- Git stage, commit, push, PR change, Ready, merge, or publication;
- Production operation;
- N8, N9, or N12 execution.

## 21. Human gates

The gates remain separate:

1. `N7_EXECUTION_CONTRACT_V0_3_INDEPENDENT_REVIEW`
2. Human adoption of the exact reviewed v0.3 artifact
3. Class R live inventory authorization with exact target, Goal, privacy, and numerical bounds
4. Architecture decision
5. Implementation Plan authorization and adoption
6. Implementation start authorization
7. Any Class M operation packet authorization
8. Local／Hosted QA gates as required
9. Git publication
10. Exact Head acceptance and later release gates

Review PASS does not authorize Human adoption. Human adoption does not authorize inventory, Plan, implementation, mutation, publication, or Production.

## 22. Candidate lifecycle

- v0.2: `CURRENT HUMAN-ADOPTED AUTHORITY / IMMUTABLE`
- v0.3: `CURRENT CORRECTION CANDIDATE / NOT ADOPTED / READY FOR INDEPENDENT REVIEW`
- Architecture: `PROVISIONAL OPTION D CANDIDATE / NOT ADOPTED`
- REST API inventory: `NOT AUTHORIZED / NOT RUN`
- Plan: `NOT AUTHORIZED`
- Implementation: `NOT AUTHORIZED`
- Firewall mutation: `NOT AUTHORIZED / NOT RUN`
- Git publication／merge: `NOT AUTHORIZED`
- Production: `NOT AUTHORIZED`
- Next gate: `N7_EXECUTION_CONTRACT_V0_3_INDEPENDENT_REVIEW`

Candidate verdict:

`N7_EXECUTION_CONTRACT_V0_3_API_ACCESS_BOUNDARY_CORRECTION_READY_FOR_INDEPENDENT_REVIEW`
