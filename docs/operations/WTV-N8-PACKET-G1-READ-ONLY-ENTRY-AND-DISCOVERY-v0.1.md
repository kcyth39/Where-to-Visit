# WTV-N8 Packet Group 1 — Read-Only Entry and Discovery v0.1-draft

## 1. Document identity
- Packet ID: `WTV-N8-PACKET-G1-READ-ONLY-ENTRY-AND-DISCOVERY`
- Version: `v0.1-draft`
- Status: `DRAFT / NOT ADOPTED / NOT READ AUTHORIZED / NOT EXECUTION AUTHORIZED`
- Repository: `kcyth39/Where-to-Visit`
- Governing branch: `codex/n8-canonical-requirements-dod-qa`
- Governing published Head: `d3377fbbac6bb037b8b336eb4a7280d9daa46dd2`
- Primary owner / sole writer: DevOps
- Technical authority: Tech Lead
- Lifecycle review: PKA
- Independent determinism review: Reviewer
- Adoption and live-read authority: Human
- Drafting authority: `N8_PACKET_GROUP1_READ_ONLY_DRAFTING / AUTHORIZE GROUP 1 PACKET DRAFTING ONLY`; live read and execution remain unauthorized.
- Evidence root: `/Users/shige/Projects/Where-to-Visit-Evidence/N8-production-maintenance/`
- Current lifecycle: candidate only; it grants no Production read or mutation permission.

## 2. Goal
Define one bounded read-only Operation Packet candidate for the observations required by N8 Stages 1, 2, and 4. Group 1 is read-only; Class M Human mutations remain exclusively in Groups 2, 3, and 4.

The Packet separates pre-lock identity and surface observations from post-lock fresh discovery. It defines target guards, authority, projections, evidence, counts, and terminal classifications without performing any live observation.

## 3. Governing authority
- Published Plan: `docs/plan/WTV-N8-PRODUCTION-MAINTENANCE-IMPLEMENTATION-PLAN-v0.1.md`
- Plan SHA-256: `3af8b66bc904c945ab4f9e4299afed163a4e17e4d41ed20808d816102327ec78`
- Lifecycle authority: `N8_IMPLEMENTATION_PLAN_PUBLISHED_HEAD_ACCEPTED`
- Canonical requirements: `docs/03_requirements.md`
- Canonical data model: `docs/04_data-model.md`
- Canonical DoD: `docs/05_dod.md`
- Canonical QA flow: `docs/06_qa-flow.md`

Canonical SHA-256 identities:
| Input | SHA-256 |
|---|---|
| `docs/03_requirements.md` | `2b9cf8e0bc72d0e59f60523f3859639e9fcbdaba0fb3f8281bef9fdd7abd791f` |
| `docs/04_data-model.md` | `d7c4395ec3cce5877cfb0f9ee0b8c08fd4298c45d2cf71324fb89664ac7bb951` |
| `docs/05_dod.md` | `aaab619d5f77e5a449ae101cb20d64d0214d1cbaa9b16122cf15cc608d963542` |
| `docs/06_qa-flow.md` | `ee7e0a3afcb5252e334c50f7bd14608bb4af80bbdfc6b26b8bbd97a21c066b00` |

The accepted Plan and four-doc meaning are inputs, not subjects for reinterpretation in this Packet.

## 4. Scope and non-scope
In scope:
- release, repository, branch, PR, and canonical artifact identity;
- Production application identity and public serving-state metadata;
- creator-route binding correlation design;
- mutation-surface inventory and classification criteria;
- post-lock count-only and catalog-only discovery projection;
- secret-free, no-replace evidence requirements.

Out of scope:
- `NOLOGIN`, session termination, or any role mutation;
- Data API toggle or any provider mutation;
- executable SQL or Dashboard runbook;
- Event creation, feature smoke, capability-bearing Event URL access;
- cleanup artifact, `ROLLBACK`, `COMMIT`, or data mutation;
- ownerless migration, deployment, Firewall, DNS, alias, or environment mutation;
- generic discovery framework or catalog comparator;
- Git publication, merge, main integration, or N9 execution.

## 5. Operator and permission model
| Observation family | Future operator | Required authority | Credential access | Persisted result |
|---|---|---|---|---|
| Local Git and source | Agent | separate Group 1 read authorization | none | identities and classifications only |
| GitHub metadata | Agent | repository read connector | connector-managed read capability | PR/ref/SHA/count/status projection |
| Vercel metadata | Agent | exact Team/Project read connector | connector-managed read capability | deployment/environment metadata only |
| Public serving state | Agent | public HEAD observation | none | status and redirect classification only |
| Supabase control plane | Human in Dashboard | separate exact Production Dashboard read authorization | Human-held; Agent access 0 | project/ref/Data API metadata classification only |
| Production DB catalog | Human in SQL Editor | separate exact SELECT-only authorization | Human-held; not Agent-readable | aggregate/catalog projection only |
| Review | Tech Lead, PKA, Reviewer | read-only artifact review | none | findings and counts |

