# WTV-N7-EVENT-CREATION-ABUSE-PROTECTION-EXECUTION-CONTRACT

## 0. Identity

- Contract ID: `WTV-N7-EVENT-CREATION-ABUSE-PROTECTION-EXECUTION-CONTRACT`
- Version: `v0.4-draft`
- Status: `CURRENT POLICY REBASELINE CANDIDATE / NOT ADOPTED / READY FOR INDEPENDENT REVIEW`
- Primary technical owner: `Tech Lead`
- Candidate architecture: `VERCEL-ALIGNED ROUTE-SPECIFIC ABUSE MITIGATION CANDIDATE / NOT ADOPTED`
- Current authority until later v0.4 Human adoption: `v0.3-draft`
- Current authority SHA-256: `336ecad1f269b5d512a67ab0c25e785c6a8561bd1f138f78d401277ac7fbf6ec`
- Candidate base Head: `cfdc5178f73c34a535f16054dbedd6f53e722869`
- Next gate: `N7_EXECUTION_CONTRACT_V0_4_INDEPENDENT_REVIEW`

This artifact is a policy rebaseline candidate. Independent Review and a separate Human adoption decision for this exact artifact are both required before it can supersede v0.3. Drafting this artifact authorizes no Plan, implementation, credential access, external read, external mutation, Git publication, merge, or Production operation.

## 1. Goal

N7 protects the login-free public Event creation API from obvious single-source bursts and simple automation without claiming a globally exact quota or unnecessarily disrupting legitimate groups that share one public IP.

N7 uses a route-specific Vercel Firewall rate limit as an early, tunable operational guardrail. The launch candidate starts with `60 requests / 600 seconds / IP / fixed window / HTTP 429`, subject to provider semantics, controlled QA, privacy-safe evidence, and later Human approval.

N7 is one layer in a defense-in-depth model. It is not:

- a billing quota;
- a legal entitlement;
- an exact per-user allowance;
- a globally consistent distributed counter;
- a guarantee that the global sixth or sixty-first request is always rejected.

## 2. Authority and lifecycle

### 2.1 Authority hierarchy

1. Tracked canonical documents, ADRs, role rules, and repository governance remain highest authority.
2. The Human-adopted N7 Handoff／Entry Contract and Execution Contract v0.3 remain immutable provenance and current task-specific authority until v0.4 is later Human-adopted.
3. The Human policy decision governing this candidate reclassifies N7 from global exact quota to operational abuse mitigation and provides the target policy delta.
4. Source, tests, official provider documentation, and authorized read-only inventory are evidence of current state and required delta; they do not grant permission.

The older Contracts record the decision and evidence available at their adoption time. They do not prevent a later Human policy rebaseline. Privacy, permission, external-mutation safety, data-integrity, retry, and Human-gate protections expressly retained here continue unchanged.

Execution Contract v0.3 remains the immutable current adopted snapshot until later v0.4 adoption, but its old `5 / 600 / global exact` clauses are no longer a Plan or implementation basis after the current Human policy rebaseline. Plan creation and implementation remain blocked until an exact reviewed v0.4 is Human-adopted and their own later gates are granted.

If this candidate conflicts with higher canonical authority, or new evidence shows it cannot be realized safely within scope, STOP and return to Human or the responsible domain owner.

### 2.2 Release position

- N5 accepted Head: `022b85776109bae62ef21380539523bafc3e147b`
- N6 accepted implementation Head／N7 base: `cfdc5178f73c34a535f16054dbedd6f53e722869`
- Release topology: `N5 → N6 → N7 → N8 → N9`
- N5 through N7 remain one stacked release line until the later N9 final-Head Human merge gate.
- Review, Contract adoption, architecture adoption, Ready state, or exact Head acceptance does not itself authorize merge or Production.

### 2.3 Roles do not grant permission

- Tech Lead owns technical coherence and integrates specialist review.
- DevOps owns provider and control-plane technical judgment after a separate authorization.
- Fullstack Engineer owns application implementation after separate implementation authorization.
- PKA owns lifecycle and canonical synchronization, not product or technical meaning.
- Independent Reviewer reviews a fixed artifact and does not adopt it.
- Human grants the separate gates defined by this Contract.

