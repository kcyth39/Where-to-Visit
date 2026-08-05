# WTV-N8-PRODUCTION-MAINTENANCE-IMPLEMENTATION-PLAN v0.2

## 0. Document identity

- Plan ID: `WTV-N8-PRODUCTION-MAINTENANCE-IMPLEMENTATION-PLAN`
- Version: `v0.2`
- Status: `HUMAN ADOPTED / CURRENT PLANNING AUTHORITY / NOT EXECUTION AUTHORIZED / NOT PACKET AUTHORIZED`
- Primary owner / sole writer: Tech Lead
- Adoption authority: Human
- Repository: `kcyth39/Where-to-Visit`
- Governing branch: `codex/n8-canonical-requirements-dod-qa`
- Governing published Head: `ea6def4b15d6e56d572c93bfdd1b4068aa754cc6`
- Evidence root: `/Users/shige/Projects/Where-to-Visit-Evidence/N8-production-maintenance/`
- Governing decision: `N8_REPLACEMENT_IMPLEMENTATION_PLAN_V0_2_ADOPTED`
- Next gate: `N8_REPLACEMENT_IMPLEMENTATION_PLAN_V0_2_PUBLISHED_HEAD_ACCEPTANCE`

本Planはstage順、依存関係、owner、Human／Agent境界、必要なPacket、evidence flow、QA順、STOP条件、Git routingおよびN9 handoffを定義する。Plan採用、Packet作成、Production read／mutation、Git publication、PRまたはN9 executionのpermissionを生成しない。

## 1. Authority and baseline

### 1.1 Authority order

1. tracked canonical documents、ADR、role authorityおよびHumanのexact decision
2. Human採用後の本Plan。ただし上位正本と矛盾しないtask-specific planning inputに限る
3. current source、Git／provider metadataおよびlater-authorized observation。baselineとdeltaのevidenceであり意味を決めるauthorityではない
4. historical frozen artifacts。provenanceでありcurrent execution authorityではない

矛盾、予期しないdrift、安全な実現不能またはscope外deltaを確認した場合、下位資料で補完せずSTOPしてHuman／domain ownerへ戻す。

### 1.2 Canonical identities

| Canonical input | SHA-256 |
|---|---|
| `docs/03_requirements.md` | `324e75b04edd34a92a1fe17d73948b187e270b99454faa5d80cce90d504827c6` |
| `docs/04_data-model.md` | `fd42e562ff7a75f164100fee32d42fd83612c28f077752e10a9621294b9675ca` |
| `docs/05_dod.md` | `4ee1cac5d7e7ca2cc849870b610864c50c7882044a6bfae8a49459094755e5f7` |
| `docs/06_qa-flow.md` | `379db1fa7f6dac7da7c0405092d6529c7f8f0c4f1bd745dc25f3ab47b8ee4b58` |

Headまたはいずれかのidentityが変わった場合は本Planを自動適用せず、fresh reconciliationとHuman判断を要求する。

### 1.3 Historical frozen ledger

| Artifact | SHA-256 | Treatment |
|---|---|---|
| Plan v0.1 | `3af8b66bc904c945ab4f9e4299afed163a4e17e4d41ed20808d816102327ec78` | pre-rebase／historical frozen／not current authority |
| Group 1 Packet | `5eb9fbcb418eb958aac829cc10cd54a0b61922a078842779b16ae07953eb52aa` | historical frozen／do not execute |
| Pre-lock Design | `77920b86d5e243e12bb101084fd77ef0fdeae4592e3815443286bbc1793cfb00` | historical frozen／do not route current execution |
| SELECT-only SQL | `21c38cfa0fa4cb0cf9e07030a567f606001a2b7ccec13792420988101fa665a3` | historical frozen／do not execute |

既存STOP evidenceは当時の停止事実を示すhistorical evidenceとして保持する。旧artifactを修正、再実行、current Packetのbody sourceまたはpermission根拠として使用しない。

### 1.4 Fixed N8 architecture