Agent-readable Production write credential remains exactly 0. A role name, connector, Packet adoption, or prior QA result does not create permission.

## 6. Target identity guards
Later execution must prove all guards from fresh correlated sources before any PASS:
- expected Production project ref: `ehmivhmsnhcrynvuahaq`;
- excluded QA ref: `twcbycyyrxbovtgiqaun`;
- exact Production database, `public` business schema, and environment;
- exact Vercel Team, Project, Production deployment, domain/alias relationship, and source identity;
- exact N8 branch and authorized Head at execution time;
- no inference from display name, stale evidence, domain alone, or repository source alone;
- Production Web observation must not follow a capability-bearing Event URL;
- unexpected redirect, QA correlation, or ambiguous project identity is STOP.
The expected Production ref remains an expectation until live proof. This draft records no Production target PASS.

## 7. Pre-lock observation set
Pre-lock observations require a later, separate Human read authorization.

### 7.1 Release and repository identity
Projection:
- Human change-freeze decision identity and freeze-start UTC time;
- N5 → N6 → N7 stacked ancestry result;
- current N8 branch, local/remote Head, upstream, ahead/behind, and worktree cleanliness;
- N7 PR #42 number, state, base/head refs, and head SHA;
- N8 PR absence or exact current state;
- merge count 0 and main-integration count 0;
- canonical four-doc and Plan SHA-256 matches.
The freeze baseline fixes the initial refs, PR states, deployment/environment identities, Firewall configuration identity, DNS/alias correlation, and observed operation ledger. Later comparison must show only separately authorized N8 deltas. Missing baseline/correlation is `OUTCOME_UNKNOWN`; unexpected deployment, environment, Firewall, DNS, merge, or main delta is STOP.
Bound: local Git read group 1; GitHub authenticated GET maximum 4; retry 0.

### 7.2 Production application and serving state
Projection:
- exact Vercel Team/Project identity;
- Production deployment ID, environment classification, source ref/SHA, and READY-equivalent serving state;
- expected public domain/alias correlation;
- public reachability status classification;
- Vercel Authentication change 0;
- DNS, alias, deployment, and environment mutation 0;
- QA deployment/environment excluded.
No page body, feature flow, Event creation, Event pathname, Cookie, or authorization material is collected.
Bound: Vercel authenticated GET maximum 4; public HEAD maximum 1; redirect 0; retry 0.

### 7.3 Creator-route binding model
Binding PASS requires three independently sourced layers:

1. Source layer: exact `POST /api/events` code path and server-only Event creator environment contract.
2. Deployment layer: exact Production deployment has the expected variable names and scope; values remain unread and unstored.
3. DB catalog layer: the correlated login role is exactly `kimenosuke_event_creator` and its intended route capability is independently classified.
All three layers must correlate to the same Production target. A secret-free, independently observable deployment-to-target correlation is mandatory, using Human binding provenance or provider/runtime metadata that identifies the expected Production project without exposing a credential value. Variable names/scope, source code, and role name alone cannot prove deployed binding. If the independent correlation is unavailable or incomplete, binding is `OUTCOME_UNKNOWN`; a confirmed different target is STOP.
Required negative assertions:
- fallback role: 0;
- `service_role` fallback: 0;
- Data API fallback for Event creation: 0;
- QA credential or project correlation: 0.
Bound: source read group 1; deployment reads included in §7.2; Production DB SELECT-only result group maximum 1; retry 0.

### 7.4 Current mutation-surface baseline
The pre-lock matrix records evidence availability and current classification without claiming post-lock safety. Each surface stays `UNKNOWN` unless its own evidence supports exactly one permitted classification.
Bound: Human Supabase Dashboard metadata observations maximum 2; no application mutation attempt; retry 0.

## 8. Post-lock observation set
Post-lock observations require separate completion and acceptance of Packet Groups 2 and 3, followed by a separate Human read authorization.

Group 1 may consume the exact secret-free outcomes of Groups 2 and 3. It does not repeat their negative Event-creation request, Data API denial request, or mutations.

