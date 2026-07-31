# Execution Contract保持・lifecycle索引

本directoryは、Humanが採用したtask-specific Execution Contractのreviewed bodyとHuman adoption recordを、exact identityを維持して保持する。repository全体のKnowledge入口は[`docs/README.md`](../README.md)、sliceの現在地と次gateは[Current Roadmap](../reports/development-and-business-activity-plan-2026-07-17.md)を使用する。

本索引はContract本文、Human adoption、current lifecycle、implementation permission、execution evidenceを分離する。Contract採用または本directoryへの保存だけでは、実装、Git publication、DB／Supabase／Vercel／Production操作のpermissionを生成しない。

## Authority

- Reviewed Contract bodyはbyte-identicalなimmutable artifactとして保持する。本文内のdraft status、review snapshot、path、wording、whitespaceをcurrent lifecycleへ書き換えない。
- Human adoption recordは採用時のexact identityを保持する。current lifecycleはreviewed body SHAとadoption record SHAの組で判断する。
- Review identity／verdictとcurrent lifecycleは本索引、slice statusと次gateはCurrent Roadmap、product／data decisionは`03_requirements.md`／`04_data-model.md`が担当する。
- Raw execution evidence、secret、credential、connection string、token、Cookie、raw share pathnameは本directoryへ保存しない。
- Embedded statusと本索引が異なる場合、embedded statusはartifact生成時snapshotとし、exact adoption recordに基づく本索引のcurrent lifecycleを使用する。

## Current Contract lifecycle

| Contract | Reviewed body | Review identity | Human adoption | Current lifecycle | Next gate |
|---|---|---|---|---|---|
| N3 `WTV-N3-DEPENDENCY-SECURITY-PATCH v0.3-draft` | [`877be5be968d73a0504933b1def6064dd87c218a65d11a6a22b7b1f56ab367a1`](WTV-N3-DEPENDENCY-SECURITY-PATCH-v0.3-draft.md) | Tech Lead `N3_EXECUTION_CONTRACT_V0_3_READY_FOR_HUMAN_ADOPTION_REVIEW`／review message SHA-256 `5d9455fcbcfd0edf05c5d14332ec4db58962660a58bf3d420296868050ae9f68`／blocking 0／advisory 0 | Human exact message（Codex task `019fada0-bfae-7c82-af88-31e4a1a90452`／`2026-07-29 20:53 JST`）がcurrent §12 evidence／repository retained copy [`ca97f14aa5109023e6e4ee442f2e73c71feda09223cb293ba945a74c916925ee`](WTV-N3-DEPENDENCY-SECURITY-PATCH-v0.3-corrected-human-adoption-and-risk-acceptance-record.md) | `CONTRACT ADOPTED / MODE B / NOT IMPLEMENTATION AUTHORIZED`／execution `N3_MODE_B_LOCAL_EXECUTION_PACKET_BLOCKED` | `N3_SHARP_REACHABILITY_RESOLUTION` |
| N4 `WTV-N4-OWNERLESS-TRANSITION-CONTRACT v0.7-rebaselined-draft` | [`3abf083fba34a0df1afbc4498eae9965803f35be583f9804494b7f41af9b813a`](WTV-N4-OWNERLESS-TRANSITION-CONTRACT-v0.7-rebaselined-draft.md) | Tech Lead `N4_TECH_LEAD_REVIEW_PASS_READY_FOR_HUMAN_DECISIONS`／DevOps `N4_DEVOPS_REVIEW_PASS_READY_FOR_HUMAN_DECISIONS`／Independent Reviewer `N4_FINAL_INDEPENDENT_REVIEW_PASS`／blocking 0 | [`102e7ed044ca13a0cc7c1a7b264fd866baeb126187fb65d941c21c419fd8bb42`](WTV-N4-OWNERLESS-TRANSITION-CONTRACT-v0.7-human-adoption-form.md) | `ADOPTED / NOT IMPLEMENTATION AUTHORIZED` | N5 current lifecycle／Human gates（下記） |
| N5 `WTV-N5-ENTRY-DECISION-CONTRACT v0.1-draft` | [`95324577e53781eb6d812f76c74383947078c47ee704d5fad78066c0762e2b51`](WTV-N5-ENTRY-DECISION-CONTRACT-v0.1-draft.md) | Tech Lead `TECH_LEAD_EXACT_SHA_REVIEW_PASS`／DevOps `DEVOPS_EXACT_SHA_REVIEW_PASS`／Independent Reviewer `INDEPENDENT_REVIEWER_APPROVED_N5_ENTRY_DECISION_CONTRACT_EXACT_SHA`／blocking 0／advisory 0 | [`cc5944d2519f6701c44002c6668b96d3d8b43c54ae43af1e15a6ff5f298ef4d1`](WTV-N5-ENTRY-DECISION-CONTRACT-v0.1-human-adoption-record.md)／authoritative Human exact message（Codex task `019f7d65-c9a5-7721-abdc-4651df04a8c3`／turn `019fadd0-047a-7983-8b5c-a2be270f6cb4`／message `msg_019fadd0-04a3-7752-99c8-fd7e7b81e590`／`2026-07-29 21:07 JST`） | `ENTRY DECISIONS ADOPTED / IMPLEMENTATION START SEPARATELY AUTHORIZED / TASK-BRANCH CANDIDATE / LAYER 2 COMPLETE / H5 PENDING / NOT MAIN-INTEGRATED` | same-SHA H5 acceptance、N6 handoff、retirement gate |

