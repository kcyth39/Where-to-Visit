# N7 Execution Process Review — 2026-08-04

> Status: `PROCESS REVIEW / GIT-MANAGED / NON-CANONICAL / NOT PERMISSION-GRANTING`
>
> Primary owner: PKA

## 1. 目的

本reviewは、N7の最終技術結果とexecution processを分離して記録する。技術結果は[Hosted QA technical result](n7-hosted-qa-technical-result-2026-08-04.md)を正とし、本reviewはそのPASSをtechnical FAILへ読み替えない。

対象はprocess efficiency、evidence handling、runbook遵守と改善点である。新しいarchitecture、Product scope、credential policy、Firewall parameter、Production permissionまたは次operationのpermissionを決めない。

## 2. 結果の分離

| 領域 | 結論 |
|---|---|
| final N7 product behavior | PASS |
| final Hosted QA | PASS |
| process efficiency | improvement required |
| security incident | not confirmed |
| secret exposure | `0` |
| Production impact | `0` |
| unnecessary complexity | occurred |
| final simplified execution | successful |

先行partial run、preflight STOP、controller問題およびparser問題は、最終executionの61-request resultを無効化しない。ただし、次のoperationで同種の無駄やevidence boundary逸脱を繰り返さないための改善入力として保持する。

## 3. Issue history

| ID | issue | technical／operational impact | correction or retained lesson |
|---|---|---|---|
| A | Baseline SQL literal generation error。`\\x27`がquoteへ変換されなかった。 | Hosted POST `0`、DB mutation `0`。 | phase-localに訂正した。 |
| B | CA strict predicateがstandard PEMのtrailing newlineを拒否した。 | source correctionが必要になった。 | outer whitespace normalizationを導入し、validationとTLS verificationを維持した。 |
| C | Firewall read endpoint／parser issue。configVersionの誤用、active endpoint修正、response parser identity extraction issueがあった。 | control-plane読み取りの再確認が必要になった。 | Project-first identityとactive-state read-backを分離して扱う。 |
| D | Build-log operation limit nonconformance。 | authorized `2`に対しactual `4`、excess `2`。mutation `0`、secret exposure `0`。 | operation boundを事前に可視化し、read-only log取得もcountへ含める。 |
| E | Event creator runtime profile discovery issue。 | 既存N5 QA credentialを再利用し、不要なrotationを避けた。 | N5／N7 shared credential lifecycleを明確化した。 |
| F | Probe privilege-model mismatch。 | Event creatorのSELECT権限が`0`なのにaggregate verificationを要求した。 | runtime roleとobserver roleを分けるtwo-credential designを採用した。 |
| G | Runtime／observer connection contract conflation。 | Event creatorのruntime pathとQA control observerの既存connection pathを混同した。 | responsibilityとconnection contractを分離した。 |
| H | Browser target acquisition instability。 | first acquisition failuresとtransient Chrome-control issueが発生した。 | Human preparation不足と即断せず、target acquisitionを独立診断する。 |
| I | Synthetic fixture content transient output。 | synthetic QA valueがobservation outputに一時的に現れた。real user data／secret exposureは`0`。 | evidence handling nonconformanceとして扱い、raw valueをGit-managed recordへ持ち込まない。 |
| J | Scope input trailing newline。 | scoped aggregate evidenceがinvalidになった。 | input normalizationを追加した。 |
| K | Timed execution planning gaps。 | execution surfaceのdry-run不足とunavailable clock APIのassumptionがあった。 | actual-surface POST-0 driver checkを採用した。 |
| L | Generic execution frameworkへの過剰拡張。 | file-backed counters、receipt binding、universal verdict engine、formal misuse-proofingがN7 QA needsを超えた。 | N7 Simple Runbookへ戻し、procedural DevOps ownershipとDoD直接検証を優先する。 |
| M | Controller contract deviation。 | runbook外fieldをcontinuation conditionに追加し、first request 201後に誤停止した。 | exact seven continuation fieldsだけを使用する。 |
| N | Path pattern evidence classification。 | pattern／shapeとactual sensitive valueの区別が必要だった。 | actual pathname、token、fixture content exposureは`0`とし、transient recordはevidence-boundary issueとして扱う。 |

