# WTV-N8-PRODUCTION-MAINTENANCE-IMPLEMENTATION-PLAN v0.1-draft

## 0. Document identity

- Plan ID: `WTV-N8-PRODUCTION-MAINTENANCE-IMPLEMENTATION-PLAN`
- Version: `v0.1-draft`
- Status: `DRAFT / NOT ADOPTED / NOT EXECUTION AUTHORIZED / NOT PACKET AUTHORIZED`
- Primary owner / sole writer: Tech Lead
- Adoption authority: Human
- Repository: `kcyth39/Where-to-Visit`
- Governing branch: `codex/n8-canonical-requirements-dod-qa`
- Governing published Head: `b8c4be0062eaae371f2d6ead5b87c5a6cdccaacf`
- Evidence root: `/Users/shige/Projects/Where-to-Visit-Evidence/N8-production-maintenance/`
- Governing Human decision: `N8_IMPLEMENTATION_PLAN_DRAFTING / AUTHORIZE IMPLEMENTATION PLAN DRAFTING ONLY`
- Governing decision record SHA-256: `0f56f5ddabb938738628c3f6bbf7a9cfe870a5690c40c3f5800ecde1f01d06e7`
- Current next gate: sequential Plan reviews defined in §13
- Adoption gate after exact-artifact Independent Review PASS: `N8_IMPLEMENTATION_PLAN_HUMAN_ADOPTION`

本Planは実行順、依存、担当、証拠、Human gateおよび停止条件を定義する。Plan採用、Operation Packet作成、Production read、Production mutation、Git publicationまたはN9 executionのpermissionを生成しない。

## 1. Authority and fixed baseline

### 1.1 Authority order

1. tracked canonical documents、ADR、role authorityおよびHumanのexact decision
2. 本PlanがHuman採用された場合、その正本と矛盾しない範囲のtask-specific planning input
3. current source、migration、Git／provider metadataはbaselineとdeltaを確認するevidence
4. historical Contract draftとreconstruction reportはreference-only evidence

矛盾、予期しないdriftまたは安全な実現不能を確認した場合は、下位資料で補完せずSTOPしてHuman／domain ownerへ戻す。

### 1.2 Exact canonical identities

| Canonical input | SHA-256 |
|---|---|
| `docs/03_requirements.md` | `2b9cf8e0bc72d0e59f60523f3859639e9fcbdaba0fb3f8281bef9fdd7abd791f` |
| `docs/04_data-model.md` | `d7c4395ec3cce5877cfb0f9ee0b8c08fd4298c45d2cf71324fb89664ac7bb951` |
| `docs/05_dod.md` | `aaab619d5f77e5a449ae101cb20d64d0214d1cbaa9b16122cf15cc608d963542` |
| `docs/06_qa-flow.md` | `ee7e0a3afcb5252e334c50f7bd14608bb4af80bbdfc6b26b8bbd97a21c066b00` |

Headまたはいずれかのidentityが変わった場合、本Planを自動適用しない。fresh reconciliationとHuman判断を要求する。

### 1.3 Fixed N8 meaning

- Purpose: N9前にProductionをbounded maintenance stateへ移し、old-owner schemaのexact 8 business tablesを0件としてhandoffする。
- Production Web: public reachability維持。Vercel Authentication、DNS、alias、deploymentのN8変更は0。
- Event creation lock: Humanが`kimenosuke_event_creator`を`NOLOGIN`へ変更する。
- Data API stop: HumanがSupabase DashboardでData APIをOFFにする。
- Cleanup target: `events`、`participants`、`candidates`、`criteria`、`votes`、`reactions`、`concerns`、`comments`。
- All rows eligible。preservation／conversion／migrationは0。
- Production write: Human-only。Agent-readable Production write credentialは0。
- Any nonzero: `CLEANUP_REQUIRED`。
- All zero: Human受入後に`ALREADY_IN_DESIRED_STATE / CLEANUP MUTATION 0`。

### 1.4 Explicit non-scope

- ownerless migration
- application deployment
- Data API restart
- creator role `LOGIN` restoration
- Firewall mutation
- positive Production smoke
- schema／RLS／GRANT redesign
- generic Production maintenance／cleanup framework
- credential governance redesign
- merge／main integration
- N9 execution