## N3 adoption boundary

- Corrected record: `CURRENT N3 HUMAN ADOPTION AND RISK ACCEPTANCE RECORD`
- Current §12 evidence: authoritative Human exact message（Codex task `019fada0-bfae-7c82-af88-31e4a1a90452`／`2026-07-29 20:53 JST`）
- Repository retained copy: [`ca97f14aa5109023e6e4ee442f2e73c71feda09223cb293ba945a74c916925ee`](WTV-N3-DEPENDENCY-SECURITY-PATCH-v0.3-corrected-human-adoption-and-risk-acceptance-record.md)
- Previous record: [`262777ad8bd49934de7b701e875261664f734f72018d71f32e1e4093dffb696c`](WTV-N3-DEPENDENCY-SECURITY-PATCH-v0.3-human-adoption-record.md)／`SUPERSEDED FOR §12 RISK ACCEPTANCE EVIDENCE`。historical evidenceとして不変保持し、編集・削除しない
- Mode: `Mode B`
- Risk owner: `kcyth39`
- `acceptedAt`: `2026-07-29 20:53 JST`
- `expiresAt`: `2026-08-28 23:59:00 JST`
- Advisory acceptance: exact 4件
- PostCSS: `REACHABLE（build-time／repo-controlled input only）`
- sharp: `UNKNOWN（conditional runtime path present／actual invocation unverified）`
- Execution: `N3_MODE_B_LOCAL_EXECUTION_PACKET_BLOCKED`
- Block reason: sharp `UNKNOWN`／reviewed Contract §15 `Unknown reachability 0`未達／local DoD未達
- Next gate: `N3_SHARP_REACHABILITY_RESOLUTION`
- Override: `NOT ADOPTED`
- High 0: `NOT CLAIMED`
- Local-only spike: `NOT AUTHORIZED`
- Dependency変更／install: `NOT AUTHORIZED`
- Local DB-dependent QA: `NOT AUTHORIZED`
- Git publication／Preview／Production: `NOT AUTHORIZED`
- Implementation／execution permission: `0`

Expiry到来またはreviewed Contract §13の失効条件成立時は、risk acceptanceを有効と推定せずHumanへ戻す。Mode B採用または`N3_SHARP_REACHABILITY_RESOLUTION`というgate名だけから、reachability調査、local execution、override採用その他のexecution permissionを導出しない。

## N4 adoption boundary

Human ownerは`kcyth39`、decision timeは`2026-07-29 18:05 JST`である。次を採用済みdecisionとして保持する。

- dedicated non-Production QA project方式
- dedicated least-privilege Postgres role方式
- candidate role `kimenosuke_event_creator`
- internal identifier `memo`
- normalized `memo` maximum `1000文字`

