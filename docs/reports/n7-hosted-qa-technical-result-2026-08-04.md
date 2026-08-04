# N7 Hosted QA Technical Result — 2026-08-04

> Status: `TECHNICAL RESULT RECORD / GIT-MANAGED / PREVIEW-ONLY / NOT PERMISSION-GRANTING`
>
> Primary owner: PKA
>
> Final technical verdict: `N7_HOSTED_QA_PASS_FIXTURES_CLEANED`

## 1. 目的と境界

本記録は、N7 Event Creation Abuse Protectionの最終Hosted QAについて、技術結果だけを一意に保持する。実行過程の非効率やnonconformanceは[別のprocess review](n7-execution-process-review-2026-08-04.md)を参照する。

本記録はHumanの最終Head acceptance、N7 slice close、PR Ready化、main integration、N8開始、credential操作、Firewall操作またはProduction操作を許可しない。

## 2. Primary evidence

最終Hosted QAのprimary sourceは、Git外の次のsecret-free evidence artifactである。

| 項目 | 値 |
|---|---|
| path | `/private/tmp/n7-hosted-qa-final-success-2026-08-04.md` |
| SHA-256 | `29a9fd770402da6268deba1553573ce2e25580a9001ed43a79a67b7f4fde37cf` |
| execution ID | `d316cae88088442581ecb911f89ad16c` |
| deployment | `dpl_4cWWhNvCXW8mqvtaSZUuLo5PycJ4` |
| branch | `codex/n7-event-creation-abuse-protection` |
| commit | `93f75d1673bd97a017fd62be6cb9314360bdb208` |
| environment | Preview |
| Production operation | `0` |

同artifactは実行前baseline、timed Hosted QA、client observation、DB aggregate、cleanup ROLLBACK／COMMIT、cleanup後postcheckを一つのexecutionとして記録する。raw credential、Cookie、token、actual pathname、request／response body、fixture title／memo、raw DB rowは保持しない。

先行する`n7-hosted-qa-recovery-60-accepted-cleanup-2026-08-04.md`（SHA-256 `122c41899a92970eb53373608457188714559b72b3454fbafb7714aa4f8cc51d`）は、61件目を送信しなかった別executionのpartial recordである。本最終結果の429 proofへ再利用しない。詳細はprocess reviewに分離する。

## 3. Qualified PreviewとFirewall semantics

final evidence artifactは、exact Preview deployment／branch／commit、branch-specific QA variables `4 / 4`、authenticated browser targetおよびPOST-0 driver checkをPASSとして記録する。

Humanが指定したactive N7 rule identityは`waf_CVi8hwpbhFuk`である。`/private/tmp/n7-event-creator-runtime-binding-existing-deployment-reconciliation-2026-08-04.md`（SHA-256 `22b8d3cabddbfeebff35ece53c4b8e20b6b0b8650ef45f2a2ffab9a156423eac`）は、exact N7 Preview rule verificationとして、active configuration identityがauthorized identityとmatchしたこと、custom rule `1`／unrelated custom rule `0`をsanitizedに記録する。raw rule IDは同artifactへ保持しない。

対象ruleはPreview-onlyの`POST /api/events`であり、IP、fixed window、600 seconds、threshold 60、超過時HTTP 429というsemanticsである。これはregion-scopedなoperational mitigationであり、global exact quota、per-user allowanceまたはProductionの挙動を保証しない。

## 4. Timed Hosted QA

| 観測項目 | 結果 |
|---|---:|
| Hosted POST | `61` |
| HTTP 201 | `60` |
| HTTP 429 | `1` |
| other | `0` |
| unknown | `0` |
| elapsed | `90726 ms` |
| retry | `0` |
| request 61 | HTTP 429 |

この結果は、同一のclean QA DB baselineから開始した最終executionのaggregateである。regionをまたぐ挙動、別deployment、任意のHTTP 429のrule provenanceまたはglobal quotaは、この結果から主張しない。