## 3. Confirmed facts, Human decisions, and unknowns

### 3.1 Confirmed completed bounded Class R facts

- Exact target Project GET returned `200` and matched the expected Project ID and name.
- Team binding was confirmed.
- The project-scoped credential was usable for the authorized Class R read.
- Vercel Firewall supports path and method conditions, IP-based rate limiting, a 600-second window, configurable limits, HTTP 429 behavior, and project-level configuration.
- Vercel Firewall counters are region-scoped. Vercel Firewall alone therefore cannot prove the former global exact `5 / 600 / IP` guarantee.

### 3.2 Human policy decisions

- N7 is route-specific operational abuse mitigation, not a global exact quota.
- The protected operation remains exact `POST /api/events`.
- The provisional launch parameter is `60 / 600 / IP`, fixed window, HTTP 429.
- Shared-IP legitimate use must be considered.
- Parameters are adjusted only through bounded Human-approved operations using evidence.
- Bot Protection, JA4, extra WAF conditions, application-side limiter, central limiter, and authentication are not adopted by this candidate.

### 3.3 Remaining unknowns

The following remain unproven until appropriate later evidence exists:

- complete active／draft／versions semantic projection;
- active-configuration endpoint behavior and version immutability;
- Preview isolation and Production non-interference;
- whether the rejection is pre-route and pre-DB in the intended deployment;
- browser-visible 429 behavior in Hosted QA;
- raw-IP-free Hosted proof and aggregate observability availability;
- exact cleanup design and its outcome-unknown reconciliation.

Unknown facts remain `UNKNOWN`; Human policy choice does not convert them to `PROVEN` or `PASS`.

## 4. Stable product and safety policy

The following are stable policy:

- login-free service model;
- exact protected route and method: `POST /api/events`;
- operational abuse-mitigation purpose;
- intent to reject before application／DB work where provider behavior and Hosted proof establish that result;
- global exact quota claim `0`;
- safe HTTP 429 handling;
- create-form draft preservation;
- navigation `0` on rejection;
- automatic retry `0` and blind retry `0`;
- N6 history mutation `0` for rate-limited, failed, or unknown creation;
- rejected Event row delta `0`;
- rejected default Criterion row delta `0`;
- accepted Event plus default Criterion remain atomic;
- Human-controlled, evidence-based parameter changes;
- Class R／Class M separation;
- Production as a separate Human gate.

These boundaries cannot be weakened by routine parameter tuning.

## 5. Provisional launch parameter

| Field | Initial value |
| --- | --- |
| Path | exact `/api/events` |
| Method | exact `POST` |
| Counting key | IP |
| Algorithm | fixed window |
| Window | 600 seconds |
| Limit | 60 requests |
| Exceed action | HTTP 429 |

This configuration is:

- provisional;
- operational;
- provider-semantic;
- region-scoped;
- Human-adjustable;
- not a global exact quota;
- not a per-user quota;
- not a permanent product invariant.

It must not be described as “each user may create 60 Events.” One public IP may represent many people, while the same source may be counted independently in multiple provider regions.

## 6. Shared-IP handling

The initial threshold accounts for legitimate shared egress from:

- schools and classrooms;
- companies and offices;
- workshops and event venues;
- public Wi-Fi;
- households and groups;
- NAT gateways and other shared networks.

The launch guardrail prefers avoiding unnecessary disruption of legitimate group creation while still suppressing obvious single-source bursts. A 429 from one IP is not proof of one person's abuse. Human review must consider the use context, false-positive evidence, and provider region semantics before tightening the rule.

## 7. Tunable operational parameters and change classes

The following are tunable operational parameters:

- counting key;
- request limit;
- window;
- action mode;
- rule priority;
- environment scope;
- additional WAF conditions;
- Bot Protection／Challenge use.

Every external parameter change needs a bounded Human-approved operation packet. The level of policy review depends on the semantic change.

### 7.1 Routine operational tuning candidate