N5 entry decisionsは後続のHuman adoptionにより確定した。N4の採用済みdecisionとpermission境界は変更せず、current lifecycleと具体的なN5 decisionは次節を正とする。

## N5 adoption boundary

Human ownerは`kcyth39`、entry decision timeは`2026-07-29 21:07 JST`である。Reviewed body内の`PROPOSED / NOT ADOPTED / NOT IMPLEMENTATION AUTHORIZED`と`Proposed decision`／`Human adoption候補`はreview時点のimmutable snapshotであり、current lifecycleへ書き換えない。Entry decisionsの採用と、後続のN5実装開始承認を分離する。

N5実装開始は、Contract SHA-256 `916121d2cf86f2b930bdbc7d4ca55899f08cd02538ecd5d18fc09205bdcc21dc`、Plan SHA-256 `c607d33b73d1f726357438b2534f8d5e6dae03f1535ffec5c98a91aa2529ec70`、baseline `87295a19f80192ffbe91c56dded86748d3a51bbd`に対する`N5_IMPLEMENTATION_START_AUTHORIZATION`として、Humanが`2026-07-30 09:47 JST`に別途承認した。承認対象はbranch `codex/n5-ownerless-transition`のtask-branch candidateであり、Git publication、DB操作、Layer 2操作、main統合を含まない。

有効なmain baselineのapplication／DBは旧owner model、targetはADR-0009のownerless modelである。task branch上の変更はimplementation candidateであり、main実装済みまたは受入済みと扱わない。

- D1: dedicated non-Production QA project方式を採用。resource `where-to-visit-qa`（ref `twcbycyyrxbovtgiqaun`）はHumanが作成し、resource creationは`COMPLETE_BY_HUMAN`
- QA creation record: Human reviewは`APPROVED_BY_HUMAN`。approved record SHA-256は`cca7c110c7152574c689ac10d01a4e4c85e105d7f3331755982bfbc741569f76`
- Canonical docs synchronization: 本PRでbranch上のcurrent statusを同期し、main統合はHuman merge待ち
- D2: `N5_LAYER2_SQL_EDITOR_CLEAN_CHAIN_V1`を採用。M01〜M11のimmutable migration exact 11件をreplayし、M12は作成していない
- D3: `pg@8.22.0`／`@types/pg@8.20.0`を採用。N5 dependency installはtask branchで`PASS`だが、main未統合
- D4: server-only `KIMENOSUKE_EVENT_CREATOR_DATABASE_URL`／`KIMENOSUKE_EVENT_CREATOR_DATABASE_CA_PEM`を採用。hosted Event creator credentialは`PRESENT / VERIFIED`で、raw値は保存・表示しない。対象branchのPreview REST target bindingは`PASS`
- D5: Node.js 24、short-lived `pg.Client`、Shared Supavisor transaction port `6543`、exact timeout、verify-full相当、prepared statement 0、retry 0、timeout／切断後`OUTCOME_UNKNOWN`を採用。Layer 2 connection／Preview basic-function QAは`PASS`し、exact設定はreviewed body §9を正とする
- D6: Human-only local credential provisioning lifecycleを採用。QA projectのdedicated role／grant minimum-privilege probeは`PASS`し、raw password／credentialは保存しない
- D7: LF normalization、ECMAScript trim、Unicode scalar value count、maximum 1000とerror copy `つたえたいことは1000文字までです。`を採用。Layer 2 candidateへ反映し、full CRUD coverageは主張しない
- N3 package／lockfile ownership: N3とは同時所有しない。N5のexclusive ownershipは別記録で管理する

上記QA project作成とrecord承認、ならびに完了済みLayer 2 evidenceは、追加のresource／Production permissionを生成しない。approved external creation recordは、project identityとrecord SHAのcurrent resource-identity authorityとして維持する。credential値、share token、raw pathname、runtime secretは記録しない。