## 5. 429 client behavior

final evidence artifactは、61件目で次を記録する。

- canonical error copy displayed: `true`
- title draft retained: `true`
- memo draft retained: `true`
- navigation occurred: `false`
- automatic retry observed: `false`
- N6 history mutation observed: `false`
- unexpected share lookup observed: `false`

source／test reviewも、HTTP 429をbody parse前に分類し、response bodyを表示せず、draft、navigation、automatic retry、N6 historyを変更しないことを補助的に裏付ける。これはsource-levelおよびmock QAの確認であり、live rule provenanceを単独で証明するものではない。

## 6. QA DB aggregateとrejected request delta

cleanup前のaggregateは次のとおりである。

| 項目 | 結果 |
|---|---:|
| Event | `60` |
| default Criterion | `60` |
| Event／Criterion mismatch | `0` |
| other business rows | `0` |
| request 61 Event delta | `0` |
| request 61 Criterion delta | `0` |

このrecordはfull CRUD coverageを主張しない。N7の対象であるEvent creation、rejected requestのrow delta、default Criterion atomicityに限る。

## 7. Fixture cleanup

final evidence artifactは、exact execution scopeに対して次を記録する。

| 項目 | 結果 |
|---|---:|
| ROLLBACK verification | PASS |
| temporary Event delete | `60` |
| ROLLBACK restoration | Event `60`／Criterion `60` |
| COMMIT | PASS |
| COMMIT count | `1` |
| cleanup retry | `0` |
| final QA DB | all eight business tables `0` |

cleanupはfinal executionのfixtureだけを対象とし、Production operationは`0`である。

## 8. Source correctionとの関係

final HeadのCA normalization correctionは、Humanが`N7_HOSTED_QA_DISCOVERED_FOCUSED_RUNTIME_CORRECTION`としてN7 closeout scope内に採用した。

- changed paths: `src/lib/event-creator-db-contract.ts`、`tests/event-creator-db.spec.ts`
- outer CA whitespaceだけをnormalizeする
- PEM bodyとinternal newlines、header／footer validation、NUL rejection、TLS verificationを維持する
- Product scope、Firewall architecture、threshold／window、credential policy、Production permission、N5〜N9 topologyを変更しない

これはPlan本文のrewriteではない。lifecycle上の扱いは[closeout status addendum](n7-closeout-lifecycle-addendum-2026-08-04.md)を正とする。

## 9. Static QA evidence-retention boundary

Humanが確認したfinal implementation Head `93f75d1673bd97a017fd62be6cb9314360bdb208`のstatic QA summaryとして、CA contract tests `8 / 8 PASS`、N7 HTTP 429 focused tests `10 / 10 PASS`、`npm run check`、`npm run build`、`git diff --check`のPASSを記録する。これはC1 DB-independent／CA focused validationの範囲であり、Hosted QA、global quotaまたはProduction全体の回帰を証明するものではない。closeout docs-only descendant `a90f49ff812418e1ef95bd9c79fbc5794aa8ce30`は、これらのcommandを再実行したとは主張しない。

Exact raw terminal-output artifact was not retained as an independent closeout artifact. This record preserves the Human-confirmed summary only; it does not claim byte-level output verification or a rerun.

これはnon-blockingのevidence-retention limitationであり、raw terminal outputの再構成、rerunまたは新しいartifact作成を許可しない。

## 10. Remaining technical limitations

- 観測はexact Preview deployment上のregion-scoped、fixed-window resultであり、global exact quotaを意味しない。
- full CRUD coverageは本executionの対象外であり、主張しない。
- HTTP status classifier単独では、任意の429をselected Firewall ruleへ帰属しない。
- Hosted QA PASSはN7 final Head acceptance、main integration、N8／N9開始またはProduction operationを意味しない。

## 11. Technical verdict

`N7_HOSTED_QA_PASS_FIXTURES_CLEANED`