## 2. Ownership and work split

### 2.1 Owners

- Tech Lead: stage dependencies、technical consistency、DoD／QA traceability、STOP判断、N9 handoff completeness。
- DevOps: authorized Packet内のtarget／binding／surface／role／Data API／evidence boundaryの実施またはreview。
- PKA: lifecycle、authority、artifact identity、routing、supersessionおよびpublication boundaryのreview。
- Agent: Humanが別途許可したread-only observation、secret-free projection、artifact generation、postcheck reviewだけを行う。
- Human: Plan採用、各Production authority、Dashboard／SQL Editor mutation、branch disposition、evidence acceptanceおよびN9 handoff acceptance。

### 2.2 Responsibility boundary

AgentはProduction SQLを実行せず、Production write credentialを受領しない。Human mutationの結果を推測せず、read-back evidenceで`PASS`、`STOP`または`OUTCOME_UNKNOWN`へ分類する。通常のlocal parser／formatter／sanitizer errorは、live requestを増やさずtarget／authority／evidence meaningを変えない範囲で修正できる。

## 3. Stage model and dependency graph

```text
Stage 1 Identity fixation
  -> Stage 2 Read-only preparation
  -> Stage 3 Maintenance lock
  -> Stage 4 Fresh Production discovery
       -> Stage 5A All-zero disposition
       -> Stage 5B Conditional cleanup
  -> Stage 6 Invariant postcheck
  -> Stage 7 N9 handoff
```

各矢印は前段のHuman acceptanceまたはPacketのexact PASSを必要とする。`OUTCOME_UNKNOWN`、STOPまたは未承認は次段へ進めない。

## 4. Stage definitions

### Stage 1 — Entry and identity fixation

Purpose:

- exact published Head、canonical identities、N5→N6→N7 lineage、current N8 branch／worktree／PR stateを固定する。
- expected Production ref `ehmivhmsnhcrynvuahaq`をexpected identityとして記録する。fresh proof前にtarget PASSとしない。
- evidence rootのregular directory、mode `0700`、no-replace方針を確認する。
- N8 change freezeを開始し、unrelated deployment／environment／Firewall／DNS／merge mutationが0であることを確認する。

Owner: Tech Lead。Git／provider external factsはauthorized Agent read-only、Human review。

Output: entry identity evidence、authority ledger、change-freeze record。

Exit: exact Head／documents／lineageが一致し、QAとProductionを区別できる。drift、dirty ownership ambiguity、target ambiguityはSTOP。

### Stage 2 — Read-only preparation

Purpose:

- Production target proof、creator route binding proof、mutation-surface inventory、fresh discoveryのquery／metadata／evidence designを固定する。
- source evidence、configuration metadata evidence、live behavioral evidenceを混同しない。
- credential値、DB URL、CA本文、token、Cookie、raw business rows／textを取得・保存しない投影を定義する。

Required design outputs:

- exact project／database／schema／environmentおよびQA exclusionのproof model
- `/api/events`がexact `kimenosuke_event_creator`を使い、fallback role、`service_role`、Data API fallbackが0であるcorrelation model
- Vercel `/api/events`、REST、GraphQL、Realtime、Storage、Auth、Edge Functions、direct Postgres／pooler、SQL Editorの8-table mutation capability matrix
- each surfaceを`BLOCKED`、`HUMAN_ONLY`、`VERIFIED_N/A`、`UNKNOWN`へ分類するevidence requirement
- NOLOGIN後のnegative verification、Data API OFF後のdenial verification、fresh discoveryのbounded read design

Owner: Tech Lead design、DevOps focused review、PKA authority review。

Output: Packet Group 1 candidate requirements。Packet本文またはSQL本文は本Planで作らない。

Exit: required read-only authorityとHuman workが一意。missing authority、route binding ambiguity、raw-value dependencyはSTOP。

### Stage 3 — Maintenance lock

Sequence:

1. Packet Group 1でProduction identity、route bindingおよびpre-mutation surface baselineをread-only固定する。
2. 別Human gateでPacket Group 2を採用する。採用からlive operation permissionを導出しない。
3. さらに別のexact Production execution authorization後だけ、Humanがcreator roleを`NOLOGIN`へ変更する。
4. role read-back、other-role delta 0、active creator session 0、controlled negative creation observation、Event／Criterion delta 0を確認する。positive smokeは行わない。
5. 別Human gateでPacket Group 3を採用する。採用からlive operation permissionを導出しない。
6. さらに別のexact Production execution authorization後だけ、HumanがData APIをOFFにする。
7. Dashboard OFF read-back、REST／GraphQL business access blocked、direct Postgres／SQL Editor availabilityの意図した維持、schema／RLS／policy／grant delta 0を確認する。
8. remaining surfacesを再分類し、Humanが`UNKNOWN 0`を受け入れる。

NOLOGINは既存sessionを終了しない。active creator sessionが残る場合はwait／killを推測せずSTOPして別Human dispositionへ戻す。Data API statusまたはdenial evidenceが不明なら再toggleせず`OUTCOME_UNKNOWN`とする。

Owner: Human mutation、authorized operator observation、Tech Lead／DevOps review、Human acceptance。

Output: lock evidence、surface matrix、operation counts。

Exit: creator `NOLOGIN`、active session 0、Data API OFF、surface `UNKNOWN 0`。retry 0。

### Stage 4 — Fresh Production discovery

Entry requires Stage 3 PASS and accepted surface matrix。

Observe without raw rows:

- exact 8-table counts
- foreign keys、delete actions、cascade relationships
- triggers、8-table external dependencies
- old-owner schema fingerprint
- ownerless final migration absent
- relevant dangling／orphan count model

The planning estimate of approximately 10 Events is non-authoritative。fresh post-lock countだけをbranch authorityとする。

Classification:

- one or more nonzero: `CLEANUP_REQUIRED` → Stage 5B
- all zero: pending Human acceptance → Stage 5A
- incomplete／uncorrelated result: `OUTCOME_UNKNOWN`、progression 0

Owner: Human-authorized read-only query／Agent secret-free review／Human branch decision。

Output: discovery bundle、schema fingerprint、baseline branch decision identity。

### Stage 5A — All-zero branch

Human must accept `ALREADY_IN_DESIRED_STATE / CLEANUP MUTATION 0`。

- cleanup artifact generation: 0
- cleanup Packet: 0
- ROLLBACK: 0
- COMMIT: 0
- cleanup claim: not applicable
- proceed to Stage 6 invariant postcheck only

Any count ambiguity or missing Human acceptance is STOP。zeroを証明するためのDELETE／ROLLBACKを実行しない。

### Stage 5B — Nonzero cleanup branch

Entry requires `CLEANUP_REQUIRED` and separate Human decisions for artifact governance and Packet drafting。

1. Confirm the production old-owner schema profile and artifact governance. The current ownerless-final cleanup profile must not be assumed compatible merely because it targets similarly named tables.
2. After separate authorization, generate and review a narrow N8-only ROLLBACK generation: target manifest、frozen cleanup body identity、ROLLBACK、restoration postcheck and execution manifest。COMMIT artifactはまだ生成しない。
3. Bind the generation to exact target、branch／Head、baseline counts、schema fingerprint、SHA-256、bytes、lines、timestamp、file type／mode。Human separately adopts the ROLLBACK Packet state。
4. Human separately authorizes and executes ROLLBACK exact 1。transaction-internal 8×0とbaseline restorationを確認する。
5. Only after verified restoration PASS, obtain separate authorization to render and review a new no-replace COMMIT generation from the unchanged frozen cleanup body。ROLLBACKとCOMMITはtransaction terminatorだけが異なることをidentity／semantic comparisonで確認し、ROLLBACK artifact自体は編集しない。
6. Human separately adopts the COMMIT Packet state。Adoptionからpermanent deletion permissionを導出しない。
7. Human then separately authorizes permanent deletion and executes the exact COMMIT artifact exact 1。Dashboardで編集、partial selectionまたはsecond executionをしない。
8. Known failureはSTOP。completion unknownはblind repeat 0とし、別途許可されたSELECT-only diagnosisへ戻す。

Owner: Tech Lead artifact model、DevOps validation、Human SQL Editor mutation、Agent read-only evidence review。

Output: immutable artifact identities、ROLLBACK result、COMMIT result、operation ledger。

