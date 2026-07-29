WTV-N5-ENTRY-DECISION-CONTRACT v0.1-draftについて、
以下のexact artifactをHuman adoptionします。

## Contract identity

- Contract ID:
  `WTV-N5-ENTRY-DECISION-CONTRACT`
- Version:
  `v0.1-draft`
- Artifact filename:
  `WTV-N5-ENTRY-DECISION-CONTRACT-v0.1-draft.md`
- SHA-256:
  `95324577e53781eb6d812f76c74383947078c47ee704d5fad78066c0762e2b51`
- Bytes:
  `22,407`
- Lines:
  `552`
- Final newline:
  `あり`
- Baseline:
  `main@bb08b1f05515b9bf86eecd0eb9114287f49fd9b6`

## Exact-SHA review

- Tech Lead:
  `TECH_LEAD_EXACT_SHA_REVIEW_PASS`
- DevOps:
  `DEVOPS_EXACT_SHA_REVIEW_PASS`
- Independent Reviewer:
  `INDEPENDENT_REVIEWER_APPROVED_N5_ENTRY_DECISION_CONTRACT_EXACT_SHA`
- Blocking findings:
  `0`
- Advisory findings:
  `0`

## Human decisions

- D1 dedicated non-Production QA project方式:
  `ADOPT`
- D2 `N5_LAYER2_SQL_EDITOR_CLEAN_CHAIN_V1`:
  `ADOPT`
- D3 `pg@8.22.0`／`@types/pg@8.20.0`:
  `ADOPT`
- D4 exact server-only environment variables 2件:
  `ADOPT`
- D5 short-lived Client、verify-full、exact timeout、retry 0:
  `ADOPT`
- D6 Human-only local credential provisioning lifecycle:
  `ADOPT`
- D7 LF normalization、ECMAScript trim、
  Unicode scalar value count最大1000:
  `ADOPT`
- Error copy:
  `つたえたいことは1000文字までです。`
  `ADOPT`
- Actual resource identityをresource creation recordへ送る:
  `CONFIRM`
- N3のpackage／lockfile ownershipと競合させない:
  `CONFIRM`
- Contract adoptionからimplementation permissionを導出しない:
  `CONFIRM`

## Human adoption

- Decision:
  `ADOPTED`
- Human decision owner:
  `kcyth39`
- Decision time:
  `2026-07-29 21:07 JST`
- Timestamp precision:
  `minute`
- Authoritative decision event:
  `このHuman message`
- Adopted artifact SHA:
  `95324577e53781eb6d812f76c74383947078c47ee704d5fad78066c0762e2b51`

## Lifecycle

`ENTRY DECISIONS ADOPTED / NOT IMPLEMENTATION AUTHORIZED`

## Authorization boundary

- N5 implementation authorization:
  `NONE`
- Resource creation authorization:
  `NONE`
- Dependency addition authorization:
  `NONE`
- QA project creation authorization:
  `NONE`
- Role／password／credential authorization:
  `NONE`
- DB／SQL authorization:
  `NONE`
- Supabase authorization:
  `NONE`
- Vercel authorization:
  `NONE`
- Git publication authorization:
  `NONE`
- Production authorization:
  `NONE`

このadoptionから、次を開始しません。

- `pg`／`@types/pg`の追加
- `package.json`／`package-lock.json`変更
- N5実装
- QA project作成
- evidence root permission変更
- migration replay
- role／credential作成
- DB接続
- Vercel Preview binding
- Production操作

次の各operationは、個別のHuman gateで判断します。

- `N5_DURABLE_EVIDENCE_ROOT_REPAIR`
- `N5_LAYER2_QA_PROJECT_CREATION`
- `N5_DEPENDENCY_AND_IMPLEMENTATION_AUTHORIZATION`
- `N5_LOCAL_ROLE_CREDENTIAL_PROVISIONING`
- `N5_LAYER2_MIGRATION_REPLAY`
- `N5_LAYER2_ROLE_CREDENTIAL_PROVISIONING`
- `N5_LAYER2_PREVIEW_BINDING`
- `N5_LAYER2_RETIREMENT`
