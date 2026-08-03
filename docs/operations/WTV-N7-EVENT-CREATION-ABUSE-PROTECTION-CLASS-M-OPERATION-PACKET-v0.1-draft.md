# N7 Class M Operation Packet v0.1-draft

## 1. Identity and lifecycle

- Packet ID: `WTV-N7-EVENT-CREATION-ABUSE-PROTECTION-CLASS-M-OPERATION-PACKET`
- Version: `v0.1-draft`
- Status: `DRAFT / NOT ADOPTED / NOT CLASS M AUTHORIZED / NOT EXECUTION AUTHORIZED`
- Primary owner: DevOps
- Lifecycle and provenance owner: PKA
- Candidate base Head: `cfdc5178f73c34a535f16054dbedd6f53e722869`
- Review: `N7_CLASS_M_PACKET_REVIEW_CHANGES_REQUIRED / P2 CORRECTION APPLIED / RE-REVIEW PENDING`
- Next gate: `N7_CLASS_M_PACKET_REVIEW`

This packet is a review candidate. Its creation, review, retention, or later adoption does not grant credential access, Class R, Class M, Hosted QA, DB, Git, or Production permission.

## 2. Authority and provenance

- Governing Contract: `WTV-N7-EVENT-CREATION-ABUSE-PROTECTION-EXECUTION-CONTRACT v0.4-draft` / SHA-256 `e694757d947126375c1da07ab3f4e4f5a79f61220545aae003bc68f9153a3d5e`
- Governing Plan: `WTV-N7-EVENT-CREATION-ABUSE-PROTECTION-IMPLEMENTATION-PLAN v0.1-draft` / SHA-256 `9f531f407997e377080423fc36623c2cbee213b79a3e37257019fc37319e64d2`
- Architecture: `HUMAN ADOPTED / CURRENT N7 ARCHITECTURE`
- Design authorization: `N7_CLASS_M_PACKET_DESIGN_AUTHORIZATION` / `AUTHORIZE`
- Artifact drafting authorization: `N7_CLASS_M_PACKET_ARTIFACT_DRAFT_AUTHORIZATION` / `AUTHORIZE`
- Design result: `N7_CLASS_M_PACKET_DESIGN_CANDIDATE_READY_FOR_HUMAN_REVIEW`
- Threshold decision: `OPTION A ADOPTED`
- Previous review: `N7_CLASS_M_PACKET_REVIEW_BLOCKED`
- Previous blocker: exact packet artifact identity absent
- Focused correction authorization: `N7_CLASS_M_PACKET_SINGLE_WRITER_FOCUSED_CORRECTION_AUTHORIZATION` / `AUTHORIZE`
- Independent Review: `N7_CLASS_M_PACKET_REVIEW_CHANGES_REQUIRED` / P2 findings `2`; this focused correction resolves only those findings and requires re-review
- Former reported candidate `d8454f1335e9ac1e2b38b2ba66b0a5c6bbccf4d94ed58f81807db55e153be729`: `UNRECOVERABLE / SUPERSEDED FOR REVIEW CANDIDATE SELECTION`
- Current input `e8203f1b1cae6e0fdfe2648e7637491cb97e49c272fe3141fbc9b4a11f825f16`: superseded by this focused-correction output

The approved design goal is a bounded Preview Firewall operation design. It excludes packet adoption, credential access, Class R read, M1 through M4, Hosted QA, fixture creation, DB postcheck, Production, and Git publication.

## 3. Goal and non-goals

The goal is to define how a Preview-only Vercel Firewall rule could later be preflighted, drafted, published, hosted-tested, and retained or removed safely.

It is not a global exact quota, per-user allowance, permanent product invariant, credential authorization, or a request to execute a provider operation.

## 4. Exact target