Required post-lock projection:
- creator role is `NOLOGIN`;
- active creator session count is 0;
- Data API state is OFF;
- REST and GraphQL blocking evidence from Group 3 is correlated;
- surface matrix has `UNKNOWN` count 0;
- Production deployment identity and public reachability remain unchanged;
- change-freeze baseline comparison shows deployment/environment/Firewall/DNS/merge/main unexpected delta 0;
- exact eight-table fresh counts and catalog fingerprint are complete;
- baseline is exactly `CLEANUP_REQUIRED` or `ALREADY_IN_DESIRED_STATE / CLEANUP MUTATION 0`;
- no cleanup decision is inferred from a partial count.
Bound: Vercel GET maximum 2; Human Supabase Dashboard metadata observations maximum 2; Production DB SELECT-only result groups maximum 2; retry 0.

## 9. Mutation-surface matrix model
Exact business tables:

`events`, `participants`, `candidates`, `criteria`, `votes`, `reactions`, `concerns`, `comments`.
Each surface must receive exactly one post-lock classification:
- `BLOCKED`: fresh evidence proves the surface cannot mutate the exact eight tables under the locked state;
- `HUMAN_ONLY`: mutation capability exists only through a separately Human-controlled path and Agent-readable write authority is 0;
- `VERIFIED_N/A`: fresh source/config/catalog evidence proves the surface has no relevant path to the exact eight tables;
- `UNKNOWN`: evidence is absent, incomplete, stale, or uncorrelated.

| Surface | Required evidence model | Allowed terminal classes |
|---|---|---|
| Vercel `POST /api/events` | source + deployment + role binding + Group 2 negative evidence and row delta | `BLOCKED` or `UNKNOWN` |
| REST | Data API OFF metadata + Group 3 denial evidence for business schema | `BLOCKED` or `UNKNOWN` |
| GraphQL | Data API OFF metadata + Group 3 denial evidence for business schema | `BLOCKED` or `UNKNOWN` |
| Realtime | publication/config/catalog relationship to the eight tables | `BLOCKED`, `VERIFIED_N/A`, or `UNKNOWN` |
| Storage | bucket/object/function/trigger dependency evidence | `BLOCKED`, `VERIFIED_N/A`, or `UNKNOWN` |
| Auth | Auth-user/trigger/function dependency evidence | `BLOCKED`, `VERIFIED_N/A`, or `UNKNOWN` |
| Edge Functions | deployed function inventory and eight-table credential/path correlation | `BLOCKED`, `VERIFIED_N/A`, or `UNKNOWN` |
| direct Postgres | credential ownership and table privilege classification | `HUMAN_ONLY` or `UNKNOWN` |
| pooler | role/login/session and credential ownership classification | `BLOCKED`, `HUMAN_ONLY`, or `UNKNOWN` |
| SQL Editor | Dashboard Human authority and Agent credential absence | `HUMAN_ONLY` or `UNKNOWN` |
Data API OFF is not evidence for Realtime, Storage, Auth, Edge Functions, direct Postgres, pooler, or SQL Editor. Post-lock PASS requires `UNKNOWN 0`.

## 10. Fresh discovery projection
The future SELECT-only design must return aggregates and non-sensitive catalog metadata sufficient to classify:
- row count for each exact business table;
- foreign-key source/target tables and delete actions;
- trigger names, owning relations, timing/event class, and enabled state;
- external table/function/trigger dependencies touching the eight-table graph;
- old-owner schema fingerprint using names, types, and canonical non-secret definitions;
- ownerless final migration absence and migration-history delta count;
- relevant dangling/orphan counts for defined FK relationships;
- `kimenosuke_event_creator` role state and active-session count;
- Data API state and final surface-matrix counts;
- schema/dependency mismatch count and completeness classification.
Forbidden projection:
- raw business rows or column values;
- IDs, share tokens, titles, memo, Candidate/Participant text;
- raw IP, session query text, credential, URL, password, CA, Cookie, or authorization value.
This Packet contains no executable SQL. A later artifact-generation gate must define any exact SELECT body.

## 11. Evidence contract
Later live evidence uses separate no-replace generations under the fixed evidence root:
- one generation for pre-lock evidence;
- one generation for post-lock evidence;
- pre-lock and post-lock results are never merged into an undifferentiated PASS.
Requirements:
- root regular directory, non-symlink, owner expected, mode `0700`;
- payload regular files, non-symlink, mode `0600`;
- no replace, overwrite, or silent completion of an incomplete generation;
- raw business data 0, personal data 0, secret 0;
- source-of-truth category, target correlation, observation time, operation count, and retry count recorded;
- each observation has one terminal classification;
- terminal completeness marker written last only after all required payloads validate;
- incomplete generation remains incomplete; later correction requires separately authorized new generation.
This Packet candidate itself is the only evidence-root artifact authorized by the drafting gate.