- Purpose／application: N9前に`old-owner / Data API-based` Productionをbounded maintenance stateへ移し、exact 8 business tablesを0件としてhandoffする。
- Lock／excluded controls: sole primary lockはHuman-operated Production Data API OFF。role mutation 0、`NOLOGIN`／creator active-session verificationはN8 scope外。in-flight requestはHuman-adopted assumptionにより不存在で、quiet period／drain／wait／race-specific lockは0。
- Baseline／cleanup: Data API OFF read-back後かつremaining surface受入後の最初のcomplete fresh countをauthoritative baselineとする。post-OFF row increaseは`UNEXPECTED MUTATION / STOP`。cleanup graphは`events`、`participants`、`candidates`、`criteria`、`votes`、`reactions`、`concerns`、`comments`で、全row eligible、preservation／conversion／migration 0。
- Authority／exit: Production writeはHuman-only、Agent-readable write credential 0。exitはold-owner schema、8 tables zero、Data API OFF、surface `UNKNOWN 0`。N9のownerless migration／deployment／Data API restart／creator route activationは別Human gate。

## 2. Ownership and permission boundary

### 2.1 Owners

- Tech Lead: Plan構造、stage dependency、technical consistency、DoD／QA traceability、STOP判断、N9 handoff completeness。
- DevOps: separately authorized Packetのtarget guard、Data API semantics、surface classification、operation boundary、evidenceのoperational review。
- PKA: lifecycle、authority、artifact identity、supersession、routingおよびpublication boundaryのreview。
- Agent: separately authorized read-only observation、secret-free projection、artifact generationおよびpostcheck reviewだけを行う。
- Human: Plan／Packet採用、Production authority、Dashboard／SQL Editor操作、branch disposition、evidence acceptance、N9 handoff acceptance。

### 2.2 Human／Agent split

AgentはProduction SQLを実行せず、Production write credentialを受領しない。Human mutationの結果を推測せず、read-back evidenceを`PASS`、`STOP`または`OUTCOME_UNKNOWN`へ分類する。local parser／formatter／sanitizer errorは、live operationを増やさずtarget、authority、evidence meaningおよびsecret boundaryを変えない範囲だけで修正できる。

Plan adoptionはplanning authorityだけを生成する。Packet drafting、Packet adoption、live read、Data API OFF、Production SQL、Git publication、PR、mergeおよびN9は、それぞれ別Human gateを必要とする。

## 3. Seven-stage model

```text
Stage 1 Entry identity and current-state fixation
  -> Stage 2 Data API OFF
  -> Stage 3 Remaining mutation-surface acceptance
  -> Stage 4 Post-lock fresh discovery
       -> Stage 5A All-zero branch
       -> Stage 5B Conditional cleanup branch
  -> Stage 6 Common exit postcheck
  -> Stage 7 N9 handoff
```

各矢印は前段のrequired evidenceとHuman acceptanceを必要とする。`STOP`、`OUTCOME_UNKNOWN`または未承認では次stageへ進まない。

### Stage 1 — Entry identity and current-state fixation

目的: governing Head／canonical identities／N5→N6→N7 lineage、current N8 branch／worktree／remote／PR state、old-owner／Data API-based Production classification、expected Production project／QA exclusion、public serving state、change-freeze baselineおよびhistorical frozen ledgerを固定する。

Public serving stateはsupporting evidenceでありmaintenance lockではない。approved same-site canonical Production originへの301／302／307／308 redirectは、external／unapproved target 0、loop 0、Authentication challenge 0、maintenance interception 0の場合にPASS可能とする。

このstageではcreator route binding、creator role catalog、pre-lock SELECT-only SQL、`NOLOGIN`またはactive-session observationを要求しない。

Owner: Tech Lead。Git／provider factsは別途許可されたAgent read-only、最終分類はHuman review。

Exit: identity correlation complete、change freeze baseline fixed、unexpected mutation 0。

### Stage 2 — Data API OFF

