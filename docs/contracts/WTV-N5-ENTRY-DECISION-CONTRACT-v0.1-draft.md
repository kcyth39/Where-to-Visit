# WTV-N5-ENTRY-DECISION-CONTRACT v0.1-draft

## 1. Task identity

- Contract ID: `WTV-N5-ENTRY-DECISION-CONTRACT`
- Version: `v0.1-draft`
- Status: `PROPOSED / NOT ADOPTED / NOT IMPLEMENTATION AUTHORIZED`
- Primary owner: PKA
- Technical reviewer: Tech Lead
- Operational reviewer: DevOps
- Independent reviewer: Independent Reviewer
- Decision／adoption authority: Human
- Primary responsibility: 採用済みN4を変更せず、N5実装開始前に必要なenvironment／connection／validation decisionを固定する

本Contractのreviewまたはadoptionは、N5実装、dependency追加、project／role／credential作成、DB接続、Vercel binding、Git publicationを許可しない。

## 2. Fresh baseline

| Item | Confirmed state |
|---|---|
| Repository | `/Users/shige/Projects/Where-to-Visit` |
| Branch | `main` |
| HEAD | `bb08b1f05515b9bf86eecd0eb9114287f49fd9b6` |
| fresh `origin/main` | 同一 |
| Ahead／behind | `0 / 0` |
| Working tree／index | clean |
| Staged／untracked | 0／0 |
| Index lock | なし |
| `AGENTS.md == CLAUDE.md` | PASS |

Read-only外部確認:

- Supabase organization: `Oparea`、ref `uunmfrhopjrpxlmgezko`、Free plan
- 確認できたactive project: `where-to-visit-dev`
- Production-serving project ref: `ehmivhmsnhcrynvuahaq`
- Vercel project: `where-to-visit-kimenosuke`
- 現在のSupabase–Vercel automatic integration: 未導入
- `SUPABASE_URL`／`SUPABASE_ANON_KEY`はPreview／Productionに存在するが、値は取得・表示していない