## 12. PASS / STOP / OUTCOME_UNKNOWN
For every future observation:

`PASS` requires exact target, exact authority, complete correlated result, operation bounds respected, secret-free evidence, and unexpected mutation 0.

`STOP` applies to a confirmed mismatch or unsafe state, including target/QA confusion, route-binding mismatch, unauthorized writer, schema/dependency mismatch, ownerless migration present, raw data dependency, secret exposure, unexpected mutation, or required retry/repair.

`OUTCOME_UNKNOWN` applies when a read may have occurred but target, provider response, query completeness, or operation record cannot be correlated.
For `OUTCOME_UNKNOWN`:
- PASS claim 0;
- automatic retry 0;
- blind repeat 0;
- next-stage progression 0;
- preserve the bounded secret-free record;
- request a separately authorized diagnosis only if needed.
Local parser, formatter, or sanitizer correction is allowed only with additional live request 0 and unchanged evidence meaning.

## 13. Operation count and retry bounds
Per later authorized Group 1 execution:
| Operation | Pre-lock maximum | Post-lock maximum |
|---|---:|---:|
| Local Git/source read groups | 2 | 0 |
| GitHub authenticated GET | 4 | 0 |
| Vercel authenticated GET | 4 | 2 |
| Public HEAD | 1 | 0 |
| Human Supabase Dashboard metadata observation | 2 | 2 |
| Human Production SELECT-only result groups | 1 | 2 |
| Application Hosted request | 0 | 0 |
| Mutation | 0 | 0 |
| Retry / blind repeat | 0 | 0 |
Overall Agent authenticated provider GET maximum: 10. Human Supabase Dashboard metadata observations maximum: 4. Public HEAD maximum: 1. Human SELECT-only result groups maximum: 3. All retry counts are 0. A documented variant is not an automatic retry; if the exact authorized interface cannot produce the projection, classify `OUTCOME_UNKNOWN` and stop.

## 14. Human gates
The following remain distinct:

1. Packet candidate review and Human adoption decision;
2. exact pre-lock Production read authorization;
3. Packet Group 2 adoption and exact `NOLOGIN` execution authorization;
4. Packet Group 3 adoption and exact Data API OFF execution authorization;
5. maintenance-lock and surface evidence acceptance;
6. exact post-lock Production read authorization;
7. baseline branch acceptance;
8. conditional cleanup governance if nonzero;
9. final postcheck and N9 handoff acceptance.
No earlier gate generates a later permission.

## 15. Outputs and next gates
Candidate output:
- one Git-external Packet identity;
- review findings and correction ledger;
- no live evidence and no SQL artifact.
Next gate after review PASS: `N8_PACKET_GROUP1_HUMAN_ADOPTION` candidate. Adoption still does not authorize a read. The later live gate must bind exact Packet identity, target, operator, operation counts, evidence generation, and STOP behavior.

## 16. Permission generated / not generated
Generated by this drafting gate:
- permission to create and review this one Git-external candidate only.
Not generated:
- Packet adoption;
- Production/GitHub/Vercel/Supabase/DB live read execution;
- credential access or creation;
- executable SQL artifact generation;
- `NOLOGIN`, Data API OFF, cleanup, `ROLLBACK`, or `COMMIT`;
- Production write or application request;
- tracked repository change, Git publication, PR, merge, main integration;
- N8 execution, another Packet, or N9 work.

## 17. Review record
### DevOps self-review
- Exact Head, Plan SHA-256, canonical SHA-256 values: matched.
- One responsibility and one candidate: confirmed.
- Pre-lock/post-lock separation: confirmed.
- Executable SQL, Dashboard runbook, mutation instruction: 0.
- Raw business/secret projection: 0.
- Explicit authority, bounds, terminal states, and non-permission inheritance: confirmed.
- Initial blocking findings: 0.

### Tech Lead technical review
- P1 3: operation-class wording, deployment-to-target correlation, and change-freeze baseline; all corrected. Final blocking count 0.

### PKA lifecycle and authority review
- P1 1: exact drafting-gate provenance; corrected. Final blocking count 0.

### Independent Reviewer determinism review
- Initial P1 1: Supabase control-plane operator route; corrected and focused re-review PASS. P0/P1/blocking P2/advisory: `0/0/0/0`.

## 18. Final lifecycle state
- Packet: `DRAFT / NOT ADOPTED / NOT READ AUTHORIZED / NOT EXECUTION AUTHORIZED`
- Production read executed: 0
- Production mutation executed: 0
- Credential accessed: 0
- SQL artifact generated: 0
- Tracked repository changed: 0
- Next action: sequential read-only reviews, then Human review only if blocking findings are 0.