Entry: Stage 1 PASS、Packet 1がreviewed／Human adopted、exact execution authorizationあり。

Sequence intent:

1. distinct sourcesでexact Production targetを相関する。
2. HumanがSupabase DashboardでData APIをOFFにする。
3. OFFをread-backする。
4. current REST／GraphQL business accessがblockedであることを確認する。
5. schema／RLS／policy／grant drift 0を確認する。

これはN8最初のmutation stageである。retry 0、second toggle 0。結果を推測せず、toggleまたはread-backの相関不能は`OUTCOME_UNKNOWN`として停止する。

Exit: exact Production Data API OFF、REST／GraphQL blocked、security drift 0、operation count within Packet bound。

### Stage 3 — Remaining mutation-surface acceptance

Entry: Data API OFF evidence accepted、Packet 2がreviewed／Human adopted、Stage 3／4を順に扱うexact bounded read authorizationあり。Packet 2はStage 3 evidence取得後にmandatory pauseし、Human surface acceptance前にStage 4 discoveryへ進まない。
Data API OFFから他surfaceの停止を推定しない。Realtime、Storage、Auth、Edge Functions、direct Postgres、pooler、SQL Editor、any current server-side pathを、8 business tablesへのmutation capabilityだけについて個別分類する。

Allowed classification: `BLOCKED`、`HUMAN_ONLY`、`VERIFIED_N/A`、`UNKNOWN`。

Owner: DevOps review、authorized Agent read-only、Human acceptance。

Exit: `UNKNOWN 0`、unauthorized writer 0。未分類またはcorrelation不能は次stageへ進めない。

### Stage 4 — Post-lock fresh discovery

Entry: Data API OFF read-back PASS、Stage 3 `UNKNOWN 0` accepted。Stage 3／4を順に扱うPacket 2 authorizationの範囲内で、mandatory pause後のpost-lock discovery phaseだけを続行する。

Human SQL Editorを必要とする観測はHumanが実行し、Agentはraw rowを受領しない。観測対象はexact 8-table counts、foreign keys／delete actions／cascade relationships、triggers／external dependencies、old-owner schema fingerprint、ownerless migration absence、dangling／orphan counts、schema／security／role／grant／migration baseline。

Data API OFF read-back後の最初のcomplete fresh resultをauthoritative baselineとする。pre-lock countはauthorityを持たない。

Classification:

- any table nonzero: `CLEANUP_REQUIRED`
- all 8 tables zero: `ALREADY_IN_DESIRED_STATE / CLEANUP MUTATION 0`
- incomplete、uncorrelatedまたはambiguous: `OUTCOME_UNKNOWN`

baseline確定後のbusiness-row increaseは想定raceではなくunexpected mutationとしてSTOPする。

### Stage 5A — All-zero branch

Entry: authoritative baselineが8×0で、Humanが`ALREADY_IN_DESIRED_STATE / CLEANUP MUTATION 0`を受入れる。

- cleanup artifact generation: 0
- ROLLBACK: 0
- COMMIT: 0
- cleanup performed／fixtures cleaned claim: not applicable
- Stage 6へのprogression: Human disposition後のみ

Stage 6はordinary exit verificationであり、quiet period、race mitigation、waitまたはre-count gateとして扱わない。

### Stage 5B — Conditional cleanup branch

Entry: authoritative baselineに1件以上、Humanが`CLEANUP_REQUIRED`を受入れる。

必要条件: old-owner cleanup compatibility proof、Production artifact governance authorization、Packet 3のconditional drafting／review／adoption。

ROLLBACK: artifact generation／review／Human adoption後、Human execution exact 1、retry 0。transaction-internal zero checkとexact baseline restoration PASSを要求する。

COMMIT: restoration acceptance後だけartifactを生成し、artifact adoptionとpermanent deletion authorization後、Human execution exact 1、retry 0、second execution 0。

ROLLBACKとCOMMITのoperation bodyは同じapproved cleanup meaningを維持するが、本PlanはSQL bodyを定義しない。ROLLBACKはpre-COMMIT validationでありpost-COMMIT recoveryではない。COMMIT outcomeがunknownならrepeat／repair 0でSTOPする。