- Team: `Oparea` / `team_s6kdrQKwUrfIS492bFKY8u1k`
- Project: `where-to-visit-kimenosuke` / `prj_DUfRBf8jhqCRH2LfqRoQitJpaan1`
- Preview deployment and environment: fixed only by a later Project-first Class R preflight
- Other Team or Project fallback: `0`

## 5. Human tasks

The Human makes these separate decisions in chronological order:

1. packet review;
2. packet adoption or rejection;
3. token necessity, scope, and expiry confirmation;
4. credential-safety preflight confirmation;
5. Class R live-preflight authorization;
6. preflight-result review;
7. M1 authorization;
8. M1-result review;
9. M2 authorization;
10. M2-result review;
11. Hosted-QA authorization;
12. Hosted-QA-result review;
13. Retain or Remove decision;
14. fixture-cleanup authorization;
15. cleanup-result review;
16. M3 authorization if Remove is selected;
17. M3-result review;
18. M4 authorization;
19. final active read-back review;
20. token retention or revoke decision; and
21. separate Production-progression decision.

An earlier result does not authorize a later item.

## 6. Agent tasks

Only within later exact authorization, DevOps performs identity-first correlation, target correlation, configuration baseline and draft inspection, semantic comparison, the authorized mutation, read-back, outcome classification, bounded Hosted QA, secret-free evidence, and STOP or Human handoff.

## 7. Credential lifecycle

A project-scoped token exists; the selected Project is `where-to-visit-kimenosuke`; an exact Project read previously passed; and the token may be technically write-capable. Retention during pre-launch development is not API-use permission.

Every later operation fixes token necessity, exact execution profile, Team and Project scope, expiry and fresh validity, safety preflight, permitted method, exact START, mutation bound, evidence boundary, and retention or revoke disposition. Ambient CLI authentication, Cookie, default account, and target fallback are prohibited.

## 8. Class R live preflight

A separately authorized read-only preflight must first use an exact Project read and official Team binding to correlate the expected Project, repository linkage, Preview deployment and environment, branch／commit, then the WAF metadata. User or Team identity endpoint success is not a prerequisite because a project-scoped credential can legitimately reject those endpoints. It must confirm active configuration, draft, versions, priority, path and method predicate, environment predicate, rate-limit capability, provider version, semantic baseline, sensitive comparison feasibility, and Production ambiguity. A mismatch stops subsequent target reads and no alternate-target search is permitted. Class R never creates Class M permission.

## 9. Intended rule

The only intended rule is a Preview-only candidate matching exact `POST /api/events`, counted by IP with a fixed 600-second window, 60 requests, and HTTP 429 on exceed. Enabled state, priority, and provider payload are fixed only after preflight. If Preview isolation is not proven, mutation is `0`.

## 10. Semantic baseline and diff

The intended delta is one N7 rule. Unrelated semantic delta, sensitive field addition or removal, whole-configuration overwrite, and changes to existing IP/CIDR or managed rules are `0`. Unknown or unsupported fields are `UNCOMPARABLE / STOP`. Non-sensitive canonicalization and sensitive comparison classification are retained without raw sensitive values.

## 11. Shared draft and concurrency

Only an absent draft or an exact N7-owned draft is eligible. Unknown or unowned draft, concurrent operator evidence, unrelated draft delta, or active baseline drift is STOP. Discard, bundling with unrelated work, and whole-configuration replacement are prohibited.

## 12. M1 and M2

M1 is one draft create or update mutation, retry `0`, followed by exact draft read-back. M2 requires M1 PASS, draft ownership, unrelated delta `0`, unchanged active baseline, unique activation target, Preview isolation, and Production non-interference. M2 is one activation or publish mutation, retry `0`, followed by active read-back. A successful PATCH alone is not evidence of active state.

## 13. Hosted QA — Option A

`OPTION A — LAUNCH THRESHOLD TEST` is selected.

- Hosted POST upper bound: `61`
- Accepted fixture upper bound: `60`
- Rejected request upper bound: `1`
- Retry: `0`
- Temporary threshold: not used
- Launch-value restoration: not applicable

