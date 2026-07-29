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
| N3 `WTV-N3-DEPENDENCY-SECURITY-PATCH v0.3-draft` | [`877be5be968d73a0504933b1def6064dd87c218a65d11a6a22b7b1f56ab367a1`](WTV-N3-DEPENDENCY-SECURITY-PATCH-v0.3-draft.md) | Tech Lead `N3_EXECUTION_CONTRACT_V0_3_READY_FOR_HUMAN_ADOPTION_REVIEW`／review message SHA-256 `5d9455fcbcfd0edf05c5d14332ec4db58962660a58bf3d420296868050ae9f68`／blocking 0／advisory 0 | [`262777ad8bd49934de7b701e875261664f734f72018d71f32e1e4093dffb696c`](WTV-N3-DEPENDENCY-SECURITY-PATCH-v0.3-human-adoption-record.md) | `CONTRACT ADOPTED / MODE B / NOT IMPLEMENTATION AUTHORIZED` | `N3_MODE_B_LOCAL_EXECUTION_AUTHORIZATION` |
| N4 `WTV-N4-OWNERLESS-TRANSITION-CONTRACT v0.7-rebaselined-draft` | [`3abf083fba34a0df1afbc4498eae9965803f35be583f9804494b7f41af9b813a`](WTV-N4-OWNERLESS-TRANSITION-CONTRACT-v0.7-rebaselined-draft.md) | Tech Lead `N4_TECH_LEAD_REVIEW_PASS_READY_FOR_HUMAN_DECISIONS`／DevOps `N4_DEVOPS_REVIEW_PASS_READY_FOR_HUMAN_DECISIONS`／Independent Reviewer `N4_FINAL_INDEPENDENT_REVIEW_PASS`／blocking 0 | [`102e7ed044ca13a0cc7c1a7b264fd866baeb126187fb65d941c21c419fd8bb42`](WTV-N4-OWNERLESS-TRANSITION-CONTRACT-v0.7-human-adoption-form.md) | `ADOPTED / NOT IMPLEMENTATION AUTHORIZED` | `N5_ENTRY_DECISION_CONTRACT_TASK` |

## N3 adoption boundary

- Mode: `Mode B`
- Risk owner: `kcyth39`
- `acceptedAt`: `2026-07-29 14:16:00 JST`
- `expiresAt`: `2026-08-28 23:59:00 JST`
- Advisory acceptance: exact 4件
- Override: `NOT ADOPTED`
- Local-only spike: `NOT AUTHORIZED`
- Dependency変更／install: `NOT AUTHORIZED`
- Local DB-dependent QA: `NOT AUTHORIZED`
- Git publication／Preview／Production: `NOT AUTHORIZED`

Expiry到来またはreviewed Contract §13の失効条件成立時は、risk acceptanceを有効と推定せずHumanへ戻す。Mode B採用だけからlocal executionまたはoverride採用を導出しない。

## N4 adoption boundary

Human ownerは`kcyth39`、decision timeは`2026-07-29 18:05 JST`である。次を採用済みdecisionとして保持する。

- dedicated non-Production QA project方式
- dedicated least-privilege Postgres role方式
- candidate role `kimenosuke_event_creator`
- internal identifier `memo`
- normalized `memo` maximum `1000文字`

N5は`ENTRY DECISIONS PENDING / NOT IMPLEMENTATION AUTHORIZED`である。次はN5 entry decisionとして未確定のまま維持する。

- actual QA project identity
- replay wrapper／method
- exact driver／version
- environment variable名
- SSL／timeout／prepared statement
- local credential provisioning
- `memo`のexact counting rule

QA project作成、role作成、credential設定、driver追加、Vercel binding、N5実装は許可されていない。

## Execution evidenceとの分離

- N3 local-only spike evidenceはspike自体が未許可であり、保存先を本索引から新設・推定しない。
- N4 raw execution evidenceはreviewed Contractが指定するGit外directoryを使用し、使用前のowner／mode／retention gateを維持する。本directoryをexecution evidenceの保存先へ流用しない。
- 将来secret-free summaryをtracked化する場合も、別Human承認と別scopeを必要とする。

## Superseded artifacts

- N3 predecessor: v0.2 SHA-256 `dc76efd4989e5a32f706d80827eddf8528424b25ffb37c89348c8c8686faa241`
- N4 predecessor: v0.6 SHA-256 `e5879f3e3d361b833d2296b06c1fd8591872eab2142ef929e334ca39a6610a0f`

これらは`SUPERSEDED / DO NOT EXECUTE`であり、current authorityまたはimplementation inputに使用しない。本retention taskはpredecessor artifactの削除、置換、再構成を行わない。

## 更新契機

- exact Contract bodyまたはHuman adoption recordの追加・置換
- review identity、current lifecycle、expiry、next gateの変更
- implementation authorizationまたはslice lifecycleのHuman decision
- execution evidenceとの責任分界変更

更新時はreviewed bodyを直接編集せず、新しいexact artifactとHuman adoption recordを追加し、本索引、Knowledge入口、Current Roadmapを同じ変更で同期する。