### Stage 6 — Common exit postcheck

Packet 4に基づき、all-zero／nonzero両branchでSELECT-only exit verificationを行う。

- DB／schema: exact 8 tables zero、dangling／orphan zero、ownerless migration absent、schema／security／role／grant／migration drift zero。
- Lock／operation: Data API OFF、surface `UNKNOWN 0`、deployment／environment／Firewall／DNS／merge／main mutation zero、SQL error／retry／outcome unknown zero。

all-zero branchではcleanup mutation／artifact／ROLLBACK／COMMIT 0を維持する。nonzero branchではCOMMIT known completionとpostcheck PASSを別々に記録する。COMMIT後のpostcheckがunknownでもcleanupを再実行しない。

### Stage 7 — N9 handoff

Tech Leadは次をsecret-free handoffへまとめ、Humanが別gateで受入れる。

- State: release／current N8 branch／Head／PR／Production identity、old-owner fingerprint、8 tables zero、Data API OFF、surface `UNKNOWN 0`、migration／deployment／Firewall state。
- Evidence／authority: evidence identities、operation／retry ledger、historical frozen status、current canonical／Plan／Packet identities、unresolved facts zero。

Human handoff acceptanceはN9 execution、migration、deployment、Data API ON、creator route activation、smoke、mergeまたはmain integrationを許可しない。

## 4. Required Packet set

current Packetはexact 4 groupsとする。Packet candidateまたはadoptionはlive permissionを生成しない。

| Packet | Class／owner | Purpose | Applicability |
|---:|---|---|---|
| 1 — Data API OFF | Human Dashboard Class M／Human executes、DevOps reviews | target guard、OFF mutation、OFF read-back、REST／GraphQL blocking、security drift check | required |
| 2 — Surface and post-lock discovery | read-only／Human SQL Editor where required | ordered phase 1: surface evidence、mandatory Human pause。ordered phase 2: 8-table counts、dependency／trigger／fingerprint、branch classification | required after Packet 1 evidence acceptance。Stage 3 acceptance前にphase 2へ進まない |
| 3 — Conditional cleanup | Human Production DB Class M | ROLLBACK、restoration、COMMIT、operation ledger | nonzero branch only |
| 4 — Exit postcheck and N9 handoff | read-only plus Human acceptance | common exit verification、evidence completeness、handoff manifest | both branches |

generic entry Packetは追加しない。Stage 1 checksはPlan preflightと各Packetのtarget guardで扱う。Packetは、必要なexact Dashboard操作またはProduction SQLを含む場合でも、単なるclick手順書、SQL本文集またはgeneric orchestration frameworkにはしない。exact operationのtarget、許可範囲、Human／Agent境界、artifact identity、operation bound、evidence、STOP、`OUTCOME_UNKNOWN`およびpermission generated／not generatedを一体で定義する。

## 5. Human gates

次のdecisionを分離する。

1. Plan v0.2 adoption
2. Plan v0.2 Git publication
3. Packet 1 drafting
4. Packet 1 adoption
5. exact Data API OFF execution authorization
6. Data API OFF evidence acceptance
7. Packet 2 drafting
8. Packet 2 adoption
9. Packet 2 bounded read execution authorization
10. remaining surface acceptance
11. baseline branch acceptance
12. all-zero disposition, if applicable
13. cleanup governance, if nonzero
14. Packet 3 ROLLBACK generation／adoption／execution, if nonzero
15. restoration acceptance, if nonzero
16. Packet 3 COMMIT generation／adoption／execution, if nonzero
17. Packet 4 drafting／adoption
18. exit postcheck acceptance
19. N9 handoff acceptance

local parser／formatter／sanitizer correctionには新しいHuman gateを追加しない。

## 6. Evidence flow