A change may be routine operational tuning when it stays within the adopted route-specific abuse-mitigation purpose and all stable policy and safety boundaries. Example: changing the request limit from 60 to 80 after evidence of legitimate shared-IP false positives.

Routine tuning still requires exact target, baseline, intended diff, operation count, read-back, outcome-unknown handling, cleanup or retention decision, and Human authorization. It does not automatically require a full Execution Contract rebaseline.

### 7.2 Architecture or risk review candidate

The following require architecture and risk review rather than routine tuning:

- changing the primary key from IP to JA4;
- adding Bot Protection or Challenge Mode;
- adding an application-side secondary limiter;
- introducing a central authoritative limiter;
- altering the control plane or credential model;
- changing enforcement in a way that can affect unrelated routes or Production traffic.

### 7.3 Product policy rebaseline

Changes to the login-free model, protected product operation, user entitlement, authentication/account boundary, or the purpose and stable safety semantics require Human product-policy rebaseline. Adding login is one such change.

## 8. Tuning signals and Human decisions

### 8.1 Signals to consider loosening

- legitimate 429 during a school, workshop, or event;
- a shared-IP false-positive incident;
- support inquiry attributable to rate limiting;
- legitimate creation bursts approaching the threshold;
- a normal introduction event being impeded.

### 8.2 Signals to consider tightening or layering

- repeated empty or junk Event creation;
- persistent single-IP saturation;
- DB, Function, or cost anomaly;
- scripted behavior or threshold probing;
- distributed bot activity;
- similar abuse from many IPs.

Signals do not mutate configuration automatically. Human evaluates signal quality, false-positive risk, affected environment, shared-IP context, evidence limitations, and the proposed change class before authorizing any operation.

## 9. Layered protection model

### 9.1 Launch layer candidate

- exact route-specific Vercel rate limit;
- provisional `60 / 600 / IP` fixed window;
- safe client 429 behavior;
- controlled Preview QA;
- available privacy-safe observability.

### 9.2 Escalation candidates only

- limit or window adjustment;
- additional WAF conditions;
- JA4 or another provider-supported key;
- Bot Protection Log Mode;
- Bot Protection Challenge Mode;
- application-side secondary defense;
- authoritative central limiter;
- authentication or account boundary.

No escalation candidate is adopted by this Contract. Each requires evidence, scope and risk review, and a separate Human decision. Bot Protection is not a launch requirement.

## 10. Client and N6 behavior

### 10.1 Definitive 429 handling

- Classify `response.status === 429` before parsing the response body.
- Do not trust, render, or log the 429 body; it may be empty, HTML, or unexpected content.
- Retain the user's create-form draft.
- Navigation is `0`.
- Automatic retry is `0`.
- N6 history mutation is `0`.

Canonical copy remains unchanged:

- `短時間に多くのきめごとが作成されました。`
- `しばらくしてからもう一度お試しください。`

Because an IP may represent multiple people, the copy is intentionally not a claim that one person exceeded a personal allowance. Exact product-copy change is outside this candidate and remains a later Human decision item if real QA shows confusion.

### 10.2 Preserved response distinctions

| State | HTTP／status | DB dispatch | Business row delta | Navigation | N6 history |
| --- | --- | ---: | ---: | ---: | ---: |
| Request parse failure | `400 / failed` | 0 | 0 | 0 | 0 |
| Validated input failure | `400 / invalid` | 0 | 0 | 0 | 0 |
| Definitive rate-limit rejection | expected `429` after technical proof | intended 0 | required 0 | 0 | 0 |
| Later known failure | `503 / failed` | 0 or rolled back | 0 | 0 | 0 |
| Post-dispatch unknown | `503 / outcome_unknown` | possible | unknown pending reconciliation | 0 | 0 |
| Accepted creation | `201` | 1 | Event 1 + default Criterion 1 atomically | share navigation | only after successful share-page lookup |

A 403, challenge, non-429 5xx, network failure, or malformed response is not labeled rate-limited unless a later adopted design proves that mapping. A successful creation response alone does not record N6 history; successful share-page lookup remains required.

## 11. Business data and migration boundary