### Stage 6 — Invariant postcheck

SELECT-only and metadata verification:

- exact 8 tables 0 and relevant dangling／orphan 0
- schema fingerprint unchanged
- ownerless migration absent and migration history delta 0
- trigger／relation／security／role／grant state unchanged except adopted NOLOGIN
- creator `NOLOGIN` and active creator session 0
- Data API OFF
- mutation-surface `UNKNOWN 0`
- deployment／environment／Firewall／DNS／merge／main integration mutation 0
- positive Production smoke 0、retry 0、SQL error 0、outcome unknown 0

Stage 5Aではcleanup実行を主張しない。Stage 5BではCOMMIT known completionとpostcheck PASSを別々に記録する。COMMIT後のpostcheckがunknownならcleanupを再実行せずN8 acceptanceを停止する。

Owner: authorized read-only operator、Tech Lead／DevOps review、Human postcheck acceptance。

Output: Packet Group 5 evidence and final invariance classification。

### Stage 7 — N9 handoff

Compile secret-free handoff:

- release-line Heads and current N8 identity
- exact Production project identity
- old-owner schema fingerprint and ownerless migration absent
- exact 8 tables row 0
- creator `NOLOGIN`、active session 0
- Data API OFF、surface matrix `UNKNOWN 0`
- deployment／Firewall state and retained credential classifications
- evidence bundle identities
- unresolved facts 0
- N9 authorized／prohibited actions as proposals pending N9 gate

Human accepts the handoff separately。Handoff acceptance does not authorize ownerless migration、deployment、Data API ON、creator LOGIN、merge or any N9 operation。

## 5. Proposed Operation Packet set

Five groups are necessary because the two Production mutations and cleanup COMMIT have distinct Human risk boundaries.

| Group | Purpose / class | Human owner / Agent role | Entry and output | Separate authority / branch |
|---:|---|---|---|---|
| 1 | Entry、target／route／surface baseline、fresh discovery design and authorized reads / read-only | Human authorizes reads; Agent observes; Tech Lead reviews | Exact identities、binding、pre-lock matrix、query projections | Required. Live discovery executes after Groups 2–3 lock; Packet can define both pre-lock and post-lock bounded reads |
| 2 | Creator role `NOLOGIN` and negative lock verification / Human Class M | Human executes; DevOps validates; Agent reviews | Exact target preflight → one role mutation → role／session／row-delta evidence | Separate authorization always required |
| 3 | Data API OFF and REST／GraphQL denial verification / Human Dashboard Class M | Human executes; DevOps validates; Agent reviews | Before metadata → one toggle → OFF／denial／drift evidence | Separate authorization always required |
| 4 | N8 cleanup artifacts、ROLLBACK and COMMIT / Human DB Class M | Human separately adopts each rendered Packet state and separately executes ROLLBACK／COMMIT; Agent never writes Production | First ROLLBACK generation and baseline restore; only then separate COMMIT generation from unchanged body and known COMMIT result | Conditional on nonzero。Artifact governance、ROLLBACK generation／adoption／execution、COMMIT generation／adoption／execution remain separate gates inside the group |
| 5 | Final postcheck and N9 handoff evidence / read-only | Human authorizes and accepts; Agent observes; Tech Lead compiles | 8×0、invariance、surface、handoff identities | Required for both branches; generates no N9 permission |

Packet minimization does not combine Human approvals。A Packet candidate or adoption never authorizes its live operation。

## 6. Human gates

The following decisions remain distinct and sequential:

1. `N8_IMPLEMENTATION_PLAN_HUMAN_ADOPTION`
2. N8 Production read-only preparation／discovery authorization
3. creator-role NOLOGIN Packet adoption
4. creator-role NOLOGIN exact Production execution authorization
5. Data API OFF Packet adoption
6. Data API OFF exact Production execution authorization
7. mutation-surface matrix acceptance
8. baseline branch acceptance; all-zero disposition if applicable
9. Production old-owner cleanup artifact governance authorization if nonzero
10. cleanup ROLLBACK artifact generation／review authorization if nonzero
11. cleanup ROLLBACK Packet-state adoption if nonzero
12. cleanup ROLLBACK execution authorization if nonzero
13. verified restoration acceptance if nonzero
14. cleanup COMMIT artifact generation／review authorization if nonzero
15. cleanup COMMIT Packet-state adoption if nonzero
16. cleanup COMMIT permanent-deletion execution authorization if nonzero
17. postcheck execution／acceptance
18. N9 handoff acceptance