- Storage: fixed evidence root配下のGit-external no-replace generation、root `0700`、files `0600`、regular／non-symlink、completeness marker last。不完全generationを上書き／追記しない。
- Content: raw business rows、title、memo、token、personal data、credential、DB URL、password、CA、Cookie、raw provider response 0。secret-free projection、operation／retry ledger、identity、terminal classificationだけを永続化する。
- Classification／ownership: observationごとにexact 1つの`PASS`／`STOP`／`OUTCOME_UNKNOWN`。Packetがartifact setとoperation boundsを定義し、Planは不要なfilename／generic generatorを固定しない。

## 7. DoD／QA traceability

Reference: `docs/05_dod.md` §3.7の16 DoD items、`docs/06_qa-flow.md` §2.4の10 scenarios。canonical本文は再掲しない。

| DoD | QA | Stage／owner | Packet／evidence／Human acceptance |
|---|---|---|---|
| 1–3 | 1 | Stage 1／Tech Lead、authorized Agent read-only | Plan preflight、lineage／Production target／application identity evidence、entry acceptance |
| 4 | 2 | Stage 1／Tech Lead、authorized Agent read-only | public serving／redirect classification、N8 serving mutation 0、Human review |
| 5 | 3 | Stage 2／Human、DevOps review | Packet 1、OFF／REST／GraphQL／security evidence、Data API acceptance |
| 6 | 4 | Stage 3／DevOps、Human | Packet 2 ordered surface evidence、surface matrix `UNKNOWN 0`、mandatory pause／surface acceptance |
| 7–8 | 5 | Stage 4／Human query、Tech Lead | Packet 2、first fresh baseline／dependency／fingerprint／post-OFF delta evidence、baseline acceptance |
| 9 | 6–9 | Stages 5A／5B／6、Human | branch disposition、Packet 3 conditional、Packet 4 common exit、branch-specific acceptance |
| 10–12 | 5、9 | Stages 4／6、Human query、Tech Lead | 8×0、dangling／orphan 0、migration absent、drift 0、exit acceptance |
| 13–14 | applicable live QA | all live stages／operation owner | SQL error／retry／unknown 0、external mutation-zero ledger、each gate acceptance |
| 15 | 1–10 | Stages 1–7／Tech Lead、PKA | complete secret-free evidence identities、Human evidence acceptance |
| 16 | 10 | Stage 7／Tech Lead、Human | Packet 4 handoff、unresolved facts 0、N9 handoff acceptance |

QA scenario 9は両branch共通のexit postcheckであり、all-zero branchをcleanup branchへ変えない。evidence absenceまたはuncorrelated evidenceはPASSではない。

## 8. Target-correlation model

単一sourceにfull target proofを要求しない。

- Git／repository: current source、release identity、write-path classification
- Vercel: deployment、environment、source、serving state
- Human Supabase Dashboard: project ref、Data API state
- Human SQL Editor: database、schema、catalog

各sourceが担当するidentityだけを証明し、cross-source correlationをHumanが受入れる。connectorが返さないfieldを推測せず、credential valueまたはraw responseをevidenceへ保存しない。

## 9. Failure and outcome-unknown model

- `PASS`: exact target、authority、bound、resultおよびevidenceが相関し、expected stateと一致する。
- `STOP`: known mismatch、unsafe state、unexpected delta、scope breach、required retry／repairまたはpost-OFF row increase。
- `OUTCOME_UNKNOWN`: operation／readの有無、target、completionまたはresultを一意に相関できない。

`OUTCOME_UNKNOWN`ではPASS claim、automatic retry、blind repeat、next-stage progression、toggle、repair、rollbackおよびcleanupを0とする。secret-free evidenceとoperation countを保持し、current stateを確定する別Human-authorized bounded diagnosisへ戻す。

## 10. Grouped STOP conditions

### Identity／authority

- canonical Head／document identity drift
- lineage、branch、worktree、PR、ownershipまたはchange-freeze ambiguity
- wrong Production target、QA／Production confusion
- historical frozen artifactのcurrent authority／execution bodyへの再利用
- required Plan／Packet／Human authority absent