- Rejected Event row delta: `0`.
- Rejected default Criterion row delta: `0`.
- Accepted Event plus default Criterion: atomic.
- Broad service-role use: `0`.
- M01 through M11: immutable.
- M12: absent.

“Early enforcement” is the design intent. “Provider-documented behavior” and “Hosted proof of no route／DB dispatch” are separate evidence classes. This Contract does not mark pre-route or pre-DB rejection `PROVEN` before Hosted evidence.

## 12. Privacy-safe observability and review

N7 does not require indefinite traffic logging, raw Firewall events, or raw client-IP persistence.

Candidate sanitized signals include, when safely available:

- 429 count;
- rule-match count;
- time bucket;
- environment;
- affected route classification;
- support inquiries;
- business-row growth;
- Function, DB, or cost anomaly;
- false-positive incident;
- known school or workshop event.

Raw client IP, request, header, Cookie, Event content, share token, and raw traffic event are not persisted in evidence. Fetching raw data and discarding sensitive fields afterward is not proof of non-acquisition. Aggregate observability is usable only when server-side aggregation or projection prevents raw client identifiers from reaching the agent process.

Candidate Human review points are:

- immediately after Preview QA;
- after an initial launch observation period chosen by Human;
- after a school or workshop event;
- when a 429 or abuse signal reaches a Human-agreed trigger;
- before changing action mode or introducing Bot Protection.

This Contract does not invent a permanent review schedule. Unavailable aggregate observability does not invalidate configuration inventory, but it blocks claims and decisions that require that evidence unless another authorized raw-IP-free source exists.

## 13. Architecture disposition

The former architecture form:

`GLOBAL EXACT 5／600 OPTION D`

is:

`REJECTED / NOT FEASIBLE ON VERCEL FIREWALL ALONE`

The current candidate is:

`VERCEL-ALIGNED ROUTE-SPECIFIC ABUSE MITIGATION CANDIDATE / NOT ADOPTED`

The same platform technology is being evaluated against a different, provider-aligned operational Goal. Creating or reviewing v0.4 does not adopt the architecture, prove unknown provider behavior, or authorize implementation.

## 14. Class R and Class M

### 14.1 Class R — bounded read-only investigation

Class R may inspect exact Human-authorized target and resource categories within fixed request, pagination, retry, timeout, privacy, and wall-clock bounds. It does not grant Class M. Credential capability, prior read success, Contract adoption, or architecture preference is not mutation permission.

### 14.2 Class M — external mutation

Each external mutation requires a separate exact Human authorization. The lifecycle remains:

| Mutation | Meaning |
| --- | --- |
| M1 | N7 draft create／update |
| M2 | N7 draft activation／publish |
| M3 | N7 cleanup draft create／update |
| M4 | N7 cleanup activation／publish |

For each mutation:

- execution count is fixed by the later packet;
- automatic retry is `0`;
- PATCH or draft-update success is not active enforcement;
- active, draft, and versions are distinguished;
- activation／publish and active read-back are required before enforcement is considered active;
- unknown or unowned shared draft is never overwritten, discarded, or activated;
- unrelated semantic delta causes STOP;
- active baseline drift causes STOP;
- outcome unknown allows no blind mutation retry;
- only separately authorized read-only reconciliation may classify actual state;
- cleanup is exact and separately authorized;
- Production requires separate authorization.

## 15. Configuration integrity and evidence

The v0.3 privacy and semantic-integrity model remains adopted for future packets:

- non-sensitive configuration uses `N7_FIREWALL_NON_SENSITIVE_JCS_RFC8785_V1`;
- sensitive comparison uses `N7_FIREWALL_SENSITIVE_COMPARE_V1` in short-lived process memory;
- persistent sensitive evidence is limited to count, non-secret structural classification, and `MATCH`, `CHANGED`, `ADDED`, `REMOVED`, or `UNCOMPARABLE`;
- raw configuration response, raw IP／CIDR, per-value digest, prefix, reversible surrogate, Authorization material, and personal profile are not persisted;
- unsupported fields or unsafe cross-run comparison remain `UNCOMPARABLE` rather than inferred equal.