## 4. Root-cause categories

1. **入力・接続境界の明確化不足**: CA predicate、SQL literal、scope input、runtime／observer contract。
2. **実行surfaceの事前確認不足**: browser target、clock capability、controller continuation condition。
3. **boundと責務の過剰化**: read-only operation count、general framework化、runtime roleへ不適切なaggregate proofを要求したこと。
4. **evidence boundaryの扱い不足**: synthetic fixture observationとactual sensitive valueを同列に扱い得たこと。

## 5. Corrective actions and retained rules

1. DoDを直接検証する。
2. QA補助基盤自体を主要成果物にしない。
3. 時間依存testは実行前にdriver、SQL、cleanupを確認する。
4. 実データ漏えいとpattern出力を区別する。
5. read-only診断のlocal parser errorだけでは逐次Humanへ戻らない。
6. credentialごとの責務を先に定義する。
7. 実行roleの権限を確認してprobeを設計する。
8. Humanへ戻すのはauthority、scopeまたはmutation変更時を基本とする。
9. 異常時もfixture cleanupを計画に含める。
10. Simple Runbookにない条件をcontrollerへ追加しない。

## 6. Evidence handling

次のGit外recordはread-only sourceとしてidentityを確認した。各recordのraw contentをGit-managed reportへ複製しない。

| record | SHA-256 | closeoutでの扱い |
|---|---|---|
| `n7-event-creator-runtime-failure-diagnosis-2026-08-04.md` | `667a173d187feba277621cb4ba0883194c9e4f648058e31708336d51d2a84f70` | historical diagnostic |
| `n7-event-creator-runtime-equivalent-preflight-2026-08-04.md` | `35e00cf5534198fd9d4c4344d73d27f85383427b07cd616a82299959394cfb70` | preflight evidence |
| `n7-event-creator-application-equivalent-rollback-probe-2026-08-04.md` | `48174434d22a2b5962bdd4932519e20267e51d4c616b808af13d8467e2139275` | application-equivalent probe |
| `n7-event-creator-runtime-binding-existing-deployment-reconciliation-2026-08-04.md` | `22b8d3cabddbfeebff35ece53c4b8e20b6b0b8650ef45f2a2ffab9a156423eac` | binding reconciliation |
| `n7-hosted-qa-stop-record-2026-08-04.md` | `f8aa38acfa1dbf09fb133f55cba8b897e4028e842c7d8197e1f1658edbd804ef` | earlier STOP record |
| `n7-hosted-qa-recovery-60-accepted-cleanup-2026-08-04.md` | `122c41899a92970eb53373608457188714559b72b3454fbafb7714aa4f8cc51d` | earlier partial execution; final 429 proofには不使用 |
| `n7-timed-429-pre-post-abort-2026-08-04.md` | `7082a61935e77381b3ee26db386a1ee547d231666023693c27296b9f145ae406` | earlier pre-post abort |
| `n7-timed-429-execution-preflight-stop-2026-08-04.md` | `e94e149ab83319fbae4e77d024261df1d746e58f8b25e4c40ae6e2821b19e60b` | later preflight STOP |
| `n7-hosted-qa-final-success-2026-08-04.md` | `29a9fd770402da6268deba1553573ce2e25580a9001ed43a79a67b7f4fde37cf` | final technical source |

final executionとfinal cleanupを別々のartifactとして再構成しない。final success record内のcleanup sectionが、そのexecutionに対応するcleanup evidenceである。

## 7. Out of scope

- source、test、package、migration、credentialまたはFirewallの変更
- final Head acceptance、PR Ready化、main integration、N8開始
- credentialのdelete／rotation／revoke
- Firewall retain／removeの最終disposition
- Productionの確認または操作

## 8. Final process assessment

final N7 product behaviorとfinal Hosted QAはPASSである。一方、process efficiencyには改善が必要であり、N7 QA needsを超える複雑化とcontroller／evidence handlingのnonconformanceが発生した。security incidentは確認されず、secret exposureおよびProduction impactはいずれも`0`である。最終的なsimple executionは成功した。