### Data API OFF

- wrong target、OFF unproven、REST／GraphQL still accessible
- unexpected schema／RLS／policy／grant drift
- retry、second toggle、manual repair required
- toggle／read-back correlation impossible

### Surface／discovery

- `UNKNOWN` remains、unauthorized writer present
- schema／dependency／trigger／fingerprint mismatch
- ownerless migration present
- first complete post-lock baseline unavailable
- all-zero／nonzero branch ambiguity
- authoritative baseline後のbusiness-row increase

### Cleanup

- old-owner compatibility unproven
- artifact governance absent
- ROLLBACK mismatch、restoration unproven
- COMMIT outcome unknown
- second execution、blind repeat、repair required

### Evidence／scope

- raw business data、personal data、secretまたはraw provider response exposure
- evidence identity／operation correlation incomplete
- unexpected deployment／environment／Firewall／DNS／merge／main mutation
- creator role mutation、`NOLOGIN`、active-session verification、in-flight mitigationまたはN9 scope expansion

## 11. Git／PR routing

- canonical Data API primary-lock publicationはgoverning Headでcomplete。
- 本Plan v0.2 candidateはGit-external。Human adoptionとexact-path publicationを別gateとする。
- Plan publication後もN8 PR creation／base decision、Ready conversion、mergeは別Human decision。
- Recommended future topology: base `codex/n7-event-creation-abuse-protection`、head `codex/n8-canonical-requirements-dod-qa`。fresh ancestry／remote／PR verificationを前提とする。
- recommendationはcommit、push、PR、Ready、mergeまたはmain integrationを許可しない。

## 12. Scope-inflation rejection

本Planはgeneric Data API administration、generic Production maintenance／cleanup system、generic discovery framework、full catalog comparator、Vercel Authentication purchase、DNS／alias manipulation、maintenance UI、schema／RLS／GRANT redesign、migration、deployment、Firewall change、credential governance redesign、merge automationおよびN9 executionを追加しない。
必要なexact Dashboard操作またはProduction SQLを含むoperation detailsとartifact identityは各future Packetがbounded execution contractとして定義し、本Planへ混入させず、PacketをImplementation Planのミクロ版、単なるclick手順書／SQL本文集またはgeneric frameworkにしない。

## 13. Review and lifecycle

Review sequence: Tech Lead self-review → DevOps operational review → PKA lifecycle／supersession review → Tech Lead focused correction → Independent Reviewer exact-artifact review → Tech Lead final integration → Human adoption decision。

Review readinessはP0 0、P1 0、blocking P2 0、current／historical authority ambiguity 0、Plan／Packet responsibility mixing 0、hidden future-route assumption 0を要求する。

Current lifecycle: Plan v0.2 `HUMAN ADOPTED / CURRENT PLANNING AUTHORITY`。Plan v0.1／Group 1 Packet／pre-lock Design／SELECT-only SQL `HISTORICAL FROZEN / NOT CURRENT AUTHORITY`。Packet 1–4 `NOT AUTHORIZED / NOT DRAFTED`。Production read／mutation、PR／merge、N9は`NOT AUTHORIZED`、N9は`NOT STARTED`。本tracked Planのpublicationは別Human authorizationに従い、publication後もadditional Git publication、Packet drafting、live operationまたはN9 permissionを生成しない。

Plan adoptionは本Planをcurrent planning authorityとして扱う判断だけであり、Packet、live read、mutation、publicationまたはN9 permissionを生成しない。

## 14. Human review decision

Humanによるexact Git-external artifactのadoptionは完了しており、本tracked fileはそのplanning authorityをpublicationする。

このpublicationはPacket drafting、live read、mutation、PR、mergeまたはN9を許可しない。Packet 1 draftingは、published Head acceptance後も別Human gateを必要とする。

Next lifecycle step: `N8_REPLACEMENT_IMPLEMENTATION_PLAN_V0_2_PUBLISHED_HEAD_ACCEPTANCE`。