Primary operation evidence is identity-first preflight, active／draft／versions read-back, exact semantic diff, response status, configuration／rule／version correlation, activation read-back, cleanup read-back, and secret-free operation counts. Provider Audit Logs are supplementary only and never the sole mutation authority.

## 16. Credential lifecycle

Current confirmed state:

- a project-scoped Vercel token exists;
- exact Project read passed;
- target Project is `where-to-visit-kimenosuke`;
- the token may be technically write-capable;
- permission remains operation-specific.

This drafting task accesses or changes no credential.

Every future credential-dependent task must state:

- whether the token is necessary;
- the Human action required;
- exact credential scope and target;
- expiry or validity boundary;
- secret-free preflight;
- permitted operation class and numeric bounds;
- outcome-unknown handling;
- retention or revocation decision.

The agent does not create, copy, overwrite, delete, rotate, revoke, or broaden credential scope. Ambient CLI login, saved CLI token, browser Cookie, default account, or another account is not a fallback.

## 17. Preview and Production progression

The intended progression is defined without authorizing it:

1. implement and locally verify safe 429 client handling;
2. review and authorize an exact Class M packet;
3. prepare a safely isolated Preview-targeted rule candidate;
4. read back the draft and exact intended diff;
5. activate／publish the exact candidate;
6. read back the active configuration;
7. perform separately authorized Hosted QA;
8. assess behavior and false positives;
9. make a Human cleanup or retention decision;
10. later seek separate Production authorization.

Firewall configuration is project-level. A Preview-targeted rule still changes project configuration. Preview isolation is not `PASS` until official semantics and exact read-back prove that Production traffic cannot match or be affected. A bounded non-Production packet never includes Production operation, Git publication, or merge.

## 18. Future QA contract

This section defines later verification requirements; it authorizes no test or Hosted operation.

### 18.1 DB-independent and application QA

- 429 is classified before body parsing.
- HTML, empty, or malformed 429 body is not trusted or rendered.
- Non-429 failures are not mislabeled as rate-limited.
- Draft, navigation, retry, and N6 history invariants hold.
- Existing `400 / failed`, `400 / invalid`, `503 / failed`, and `503 / outcome_unknown` classifications remain distinct.
- Canonical copy remains unchanged.
- Automatic and blind retry loops are absent.

### 18.2 Controlled provider-aligned QA

- exact route and method matching;
- configured fixed-window parameter read-back;
- bounded behavior around threshold-minus-one, threshold, and threshold-plus-one, using a safe test design appropriate to provider semantics;
- exact browser-visible 429 classification;
- rejected Event and default Criterion row delta `0`;
- accepted Event plus default Criterion atomicity;
- other-route non-interference;
- Preview／Production non-interference;
- region-scoped semantics recorded without a global exact claim;
- privacy-safe evidence;
- exact fixture cleanup or an explicit retention decision;
- Human assessment of shared-IP and false-positive risk.

QA does not automatically require creating 60 persistent Events. A later Plan must choose between full-threshold testing and a separately authorized temporary lower QA threshold based on provider support, mutation count, DB cost, cleanup safety, and evidence value. Neither option is adopted here.

School or shared-IP behavior may be evaluated through bounded simulation and Human review. Raw client-IP evidence is not required or permitted.

### 18.3 Architecture adoption and external-progression DoD

The Vercel-aligned architecture candidate cannot become architecture-adopted, its Preview result cannot be accepted, and Production progression cannot begin until appropriate evidence confirms:

- exact route and method semantics;
- configuration lifecycle and exact cleanup feasibility;
- stable HTTP 429 behavior;
- sufficient early-enforcement and rejected-row evidence;
- Preview isolation and Production non-interference for the intended packet;
- region-scoped counter semantics are recorded without global guarantees;
- adequate raw-IP-free evidence and Human false-positive assessment.

An unavailable or conflicting required fact produces `UNKNOWN`, `CONFLICT`, `PARTIAL`, or `BLOCKED`, not PASS.

This architecture-evidence requirement does not block Independent Review or Human adoption of this Execution Contract as a governance artifact. Contract adoption still grants no architecture adoption, Plan, implementation, or external operation.