本同期記録時点のN5は`TASK-BRANCH CANDIDATE / LAYER 2 COMPLETE / H5 PENDING / NOT MAIN-INTEGRATED`である。Human受容済みcomposite evidenceには、QA project identity、M01〜M11 exact 11件、credential／minimum-privilege probe、Preview REST target binding、basic-function QA、fixture cleanupを含む。Vercel Runtime Logsだけではoutbound REST hostを直接証明できないため、接続先判定はbranch-specific override、deployment identity、QA-only Event表示／共同編集、postflightの複合証拠として記録し、既知のevidence limitationを非blockingとして受容する。full CRUD coverageは主張しない。same-SHA `H5` acceptance、N6 handoff、retirement gateは未完了であり、N5単独をmainへmergeしない。N3のdependency security、N6のbrowser history、N7のWAF／rate limit、N8の既存Event cleanupはN5へ混入させない。

## N5 Layer 2 completion evidence

- Tested branch／commit: `codex/n5-ownerless-transition`／`d6c473271410032253d18ede52607302cda80df6`
- QA project: `where-to-visit-qa`／ref `twcbycyyrxbovtgiqaun`
- Preview deployment: `dpl_4Vk3cAGk5y7GrT2mtFuKj2of7m4q`／branch alias [`where-to-visit-kimenosuke-git-codex-n5-ownerless-638d9d-oparea.vercel.app`](https://where-to-visit-kimenosuke-git-codex-n5-ownerless-638d9d-oparea.vercel.app)
- Migration evidence: M01〜M11 immutable exact 11件、M12 absent、migration count 11。cleanup SQL SHA-256 `220d5c0d6e4cec9096e4141714379d4b93603f8b23b72d5dc58c072d2f7bac90`
- Cleanup postflight: `/Users/shige/Projects/Where-to-Visit-Evidence/N4-ownerless-transition/n5-dependency-and-implementation/layer2-preview-qa-cleanup/20260731T160119Z-commit-postflight`、manifest SHA-256 `84e1f7ab3be2fd4ccf747a0552bdce5b192493bbee66f153fe8eaf6f681da709`、COMPLETE SHA-256 `a3ce8655b1d9b9d17d5887c786644a10b2c5244765cd21145ba627c85b6c459d`
- Disposition: hosted credential／minimum privilege／Preview binding／basic-function QA／fixture cleanupはHuman accepted。Vercel Runtime Logsのoutbound REST host非観測は既知のevidence limitation、full CRUD coverage limitationはnon-blocking。raw credential、share token、raw pathname、Production secretは保存しない。

## Execution evidenceとの分離

- N3 local-only spike evidenceはspike自体が未許可であり、保存先を本索引から新設・推定しない。
- N4 raw execution evidenceはreviewed Contractが指定するGit外directoryを使用し、使用前のowner／mode／retention gateを維持する。本directoryをexecution evidenceの保存先へ流用しない。
- N5のreviewed bodyとHuman adoption recordはnormative Contract／adoption evidenceであり、actual resource identity、credentialまたはraw execution evidenceの保存先にしない。
- 将来secret-free summaryをtracked化する場合も、別Human承認と別scopeを必要とする。

## Superseded artifacts

- N3 predecessor: v0.2 SHA-256 `dc76efd4989e5a32f706d80827eddf8528424b25ffb37c89348c8c8686faa241`
- N4 predecessor: v0.6 SHA-256 `e5879f3e3d361b833d2296b06c1fd8591872eab2142ef929e334ca39a6610a0f`

これらは`SUPERSEDED / DO NOT EXECUTE`であり、current authorityまたはimplementation inputに使用しない。本retention taskはpredecessor artifactの削除、置換、再構成を行わない。

N3 previous Human adoption record [`262777ad8bd49934de7b701e875261664f734f72018d71f32e1e4093dffb696c`](WTV-N3-DEPENDENCY-SECURITY-PATCH-v0.3-human-adoption-record.md)は`SUPERSEDED FOR §12 RISK ACCEPTANCE EVIDENCE`である。historical adoption evidenceとして保持し、本文を編集・削除しない。

## 更新契機

- exact Contract bodyまたはHuman adoption recordの追加・置換
- review identity、current lifecycle、expiry、next gateの変更
- implementation authorizationまたはslice lifecycleのHuman decision
- execution evidenceとの責任分界変更

更新時はreviewed bodyを直接編集せず、新しいexact artifactとHuman adoption recordを追加し、本索引、Knowledge入口、Current Roadmapを同じ変更で同期する。