Free planはOwner／Adminとして関与する組織を横断してactive project 2件までで、inactiveなFree projectはpauseされ得るため、作成直前のcapacity／health再確認を必須とする。[Supabase billing](https://supabase.com/docs/guides/platform/billing-on-supabase)、[Free project pausing](https://supabase.com/docs/guides/platform/free-project-pausing)

## 3. N4 Contract／adoption identity

- [N4 reviewed Contract](/Users/shige/Projects/Where-to-Visit/docs/contracts/WTV-N4-OWNERLESS-TRANSITION-CONTRACT-v0.7-rebaselined-draft.md:1)
  - SHA-256: `3abf083fba34a0df1afbc4498eae9965803f35be583f9804494b7f41af9b813a`
- [N4 Human adoption record](/Users/shige/Projects/Where-to-Visit/docs/contracts/WTV-N4-OWNERLESS-TRANSITION-CONTRACT-v0.7-human-adoption-form.md:1)
  - SHA-256: `102e7ed044ca13a0cc7c1a7b264fd866baeb126187fb65d941c21c419fd8bb42`
- N4 lifecycle: `ADOPTED / NOT IMPLEMENTATION AUTHORIZED`
- N5 lifecycle: `ENTRY DECISIONS PENDING / NOT IMPLEMENTATION AUTHORIZED`

維持するN4 decisions:

- dedicated non-Production QA project
- dedicated least-privilege role
- candidate role `kimenosuke_event_creator`
- internal identifier `memo`
- normalized memo maximum `1000文字`
- `service_role`不採用
- Production project／credential不使用

## 4. Authority／responsibility map

| Responsibility | Owner |
|---|---|
| N4決定の意味 | Human／採用済みN4 |
| 7 entry decisionsの統合 | PKA |
| driver／connection／memo／replay技術成立性 | Tech Lead |
| project／binding／credential／retirement | DevOps |
| Contract完備性・permission境界 | Independent Reviewer |
| Contract adoption | Human |
| resource作成・credential設定・Vercel操作 | Humanの別gate |
| N5 implementation／dependency追加 | Humanの別Contract／gate |
| N3 dependency patch | N3 task owner。N5とpackage／lockfileを同時所有しない |

## 5. D1 — QA project decision

### Proposed decision

| Field | Decision |
|---|---|
| Target type | `DEDICATED_NON_PRODUCTION_LAYER2_QA` |
| Proposed display name | `where-to-visit-qa` |
| Organization | `Oparea` |
| Region policy | Productionと同じ`ap-northeast-1` |
| Database | `postgres` |
| Human owner／cost owner | `kcyth39` |
| Lifecycle | Layer 2作成からfinal `H` regression・cleanup・evidence移管完了まで |
| Retirement | Human-only。pause／deleteは実planと保持要件から別途選択 |
| Preview binding | exact N5 branchだけへのmanual binding |
| Automatic integration | 新規有効化しない |
| Production credential | 使用0 |

現在確認できるactive projectが1件であるためFree枠1件が候補だが、member横断limit、quota、costを作成直前にfresh確認する。paid plan／追加costが必要なら自動承認せずSTOPする。

### Resource creation後に固定するidentity

`N5_LAYER2_QA_PROJECT_CREATION_RECORD`へ次をsecret-freeで記録する。

- project ref
- REST／Data API host
- Shared Supavisor transaction host／port
- database／region
- project owner／creation time
- CA取得元とSHA-256
- anon keyは値ではなくsecret-manager／binding version identity
- Data APIおよび外部surfaceの有効状態
- Production ref／hostとの不一致
- active-project count／plan／cost approval
- exact Preview branch／deployment
- automatic integrationが未導入である証拠
- retirement deadline／operator

Productionとの分離を証明できない、regionを選択できない、Free capacityまたはcostが不明なら作成を停止する。

## 6. D2 — Replay method decision

### Proposed decision

Replay identity:

`N5_LAYER2_SQL_EDITOR_CLEAN_CHAIN_V1`

方法:

1. Humanがexact dedicated QA projectをSQL Editorで選択する。
2. Production refとの不一致、business row 0、target schema状態をread-only確認する。
3. N5 candidate Headのtracked migration全件について、relative path、byte count、SHA-256、順序をimmutable manifestへ固定する。
4. Humanが各file全文を変更せずtimestamp順にexact 1回実行する。
5. execution count、operator、timestamp、結果をexternal replay ledgerへ記録する。
6. automatic retryは0。
7. 最初の失敗でtargetをtaintedとして停止し、残りmigration、repair、再実行を行わない。
8. 成功後にschema／role／GRANT／RLS fingerprint、UTF-8、business row 0をread-only確認する。
9. credential provisioning、Preview binding、runtime QAは後続の独立gateとする。

External ledgerは`supabase_migrations.schema_migrations`の同期とは主張しない。

禁止:

- `supabase link`
- remote `db push`
- remote `--db-url`
- migration history repair
- current Production wrapperの読み替え
- Production credential
- automatic retry

DB内部のSupabase migration historyが必須になった場合は、本方式を変更せずSTOPし、target-specific wrapper／authorityを別Contractへ戻す。

## 7. D3 — Driver／version decision

| Driver | Candidate version | Strength | Risk | Required spike | Recommendation |
|---|---:|---|---|---|---|
| `pg` | `8.22.0` | timeout／SSL／parameter bindingが明示的。Node／Vercelで運用資料が豊富 | 型packageが別。接続ごとのTLS cost | LocalとLayer 2で接続、SSL、timeout、role privilege、latencyを確認 | **推奨候補** |
| `postgres` | `3.4.9` | 型同梱、`prepare:false`が明示的 | client-side query timeoutと今回のfailure classificationが`pg`より弱い | 非推奨候補のため実施しない | 非推奨候補 |

`pg@8.22.0`／`@types/pg@8.20.0`をHuman adoption候補とする。

Human adoption候補としての成立条件:

- implementation開始時にnpm registry、公式document、security advisoryをfresh確認
- version drift時は無断で新versionへ置換しない
- `package.json`／lockfile変更はN5 implementationの別Human gate
- N3がpackage／lockfileを所有中ならN5は同pathへ触れず停止
- N5 publication時に変更後lockfileのdependency auditを再実行

## 8. D4 — Environment variable decision

Exact names:

- `KIMENOSUKE_EVENT_CREATOR_DATABASE_URL`
- `KIMENOSUKE_EVENT_CREATOR_DATABASE_CA_PEM`

境界:

- 両方server-only。`NEXT_PUBLIC_`禁止
- generic `DATABASE_URL`へのfallback禁止
- `SUPABASE_URL`／`SUPABASE_ANON_KEY`の流用禁止
- URLはcredentialを含むsecretとして、ログ、error、report、artifactへ出力しない
- CAはtarget固有identityとしてSHAを確認する
- URLに`sslmode`、`sslrootcert`、`sslcert`、`sslkey`が1件でも含まれた場合、Client生成前にSTOP
- SSL設定はCA PEMと`rejectUnauthorized: true`だけから構成する
- unset／empty／target mismatchはfail-closed

Environmentごとの値:

| Environment | URL | CA | Status |
|---|---|---|---|
| Local | exact localhost role credential | 不使用、SSL false | 後続local provisioning gate |
| Preview | QA project専用 | QA project専用CA | exact branch manual binding |
| Production | Previewと別credential | Production専用CA | N9まで未設定・未許可 |

Vercel環境変数の変更は新しいdeploymentにのみ反映されるため、binding／rotation／removal後はsource SHAを固定した新deploymentで確認する。[Vercel environment variables](https://vercel.com/docs/environment-variables/managing-environment-variables)

## 9. D5 — Connection settings decision

### Runtime

- Node.js 24
- driver: `pg@8.22.0`
- application-side Pool: 0
- connection lifecycle: Event作成ごとにshort-lived `pg.Client`
- endpoint: Shared Supavisor transaction mode、port `6543`
- database: `postgres`
- expected user: `kimenosuke_event_creator.<project-ref>`
- actual endpoint／usernameはproject creation recordでDashboard値と照合

Supabaseはserverless用途にtransaction mode `6543`を案内し、このmodeではprepared statementを無効にするよう求めている。[Supabase connection modes](https://supabase.com/docs/guides/database/connecting-to-postgres)

### Exact Client settings

| Setting | Value |
|---|---:|
| `connectionTimeoutMillis` | `5000` ms |
| `lock_timeout` | `1000` ms |
| `statement_timeout` | `5000` ms |
| `query_timeout` | `7000` ms |
| `idle_in_transaction_session_timeout` | `5000` ms |
| `application_name` | `kimenosuke-event-creator` |
| `client_encoding` | `UTF8` |
| automatic retry | `0` |

`query_timeout`はclient-side待機上限であり、network timeoutやDB rollback保証とは扱わない。query dispatch後のtimeout／切断は`OUTCOME_UNKNOWN`とし、自動再試行しない。

### SSL

```text
ssl = {
  ca: exactTargetCaPem,
  rejectUnauthorized: true
}
```

- CA／hostname検証を行う`verify-full`相当
- `rejectUnauthorized: false`禁止
- CA取得不能・SHA不一致・hostname検証失敗時はSTOP
- `require`への自動downgrade 0

Supabaseは`require`ではCA／hostnameを検証しないと説明し、`verify-full`利用時にはproject CAを必要としている。[Supabase SSL enforcement](https://supabase.com/docs/guides/platform/ssl-enforcement)

### SQL boundary

- query `name`: 0
- SQL `PREPARE`／`EXECUTE`: 0
- ORM／cursor／custom submittable: 0
- static SQL text＋`values` parameter binding必須
- value interpolation: 0
- exact shape: `INSERT events(title, memo, share_token)`
- `RETURNING`: 0
- Event＋default Criterionは既存triggerのatomicityを使用
- Clientは`finally`で必ず`end()`

`pg`はquery configへ`name`を指定した場合にprepared statementを作るため、`name`自体を禁止する。[node-postgres Client API](https://node-postgres.com/apis/client)

### Request failure

- evidenceはtarget alias、phase、stable error category、driver versionだけ
- URL、password、CA本文、SQL values、share token、raw driver error／stackは記録しない
- `OUTCOME_UNKNOWN`時のcandidate user copy:

  `作成結果を確認できませんでした。自動では再試行していません。もう一度作ると別の「きめたいこと」が作成される場合があります。`

Connection overheadがLayer 2で受容不能なら、Poolを追加せずContract repairへ戻す。

## 10. D6 — Local credential decision

### Proposed decision

- role: `kimenosuke_event_creator`
- password: local stack generationごとに32 random bytesをbase64url化
- deterministic credential: 不採用
- Production／QA password流用: 0
- role DDL／GRANT／RLS: migration-owned
- password provisioning: Human-owned
- runbook identity: `N5_LOCAL_ROLE_CREDENTIAL_PROVISIONING_V1`
- profile: `.env.n5-event-creator.local`
- profile format: exact 1 key  
  `KIMENOSUKE_EVENT_CREATOR_DATABASE_URL`
- regular file、non-symlink、current user owner、mode `0600`
- Git保存、shell history、report、artifactへの値出力: 0

Local reset後はroleがpasswordなしで再構築され、旧profileはstaleとして扱う。

Rotation／reset順序:

1. existing profile／role identityをread-only分類
2. `EEXIST`、mismatch、staleなら自動上書き・削除せずSTOP
3. Humanがexact profile dispositionを別gateで承認
4. old credentialをrevokeし、old login拒否を確認
5. exact validated profileだけをHuman gateで除去
6. fresh random credentialを対話入力でprovision
7. no-replace／exclusive createで新profileを作成
8. secret-free login postcheck

Agentが実施できるのは、将来のN5 implementation Contractが明示したlocalhost-only wrapperとread-only postcheckだけ。QA／Production credential操作はHuman-onlyとする。

## 11. D7 — Memo counting rule decision

### Exact normalization

1. missing fieldはmutationなし
2. explicit inputの`CRLF`とlone `CR`を`LF`へ変換
3. Node 24のECMAScript `String.prototype.trim()`と同じ境界文字を除去
4. emptyなら`NULL`
5. NFC／NFKCその他のUnicode normalizationは行わない
6. unpaired surrogateをserver dispatch前に拒否
7. normalized Unicode scalar value数を数える
8. maximumは`1000`

Trim対象は次のexact集合とする。

- U+0009、U+000B、U+000C、U+0020、U+00A0、U+1680
- U+2000–U+200A、U+202F、U+205F、U+3000、U+FEFF
- line terminator U+000A、U+000D、U+2028、U+2029

locale依存regexやPostgreSQLの素の`btrim()`だけへ委ねない。

### Count semantics

- UI／server: shared helperによるUnicode scalar value count
- JS `.length`: 不採用
- UTF-8 bytes: 不採用
- grapheme cluster: 不採用
- DB: 同一normalization functionを通したstored valueに`char_length(memo) <= 1000`
- stored valueがnormalized formであること、CRがないこともDBで検証

例:

| Input | Count |
|---|---:|
| `😀` | 1 |
| precomposed `é` | 1 |
| `e`＋combining acute | 2 |
| variation selector | 独立1 code point |
| `👨‍👩‍👧‍👦` | 7 |
| internal LF | 1 |

UIはnormalized countを`n / 1000`で表示する。HTML `maxlength=1000`はUTF-16 unit基準になり得るため、authoritative validationとして使用しない。

Error copyの決定ownerはHuman／Product。採用候補:

`つたえたいことは1000文字までです。`

Minimum test:

- 0／1／1000／1001
- trim前後1000／1001
- whitespace-only→`NULL`
- CRLF／CR／LF
- astral emoji
- combining sequence
- variation selector
- ZWJ sequence
- unpaired surrogate拒否
- UI／server／DB verdict一致

PostgreSQLの`char_length`はbyte数ではなく文字数を返す。[PostgreSQL string functions](https://www.postgresql.org/docs/current/functions-string.html)

## 12. Tech Lead findings

Final assessment: `PASS`

- `pg@8.22.0`／`@types/pg@8.20.0`を推奨
- application Poolではなくsingle short-lived Clientを推奨
- exact timeout、`OUTCOME_UNKNOWN`、retry 0を承認
- CA／hostname検証とprepared statement禁止を承認
- SQL Editor clean-chain方式を技術的に成立可能と判定
- memo normalization／scalar count／DB parityを承認
- `lock_timeout < statement_timeout < query_timeout`を確認

Advisory:

- connection overheadはLayer 2で測定する
- Poolが必要なら実装中に追加せずContract repairへ戻す

## 13. DevOps findings

- dedicated QA target lifecycle: 成立
- manual branch-scoped Preview binding: 成立
- automatic integration未導入／新規有効化なし: PASS
- Human-only SQL Editor replay＋external ledger: 成立
- credential separation／rotation／revocation: 成立
- retirementはfinal regression後: PASS
- project capacity／cost／actual identityはresource creation gateでfresh確認
- resource／external mutation: 0

Known operational precondition:

`/Users/shige/Projects/Where-to-Visit-Evidence/N4-ownerless-transition`はowner `shige`だが現在mode `0755`で、採用済みN4の`0700`要件を満たさない。

これはContract draftのblockerではないが、replay evidenceを書き込む前にHuman承認の是正とfresh `lstat`が必須。

## 14. Independent Reviewer findings

Preliminary findings:

1. query timeoutとnetwork outcomeの混同
2. memo normalizationのUI／server／DB差
3. local profile rotationのno-replace lifecycle不足
4. connection URIによるSSL object上書き経路

すべて本文へ反映済み。

Final verdict:

`N5_ENTRY_DECISION_CONTRACT_READY_FOR_HUMAN_REVIEW`

- Blocking findings: 0
- N4 consistency: PASS
- N3 ownership separation: PASS
- Seven decisions completeness: PASS
- New implementation/resource permission: 0
- STOP／Human gate: PASS

`check-execution-contract`によるinspectionでもblocking finding 0。SkillはContract adoption、repair、permission、実装を生成していない。

## 15. Resource creation gates

| Gate | Operation | Authority |
|---|---|---|
| `N5_ENTRY_DECISION_CONTRACT_ADOPTION` | 本7 decisionsの採用 | Human |
| `N5_DURABLE_EVIDENCE_ROOT_REPAIR` | evidence rootを承認条件へ是正 | Human |
| `N5_LAYER2_QA_PROJECT_CREATION` | project作成とidentity record | Human |
| `N5_DEPENDENCY_AND_IMPLEMENTATION_AUTHORIZATION` | `pg`追加とN5実装 | Human |
| `N5_LOCAL_ROLE_CREDENTIAL_PROVISIONING` | local password／profile | Human |
| `N5_LAYER2_MIGRATION_REPLAY` | SQL Editor clean-chain | Human |
| `N5_LAYER2_ROLE_CREDENTIAL_PROVISIONING` | QA role password | Human |
| `N5_LAYER2_PREVIEW_BINDING` | exact Preview branch env binding | Human |
| `N5_LAYER2_RETIREMENT` | unbind、revoke、pause／delete | Human |

Production credential／bindingはN9以降の別Contractであり、本表から許可されない。

## 16. Human adoption form

Human review時の採用対象:

- [ ] D1: `where-to-visit-qa`を候補とするdedicated non-Production project方式
- [ ] D2: `N5_LAYER2_SQL_EDITOR_CLEAN_CHAIN_V1`とexternal ledger方式
- [ ] D3: `pg@8.22.0`／`@types/pg@8.20.0`
- [ ] D4: exact 2 environment variables
- [ ] D5: short-lived Client、verify-full、exact timeout、retry 0
- [ ] D6: Human-only random local credential provisioning lifecycle
- [ ] D7: LF＋ECMAScript trim＋Unicode scalar count 1000
- [ ] Error copy候補を採用
- [ ] Actual resource identityはproject creation recordへ送る
- [ ] N3 package／lockfile ownershipと競合させない
- [ ] Contract adoptionからimplementation permissionを導出しない

Adoption metadata:

- Decision: `ADOPTED`／`CHANGES REQUESTED`
- Human decision owner:
- Decision date／timezone:
- Adopted artifact identity:
- N5 implementation authorization: `NONE`
- Resource creation authorization: `NONE`
- Dependency addition authorization: `NONE`
- DB／Supabase／Vercel authorization: `NONE`

Human adoption後のlifecycle候補:

`ENTRY DECISIONS ADOPTED / NOT IMPLEMENTATION AUTHORIZED`

## 17. DoD

- 7 decisionsが一意
- N4 adopted decisionsを変更していない
- actual resource identityと方式decisionを分離
- Production target／credential利用0
- replay exact once／retry 0
- DB内部migration historyを過大主張しない
- driver／types version pinned
- implementation開始時freshness gateあり
- exact server-only env名とscope
- verify-full相当、downgrade 0
- prepared statement 0、parameter binding維持
- local credential lifecycleがno-overwrite
- memo UI／server／DB parityが判定可能
- N3 ownershipとpackage path競合0
- Human resource gatesが分離
- N5 implementation authorization 0

## 18. QA

Design-only QA:

- baseline／N4 SHA: PASS
- seven decisions mapping: PASS
- Tech Lead: PASS
- DevOps: blocking finding 0
- Independent Reviewer: PASS
- Contract quality inspection: blocking finding 0
- authority／permission分離: PASS
- N3 ownership分離: PASS
- secret値出力: 0
- repository／Git／dependency変更: 0
- Supabase／DB／Vercel mutation: 0
- final repository state: clean、`0 / 0`
- `AGENTS.md == CLAUDE.md`: PASS
- index lock: なし

Implementation時のQAは各decision内のtest／postflightへ従う。今回test script、connection proof、resource creationは実行していない。

## 19. STOP conditions

次のいずれかでN5実装またはresource gateを停止する。

- N4との矛盾
- QA targetとProductionの分離証明失敗
- project capacity／cost／owner不明
- `service_role`、Production credential、RLS bypassが必要
- automatic integrationが必要
- replayに`link`／`db push`／history repairが必要
- DB内部migration historyが必須
- N3がpackage／lockfileを所有中
- driver version driftを無断採用する必要
- CA取得／hostname検証失敗
- SSL query parameterがURLへ混入
- prepared statement、value interpolation、automatic retryが必要
- timeout後の`OUTCOME_UNKNOWN`を安全に扱えない
- local credentialをsecret-freeにprovisionできない
- stale profileの自動上書き／削除が必要
- UI／server／DBのmemo verdict不一致
- hosted DBがUTF-8でない
- durable evidence rootが`0700`条件を満たさない
- repository／resource mutationなしではContract reviewを続けられない

## 20. Permission boundary

このturnで許可・実施したのはread-only調査、focused review、Contract draft作成だけ。

| Operation | Count／permission |
|---|---|
| Repository file change | 0 |
| Stage／commit／push／PR | 0 |
| Package／lockfile change | 0 |
| Dependency install | 0 |
| QA project create | 0 |
| Role／password／credential create | 0 |
| DB connection／SQL | 0 |
| Vercel env／deployment change | 0 |
| Supabase integration change | 0 |
| N3 execution | 0 |
| N5 implementation | 0 |
| Production operation | 0 |

## 21. Verdict

`N5_ENTRY_DECISION_CONTRACT_READY_FOR_HUMAN_REVIEW`

Actual QA project ref、endpoint、CA、Data API state、Preview branch identityは、project未作成のため意図的に未確定です。方式とresource creation recordは一意化されているため、これらはContract不備ではなく次のHuman gateです。

次はHumanによる本Contractの採用判断です。採用されてもN5実装またはresource作成へ自動的には進みません。