After exact v0.4 Human adoption, a separately Human-authorized DB-independent Plan may cover safe 429 client handling, local tests, and bounded later Class M operation-packet design. Such a Plan does not adopt the architecture or authorize Class M, Hosted QA, Preview acceptance, Production progression, or Git publication.

## 19. Human work and gates

Human work is explicit:

1. independently review v0.4;
2. adopt or reject the exact reviewed v0.4 artifact and provisional `60 / 600 / IP` parameter;
3. authorize any later Plan and implementation separately;
4. authorize an exact Class M packet;
5. decide credential retention or revocation when the token is used;
6. review Hosted QA and false-positive evidence;
7. decide cleanup or retained configuration;
8. review initial operating signals;
9. authorize parameter tuning;
10. decide whether Bot Protection or another escalation is warranted;
11. accept or reject the exact N7 implementation Head;
12. later authorize Git publication, merge, and Production through their separate gates.

Review PASS does not authorize Human adoption. Human adoption does not authorize Plan, implementation, credential access, Class R, Class M, Hosted QA, Git publication, merge, or Production.

## 20. STOP conditions

STOP and return to Human or the responsible owner when:

- target, branch, Head, environment, credential profile, or Contract identity drifts;
- implementation requires a route other than exact `POST /api/events`;
- login-free behavior or another stable policy must change;
- a global exact guarantee is required;
- provider behavior or Preview isolation is ambiguous for the proposed operation;
- Production may be affected without separate authorization;
- an unknown or unrelated shared draft or semantic delta exists;
- sensitive data cannot be protected;
- a required raw-IP-free proof path is unavailable;
- architecture or product rebaseline is required rather than routine tuning;
- credential creation, scope change, or unsafe fallback is required;
- M01 through M11, M12 absence, service-role boundary, atomicity, or N6 invariants would change;
- an outcome-unknown state cannot be reconciled read-only within separate authority;
- exact cleanup cannot be defined safely;
- scope, permission, or evidence is insufficient.

## 21. Scope and prohibited work

This candidate is docs-only. It does not authorize:

- Plan creation or adoption;
- application, test, helper, package, lockfile, migration, or configuration change;
- credential access or operation;
- Vercel REST API／CLI or Firewall read;
- Class R execution;
- Class M mutation;
- Hosted request or QA;
- Supabase or database operation;
- Git stage, commit, push, PR change, Ready, merge, or publication;
- Production operation;
- N8, N9, or N12 execution;
- Independent Review or Human adoption by the drafting agent.

## 22. Candidate lifecycle

- Handoff v0.3: `HUMAN ADOPTED / IMMUTABLE PROVENANCE`
- Execution Contract v0.3: `CURRENT HUMAN-ADOPTED AUTHORITY UNTIL v0.4 IS LATER HUMAN-ADOPTED / IMMUTABLE`
- Execution Contract v0.4: `CURRENT POLICY REBASELINE CANDIDATE / NOT ADOPTED / READY FOR INDEPENDENT REVIEW`
- Old global-exact architecture: `REJECTED / NOT FEASIBLE ON VERCEL FIREWALL ALONE`
- Vercel-aligned architecture candidate: `NOT ADOPTED`
- Plan: `NOT AUTHORIZED`
- Implementation: `NOT AUTHORIZED`
- Credential access: `NOT AUTHORIZED / NOT RUN`
- Completed bounded Class R inventory: `READ-ONLY COMPLETE / OLD GLOBAL-EXACT ARCHITECTURE CONFLICT CONFIRMED`
- Additional Class R: `NOT AUTHORIZED / NOT RUN`
- Class M／Firewall mutation: `NOT AUTHORIZED / NOT RUN`
- Hosted QA: `NOT AUTHORIZED / NOT RUN`
- Git publication／merge: `NOT AUTHORIZED`
- Production: `NOT AUTHORIZED`
- Next gate: `N7_EXECUTION_CONTRACT_V0_4_INDEPENDENT_REVIEW`

Candidate verdict:

`N7_EXECUTION_CONTRACT_V0_4_VERCEL_ALIGNED_POLICY_REBASELINE_READY_FOR_INDEPENDENT_REVIEW`