The test uses the same authorized Preview target, policy conditions, and relevant Vercel region within one 600-second window. Its result is region-scoped only and never a global guarantee.

For every executed POST, retain one privacy-safe request tuple only: sequence number; actual HTTP status or `NO_RESPONSE`; request outcome classification; aggregate bucket `accepted`, `rejected`, or `unknown`; retry count `0`; and continuation decision `CONTINUE`, `COMPLETE`, or `STOP`. The request outcome classifications are `ACCEPTED_EXPECTED`, `EXPECTED_REJECTED_429`, `EARLY_REJECTION`, `UNEXPECTED_STATUS`, `TRANSPORT_FAILURE`, `OUTCOME_UNKNOWN`, and `CORRELATION_IMPOSSIBLE`. `ACCEPTED_EXPECTED` belongs to `accepted`; `EXPECTED_REJECTED_429` and `EARLY_REJECTION` belong to `rejected`; every other outcome belongs to `unknown`.

Execution terminates in exactly one classification: `EXPECTED_COMPLETE` for 60 accepted requests followed by one expected 429; `PARTIAL_ACCEPTED` for a cleanly recorded stop before the complete sequence with one or more accepted requests and no terminal failure; `EARLY_REJECTION`; `UNEXPECTED_STATUS`; `TRANSPORT_FAILURE`; `OUTCOME_UNKNOWN`; or `CORRELATION_IMPOSSIBLE`. If any request is not the expected accepted result for requests 1 through 60, or is not HTTP 429 for request 61, STOP immediately. Automatic continuation to any remaining request is `0`. Return the executed portion to Human with accepted, rejected, and unknown counts; do not infer the status or scope of unexecuted requests, and do not automatically begin cleanup.

## 14. Fixture identity

Each accepted fixture is bound to a Human-approved execution ID in the form `N7-HQA-<UTC timestamp>-<16 lowercase hexadecimal characters>`. Under a later Hosted-QA authorization, DevOps generates the candidate ID immediately before execution and Human binds the actual ID before the first request. The manifest may retain the ID, operation counts, and aggregate row counts until the corresponding Human retention decision; it must not retain raw title, memo, share token, pathname, request body, or raw business row.

The design must identify partial execution, verify Event and Criterion counts, exclude unrelated rows from cleanup, and avoid retaining raw title or memo in evidence. Start success alone does not establish cleanup ownership.

## 15. DB postcheck

A later Hosted-QA packet separately authorizes the DB postcheck and fixture cleanup responsibility. It fixes credential necessity, exact non-Production DB target, service-role use `0`, accepted Event count at most 60, matching Criterion count, rejected Event and Criterion delta `0`, accepted atomicity, unrelated-row impact `0`, and raw-row, title, and memo retention `0`. Production ambiguity is STOP.

Fixture cleanup itself remains a separate Human authorization: one bounded cleanup transaction or command for the exact execution-ID scope only, accepted fixture maximum 60, retry `0`, automatic retry after partial failure `0`, cleanup postcheck required, and unrelated rows `0`. It is separate from Firewall M3/M4. Any unsettled postcheck or cleanup method remains a required Human decision before Hosted QA authorization.

Fixture cleanup terminates as exactly one of `CLEANUP_CONFIRMED`, `CLEANUP_PARTIAL`, `CLEANUP_FAILED`, `CLEANUP_OUTCOME_UNKNOWN`, or `TARGET_CORRELATION_IMPOSSIBLE`. `CLEANUP_PARTIAL`, `CLEANUP_OUTCOME_UNKNOWN`, and `TARGET_CORRELATION_IMPOSSIBLE` return to Human disposition with automatic retry `0`; they do not start, imply, or authorize M3/M4.

## 16. Retain