Each gate must state exact target、artifact identity、operation count／retry、Human work、outcome-unknown behavior and exclusions appropriate to that operation。No ordinary local parser／formatter／sanitizer gate is added。

## 7. Evidence flow

- All runtime evidence is Git-external under the fixed evidence root。
- Use no-replace generation directories with a stable `<UTC>-<stage>-evidence` naming scheme。Do not predetermine payload filenames until its Packet is reviewed。
- root mode `0700`、payload mode `0600`、regular file only、symlink 0。
- Each accepted generation records non-secret artifact identities and a terminal completeness marker created last。
- Persistent evidence contains raw business rows 0、title／memo／token／personal data 0、credential／URL／password／CA／Cookie 0。
- Stage owners create evidence; DevOps reviews operational meaning; PKA reviews identity／lifecycle; Tech Lead integrates; Human accepts at the corresponding gate。
- Later tracked lifecycle synchronization, if separately authorized, records only evidence path／digest／verdict／decision identity, not evidence payload or secrets。
- An incomplete generation is never silently completed or replaced。Create a new generation after separate authority when material correction is required。

## 8. DoD / QA traceability

References: `docs/05_dod.md` §3.7 DoD items 1–17 and `docs/06_qa-flow.md` §2.4 scenarios 1–11。

| DoD items | Stage / owner | QA scenarios | Required evidence / Human acceptance |
|---|---|---|---|
| 1–3 | Stages 1–2 / Tech Lead、Agent read-only | 1 | lineage、target、public serving-state and N8 mutation-zero evidence / entry acceptance |
| 4 | Stages 2–3 / DevOps、Human review | 2 | source／binding／role correlation、fallback 0 / route proof acceptance |
| 5 | Stages 3 and 6 / Human mutation、Agent review | 3, 10 | NOLOGIN、session 0、negative rejection and row delta 0 / lock and postcheck acceptance |
| 6 | Stages 3 and 6 / Human Dashboard、DevOps review | 4, 10 | OFF read-back、REST／GraphQL blocked、security delta 0 / Data API and postcheck acceptance |
| 7 | Stages 2–3 and 6 / DevOps、Human | 5, 10 | complete surface matrix `UNKNOWN 0` / surface acceptance |
| 8 | Stage 4 / authorized query operator、Tech Lead | 6 | count-only graph／trigger／fingerprint／migration evidence / baseline acceptance |
| 9 | Stage 5A or 5B / Human | 7–10 | branch identity; either mutation 0 or approved ROLLBACK／COMMIT／postcheck / branch-specific acceptance |
| 10 | Stages 5–6 / authorized query operator | 10 | 8×0 and dangling／orphan 0 / postcheck acceptance |
| 11–12 | Stages 1, 4 and 6 / Tech Lead、DevOps | 1, 6, 10 | migration absent and authorized-delta-only fingerprints / postcheck acceptance |
| 13–15 | All live stages / operation owner、Tech Lead | 3, 4, 8–10 | SQL error／retry／unknown 0、external mutation 0、positive smoke 0 / each gate and final acceptance |
| 16 | Stages 1–7 / PKA、Tech Lead | all applicable | complete secret-free evidence identities / Human evidence acceptance |
| 17 | Stage 7 / Tech Lead、Human | 11 | exact N9 handoff manifest with unresolved fact 0 / N9 handoff acceptance |

Every live observation receives exactly one classification: `PASS`、`STOP` or `OUTCOME_UNKNOWN`。Evidence absence is not PASS。

## 9. Git and PR routing

- Canonical four-doc publication is complete at the governing published Head。
- This Plan candidate is Git-external and remains untracked unless a later Human gate authorizes exact-path publication。
- Plan review、Human adoption、Plan Git publication、N8 stacked PR creation、PR base decision、Ready conversion and merge are separate decisions。
- If later published, recommended topology is base `codex/n7-event-creation-abuse-protection` with head `codex/n8-canonical-requirements-dod-qa`, subject to fresh ancestry／remote／PR verification and Human decision。
- This recommendation does not authorize commit、push、PR creation、Ready conversion、merge or main integration。