If Human selects Retain, M3 and M4 are `0`. Record the active Preview rule and version identity, provisional `60 / 600 / IP` parameter, region-scoped limitation, owner, review condition, cleanup trigger, known limitation, and token disposition. Indefinite or ownerless retention is prohibited; Production permission remains `0`.

## 17. Remove — M3 and M4

If Human selects Remove, M3 creates one exact N7 rule-removal draft with retry `0` and read-back PASS. M4 activates that removal once with retry `0` and a final active read-back. Unrelated semantic delta is `0`; outcome unknown never triggers blind retry. Firewall cleanup and fixture cleanup remain separate.

## 18. Outcome unknown

For timeout, connection loss, 5xx, or parse loss: blind retry is `0`; only separately authorized Class R reconciliation may classify `NO_MUTATION_CONFIRMED`, `COMPLETED_CONFIRMED`, `N7_OWNED_REVERSIBLE_PARTIAL`, `UNKNOWN`, or `CORRELATION_IMPOSSIBLE`. Automatic cleanup or repair is `0`; return to Human disposition.

## 19. Preview and Production boundary

Firewall configuration is project-level. Mutation is `0` unless reliable environment predicate, exact Preview semantics, Production non-match, priority non-interference, unrelated change `0`, and deployment correlation are proven. Production operation is always a separate Human gate.

## 20. Evidence and privacy

Allowed evidence is authority identity, packet and Head identity, target match, status, counts, versions, semantic classifications, intended diff, read-back, Hosted classification, row count, cleanup disposition, and Human decisions.

Do not retain token, Authorization header, raw response, IP/CIDR, per-value digest, raw traffic or runtime log, request body/header/Cookie, title, memo, share token, pathname, DB URL/password/CA, or raw DB rows.

## 21. Numeric bounds

- Preflight base GET/HEAD: `10`; total including retry: `12`
- Read retry: total `2`, same request `1`
- Timeout: `10 seconds`; wall-clock: `8 minutes`
- Pagination: `2 pages`, size `20`; documented variant: one per resource category
- M1, M2, M3, M4: each one mutation, retry `0`
- Hosted POST: `61`; accepted fixture: `60`; rejected request: `1`
- Fixture cleanup: exact execution-ID scope, one bounded transaction or command, maximum 60 accepted fixtures, retry `0`, automatic retry after partial failure `0`, postcheck required, unrelated rows `0`

## 22. STOP conditions

STOP for authority, target, or credential-safety mismatch; unknown draft ownership; baseline drift; unsupported or uncomparable field; inability to prove Preview isolation or Production non-interference; inability to create an exact diff or privacy-safe evidence; outcome unknown; required retry; bound excess; or a required Human decision.

## 23. DoD

Packet drafting DoD is independent of execution DoD. A reviewable identity, provenance, Option A, bounds, Human tasks, Agent tasks, credential lifecycle, fixture／DB／cleanup boundary, lifecycle, and fail-closed boundary are required. Drafting does not create execution permission.

Each future operation has its own DoD: exact Human gate, target verification, prescribed bound, privacy-safe evidence, required read-back or postcheck, outcome classification, and Human result review. A successful request alone is not completion.

## 24. Human gates

Packet review, packet adoption, credential safety, Class R, M1, M2, Hosted QA, Retain or Remove, fixture-cleanup authorization and cleanup-result review, M3, M4, exact Head acceptance, and Production are separate Human gates. Hosted-QA authorization or result review does not include fixture-cleanup permission; M3/M4 begin only after a Human Remove decision and never from a fixture-cleanup terminal classification.

## 25. Candidate lifecycle

- Packet: `DRAFT / NOT ADOPTED / NOT CLASS M AUTHORIZED / NOT EXECUTION AUTHORIZED`
- Review: `P2 CORRECTION APPLIED / RE-REVIEW PENDING`
- Credential access: `0`
- Class R, M1 through M4, Hosted QA, and Production: `NOT AUTHORIZED`
- Next gate: `N7_CLASS_M_PACKET_REVIEW`