## 10. Failure and outcome-unknown model

- `PASS`: exact target、authority、operation bound and evidence correlate; all expected observations match。
- `STOP`: known mismatch、unsafe state、unexpected success／delta、scope breach or required retry／repair。
- `OUTCOME_UNKNOWN`: operation or read may have occurred but completion／target／result cannot be correlated。

For `OUTCOME_UNKNOWN`:

- do not claim PASS
- automatic retry and blind repeat 0
- next-stage progression 0
- preserve secret-free evidence and operation counts
- return to Human with exact unknown and a separately authorized bounded read-only diagnosis proposal
- do not rollback、toggle、repair or cleanup unless separately authorized and current state is first established

ROLLBACK in Stage 5B is pre-COMMIT validation, not post-COMMIT recovery。

## 11. Grouped STOP conditions

### Identity and authority

- canonical Head／document identity drift
- release ancestry、branch、PR、worktree or ownership ambiguity
- Production target ambiguity or QA／Production confusion
- required read-only authority absent

### Lock and surface

- creator route binding、fallback or deployed correlation ambiguity
- NOLOGIN unproven、unexpected role delta or active creator session remaining
- Data API OFF or REST／GraphQL denial unproven
- mutation surface `UNKNOWN` or unauthorized writer present

### Discovery and cleanup

- schema／dependency／trigger／old-owner fingerprint mismatch
- ownerless migration present
- all-zero／nonzero branch ambiguity
- cleanup required but Production artifact governance authority absent
- old owner profile compatibility unproven
- ROLLBACK mismatch、COMMIT uncertainty、second execution or repair required

### Evidence and scope

- raw business data、personal data or secret exposure
- evidence identity／operation correlation incomplete
- retry required or any outcome unknown
- deployment、environment、Firewall、DNS、merge or main mutation
- N9 scope expansion or positive Production smoke requirement

## 12. Scope-inflation rejection record

This Plan rejects generic Data API administration、generic maintenance／cleanup orchestration、full catalog comparator、Vercel Authentication purchase、DNS／alias manipulation、maintenance UI、schema／RLS／GRANT redesign、migration execution、deployment、Firewall change、credential governance redesign、merge automation and N9 execution。

The current `operate-supabase-live-db` cleanup profile describes the ownerless-final schema and cannot by itself authorize or prove N8 old-owner cleanup compatibility。Resolving that compatibility is a conditional Production artifact governance decision, not a reason to create a generic cleanup framework。

## 13. Review, lifecycle and completion boundary

Required review sequence:

1. Tech Lead self-review
2. PKA routing／identity review
3. DevOps Production-boundary／Packet review
4. Tech Lead final integration
5. Independent Reviewer exact-artifact DoD／QA／determinism review
6. Human adoption decision

Human review readiness requires P0 0、P1 0、blocking P2 0 and no Plan／Packet responsibility mixing。

Current lifecycle after drafting remains:

- Plan: `DRAFT / NOT ADOPTED`
- Production read: `NOT AUTHORIZED`
- Operation Packet: `NOT AUTHORIZED / NOT DRAFTED`
- Production mutation: `NOT AUTHORIZED`
- Git publication／PR／merge: `NOT AUTHORIZED`
- N9: `NOT AUTHORIZED / NOT STARTED`

Plan adoption, if later granted, authorizes only use of this Plan as planning authority。It does not authorize any Packet, live read, mutation, publication or N9 work。

## 14. Human review decision

Human should decide whether the exact Plan identity:

- faithfully maps the published canonical four-doc baseline;
- keeps five Packet groups and all distinct Human risk gates separated;
- correctly branches all-zero versus nonzero;
- makes old-owner Production artifact governance conditional and explicit;
- provides complete DoD／QA traceability without drafting live operation bodies;
- is acceptable as the current N8 Implementation Plan authority。

Current next gate: PKA findingsの限定修正後に行うDevOps focused review。Tech Lead final integrationを経たexact artifactのIndependent Review PASS後だけ、`N8_IMPLEMENTATION_PLAN_HUMAN_ADOPTION`へ進む。
