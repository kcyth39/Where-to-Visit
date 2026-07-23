# きめのすけ Slice 5 Supabase権限・変更管理基盤 詳細開発プロセス（2026-07-22）

- lifecycle: **Process Contract PR merge前 = PROPOSED / NOT EFFECTIVE**、**Human merge後 = APPROVED / EFFECTIVE / PROCESS DEFINITION ONLY**
- 上位Mission: [`pka-slice-5-supabase-governance-mission-and-dod-2026-07-20.md`](./pka-slice-5-supabase-governance-mission-and-dod-2026-07-20.md)
- 作成目的: 上位MissionのA〜F相当を、有限なExecution Contract、要件、DoD、QA、Human gateへ分解する
- PG-01 baseline: `main@4bdf5701b4b5bb80c9636c8026f4421f52258cd9`。既存review済みProcess input SHA-256 `9f6ed1aded70854d97687a0f620fb472201e802eb5a5511b6972030e04901f1e`を内容単位で再適用し、Minimal Process Amendmentとcurrent state更新を分離してreviewする
- 内容責任: Human（目的、risk、cost、承認）／Tech Lead（技術成立性）／DevOps（外部設定、credential、運用安全性）
- lifecycle・構造責任: PKA

> **NO EXECUTION AUTHORIZATION**
>
> 本書はProcess Contract PR merge前は詳細開発プロセスの提案であり、Human merge後はSlice 5の実行順、依存、Gate DoD、PR境界を定義するProcess Contractとなる。いずれの状態でも、Supabase、DB、Docker、GitHub settings、credential、MCP、Staging、Production、Git publicationを変更・実行する権限を付与しない。各sub-sliceは、採用済みExecution Contractと、そのGateに対応するHumanの明示承認を必要とする。

## 0. Authorityと利用境界

1. 上位MissionはGoal、導入要件`SUP-I01〜SUP-I14`、最終要件`SUP-F01〜SUP-F11`、Human判断`SD-01〜SD-12`の正本である。
2. 本書はMissionの意味を変更せず、実施順、依存関係、有限な成果物、検証方法を定義する。
3. 現行運用は最新`main`の`AGENTS.md`／`CLAUDE.md`、ADR-0008、`docs/05_dod.md`、`docs/06_qa-flow.md`、Supabase関連Skill／referenceを優先する。
4. 本書と現行運用の差は将来の変更候補であり、個別sliceのHuman承認とmergeまたは外部設定受入まで発効しない。
5. 過去のA2 v1〜v4汎用Catalog Comparator artifactは、scope拡張の経緯を示す`SUPERSEDED / DO NOT EXECUTE` evidenceである。SQL、review PASS、実行authorityを新契約へ継承しない。
6. private evidenceは内容を公開資料へ転載しない。公開側はidentity、hash、保護状態、review結果、gate結果、retentionだけを記録できる。
7. Mission §12.1の段階配賦は本書単独の解釈ではない。Mission §12.1改訂と本書を同じProcess Contract PRの同一exact Headへ含め、Missionの条件表をauthority、本書のGate対応表を実行traceabilityとして扱う。
8. 同じPRでMission改訂が承認・mergeされない場合、本書は`PROPOSED / NOT EFFECTIVE`の提案資料に留まり、PG-02以降の実行順または開始根拠として使用しない。低risk pilot候補の確定は、改訂後Missionと本書が発効した後もProduction経路前のPilot Candidate Gateで別途行う。
9. A1 bootstrapはProcess採用前の履歴入力として完了した。PR #17 actual merge commitは`4bdf5701b4b5bb80c9636c8026f4421f52258cd9`、PG-00P0は`NOT_APPLICABLE_BY_PATH_ABSENCE / Confirmed`、PG-00P1は`EXPECTED_APP_DEPLOYMENT / Confirmed`、PG-00P2は`PASS`である。これらはPG-01のbaseline evidenceであり、PG-02以降のauthorizationではない。PG-01はこのmerge commitの最新`main`から専用branch／worktreeを作り、review済みProcess input、Minimal Process Amendment、current state更新を区別して再baseline化する。
10. 2026-07-23のHuman判断により、現行Vercel Production Git-triggerを維持する。通常publicationのmerge後application側PASSは、actual merge commitをsourceとするdeploymentがexact 1件、READY／Current、期待alias／domain一致、環境設定・aliasの想定外差分0である`EXPECTED_APP_DEPLOYMENT / Confirmed`とする。deployment 0件、複数件、別source commit、failed／stale、想定外のsettings／alias delta、Unknownは停止する。この判断はVercel settings変更、manual deploy、redeploy、AC5-A実行を承認しない。

### 0.1 Authority hierarchyとDoD-first

authorityは文書名やstatusではなく、内容が担う役割により次の順で解釈する。ADR、Skill、その他の正本も一律の層へ固定しない。

1. `AGENTS.md`／`CLAUDE.md`、repository-wideのauthority・安全・role規則、Global Hard Constraints。
2. Human承認済みGoal／Mission／要件／DoD、適用domainの成果・安全要件。
3. Execution Contract／Process／Gate／task-specific Hard Constraints。
4. QA／evidence／runbook。

下位層は上位層を具体化できるが、上位根拠のないGoal、DoD、成果物、証拠、承認、禁止を追加または緩和しない。Process／QAが上位DoDを超える場合は追加の仕組みで補完せず、Process defectとして扱う。

Gate／QAの開始前に、閉じる上位DoD、直接必要性、既存evidenceの再利用可否、`AGENTS.md`／`CLAUDE.md`との整合を確認する。Process／QAを満たすこと自体を目的にせず、実platformで実行不能なQAはDoDを拡張せず訂正する。

`AGENTS.md`／`CLAUDE.md`はこの横断規則の導入を理由に自動変更しない。実際のauthority・安全・role規則の不足が確認された場合だけ、本4-file amendmentから分離した最小amendment候補としてHumanへ報告する。

## 1. A〜F再検討の結論

### 1.1 A〜Fは大区分として維持する

旧A〜Fは目的の順序として妥当だが、そのまま一つのExecution ContractまたはPRにすると大きすぎる。特にA2、C、D、E、Fは異なるauthorizationとriskを含むため、A〜Fを**macro milestone**、本書の英数字付き項目を**有限な実行単位**とする。

| Macro | Mission上の目的 | 旧案のままでは不足する点 | 採用する有限単位 |
|---|---|---|---|
| A: Current State | 外部状態、history、schema baselineを事実として確定する | metadata、Local mutation、Production read-onlyを混在できない | A1、A2-P、A2-T0、A2-T1、A2-R、A2-B |
| B: Governance Design | environment、権限、credential、変更経路を設計する | inventory前後の設計とMCP到達性の確認／是正を分ける必要がある | B1、B2、B3a、B3b |
| C: Local／PR Foundation | clean replay、CI、deploy workflow、merge保護を成立させる | repository workflow、hosted runner実行、GitHub settings、auto-deploy guard、credential設定は別gate | C1、C2a、C2b、C2c、C3a、C3b1、C3b2、C3c |
| D: Hosted Staging／Recovery | Production分離環境、Hosted QA、復旧、緊急経路を実証する | project作成、application接続、recovery contract、restore、Break-glass contract／rehearsalを一括承認できない | D1a、D1b、D2a、D2b、D3a、D3-PR、D3b、D3-PB、D3c |
| E: Protected Production Path | Staging dry-run、merge identity、merge-triggered Production application受入、pilot経路の正本化、Production DB準備、低risk pilotを実証する | PR Headとmerge commit、Vercel expected deployment観測・受入、現行SQL Editor経路からpilot限定経路へのauthority移行、Production credential登録、Production DB実行を分ける必要がある | E1、E0、E0A、E2-G、E2-P、E2-X |
| F: Transition／Operations | SQL Editor方針を決め、Mission最終状態を運用として成立させる | 1回のpilotで全surface／複数cycleを完了できない | F1、F2a〜F2f |

### 1.2 本書が採用しない設計

- A2内でPostgreSQL全object、全extension member、全内部依存を説明する汎用Catalog Comparatorを開発しない。
- PR CI導入とGitHub settings変更を一つの承認で実行しない。
- Production credentialをLocal／PR foundation段階で登録しない。
- Hosted Staging作成承認を、作成後の受入承認で代替しない。
- Supabase Staging project作成を、application接続先変更またはGitHub credential登録の承認として扱わない。
- repositoryへworkflowを追加する承認を、hosted runner実行、GitHub settings変更、credential登録、deployの承認として扱わない。
- Supabase GitHub integration／Branching等のmerge-triggered Production deployを、manual protected routeと併存させない。無効化・分離を証明できない場合はcandidate merge前に停止する。
- Recovery能力の確認、restore rehearsal、Break-glass rehearsalを同一PASSにしない。
- pilot用に不要なmigrationを作らない。
- pilot 1回をMission最終受入またはSQL Editor廃止の自動根拠にしない。

## 2. Authorization Class（非時系列）

Authorization Class（`AC`）は、操作のriskと必要authorityを表す分類であり、実行順を表すgateではない。同じProcess Gateで複数のACを一括承認せず、必要なmutationごとに該当ACのHuman承認を得る。実行順は§5のProcess Gate（`PG`）を正とする。

| Class | 許可できる範囲 | 代表slice | 明示的に含まないもの |
|---|---|---|---|
| AC0: Plan／Read-only | repository、公式資料、承認済み外部metadataのread-only確認、契約・evidence設計 | S5-0、A1、A2-P、A2-T0、B1、B3a | Local DB起動、外部設定変更、Production DB query |
| AC1: Repository／Local／Source Publication Mutation | 専用worktreeの承認file、Docker／Local Supabase、Local-only test、承認branchのcommit／push、Draft PR作成、Ready化、Humanによる通常merge | C1、C2a、C2b、tracked PR publication | hosted runner／DB／application実行、GitHub settings／ruleset／Environment、secret／credential、check／status publisher authority、control-plane変更、deploy |
| AC2: External Non-Production／Control-plane | GitHub settings、hosted runner、Staging project／application／Environment／credential、client設定、非Production rehearsal | B3bの非Production／client側、C2a／C2bのhosted run、C3a、D1a／D1b、C3b1／C3b2、D2、D3b、D3c、E1 | Production DB query、Production credential、Production deploy |
| AC3: Production Read-only | exact target、exact query／API、取得項目を限定したProduction system metadata観測 | A2-T1、A2-R、D3a | business data、write、migration、任意追加調査 |
| AC4: Production Control-plane Preparation | Production auto-deploy triggerのdisable／分離、Production Environmentとdeploy credentialの登録・revoke・否定test。deploy 0件 | B3bのProduction側、C3c、E2-P | migration実行、DB write、Production deploy |
| AC5-A: Protected Production Application Execution | 将来、別Process改訂でVercel Git-triggerを停止し明示deploy経路を採用した場合に限り、Humanがexact release commit 1件のProduction application deployを起動する | 予約class（現行Vercel Git-trigger維持中はN/A） | Production DB query／write、schema／migration deploy、別release、自動retry、mergeとの結合、AC3 post-check |
| AC5-S: Protected Production Schema Execution | Humanがexact candidate 1件の保護されたschema／migration deployを起動する | E2-X | managed data job、別candidate、中高risk、retry、直接SQL、追加修正、AC3 post-check |
| AC5-D: Managed Production Data Execution | Humanがexact managed data job 1件を、preview、expected count、single transaction、idempotency、retry禁止、recovery付きで限定起動する | F2b | schema／migration deploy、任意SQL、件数上限なし、別job、自動再実行、AC3 post-check |
| AC6: Operational Acceptance | SQL Editor判断とMission最終受入 | F1、F2f | AC1〜AC5-A／AC5-S／AC5-Dが必要な実装・設定・Production操作の代替承認 |

### 2.1 Authorization Class共通規則

- 各mutationの開始直前に、当該Gateを明示的に含むcurrent Human authorizationが存在することを確認する。current authorizationは、当該Gateだけを含む単一GateのHuman approval packet、またはauthority、target、scope、許可操作、runtime principal、停止・rollback境界、bundle-level input identity／lineage、riskの8条件がすべて同一で当該Gateを明示的に含む複数GateのHuman approval bundleのいずれかとする。単一Gate承認も既存bundle authorization model内の1 Gateだけを含むpacketとして扱い、いずれもProcess上は`AUTHORIZED_BY_CURRENT_BUNDLE(<authorization-id>)`と記録する。current authorizationがなければ`NOT AUTHORIZED`とする。
- Gate PASS、domain review、Reviewer PASS、observed checkからauthorizationを生成しない。mutation開始直前に、対象Gate、Entry、identity／lineage、STOP、失効条件を照合し、bundle承認時点からmutation実行時点までにこれらまたは8条件のdriftがあれば停止する。
- 先行Process GateのPASSは、次のProcess Gateまたは別ACの開始承認ではない。
- AC3のProduction read-only承認はAC4／AC5-A／AC5-S／AC5-DのProduction設定・deploy・write承認ではない。
- AC4のcredential登録承認はdeploy承認ではない。
- AC1のsource publicationは、承認scopeのcommit／push／Draft／Ready／通常mergeだけを許可する。GitHub settings、hosted runner、credential、check／status発行、DB実行、manual application deployを許可せず、target、runtime principal、rollback domainが異なるLocal実行とsource publicationは別Gateにする。Human mergeは、current Vercel Git-triggerによる想定済み1 deploymentが発生することを理解したsource publication判断であり、settings変更、manual deploy、redeploy、AC5-Aを許可しない。
- AC1のmerge前に、Production DBは有限管理surface上で`PATH_ABSENT / Confirmed`がmerge直前にcurrentであることをPG-00C2／PG-12C2で確認する。Human operational attestation、merge開始からDB post-merge観測完了までのchange freeze、`EXPECTED_DB_EFFECT = NONE`は両path分岐共通で、別Gateであるmerge準備・Human merge判断へ置く。`PATH_PRESENT / Confirmed`時はProduction DB deployment metadata観測planとDB用AC3 Human authorizationを、`PATH_ABSENT / Confirmed`時はcurrent path identity・actual merge commit・bounded windowによる`NOT_APPLICABLE_BY_PATH_ABSENCE` closure planを固定し、DB用AC3を要求しない。後者はschema全体またはDB全体の不変を主張しない。active／pending件数は`PATH_ABSENT`時にplatform上で実測必須にしない。applicationはcurrent Git-trigger、source identity規則、exact 1 deployment、expected alias／domain、rollback routeをfreshに証明し、post-merge観測の別AC3 Human authorizationを必要とする。DBの有限surfaceが`PATH_PRESENT`／`Unknown`、既知のDB変更あり、change freeze不成立、path分類に対応するDB post-merge plan／authorization未固定、application経路が不存在／複数／Unknown、またはいずれかがstaleならmergeせず停止する。管理外で具体的兆候のない経路は`NotCompared`であり、全経路の不存在を推定しない。DB trigger分離はAC4、`PATH_PRESENT`時のDB post-merge観測とapplication post-merge観測はAC3の別Human承認・別Gateとし、AC1へ含めない。
- AC5-A、AC5-S、AC5-Dは相互流用しない。各runはclass、target、release／job identity、実行回数を固定した別Human承認を必要とし、Humanだけが承認済みruntime principalを起動する。DevOpsのpackage qualificationまたはAC3 post-checkを実行authorityへ読み替えない。
- domain review、Reviewer APPROVED、observed checkはHuman authorizationを代替しない。
- target、scope、artifact、candidate、Headのいずれかが変われば、影響するgateのreviewとHuman承認を失効させる。
- authority、target、scope、許可操作、runtime principal、停止・rollback境界、bundle-level input identity／lineage、riskがすべて同一である有限作業だけを、一つのHuman approval packet／一回の応答へまとめられる。bundleは各Gate、許可操作、Entry、STOP、失効条件を個別に列挙し、GateごとのHuman判断を省略しない。
- approval bundleは明示されたGateとmutationだけに有効であり、bundle外のGate、異なるAC、target、scope、principal、rollback domainへ拡張しない。
- reviewは変更の影響domainに必要なRoleだけが行う。currentness確認は実行開始、Ready／review、merge、Production実行、postcheck等の主要境界へ集約し、個別Gate／QAのfresh要件を優先したうえで、identityと失効条件が不変なevidenceを再利用できる。
- この横断規則は新規、変更、初回実行する項目から適用する。問題のない既存Gate／QA／Hard Constraintおよび完了済み作業は、authority違反、安全性、成果妥当性、後続Gateへの実質的影響が確認されない限り開き直さない。

## 3. 全sub-slice共通契約

### 3.1 Execution Contract必須項目

各Execution Contractは少なくとも次を固定する。

1. Goalと非Goal。
2. exact repository、baseline Head、worktree、branch、owner。
3. 計画scope、実行scope、実行role、許可成果物／変更種別、対象外。
4. 参照正本、外部一次資料、snapshot時刻。
5. target identity。Supabaseではproject、Reference ID、Database hostname、port、database、roleを分離する。
6. risk、残余risk、main metric 1件、rollbackまたはroll-forward 1件。
7. public／private evidence、owner、reader、mode、hash、retention、削除条件。
8. DoD、QA、STOP RULES、ESCAPE HATCH、Human判断事項。
9. publication、domain review、Reviewer、merge、external mutationのauthority境界。
10. `gate_closer`、必要なruntime principal、authorization owner、credential holder、evidence owner。
11. 期待end stateと次gate。

### 3.2 Role

| Role | 担当範囲 | 禁止境界 |
|---|---|---|
| Human | Goal、risk、cost、例外、各PG／AC、merge、Production判断 | Raw SQLやPostgres内部挙動の技術保証を単独で担わない |
| Claude | `docs/03_requirements.md`を含むproduct要件の意味確認 | 技術・運用判断、実装、Human承認を代行しない |
| Tech Lead | Execution Contract、architecture、SQL／比較意味、停止条件 | code／SQL artifactを実装せず、自己承認しない |
| DevOps | target、credential、GitHub／Supabase settings、recovery、運用安全性 | Human gate、Reviewer判定、Production実行を代行しない |
| Fullstack Engineer | 承認されたcode／workflow／SQL candidateの標準実装 | 自作artifactを最終reviewしない |
| PKA | process、Knowledge、evidence identity、lifecycle、traceability | 技術意味を補完せず、SQLを作成・自己承認しない |
| Reviewer | exact Head／artifactへの独立判定 | 既存実装file、DB、外部設定を変更しない |

GitHub Environmentのrequired reviewerは、AI Reviewerではなく、実在する別Human user／teamでなければならない。実装者またはdeploy起動者の自己承認しか構成できない場合、E2-P／E2-Xを停止する。

primary actorは上表のnamed Role 1件へ固定する。workflow、scheduler、GitHub App、Vercel deploy session、Supabase protected job等はauthorityを持つRoleではなく`runtime_principal`であり、Execution Contractへ別fieldで記録する。aliasから権限を推定しない。

| 実行surface | primary accountable Role | runtime principal／trigger | authority・credential・evidence境界 |
|---|---|---|---|
| repository／Git source publication | Execution Contractで選定したFullstack EngineerまたはPKAの一方 | approved local Git principalまたはHumanのapproved GitHub repository session | Humanがscopeを承認し、選定Roleが実装・Draft／Ready化する。mergeはHuman、独立判定はReviewer。settings、runner、credential、check／status publisher、deployは別surface・別Gate |
| GitHub／Supabase／Vercel control-plane | DevOps | Human承認済みplatform sessionまたはservice principal | Humanがexact mutationを承認し、DevOpsがtarget／rollback／postcheckへ責任を持つ。credential値は公開証拠へ出さない |
| Production read-only observation | DevOps | Human承認済みread-only principal | exact target／query／routeだけ。追加調査、business data、writeへ拡張しない |
| Candidate validation CI | DevOps | isolated candidate-validation job／ephemeral runner | candidate codeを実行する唯一のjob。job permissionは最大`contents: read`、Environment／repository／organization secretとpublisher credentialを持たず、checks／statuses／pull-requests／deployments writeを禁止する |
| Required-result publication | DevOps | isolated trusted-publisher job／expected GitHub App principal | candidate ref／code／action／scriptをcheckout・実行せず、schemaとhashを検証したsanitized result manifestだけからexact candidate／test-merge SHAへ限定結果を発行する。Production／deploy／repository mutation credentialを持たない |
| Protected Production application deploy（将来の明示経路だけ） | Human | Human-triggered protected application deploy principal | 別Process改訂でAC5-Aを有効化した場合だけ、Human authorizationに紐づくdispatch操作で承認済みprincipalを起動する。現行Git-trigger維持中はN/Aで、merge-triggered deploymentの観測・受入へ読み替えない。Environment approverはdeploy起動者とは別Humanとし、DevOpsはAC3 preflight／post-checkとevidence closureを別Gateで行う |
| Protected Production schema deploy | Human | Human-triggered protected schema deploy principal | Humanがexact migration package／target／1 runを承認して起動する。HumanまたはAIへProduction write credential値を開示せず、DevOpsは実行前qualificationと実行後SELECT-only verificationを別Gateで行う |
| Managed Production data job | Human | Human-triggered approved narrow data-job principal | AC5-Dのexact job／arguments／1 runだけをHumanが起動する。任意SQL、自動retry、別jobへ拡張せず、DevOpsはAC3 post-checkを別Gateで閉じる |
| Scheduled observation | DevOps | approved scheduler principal | schedulerはactorではない。DevOpsがpackage、target、retention、結果を照合する |

Gate表に「標準実装担当」「platform operator」「execution agent」「Human-triggered operator」「Scheduler」等のaliasをprimary actorとして残さない。各Gate／publication instanceで上表のnamed Roleへ解決し、runtime principalが必要なら同じevidenceへ別記する。

### 3.3 Evidenceと判定

- public durable record: exact Head／commit、run／deployment URL、QA ID、判定、risk、Human approval、private hash、retention、exception。secret、target値、raw resultを含めない。
- private evidence: repository外のHuman承認済みroot、directory `0700`、file `0600`、non-symlink、version固定、hash、owner／reader／retention／削除条件を持つ。
- private内容のreview事実は公開できるが、内容、結論の根拠となるoperational metadataを転載しない。
- private artifactが変われば旧reviewは失効する。task worktree削除で失われる場所を唯一の長期証拠にしない。

判定は混同せず、必要に応じて次を別fieldで持つ。

```text
execution_status
test_outcome
history_outcome
catalog_outcome
expected_absence_outcome
unknown_outcome
baseline_eligibility
next_gate_authorization
```

`next_gate_authorization`は`NOT AUTHORIZED`または`AUTHORIZED_BY_CURRENT_BUNDLE(<authorization-id>)`のいずれかだけを取る。Gateの`PASS`や`Match`自体からauthorization状態を生成することを禁止する。currentなHuman approval bundleがない場合は`NOT AUTHORIZED`とする。

### 3.4 Data API exposure／GRANT／RLS三層判定

Data APIの安全性と可用性は、次の三層を別々に判定する。一つの層のPASSから他層を推定しない。

| Layer | 必須判定 |
|---|---|
| Data API exposure configuration | 対象schemaがData API公開設定へ含まれるか。targetごとのcurrent設定と新規・変更objectの公開意図を照合する |
| Data API GRANT | API roleのschema／table／function権限とdefault privilegeが期待値に一致するか |
| RLS／policy | RLS有効状態、policy、role別positive／negative behaviorが期待値に一致するか |

各層は`expected`、`observed`、`comparison_outcome = Match / Drift / NotCompared`、`evidence_status = Confirmed / Unknown / Inaccessible`を持つ。適用対象の全層が`Match + Confirmed`の場合だけ三層GateをPASSとし、`Unknown`、`Inaccessible`、設定差を暗黙のMatchにしない。設定是正が必要な場合は、read-only QA内で変更せず、target、actor、rollbackを持つ別control-plane Execution Contractへ停止する。

current Changelogはplatform semanticsと対象projectへの適用可能性の根拠であり、実targetの設定証拠ではない。A1、C1、C2b、D2a、D2b、candidate QAの開始時に、URL／entry ID、確認日時、対象projectへのapplicabilityを記録し、actual exposure／GRANT／RLSはtarget固有証拠で確認する。Changelogまたはapplicabilityが不明・取得不能なら、過去snapshotをcurrent扱いせず、最初に結論を必要とするGateで停止する。

### 3.5 動的N/Nと再現可能QA

- migration、DB test、Playwright spec、wrapper testの件数は、各Execution Contractのfixed Headからbaseline manifestを生成し`N/N`で確認する。
- 本書作成snapshotのmigration 9件は参考値であり、将来の契約へ固定しない。
- assertion数はgrepで推定せず、runnerの正式reporterまたは実行結果から取得する。
- QA evidenceはtool version、exact command／query ID、start／end、exit code、sanitized log hash、result hash、cleanup stateを持つ。
- 全環境で同じcandidate artifact identityを使う。Local／CI／Stagingはcandidate PR Head、ProductionはPG-24で対応付けたrelease commitを使用する。commitが異なる場合はpromotion identityで同値性とQA継承範囲を証明し、証明不能な影響QAをrelease commitで再実施する。
- negative testは通常migrationを意図的に壊さず、専用fixture／validation branch／workflow contract testで行う。

#### 3.5.1 Trusted workflowとcandidate artifactの二identity

Candidate hosted CIでは、workflowを実行するtrust rootと、検証対象candidateを同一SHAとして扱わない。

```text
trusted_workflow_identity =
  workflow path
  + default branch
  + workflow release commit
  + workflow blob hash
  + trust-root script/action hashes
  + check context
  + expected result publisher

candidate_artifact_identity =
  PR URL
  + current candidate Head SHA
  + base SHA
  + candidate tree／migration／Change Brief hashes
```

`workflow_dispatch`はapproved default-branch release refへ行い、`run.head_sha`はworkflow release commitと一致させる。candidate SHAは型付き必須inputとして渡し、trusted workflowが別worktreeへcheckoutした`HEAD`とPRのcurrent Headが一致することをtest前とresult発行前に確認する。candidate refのworkflow、local action、result publisherをtrust rootとして実行しない。

candidate checkoutとtestは、trusted result publisherから分離したjob／runner／runtime principalで実行し、workspace、service、container、credential、write可能cacheを共有しない。candidate jobの`GITHUB_TOKEN`は`contents: read`を上限とし、checkout credentialは永続化せず、Environment secret、repository／organization／environment secret、App private key、check／status／deploymentへのwrite credentialを一切渡さない。untrusted candidate code、candidate側action、candidate生成scriptをpublisher credential contextで実行しない。publisher jobはcandidate codeをcheckout／実行せず、candidate生成物をcommand／script／archiveとして実行・展開しない。workflow release側の固定validatorが、allowlist済みschema／件数／sizeを持つsanitized result manifestのcandidate SHA、workflow release SHA、run ID／attempt、checkout HEAD、current PR Head、test-merge SHA、artifact hash、trusted harness outcomeを再照合した後だけexpected sourceとして結果を発行する。publisher credentialはpublisher jobだけに限定し、必要なcheck／status write以外を与えない。

required resultはlatest candidate／test-merge SHAとexpected GitHub App sourceへ紐づくことを別々に証明する。default-branch runがPASSした事実だけをcandidate required checkとして扱わない。trusted publisherがcandidate SHAへ結果を付与できない、expected sourceをbranch protectionで固定できない、workflow／trust-root hashがdriftした場合は`FOUNDATION_BLOCKED`であり、required checkを名前だけで成立扱いしない。

負系QAは少なくとも、candidate側workflowの偽成功変更、input SHAとcurrent Headの不一致、workflow release hash drift、default branch SHAだけへのsuccess、別sourceによる同名status、candidate Head変更、candidate jobからpublisher secret／write tokenを読む試行、candidate jobからcheck／statusを書き込む試行、改ざん・再送・別SHAのresult manifestを含む。candidate jobにはsecretが存在せずwriteが拒否され、publisherは不正manifestを拒否することを証明する。いずれもcandidate required resultをPASSにせず、旧run／reviewを失効させる。

### 3.6 Review loop停止

同じissue familyの`occurrence 2`を検出した場合、局所patchと追加version作成を停止する。Gate構造、scope、問題設定、標準tool利用をTech Lead／DevOps／PKAが再評価し、Humanが次方針を判断するまで同じlineageの追加versionを作らない。判定とclosureは§3.7のProcess Issue Registerへ集約し、別の「連続version数」基準を併用しない。

### 3.7 Process Issue Register

Process defectは次の5列だけで管理する。lifecycle ownerはPKA、影響domainのclosure reviewはTech Lead／DevOpsが担う。過去patch回数の全件backfillは行わず、PG-01採用時を各familyの`occurrence 1`とする。

| issue ID | family・occurrence | 影響範囲 | owner | 恒久対応・closure |
|---|---|---|---|---|
| `S5-PI-001` | DoDを超えるscope拡張・1 | A2の汎用Catalog Comparator化 | PKA | DoD-firstで必要十分な対象へ縮小。PG-01 focused reviewとProcess Contract mergeで初期closure |
| `S5-PI-002` | 取得不能な証拠要求・1 | PG-00C2／PG-00P0のProduction DB deployment metadata | PKA | platform feasibilityを先に判定し、取得不能時はDoDを拡張せずProcess defectとして訂正 |
| `S5-PI-003` | Gate間の責務混入・1 | PG-00C0／C1／C2／M／P0 | PKA | currentness、mutation、merge preparation、postcheckの責務を分離 |
| `S5-PI-004` | 水平反映漏れ・1 | `S5-A1DBD-Q01`／`S5-PUBDB-Q01`／publication family | PKA | 同一QA familyの適用先をfocused reviewで横断確認 |
| `S5-PI-005` | 旧前提の再流入・1 | superseded Execution Contract／target／bundle前提 | PKA | 実行時のcurrent Gate Entry／DoD／QAを正として照合 |

同じfamilyの次回発生を`occurrence 2`として登録し、局所patchを止めてGate構造または問題設定を再評価する。

## 4. 依存関係の読み方

A〜Fは活動領域、AC0〜AC6（AC5-A／AC5-S／AC5-Dを含む）はauthorization／mutationの分類、PG-00AからPG-32E（suffix gateを含む）は実際に進める時系列である。A〜FまたはAC番号から実行順を推定せず、§5のPG順序を正とする。

```text
既存A1 evidence assembly／Human受入（今回限り）
  → PR #17 merge前のProduction DB Git-trigger確認／必要時分離
  → PR #17 merge前のVercel Production application expected-effect確認／必要時是正
  → Human merge
  → DB／application post-merge deltaの別々の観測
  → 同一merge identityのpost-merge rollup
  → Process受入
  → 有限baseline設計
  → clean Local desired state
  → exact Production target／read-only比較／baseline判断
  → actual recovery能力を反映したarchitecture
  → CI／merge protection
  → 分離Staging／deploy workflow／credential protection
  → Staging baseline／restore／Break-glass
  → Foundation受入
  → 実需candidate PR
  → Staging qualification
  → Ready化 → Reviewer独立判定 → Human merge
  → DB／application post-merge観測 → rollup
  → merge identity確認
  → Production control-plane準備
  → Production pilot
  → SQL Editor判断 → post-pilot route正本化
  → Operations／最終受入
```

- A2-RはC1-Bのhash固定desired artifactを入力にする。A2内でLocal replayを再実装しない。
- D3aのactual recovery能力とRTO／RPO gapを確認してからB2の正式architectureを採用する。
- D1aのHosted Staging project作成はA2-B／B2後に行い、D1bのapplication接続変更と分離する。
- repository workflow作成、hosted runner実行、GitHub settings、Environment保護、credential登録、deployを別authorizationとする。
- Production credentialはE2-Pまで登録しない。mergeだけでProduction DB deployが起動する構成は採用しない。
- candidateはPR HeadでLocal／CI／Stagingを検証し、Human merge後にPG-23D／PG-23EでDB／applicationを独立観測し、PG-23Fのpost-merge rollupがPASSしてからrelease commitとのidentityをPG-24で固定する。identityを証明できない場合はPG-24R0〜R5で影響判定と必要QAを原子Gateとして再実施し、Productionへ進まない。code／migration修正が必要ならmerge済みPRへ戻らず、新しいcorrective candidateを採用する。
- 実需のlow-risk candidateがない場合は、不要migrationを作らず`FOUNDATION_COMPLETE / PILOT_OPPORTUNITY_PENDING`で正常停止する。

集合表現を使う場合、`C2=C2a+C2b+C2c`、`C3=C3a+C3b1+C3b2+C3c`、`D1=D1a+D1b`、`D2=D2a+D2b`、`D3=D3a+D3-PR+D3b+D3-PB+D3c`を意味する。「C2 PASS」等は構成sub-slice全件PASSでなければ使用しない。

## 5. End-to-end Process GateとPR境界

### 5.1 Process Gateの判定規則

各PGは、前PGのGate DoDをEntryとして受け取り、記載した実行単位とQAだけを行い、次のいずれかで有限に閉じる。

| 終了状態 | 意味 |
|---|---|
| `PASS` | Gate DoDとartifact handoffを、指定`gate_closer`がclosure recordで受入れ、次PGのplan作成を提案できる |
| `BLOCKED_REMEDIATION_REQUIRED` | 原因別Execution Contractが必要。次PGへ進まない |
| `BLOCKED_BY_HUMAN_DECISION` | owner、再判断日、再開条件を記録して停止 |
| `FOUNDATION_COMPLETE / PILOT_OPPORTUNITY_PENDING` | foundationは完了したが実需candidateがない。Production変更0件で停止し、candidate出現時はcurrentness再確認Gateから再入場する |
| `MISSION_ACCEPTANCE_PENDING / SECOND_CYCLE_NOT_AVAILABLE` | Cycle 1まで完了したが、独立した2件目の実需candidateがない。Mission最終受入だけを保留して有限停止 |
| `N/A_WITH_PROHIBITION` | optional能力を採用せず、禁止状態を正本化して閉じる |
| `NOT_REQUIRED_BY_CLASSIFICATION` | 先行read-only分類により当該conditional correctionが不要と証明された。理由と分類identityを保持して次Gateへ進む |
| `SUPERSEDED` | Head、target、artifact、candidateの変更で失効。影響PGから再開 |

各Gateの既定`gate_closer`はGate行のprimary actorである。Humanがcloserとなるのは、primary actorがHumanであるGate、またはQAがHumanによるadopt／accept／authorizeを明記するGateに限る。technical Gateのprimary actorは、必要なdomain reviewを得て技術的DoDを閉じるが、次Gateやmutationを承認しない。Reviewer GateはReviewer、merge／最終受入GateはHumanが閉じる。closure recordは`gate_id`、`gate_closer_role`、evidence identity／hash、result、closed_at、blockerまたはN/A理由を持ち、全Gateで`S5-GC-Q01`を適用する。

`PASS`自体は次PGのauthorizationではない。次PGは原則として、Entry artifactを固定したplan draftとExecution Contractを提示し、該当ACのHuman承認後に開始する。ただし、currentなHuman approval bundleが次PGを明示的に含み、当該GateのEntry、bundle-level input identity／lineage、失効条件が満たされる場合は、Humanの再応答なしで開始できる。この場合も`next_gate_authorization`は`AUTHORIZED_BY_CURRENT_BUNDLE(<authorization-id>)`でなければならず、Gate PASSから推定しない。予期しないauthority、target、identity／lineage、scope、risk、runtime principal、許可操作、停止・rollback境界の変更でbundleを失効させる。Drift／Unknownは調査失敗と混同しないが、明示された後続PGを停止する。

個別Gate／QAがfresh observation、fresh review、独立reviewを明示要求する場合、その要件を横断的なcurrentness／review再利用で省略しない。再利用できるのは、内容、Head／artifact identity、authority、risk、失効条件が不変な既存domain evidenceだけである。

一つのProcess Gateは、次のtupleを各1件に固定する。

```text
Authorization Class
＋ Human authorization ID
＋ primary execution actor
＋ runtime principal（該当時）
＋ exact target
＋ rollback domain
＋ input artifact identity
```

複数QAを同一Gateへ含められるのは、この7項目がすべて同じ場合だけである。いずれかが異なる場合は別Gateとし、先行GateのDoD artifactを次GateのEntryへ渡す。

tracked PRのpublicationは、本文中の`PUB(<logical-pr-id>)`を次の7 Gateへ展開する。これらは省略可能な説明ではなく、logical PRごとに別instanceとして挿入するProcess Gateである。Draft PRが既に存在する実行列は`PUB-READY`から開始できるが、その場合も`PUB-DRAFT`のQA証拠をEntryとして必要とする。`PUB-DRAFT`／`PUB-READY`／`PUB-MERGE`はAC1のsource publicationだけであり、GitHub settings、hosted runner、credential、check／status publisher、DB／application実行、deployを許可しない。

| Publication Gate | AC／Primary actor／target | Entry | DoD／QA |
|---|---|---|---|
| `PUB-DRAFT(<id>)` | AC1／Execution Contractで1名に固定したFullstack EngineerまたはPKA／exact branch・tracked scope・GitHub Draft PR | 承認scopeの実装・自己QA完了 | `S5-PUBD-Q01`。scope外0、commit／upstream／PR Head一致、Draft、merge 0。source publication以外のGitHub／external settings・DB・Production権限を含まない |
| `PUB-READY(<id>)` | AC1／同じExecution Contractで選定済みのFullstack EngineerまたはPKA／同一exact PR Head | 全QA・必要なdomain review完了、Head固定 | `S5-PUBR-Q01`。DoD evidence、checks、未解決finding 0を確認しReady化。candidate CIはtrusted workflow／candidate二identity currentnessを必要とする。Head変更時は実装Gateへ戻る |
| `PUB-REVIEW(<id>)` | AC0／Reviewer／同一exact PR Head | Ready、checks／evidence current | `S5-PUBV-Q01`。既存fileを更新せず独立判定し、APPROVEDまたはCHANGES REQUESTEDを記録 |
| `PUB-MERGE(<id>)` | AC1／Human／approved Headとcurrent base | Reviewer APPROVED、checks、base drift、通常merge方式、対応`PG-12C2`のcurrentness subresult、DBのfresh `EXPECTED_DB_EFFECT = NONE` attestation、applicationのfresh `deployment_effect=EXPECTED_SINGLE_DEPLOYMENT`、path分類に対応するDB／application別のpost-merge観測planとauthorization | `S5-PUBM-Q01`。`S5-C3cV-Q01`の**merge-preparation subresult**として、Human operational attestation、merge開始から`PUB-POST-DB(<id>)`完了までのchange freeze、`EXPECTED_DB_EFFECT = NONE`を固定する。`PATH_PRESENT`時はDB post-merge既存deployment metadata観測planとAC3承認を、`PATH_ABSENT`時はcurrent path identity・actual merge commit・bounded windowによる`NOT_APPLICABLE_BY_PATH_ABSENCE` closure planを固定する。有限surfaceの`PATH_ABSENT / Confirmed` currentnessは対応`PG-12C2`だけが固定する。merge前はapproved Head SHA、current base SHA、通常merge方式、current Vercel project／Production branch／Git-trigger設定、および結果として生成されるmerge commitをsourceとする1 deploymentというexpected source ruleを固定する。HumanがGitHub repositoryだけを通常mergeし、生成後のactual merge commit SHAを固定する。squash／rebase／merge queue／auto-merge、settings変更／manual deploy／redeployを含まない。Head／base／merge方式／Git-trigger設定のdrift、DB finite-surface drift、既知のDB変更、freeze不成立、attestationがUnknown、またはpath分類に対応する後続観測plan／authorizationが未固定ならmergeしない |
| `PUB-POST-DB(<id>)` | `PATH_PRESENT`: AC3／DevOps／exact merge commit・Production DB deployment metadata。`PATH_ABSENT`: current path identity・exact merge commit・bounded window | `PUB-MERGE(<id>)` PASS、pre-merge DB attestation、path分類に対応するDB plan／authorization current | `S5-PUBDB-Q01`。`PATH_PRESENT`時だけbounded windowでmerge前後identity、active／pending／completed／new deployment、schema／migration effectを値非表示で固定し、`ZERO_DELTA`／`NONZERO_DELTA`／`UNKNOWN`を記録する。`PATH_ABSENT`時は同metadataを要求せず、Git-triggered DB deployment observationを`NOT_APPLICABLE_BY_PATH_ABSENCE / Confirmed`として閉じる。write、settings変更、remediation 0 |
| `PUB-POST-APP(<id>)` | AC3／DevOps／exact merge commit・Vercel Production metadata | `PUB-MERGE(<id>)` PASS、pre-merge application expected-effect attestation、application観測planとAC3 Human承認current | `S5-PUBAPP-Q01`。同じbounded windowでbuild／deployment／Current／alias／environment-setting deltaを固定し、exact merge commitをsourceとする1 deployment、READY／Current、期待alias／domain一致、想定外settings／alias delta 0を`EXPECTED_APP_DEPLOYMENT`、それ以外を`UNEXPECTED_APP_DELTA`／`UNKNOWN`として記録する。observer起動のdeploy、settings変更、remediation 0 |
| `PUB-POST-ROLLUP(<id>)` | AC0／DevOps／同一merge identityに紐づくDB／application観測artifact | `PUB-POST-DB(<id>)`と`PUB-POST-APP(<id>)`が結果にかかわらず完了 | `S5-PUBPOST-Q01`。identity、window、currentnessを照合し、DBが`PATH_PRESENT`時の`ZERO_DELTA / Confirmed`または`PATH_ABSENT`時の`NOT_APPLICABLE_BY_PATH_ABSENCE / Confirmed`、かつapplicationが`EXPECTED_APP_DEPLOYMENT / Confirmed`のときだけPASS。DB非0、DB path／identity／window不明、applicationの0件／複数件／別source／failed／stale／想定外settings・alias delta、Unknown、identity不一致はincident／`FOUNDATION_BLOCKED`とし、後続Gate、closeout、外部mutationを禁止する |

`PG-00C0`の有限管理surfaceは、Supabase Dashboard上のGitHub repository連携、repository内GitHub Actions workflow、repository webhook、対象repositoryへaccessを持つInstalled GitHub Apps、およびこれらから具体的に確認できるGitHub／Supabase連携だけである。repository ownerまたはorganization ownerがGitHub公式UIで表示されたInstalled GitHub Appのrepository access、権限、用途をread-onlyで確認した記録は有効なevidenceであり、API／connectorは補助証拠とする。API／connectorの認証失敗だけでは`Unknown`にしない。Appの存在だけではProduction DB triggerを`PATH_PRESENT`にせず、schema／migration適用へ至る具体的経路を確認する。管理外の抽象的可能性または具体的兆候のない外部経路は`NotCompared`であり、`Unknown`／STOPの理由にしない。`Unknown / STOP`は、上記有限surface自体が未確認・判断不能、または具体的な不審経路・用途不明の対象repository accessが残る場合だけとする。旧定義で収集済みのevidenceは新定義の再判定入力であって、旧Process上のPG-00C0を遡及的にPASSへ書き換えない。

すべてのpublicationは、`PUB-MERGE`直前にProduction DBの有限管理surface上で`PATH_ABSENT / Confirmed`がcurrentであること、Supabase GitHub repository連携なし・branchなしのcurrent確認、Human operational attestation、merge開始から`PUB-POST-DB`完了までのchange freeze、fresh `EXPECTED_DB_EFFECT = NONE`を別Gateで固定することと、approved Head SHA、current base SHA、通常merge方式、current Vercel project／Production branch／Git-trigger設定、および結果として生成されるmerge commitをsourceとする想定済み1 deploymentというfresh `deployment_effect=EXPECTED_SINGLE_DEPLOYMENT`を要求する。`PATH_PRESENT`時はDB deployment metadata観測planとAC3 Human authorization IDを、`PATH_ABSENT`時はcurrent path identity・actual merge commit・bounded windowによる`NOT_APPLICABLE_BY_PATH_ABSENCE` closure planを固定する。platformに存在しないDB active／pending件数を`PATH_ABSENT`時に実測必須にせず、後者はschema全体またはDB全体の不変を主張しない。merge前にfuture merge SHAを推定・固定せず、merge後にactual merge commit SHAを固定してdeployment sourceと照合する。Head／base／merge方式／Git-trigger設定が変わればpreflightとHuman承認は失効し、PR Head由来deployment、manual deploy、redeployで代替しない。両観測はmergeから独立に分岐し、一方のdrift／Unknownを理由に他方を省略しない。`PUB(<id>) PASS`は`PUB-POST-ROLLUP(<id>) PASS`だけを意味し、すべての後続Entryはmerge済みという事実だけでなく、path分類に対応するDB結果とapplication `EXPECTED_APP_DEPLOYMENT / Confirmed`のterminal rollup artifactを必要とする。PR #17はPG-00C2／PG-00V2とPG-00P0／P1／P2を使う。Process Contract PRは同じbootstrap lineageをmerge直前にread-only再確認して使い、Process発効後もPG-12C2／PG-12V2が初めてPASSするまでは同lineageを使う。PG-12C2／PG-12V2の初回PASS後は恒久lineageを両identityへ切り替える。切替前のdriftはPG-00C0／PG-00V0、切替後のdriftはPG-12C0／PG-12V0へ戻り、再確認前のmergeを許可しない。publication GateのPASSはremote branch削除、closeout、外部mutation、次ACの開始を承認しない。

本書の機械計数でいう`explicit PG`は、§5.2の`PG-*`行だけを数える。publication transitionを既に個別PG行として展開したlogical PRはexplicit PGへ含まれるため再加算しない。未展開の`PUB(<id>)` logical PR instance数を`L_unexpanded`とすると、全placeholderを実体化したdefinition総数は`explicit PG + 7 × L_unexpanded`で算出する。既存Draftから開始する列も`PUB-DRAFT`の既存証拠を一instanceとして数え、conditional PRが作成されない場合は実行instanceへ数えず、corrective／追加PRが生じればlogical PR instanceと総数を再計算する。

### 5.2 実行順、Gate DoD、次工程

#### Process／baseline／architecture

| PG | Entry state | AC／primary actor／exact target | QAとGate DoD（handoff artifact） | 次工程 | PR境界 |
|---|---|---|---|---|---|
| PG-00A Existing A1 evidence assembly | Mission承認済み、A1／PR #17開始済み | AC0／PKA／PR #17 Head・A1 public record・private packet identity | `S5-A1-Q01`。tracked `remote=Human確認済みdev`、application targetの確認状態、packet hash、必須review identity、漏えい0を同一immutable bundleへ固定する。Human受入、merge、外部mutationを含めず、遡及authorizationしない | PG-00B | 既存PR #17の証拠集約だけ。file／GitHub／外部変更0 |
| PG-00B Existing A1 Human acceptance | PG-00A PASS、同一Head・packet hash・review identity current | AC0／Human／A1 evidence bundle | `S5-A1H-Q01`。HumanがA1を受入／修正要求／保留の一件で判断し、受入時も`next_gate_authorization=NOT AUTHORIZED`を維持する | PG-00C0 | merge、settings変更、後続Gate開始を含まない |
| PG-00C0 Pre-merge Production DB Git-trigger assessment | PG-00B PASS、PR #17未merge | AC0／DevOps／Supabase Dashboard GitHub repository連携、repository workflow／webhook、Installed GitHub Apps、具体的GitHub／Supabase連携 | `S5-C3cA-Q01`。main merge／pushからProduction DB schema／migration適用へ至る経路だけを有限管理surfaceで`PATH_ABSENT / Confirmed`、`PATH_PRESENT / Confirmed`、`Unknown / STOP`へ分類する。active／pending deployment metadata、effect、rollback routeは扱わない | `PATH_ABSENT`ならPG-00C2、`PATH_PRESENT`ならPG-00C1、`Unknown`なら`FOUNDATION_BLOCKED` | DB／settings mutation 0。別Execution Contract。具体的兆候のない管理外経路は`NotCompared`でありSTOPにしない |
| PG-00C1 Pre-Process Production DB Git-trigger separation | PG-00C0の`PATH_PRESENT / Confirmed`、AC4別承認 | AC4／DevOps／exact unsafe GitHub／Supabase integration trigger | `S5-C3cM-Q01`。Git-triggered Production DB deploymentをdisable／unlink／分離し、before／after／rollback、manual protected route、deploy／credential追加／DB write 0を固定し、是正後の有限surface再分類をPG-00C2入力へ渡す。`PATH_ABSENT`ならPG-00C0 identity付き`NOT_REQUIRED_BY_CLASSIFICATION` | PG-00C2 | 外部control-plane contract。Process proposalはauthorityにならない |
| PG-00C2 Pre-merge Production DB finite-surface currentness | PG-00C0の`PATH_ABSENT / Confirmed` identityまたはPG-00C1 PASS | AC0／DevOps／current finite management-surface identity | `S5-C3cV-Q01`のcurrentness部分だけを用いる。PG-00C0の分類を再current化し、C1後は是正後の有限surfaceを`PATH_ABSENT / Confirmed`へ再分類する。Supabase Dashboard repository connection、branch／project mapping、tracked GitHub Actions workflow、repository webhook、Installed GitHub Appを含む具体的GitHub／Supabase連携設定に、PG-00C0分類へ影響する変更がないことをmerge直前に確認する | PG-00V0 | path drift、有限surfaceの`PATH_ABSENT`未成立、有限surface自体の確認不能は`FOUNDATION_BLOCKED`。PRなし |
| PG-00V0 Pre-merge Vercel expected-effect assessment | PG-00C2 PASS、PR #17未merge | AC0／DevOps／approved PR Head SHA・current base SHA・通常merge方式・Vercel project／Production branch／Git deployment settings | `S5-VAPP-M0-Q01`。mainへの通常mergeからProduction application build／Current切替へのcurrent経路、resulting merge commitをdeployment sourceとする規則、expected deployment count、期待alias／domain、active／pending、rollback routeを値非表示で固定。future merge SHAは固定しない | expected source ruleにより1 deploymentを一意に期待できればPG-00V2、経路不存在／複数／driftはPG-00V1、Unknownなら`FOUNDATION_BLOCKED` | settings mutation 0。別Execution Contract |
| PG-00V1 Pre-Process Vercel expected-effect correction | PG-00V0でcurrent経路がHuman判断と不一致、AC4別承認 | AC4／DevOps／exact Vercel Git deployment setting | `S5-VAPP-M-Q01`。現行Git-trigger維持のHuman判断へ一致させる必要最小の設定是正だけを、before／after／rollback、deploy 0で固定。Git-trigger停止、manual deploy経路への変更、追加deployを行わない。PG-00V0適合ならidentity付き`NOT_REQUIRED_BY_CLASSIFICATION` | PG-00V2 | 外部Vercel control-plane contract。Process proposalはauthorityにならない |
| PG-00V2 Pre-merge Vercel expected-effect attestation | PG-00V0適合またはPG-00V1 PASS | AC0／DevOps／approved PR Head SHA・current base SHA・通常merge方式・current Vercel project settings／deployment metadata | `S5-VAPP-MV-Q01`。resulting normal-merge commitをsourceとするProduction application deploymentがexact 1件となるexpected source rule、期待alias／domain、想定外settings／alias delta 0となる`deployment_effect=EXPECTED_SINGLE_DEPLOYMENT`、observed_at、pre-merge identity、失効条件、rollback routeを固定。actual merge commit SHAはPG-00M後に固定する | PG-00M | Head／base／merge方式／Git-trigger設定の変更、squash／rebase／merge queue／auto-merge、経路0／複数、drift／stale／証明不能は`FOUNDATION_BLOCKED`。PRなし |
| PG-00M Existing A1 Human merge | PG-00B PASS、Reviewer APPROVED、PR #17 Head・base・checks current、PG-00C2 finite-surface currentness、PG-00V2のfresh `deployment_effect=EXPECTED_SINGLE_DEPLOYMENT`、Human operational attestation、PG-00M開始からPG-00P0完了までのchange freeze、`EXPECTED_DB_EFFECT = NONE`、PG-00P1の観測plan／AC3 authorization ID、およびPG-00P0は`PATH_PRESENT`時だけ既存deployment metadata観測plan／AC3 authorization ID、`PATH_ABSENT`時は既存PG-00C2 identity・actual merge commit・有限windowを用いるN/A closure planを固定 | AC1／Human／approved PR #17 Head・GitHub repository | `S5-PUBM-Q01`。PG-00MをDB観測準備とHuman merge判断の境界とし、HumanがGitHub repositoryだけを通常mergeしてmerge commitを固定する。Vercel expected deploymentはこのmergeの既存Git-trigger副作用として受入れ、manual deploy／settings変更を追加しない。C2／V2のUnknown／stale／drift、既知のDB変更、freeze不成立、`EXPECTED_DB_EFFECT = NONE`未固定、またはpath分類に対応する後続観測plan／authorization未固定ならmergeしない | PG-00P0／PG-00P1 | Production DB実行、manual Vercel deploy、settings変更と結合しない。両観測をmergeから独立に開始する |
| PG-00P0 A1 post-merge Production DB Git-trigger observation | PG-00M PASS、exact merge commit固定、PG-00C2 current path identity、有限window。`PATH_PRESENT`時だけDB観測のAC3承認current | `PATH_PRESENT`: AC3／DevOps／exact merge commit・Production DB deployment metadata。`PATH_ABSENT`: PG-00C2 identity・exact merge commit・有限windowだけをread-only照合するN/A closure | `S5-A1DBD-Q01`。`PATH_PRESENT / Confirmed`では既存deployment metadataのactive／pending／completed／newとschema／migration effectを照合し、`ZERO_DELTA`／`NONZERO_DELTA`／`UNKNOWN`を固定する。`PATH_ABSENT / Confirmed`では、main mergeによるGit-triggered Production DB deploymentは期待されないことをPG-00C2 current identity、actual merge commit、有限windowで固定し、`NOT_APPLICABLE_BY_PATH_ABSENCE / Confirmed`として閉じる。この後者はschema全体、business data、Bundle外objectまたはDB全体の不変を主張しない | 結果にかかわらずPG-00P2へartifactを渡す | path identity／window不明、`PATH_ABSENT`未current、`PATH_PRESENT`でmetadata観測未承認・未完了、DB write／settings変更／remediation 0 |
| PG-00P1 A1 post-merge application expected-effect observation | PG-00M PASS、exact merge commit固定、application観測のAC3承認current | AC3／DevOps／exact merge commit・Vercel Production deployment metadata | `S5-A1APPD-Q01`。PG-00V2のpre-merge identityとmerge後build／deployment／Current／alias／settingsを照合し、`EXPECTED_APP_DEPLOYMENT`／`UNEXPECTED_APP_DELTA`／`UNKNOWN`を固定 | 結果にかかわらずPG-00P2へartifactを渡す | observer起動のdeploy／settings変更／remediation 0 |
| PG-00P2 A1 post-merge rollup | PG-00P0／PG-00P1が同一merge commitについて完了 | AC0／DevOps／DB・application delta artifact | `S5-PUBPOST-Q01`。両artifactのidentity、window、currentnessを照合し、DBが`PATH_PRESENT`時の`ZERO_DELTA / Confirmed`または`PATH_ABSENT`時の`NOT_APPLICABLE_BY_PATH_ABSENCE / Confirmed`、かつapplicationが`EXPECTED_APP_DEPLOYMENT / Confirmed`のときだけPASS | PASSならPG-01。DB非0、DB path／window／identity不明、applicationの0件／複数件／別source／failed／stale／想定外settings・alias delta、Unknownはincident／`FOUNDATION_BLOCKED` | 外部mutation、closeout、後続開始0 |
| PG-01 Process Contract authoring | PG-00P2 PASS、A1 merge commitの最新`main` | AC1／PKA／Mission §12.1・本書・Roadmap・副索引 | `S5-0-Q01`。Mission開始条件、全trace、Gate原子性、停止状態をexact 4-file diffへ固定 | `PUB(PR-00)`、PASS後PG-02 | **PR-00 Process Contract**。Mission改訂と同時発効 |
| PG-02 Finite baseline contract | `PUB(PR-00) PASS` | AC0／Tech Lead／A2-P・A2-T0 plan | `S5-A2P-Q01`、`S5-A2T0-Q01`。Managed Register、Sentinel、target-attestation contractが有限、DB接続0 | `PUB(PR-02A)`、PASS後PG-03A | **PR-02A Managed Baseline Contract** |
| PG-03A GitHub Environment feasibility | `PUB(PR-02A) PASS` | AC0／DevOps／repository・GitHub Environment feature metadata | `S5-B1G-Q01`。visibility、plan／feature、admin、required reviewer、self-review、別Human approver、quorum、enforced alternativeを固定。成立しなければ`FOUNDATION_BLOCKED` | PG-03Bまたは停止 | settings mutation 0。manifestをPR-02B入力へ渡す |
| PG-03B Preliminary governance assessment | PG-03A成立 | AC0／DevOps／repository・plan・credential reachability metadata | `S5-B1-Q01`、`S5-B3a-Q01`。risk、cost、利用可能機能、Production write到達性を分類 | 到達0ならPG-03R5、不適合ならPG-03R0 | **PR-02B**はassessment／correction完了後に作成 |
| PG-03R0 Correction decomposition | PG-03B不適合 | AC0／Tech Lead／不適合surface一覧 | `S5-B3bC-Q01`。surfaceごとにnon-Production correction、Production disable、禁止／blockedを分類しtarget・actor・rollbackを固定 | PG-03R1 | PRなし |
| PG-03R1 Non-Production correction | PG-03R0でAC2対象あり | AC2／DevOps／exact client・non-Production config | `S5-B3bN-Q01`。before／after／rollback、Production変更0。対象なしは`NOT_REQUIRED_BY_CLASSIFICATION` | PG-03R2 | tracked修正があれば専用小PR。PR-02Bと混在させない |
| PG-03R2 Production capability correction | PG-03R1完了／非該当、PG-03R0でunsafe Production capabilityあり | AC4／DevOps／exact unsafe capability・Human承認済みplatform runtime principal | `S5-B3bP-Q01`。disable／revoke／unlinkのみ。new credential・deploy・DB write 0。対象なしは`NOT_REQUIRED_BY_CLASSIFICATION` | PG-03R3 | 外部contract。PR mergeで承認しない |
| PG-03R3 Non-Production reachability postcheck | PG-03R2完了／非該当、PG-03R1完了／非該当 | AC0／DevOps／correction後client・non-Production metadata | `S5-B3bNV-Q01`。新identityで否定test PASS、residual unsafe path 0 | PG-03R4 | PRなし |
| PG-03R4 Production reachability postcheck | PG-03R3 PASS、PG-03R2完了／非該当 | AC0／DevOps／Production capability metadata | `S5-B3bPV-Q01`。値非表示でProduction write到達0、residual credential 0、deploy 0 | PG-03R5 | PRなし |
| PG-03R5 Reachability rollup | PG-03B適合またはPG-03R3／R4完了 | AC0／Tech Lead／全assessment・correction identity | `S5-B3b-Q01`。B3aを新identityで再計算しPASSまたは`FOUNDATION_BLOCKED` | PASSなら`PUB(PR-02B)`、その後PG-04A | **PR-02B Preliminary Governance／Reachability** |
| PG-04A Local tooling need decision | `PUB(PR-02A) PASS`／`PUB(PR-02B) PASS` | AC0／Tech Lead／baseline contract・repository tool | `S5-C1P-Q01`。tracked tooling変更の要否を1件固定 | 必要ならPG-04B、不要ならPG-04C | PRなし |
| PG-04B Local baseline tooling | PG-04Aで変更必要 | AC1／Fullstack Engineer／承認tracked tool files | `S5-C1S-Q01`。静的QA、remote接触0、tool artifact hash固定 | `PUB(PR-03)`、PASS後PG-04C | **PR-03 Local Baseline Tooling** |
| PG-04C Clean Local baseline execution | PG-04A非該当または`PUB(PR-03) PASS` | AC1／Fullstack Engineer／localhost限定Local Supabase | `S5-C1-Q01` baseline mode、`S5-DAPI-Q01(Local baseline)`。migration／test N/N、Data API三層、desired artifact hash、cleanup、remote接触0 | PG-05 | Local DB stateはPRへ含めない |
| PG-05 Production target attestation | PG-04C PASS、A2-T0 contract採用 | AC3／DevOps／exact Production-serving target metadata | `S5-A2T1-Q01`。project、Reference ID、Database hostname、port、database、role、major、read-only actorを固定 | PG-06 | private evidence／public hash |
| PG-06 Limited Production observation | PG-04C／05 PASS、SD-05承認 | AC3／DevOps／exact Production target・Human承認済みread-only runtime principal・artifacts | `S5-A2R-Q01`。History、Managed Catalog、Expected Absence、Unknownを分離。business data／write 0 | PG-07 | raw resultはGit外 |
| PG-07 Baseline decision | PG-06完了 | AC0／Human／A2 comparison result identity | `S5-A2B-Q01`。baseline stateを1件固定しblockedをReady扱いしない | `PUB(PR-04A)`、PASS後PG-08または停止 | **PR-04A Baseline Decision** |
| PG-08 Recovery capability assessment | `PUB(PR-04A) PASS`、baseline採用 | AC3／DevOps／Production backup・restore capability metadata | `S5-D3a-Q01`。actual capability、RTO／RPO gap、禁止riskを固定 | PG-09 | capability存在をrehearsal PASSとしない |
| PG-09 Final architecture decision | PG-07 baseline採用、PG-08 PASS | AC0／Tech Lead／正式route・禁止surface | `S5-B2-Q01`。Migration Change Contract、Privileged Change Gate、recovery制約を固定 | `PUB(PR-04B)`、PASS後PG-10A | **PR-04B Final Architecture** |

#### CI／Staging foundation／recovery

| PG | Entry state | AC／primary actor／exact target | QAとGate DoD（handoff artifact） | 次工程 | PR境界 |
|---|---|---|---|---|---|
| PG-10A Runner workflow introduction | `PUB(PR-04B) PASS` | AC1／Fullstack Engineer／manual-only minimal runner workflow files | `S5-C2aS-Q01`。`workflow_dispatch`、permissions read-only、Environment／secret／remote 0、lint／contract fixture PASS、hosted run 0、workflow hash固定 | `PUB(PR-05)`、PASS後PG-10I | **PR-05 Runner Compatibility**。workflowをdefault branchへ先に導入する |
| PG-10I Runner workflow release identity | `PUB(PR-05) PASS` | AC0／PKA／PR-05 Head・merge commit・workflow hash | `S5-C2aI-Q01`。default branch上のexact workflow path、release commit、hashを固定 | PG-10B | PRなし |
| PG-10B Runner compatibility execution | PG-10I PASS、AC2個別承認 | AC2／DevOps／default branchのworkflow・exact release commit | `S5-C2aX-Q01`。`workflow_dispatch`でexact release refを独立2 run、`run.head_sha = release commit`、permissions read-only、Environment／secret／remote接触0、cleanup、manifest固定 | PASSならPG-11A、failureはPG-10R | PR本文のrun IDでHeadを変えない |
| PG-10R Runner compatibility remediation decision | PG-10B failure | AC0／Tech Lead／failed run・workflow release identity | `S5-C2aR-Q01`。原因、影響、rollback、corrective scopeを固定し、merged workflowを上書きしない | corrective PRはPG-10Aへ戻る。成立不能は`FOUNDATION_BLOCKED` | PRなし |
| PG-11A Full verification introduction | PG-10B PASS | AC1／Fullstack Engineer／manual validation可能なfull verification workflow files | `S5-C2bS-Q01`、`S5-C2bP-Q01(static)`。candidate validation／trusted publisherの別job・別principal、job／check名、三層Data API判定、failure propagation、Change Brief contract、permissions／secret境界、manifest schemaを固定し、hosted run 0 | `PUB(PR-06)`、PASS後PG-11I | **PR-06 Full PR Verification** |
| PG-11I Full verification release identity | `PUB(PR-06) PASS` | AC0／PKA／PR-06 Head・merge commit・workflow hash | `S5-C2bI-Q01`。default branch上のexact workflow path、release commit、fixture contractを固定 | PG-11B | PRなし |
| PG-11B Full verification execution | PG-11I PASS、AC2個別承認 | AC2／DevOps／default branchのworkflow・exact release commit | `S5-C2bX-Q01`、`S5-C2bP-Q01(foundation)`。`workflow_dispatch`のpass／failure fixture、`run.head_sha = release commit`、candidate jobのpublisher secret非到達／write拒否、publisher jobのcandidate非実行、不正manifest拒否、Data API exposure／GRANT／RLS別result、cleanup、required-check manifestを固定 | PASSならPG-12、failureはPG-11R | 自動`pull_request`起動やProduction secretを初回検証に使わない |
| PG-11R Full verification remediation decision | PG-11B failure | AC0／Tech Lead／failed run・workflow release identity | `S5-C2bR-Q01`。原因、required-check影響、corrective scope、再検証範囲を固定 | corrective PRはPG-11Aへ戻る。成立不能は`FOUNDATION_BLOCKED` | PRなし |
| PG-12 Merge protection mutation | `PUB(PR-06) PASS`、check manifest固定 | AC2／DevOps／exact GitHub branch protection settings | `S5-C3a-Q01`。required check、review、conversation、merge方式、rollbackを適用しnegative cases PASS | PG-12C0 | 外部GitHub settings contract |
| PG-12C0 Auto-deploy assessment | PG-09／12 PASS | AC0／DevOps／Supabase・GitHub有限管理surface metadata | `S5-C3cA-Q01`。merge／push／PR-close／webhookからProduction DB deployへ至る経路を`PATH_ABSENT / Confirmed`、`PATH_PRESENT / Confirmed`、`Unknown / STOP`へ分類 | `PATH_ABSENT`ならPG-12C2、`PATH_PRESENT`ならPG-12C1、`Unknown`なら`FOUNDATION_BLOCKED` | 管理外で具体的兆候のない経路は`NotCompared`。全経路の不存在を推定しない |
| PG-12C1 Auto-deploy correction | PG-12C0の`PATH_PRESENT / Confirmed`、AC4別承認 | AC4／DevOps／exact Production trigger・Human承認済みplatform runtime principal | `S5-C3cM-Q01`。disable／unlink／分離、rollback、deploy 0、new credential 0を固定し、是正後の有限surface再分類をPG-12C2入力へ渡す。`PATH_ABSENT`ならPG-12C0 identity付き`NOT_REQUIRED_BY_CLASSIFICATION` | PG-12C2 | 外部Production control-plane contract |
| PG-12C2 Auto-deploy finite-surface currentness | PG-12C0の`PATH_ABSENT / Confirmed` identityまたはPG-12C1 PASS | AC0／DevOps／current finite management-surface identity | `S5-C3cV-Q01`のcurrentness subresultだけを用いる。C1後は是正後の有限surfaceを`PATH_ABSENT / Confirmed`へ再分類し、Supabase GitHub repository連携なし・branchなし、tracked GitHub Actions workflow、repository webhook、Installed GitHub Appを含む具体的GitHub／Supabase連携設定に分類へ影響する変更がないことをmerge直前にcurrent確認する | PG-12V0 | path drift、有限surfaceの`PATH_ABSENT`未成立、有限surface自体の確認不能は`FOUNDATION_BLOCKED`。drift時PG-12C0へ戻る |
| PG-12V0 Vercel expected-effect currentness | PG-12C2 PASS、PG-00V2のcurrentness再確認 | AC0／DevOps／approved Head SHA・current base SHA・通常merge方式・current Vercel project／Production branch／Git settings | `S5-VAPP-M0-Q01`。resulting normal-merge commitをsourceとするProduction application 1 deploymentというexpected source rule、Current／alias／domain、rollback routeを再分類 | expected effectが一意ならPG-12V2、不存在／複数／driftはPG-12V1、Unknownは`FOUNDATION_BLOCKED` | mutation 0。future merge SHAは固定しない |
| PG-12V1 Vercel expected-effect correction | PG-12V0不適合、AC4承認 | AC4／DevOps／exact Vercel Git deployment setting・Human承認済みplatform runtime principal | `S5-VAPP-M-Q01`。現行Git-trigger維持のHuman判断へ一致させる必要最小の設定是正とrollbackだけを行い、Git-trigger停止、manual deploy経路への変更、application deploy 0。PG-12V0適合ならidentity付き`NOT_REQUIRED_BY_CLASSIFICATION` | PG-12V2 | 外部Vercel control-plane contract |
| PG-12V2 Vercel expected-effect attestation | PG-12V0適合またはPG-12V1完了 | AC0／DevOps／approved Head SHA・current base SHA・通常merge方式・current Vercel project settings／deployment metadata | `S5-VAPP-MV-Q01`。resulting normal-merge commitをsourceとする1 deploymentのexpected source rule、期待Current／alias／domain、想定外settings／alias delta 0、`deployment_effect=EXPECTED_SINGLE_DEPLOYMENT`、unrelated active／pending 0を固定 | PG-13A | Head／base／merge方式／Git-trigger設定のdrift時PG-12V0へ戻る。actual SHA照合はpost-merge Gate |
| PG-13A Hosted Staging project | PG-09／12C2／12V2 PASS、cost承認 | AC2／DevOps／exact Supabase Staging project・Human承認済みplatform runtime principal | `S5-D1a-Q01`。Production分離、data、owner、cost、cleanup、project identity固定 | PG-13B | Supabase project mutation専用contract |
| PG-13B Staging application binding | PG-13A PASS | AC2／DevOps／exact Preview・Staging application | `S5-D1b-Q01`。Staging target一致、Production application／credential非変更、rollback固定 | PG-14 | Vercel／application settings専用contract |
| PG-14 Protected deploy workflow | PG-13A／B PASS | AC1／Fullstack Engineer／deploy workflow files | `S5-C2c-Q01`。manual dispatch、Environment、target、concurrency、retry禁止、postcheck contract、deploy 0 | `PUB(PR-07)`、PASS後PG-15A | **PR-07 Staging Deploy Workflow** |
| PG-15A Staging Environment protection | `PUB(PR-07) PASS`、PG-03A current再確認PASS | AC2／DevOps／exact GitHub Environment protection | `S5-C3b1-Q01`。branch、required reviewer、self-review、bypass、rollbackをcanary検証 | PG-15B | secret登録と別contract |
| PG-15B Staging credential registration | PG-15A PASS、別Human approver実在 | AC2／DevOps／exact Staging Environment credential | `S5-C3b2-Q01`。job scope、露出0、revoke、Production credential 0。execution-package manifest固定 | PG-16 | credential値をGitへ含めない |
| PG-16 Staging baseline qualification | PG-07／09／11B／12／12C2／12V2／13A／13B／14／15B PASS | AC2／DevOps／exact Staging project・workflow・credential identity | `S5-D2a-Q01`、`S5-DAPI-Q01(Staging baseline)`。baseline migration、managed schema、Data API exposure／GRANT／RLS、API negative smoke、cleanup PASS | PG-17A0 | drift時は責任PGへ戻る |
| PG-17A0 Recovery technical review | PG-08／16 PASS、recovery draft identity固定 | AC0／Tech Lead／D3a capability・B2 risk・recovery draft | `S5-D3PRT-Q01`。restore方式、RTO／RPO、integrity、failure、STOP、rollbackの技術成立性を確認 | PG-17A1 | file変更0 |
| PG-17A1 Recovery operations review | PG-17A0 PASS、same draft identity | AC0／DevOps／same recovery draft・non-Production rehearsal target | `S5-D3PRD-Q01`。target、data、credential、cost、cleanup、evidence lifecycle、通常復帰を確認 | PG-17A2 | file／external mutation 0 |
| PG-17A2 Recovery contract adoption | PG-17A0／A1 PASS | AC0／Human／review済みrecovery contract | `S5-D3PRA-Q01`。target、data、RTO／RPO、integrity、cleanup、rollback、riskを採用 | PG-17A3 | PRなし。rehearsal未承認 |
| PG-17A3 Recovery tracked implementation | PG-17A2 PASS | AC1／PKA／採用済みrecovery runbook tracked files | `S5-D3PR-Q01`。採用済み意味を補完せず構造化し、trace、hash、rehearsal 0を固定。意味差分はPG-17A0へ戻る | `PUB(PR-08R)`、PASS後PG-17B | **PR-08R Recovery Contract** |
| PG-17B Restore rehearsal | `PUB(PR-08R) PASS` | AC2／DevOps／exact non-Production restore target | `S5-D3b-Q01`。Same／Equivalent、integrity、reconnect、cleanup、所要時間PASS | PG-17C0 | 外部restore contract |
| PG-17C0 Break-glass technical／security review | PG-17B PASS、Break-glass draft identity固定 | AC0／Tech Lead／D3a access capability・B2 risk・Break-glass draft | `S5-D3PBT-Q01`。開始条件、scope、MFA／network、expiry、audit、revoke、通常復帰の技術／security成立性を確認 | PG-17C1 | file変更0 |
| PG-17C1 Break-glass operations review | PG-17C0 PASS、same draft identity | AC0／DevOps／same Break-glass draft・non-Production rehearsal path | `S5-D3PBD-Q01`。custodian、target、credential lifecycle、cost、cleanup、evidence、通常復帰を確認 | PG-17C2 | file／access mutation 0 |
| PG-17C2 Break-glass contract adoption | PG-17C0／C1 PASS | AC0／Human／review済みBreak-glass contract | `S5-D3PBA-Q01`。開始条件、custodian、期限、scope、audit、revoke、riskを採用 | PG-17C3 | PRなし。access発行未承認 |
| PG-17C3 Break-glass tracked implementation | PG-17C2 PASS | AC1／PKA／採用済みBreak-glass policy tracked files | `S5-D3PB-Q01`。採用済み意味を補完せず構造化し、trace、hash、access発行0を固定。意味差分はPG-17C0へ戻る | `PUB(PR-08B)`、PASS後PG-17D | **PR-08B Break-glass Contract** |
| PG-17D Break-glass rehearsal | `PUB(PR-08B) PASS` | AC2／DevOps／exact non-Production access path | `S5-D3c-Q01`。期限前後、revoke、residual access 0、通常経路復帰 | PG-17E | 外部rehearsal contract |
| PG-17E Foundation input assembly | PG-02、PG-03A、PG-03R5、PG-04A、PG-04C、PG-05、PG-06、PG-07、PG-08、PG-09、PG-10A、PG-10I、PG-10B、PG-11A、PG-11I、PG-11B、PG-12、PG-12C0、PG-12C1、PG-12C2、PG-12V0、PG-12V1、PG-12V2、PG-13A、PG-13B、PG-14、PG-15A、PG-15B、PG-16、PG-17A0、PG-17A1、PG-17A2、PG-17A3、PG-17B、PG-17C0、PG-17C1、PG-17C2、PG-17C3、PG-17Dと対応publicationのterminal identityが利用可能。PG-10R／PG-11Rはfailure時のroute記録であり必須terminal inputにせず、失敗後はcorrective release identityを経てPG-10B／PG-11Bのnew-identity PASSへ戻る。条件枝は親分類identity付きでdisposition済み | AC0／PKA／foundation evidence identities・branch disposition | `S5-FAI-Q01`。上記責任Gateを個別列挙し、条件枝はPASSまたは親分類identity付き`NOT_REQUIRED_BY_CLASSIFICATION`、remediation後は責任Gateのnew identity PASSを要求し、blockedを隠さない | PG-18 | 技術判定を再解釈せずidentityだけを集約 |
| PG-18 Foundation acceptance | PG-17E PASS | AC0／Human／foundation input register | `S5-FA-Q01`。registerの必須evidence、条件分岐、currentness、blocked stateを固定し、candidate有無と分離してfoundationを受入 | `PUB(FOUNDATION-CLOSEOUT)`、PASS後PG-18C | **Foundation Closeout PR** |
| PG-18C Pilot opportunity currentness | `PUB(FOUNDATION-CLOSEOUT) PASS`。initialまたは後日candidate確認時 | AC0／Tech Lead／current foundation register・実需candidateまたは明示的不在 | `S5-PC1R-Q01`。foundation、baseline、Staging、workflow、recoveryのcurrentnessとcandidate availabilityを固定 | candidate currentならPG-19。不在なら`FOUNDATION_COMPLETE / PILOT_OPPORTUNITY_PENDING`で有限停止し、後日新identityでPG-18Cを再実施 | PRなし |

#### Pilot cycle 1

| PG | Entry state | AC／primary actor／exact target | QAとGate DoD（handoff artifact） | 次工程 | PR境界 |
|---|---|---|---|---|---|
| PG-19 Pilot candidate adoption | PG-18C PASS、実需変更あり | AC0／Human／candidate issue・base・risk manifest | `S5-PCG-Q01`。low-risk、metric、rollback／roll-forward、expiry、Data API三層影響を固定 | PG-20A | candidate identity変更時はPG-18Cへ戻る |
| PG-20A Candidate implementation | PG-19 PASS | AC1／Fullstack Engineer／candidate tracked files | `S5-CAND-S-Q01`。承認scope実装、migration・test・Change Brief、Data API exposure／GRANT／RLSの各diff固定 | PG-20B | 未commit worktree diff |
| PG-20B Candidate Local qualification | PG-20A完了 | AC1／Fullstack Engineer／localhost Local Supabase | `S5-C1-Q01` candidate mode、`S5-DAPI-Q01(Local candidate)`。Local migration・test・advisor・cleanupとnew app＋old DB／new app＋new DB compatibility PASS | PG-20C | Local stateをPRへ含めない |
| PG-20C Candidate Draft publication | PG-20B PASS | AC1／Fullstack Engineer／candidate branch・Draft PR | `S5-PUBD-Q01`。scope限定commit、push、Draft、exact Head固定 | PG-20D | **Candidate PR**／`PUB-DRAFT(CYCLE-1)` |
| PG-20D Candidate trusted hosted CI | PG-20C exact Head、current PG-11I workflow release、AC2承認 | AC2／DevOps／default branch trusted workflow release identity＋candidate artifact identity | `S5-C2bC-Q01`、`S5-C2bP-Q01(candidate)`、`S5-DAPI-Q01(Candidate CI)`。default branchへdispatchし`run.head_sha=workflow release commit`、typed input／checkout HEAD／PR current Head=candidate Head、workflow／trust-root hash、separate publisher identity、expected result source、三層result、new app＋old DB compatibility、failure propagation、cleanup PASS | PG-21 | Headまたはworkflow release変更時PG-20A／PG-11I。candidate ref workflowと暗黙PR runをauthorizationに使わない |
| PG-21 Staging protected deploy | PG-20D PASS、E1 Human承認 | AC2／DevOps／exact Staging workflow・target | `S5-E1-Q01`。same PR Headを1回deploy、parallel／retry／Production接触0、postcheck PASS | PG-22 | evidenceをCandidate PRへHead非変更で記録 |
| PG-22 Candidate Hosted QA | PG-21 PASS、candidate不変 | AC2／Fullstack Engineer／deployed Staging candidate | `S5-D2b-Q01`、`S5-DAPI-Q01(Staging candidate)`。same Head・migration hash、Data API三層、new app＋new DB、主要journey、cleanup PASS | PG-23A | failureはPG-22R0。直接実装へ戻らない |
| PG-22R0 Hosted QA failure identity freeze | PG-22 failure | AC0／PKA／candidate・E1 deployment・failure・cleanup evidence | `S5-D2bR0-Q01`。failure、Head、deployment、fixture cleanup identityを固定し、schema／history復元と区別 | PG-22R1 | file／DB変更0 |
| PG-22R1 Staging applied-state attestation | PG-22R0 PASS | AC2／DevOps／exact Staging migration history・schema metadata | `S5-D2bR1-Q01`。適用済みmigration、schema、history、fixture stateをread-onlyで別fieldに固定 | PG-22R2 | migration修正・cleanup 0 |
| PG-22R2 Hosted QA remediation design | PG-22R1 PASS | AC0／Tech Lead／same failure・applied-state identity | `S5-D2bR2-Q01`。適用済みmigration不変で、additive correction／disposable Staging再作成／same identity evidence-only 1回／blockedの有限routeを定義 | PG-22R3 | 実装・recreate 0 |
| PG-22R3 Hosted QA remediation authorization | PG-22R2 PASS | AC0／Human／review済みremediation route | `S5-D2bR3-Q01`。一経路、再実行上限、戻りGateを採用 | additiveはPG-20A、recreateはPG-13A、same identityはPG-22を1回、判断不能はblocked | fixture cleanupをschema／history復元扱いしない |
| PG-23A Candidate Ready | PG-20D〜22 PASS、全DoD・domain review完了 | AC1／Fullstack Engineer／Candidate PR Ready state | `S5-PUBR-Q01`。candidate／trusted workflow二identity、Head、PG-12C2／12V2 currentness、未解決domain finding 0 | PG-23V0 | `PUB-READY(CYCLE-1)` |
| PG-23V0 Production application expected-deployment preflight | PG-23A PASS、PG-12V2 current | AC3／DevOps／Vercel project・current Git-trigger・candidate Head・current base・通常merge方式・current deployment metadata | `S5-VAPP-P0-Q01`。resulting normal-merge commitをsourceとする1 deploymentのexpected source rule、期待Current／alias／domain、rollback route、unrelated active／pending 0を固定する。zero-business-data smokeのexact route、method、token／cookie不使用、許可response metadata、business endpoint／Server Action非到達をmanifest化し、証明不能ならSD-05別契約へ停止 | PG-23B | DB mutation、manual application deploy、settings mutation 0。future merge SHAは固定しない |
| PG-23B Candidate independent review | PG-23V0 PASS | AC0／Reviewer／exact Candidate PR Head | `S5-PUBV-Q01`。独立APPROVED、未解決thread 0、file変更0 | PG-23C | `PUB-REVIEW(CYCLE-1)` |
| PG-23C Candidate Human merge | PG-23B PASS、fresh checks・base・PG-12C2／12V2、`PATH_PRESENT`時はPG-23D AC3、`PATH_ABSENT`時はN/A closure plan、PG-23E AC3 authorization ID固定 | AC1／Human／approved Head・`main` | `S5-PUBM-Q01`。fresh DB `EXPECTED_DB_EFFECT = NONE` attestationとapplication expected-effect attestationを確認し、GitHub repositoryだけを通常mergeしてmerge commitを固定 | PG-23D／PG-23E | `PUB-MERGE(CYCLE-1)`。両観測をmergeから独立に開始する |
| PG-23D Candidate post-merge Production DB Git-trigger observation | PG-23C PASS、path分類に対応するDB plan／authorization current | `PATH_PRESENT`: AC3／DevOps／exact merge commit・Production DB deployment metadata。`PATH_ABSENT`: current path identity・exact merge commit・bounded window | `S5-PUBDB-Q01`。`PATH_PRESENT`時だけbounded windowのschema／migration deltaを`ZERO_DELTA`／`NONZERO_DELTA`／`UNKNOWN`で固定し、`PATH_ABSENT`時は`NOT_APPLICABLE_BY_PATH_ABSENCE / Confirmed`として閉じる | 結果にかかわらずPG-23Fへartifactを渡す | `PUB-POST-DB(CYCLE-1)`。write／remediation 0 |
| PG-23E Candidate post-merge application observation | PG-23C PASS、application観測plan／AC3承認current | AC3／DevOps／exact merge commit・Vercel Production metadata | `S5-PUBAPP-Q01`。同じbounded windowのbuild／deployment／Current／alias／settings deltaを固定し、expected effectとの一致を判定 | 結果にかかわらずPG-23Fへartifactを渡す | `PUB-POST-APP(CYCLE-1)`。observer起動のdeploy／remediation 0 |
| PG-23F Candidate post-merge rollup | PG-23D／Eが同一merge commitについて完了 | AC0／DevOps／DB・application観測artifact | `S5-PUBPOST-Q01`。DBがpath分類に対応するPASS結果、applicationが`EXPECTED_APP_DEPLOYMENT / Confirmed`のときだけPASS | PASSならPG-24。その他はincident／`FOUNDATION_BLOCKED` | `PUB-POST-ROLLUP(CYCLE-1)` |
| PG-24 Merge Identity | PG-23F PASS | AC0／PKA／PR Head・base・merge commit・tree・artifact hashes | `S5-MIG-Q01`。release commitとQA継承範囲を固定 | 同値ならPG-24V0、影響ありPG-24R0 | PRなし |
| PG-24R0 Reverification impact decision | PG-24で同値未証明 | AC0／Tech Lead／release commit・impact manifest | `S5-MIGR0-Q01`。C1、CI、Staging、Hosted QAの必要／N/Aを理由付き固定 | PG-24R1 | PRなし |
| PG-24R1 Release Local revalidation | PG-24R0でLocal対象 | AC1／Fullstack Engineer／release commit・Local Supabase | `S5-MIGRL-Q01`。影響Local QA PASS。非対象はimpact N/A | PG-24R2 | repository修正0 |
| PG-24R2 Release hosted CI revalidation | PG-24R1完了／理由付きN/A、PG-24R0でCI対象 | AC2／DevOps／release commit hosted run | `S5-MIGRC-Q01`。影響CI PASS、exact run identity固定。非対象はimpact N/A | PG-24R3 | PRなし |
| PG-24R3 Release Staging redeploy | PG-24R2完了／理由付きN/A、PG-24R0でE1対象 | AC2／DevOps／release commit・Staging | `S5-MIGRS-Q01`。exact releaseを1回deploy、Production接触0。非対象はimpact N/A | PG-24R4 | PRなし |
| PG-24R4 Release Hosted QA | PG-24R3完了／理由付きN/A、PG-24R0でD2b対象 | AC2／Fullstack Engineer／release deployment | `S5-MIGRH-Q01`。影響journey・cleanup PASS。非対象はimpact N/A | PG-24R5 | PRなし |
| PG-24R5 Reverification rollup | PG-24R1〜R4完了／理由付きN/A | AC0／Tech Lead／全revalidation manifest | `S5-MIGR-Q01`。Data API三層を含むQA継承範囲を再固定。code修正必要なら新candidateへ分岐 | repository修正0ならPG-24V0、corrective candidateはPG-18C | 修正時は新Corrective Candidate PR |
| PG-24V0 Production application package currentness | PG-24またはPG-24R5 PASS、PG-23V0／PG-23E manifest current | AC3／DevOps／release commit・Vercel project・expected deployment metadata | `S5-VAPP-B0-Q01`。release commit、build settings、PG-23E deployment identity、rollback deployment、active／pending、PG-12V2 identity、zero-data smoke manifestを値非表示で固定 | PG-24V1 | manual deploy 0。driftはPG-12V0またはPG-23V0へ戻る |
| PG-24V1 Merge-triggered Production application deployment adoption | PG-24V0 PASS | AC0／Human／exact release commit・PG-23E expected deployment evidence | `S5-VAPP-B-Q01`。Humanがexact merge-triggered deploymentをapplication acceptance対象として採用し、manual deploy／redeploy／settings変更／AC5-Aを`NOT_AUTHORIZED`のまま維持する | PG-24V2 | Git mergeで既に生成されたdeploymentの証拠採用だけ。外部mutation 0 |
| PG-24V2 Production application deployment currentness observation | PG-24V1 PASS | AC3／DevOps／exact Vercel Production deployment metadata | `S5-VAPP-O-Q01`。deployment source commit＝release commit、READY／Current、alias／domain、single deployment、想定外settings／alias delta 0を値非表示で再確認 | PG-24V3 | DB write／redeploy 0 |
| PG-24V3 Production application zero-business-data smoke | PG-24V2 PASS、PG-23V0 smoke manifest current | AC3／Fullstack Engineer／exact Current Production application route | `S5-VAPP-S-Q01`。token／cookie／record／response body／Data API／Server Action mutation 0。status、許可header、release identity、browser／Application／Server errorだけを確認 | PG-24V4 | zero-data証明不能またはDB-backed route必須なら実行せずSD-05別契約へ停止 |
| PG-24V4 Production application acceptance | PG-24V0〜V3 PASS | AC0／Human／application release evidence | `S5-VAPP-A-Q01`。application releaseを受入またはblocked state固定。DB authorizationは付与しない | PASSならPG-24S0 | failure時はPG-24S0以降禁止 |
| PG-24S0 Pilot route authority contract | PG-24V4 PASS、PG-09／PG-12C2／PG-12V2 current | AC0／Tech Lead／Cycle 1 exact candidate・現行正本・pilot route draft | `S5-E2RA-C-Q01`。pilot限定Human-triggered protected principal、1 run、no retry、history effect、expiry、SQL Editor fallback、同一candidate二経路併用／自動failover禁止、exact 14-file canonical scopeを固定 | PG-24S1 | file／settings／credential／deploy 0 |
| PG-24S1 Pilot route operations review | PG-24S0 PASS、same contract hash | AC0／DevOps／same route draft・platform成立性 | `S5-E2RA-D-Q01`。credential非開示、別Human approver、concurrency、target、rollback、history、fallback、evidence lifecycleを確認 | PG-24S2 | external mutation 0 |
| PG-24S2 Pilot route Human adoption | PG-24S0／S1 PASS | AC0／Human／review済みpilot route contract | `S5-E2RA-H-Q01`。採用／修正要求／保留を一件で判断し、採用時もfile変更、publication、settings、credential、deployを未承認として維持 | PG-24S3 | 実装開始は別Human承認 |
| PG-24S3 Pilot route canonical implementation | PG-24S2 PASS、exact 14-file実装開始の別Human承認 | AC1／PKA／`AGENTS.md`、`CLAUDE.md`、`docs/README.md`、`docs/03_requirements.md`、`docs/04_data-model.md`、ADR-0008、05、06、Supabase運用reference、`operate-supabase-live-db`本体と主要4 reference | `S5-E2RA-S-Q01`。正本14ファイルだけへpilot限定route、AI Production write禁止、SQL Editor fallback、expiry、二経路併用禁止を同期し、AGENTS／CLAUDE byte一致、workflow／settings／credential／DB変更0 | PG-24S4 | source publication未実施 |
| PG-24S4 Pilot route authority Draft | PG-24S3自己QA PASS | AC1／PKA／exact branch・14-file scope・Draft PR | `S5-PUBD-Q01`。source publicationだけを行いexact Head固定 | PG-24S4P | `PUB-DRAFT(PILOT-ROUTE-AUTHORITY)` |
| PG-24S4P Pilot route product content-owner review | PG-24S4 PASS | AC0／Claude／exact Draft Head・`docs/03_requirements.md` diff・adopted contract | `S5-E2RA-P-Q01`。現行SQL Editor規定を一般則／fallbackとして維持し、protected routeがexact candidate／target／1 run／expiryに限るpilot例外であることを確認 | PG-24S5 | file変更0。技術・運用reviewを代行しない |
| PG-24S5 Pilot route technical domain review | PG-24S4P PASS、same Head | AC0／Tech Lead／exact Draft Head・adopted contract・`docs/04_data-model.md` diff | `S5-E2RA-T-Q01`。migration history、route exclusivity、failure／partial、STOP、04の技術意味と正本意味の一致を確認 | PG-24S6 | file変更0 |
| PG-24S6 Pilot route operations domain review | PG-24S5 PASS、same Head | AC0／DevOps／exact Draft Head・Skill routing・platform currentness | `S5-E2RA-O-Q01`。credential非到達、Human trigger、fallback、revoke、current platform成立性を確認 | PG-24S7 | file／external mutation 0 |
| PG-24S7 Pilot route authority Ready | PG-24S4P／S5／S6 PASS、全DoD完了 | AC1／PKA／same exact PR Head | `S5-PUBR-Q01`。未解決finding 0、checks／scope／Head currentを確認しReady化 | PG-24S8 | `PUB-READY(PILOT-ROUTE-AUTHORITY)` |
| PG-24S8 Pilot route authority independent review | PG-24S7 PASS | AC0／Reviewer／same exact Head | `S5-PUBV-Q01`。独立APPROVED、thread 0、file変更0 | PG-24S9 | `PUB-REVIEW(PILOT-ROUTE-AUTHORITY)` |
| PG-24S9 Pilot route authority Human merge | PG-24S8 PASS、fresh DB／application attestation、`PATH_PRESENT`時はPG-24S10D AC3、`PATH_ABSENT`時はN/A closure plan、PG-24S10A AC3 authorization ID固定 | AC1／Human／approved Head・current base | `S5-PUBM-Q01`。GitHub repositoryだけを通常mergeし、canonical release commitを固定 | PG-24S10D／PG-24S10A | `PUB-MERGE(PILOT-ROUTE-AUTHORITY)` |
| PG-24S10D Pilot route authority post-merge DB Git-trigger observation | PG-24S9 PASS、path分類に対応するDB plan／authorization current | `PATH_PRESENT`: AC3／DevOps／exact merge commit・Production DB deployment metadata。`PATH_ABSENT`: current path identity・exact merge commit・bounded window | `S5-PUBDB-Q01`のpath分岐でbounded windowを固定 | 結果にかかわらずPG-24S10Rへ渡す | `PUB-POST-DB(PILOT-ROUTE-AUTHORITY)` |
| PG-24S10A Pilot route authority post-merge application observation | PG-24S9 PASS、application観測承認current | AC3／DevOps／exact merge commit・Vercel Production metadata | `S5-PUBAPP-Q01`。同じbounded windowのapplication deltaを固定 | 結果にかかわらずPG-24S10Rへ渡す | `PUB-POST-APP(PILOT-ROUTE-AUTHORITY)` |
| PG-24S10R Pilot route authority post-merge rollup | PG-24S10D／S10A完了 | AC0／DevOps／同一mergeの両観測artifact | `S5-PUBPOST-Q01`。DBがpath分類に対応するPASS結果、applicationが`EXPECTED_APP_DEPLOYMENT / Confirmed`のときだけPASS | PASSならPG-24S11。その他はincident／`FOUNDATION_BLOCKED` | `PUB-POST-ROLLUP(PILOT-ROUTE-AUTHORITY)` |
| PG-24S11 Pilot route canonical currentness | PG-24S10R PASS | AC0／PKA／canonical release commit・latest `main` blobs | `S5-E2RA-R-Q01`。reviewed Headとmainの14-file path／blob-hash setを照合し、AGENTS＝CLAUDE、pilot expiry、SQL Editor fallback、正本pointer、外部mutation 0を固定 | PASSならPG-25A | driftは`PILOT_ROUTE_AUTHORITY_DRIFT`で有限停止する。使用済み`PILOT-ROUTE-AUTHORITY`へ戻らず、new logical publication IDを持つ別Process amendment／Execution ContractをHuman判断へ返す |
| PG-25A Production control-plane mutation | PG-24S11 PASS、PG-17A0〜A3／17B／17C0〜C3／17D PASS | AC4／DevOps／exact Production Environment・credential・workflow settings・Human承認済みplatform principal | `S5-E2PA-Q01`。canonical authority release hashを入力にsettings apply／rollback、deploy 0、新identity固定 | PG-25B | 外部Production settings contract |
| PG-25B Production package qualification | PG-25A完了、PG-03A current feasibility再確認PASS、PG-24S11 current | AC3／DevOps／Production control-plane metadata | `S5-E2P-Q01`。AC5-S、pilot route authority release、selected protected route、fresh C3c、workflow、Environment、credential config、approver、concurrency、targetとPG-03A manifest identity／hashをpackageへ固定。不成立は`FOUNDATION_BLOCKED`、settings driftはPG-15AまたはPG-25Aへ戻し、authority driftは`PILOT_ROUTE_AUTHORITY_DRIFT`で停止する | PG-26 | public hash＋private package |
| PG-26 Production pilot execution | PG-25B PASS、AC5-S exact 1 run承認、同一candidateのSQL Editor適用履歴0 | AC5-S／Human／exact Production target・release commit・Human-triggered protected schema deploy principal | `S5-E2X-Q01`。Humanが承認済みprincipalでschema／migration candidateを1回だけ適用し、managed data job、SQL Editorへの自動切替、自動retry、追加操作0。run／deployment identityを固定 | PG-26V | PR merge、read-only postcheck、settings変更と結合しない。credential値をHuman／AIへ開示しない |
| PG-26V Production pilot read-only postcheck | PG-26完了、exact run identity固定 | AC3／DevOps／exact Production target・migration result・history／managed metadata | `S5-E2XV-Q01`。SELECT-onlyでmigration result、history、managed postcheck、unexpected change 0を確認しevidenceを閉じる。write、retry、rollback起動0 | PG-27 | execution authorityを持たず、drift／partial／Unknownはblocked stateへ停止 |
| PG-27 Pilot closeout | PG-26V PASS | AC0／Human／Cycle 1 result・risk・cleanup identity | `S5-PCL-Q01`。成功時だけ`CYCLE_1_ACCEPTED`、failure／partialはblocked state固定 | `PUB(PILOT-CLOSEOUT)`、成功時PG-28 | **Pilot Closeout PR** |
| PG-28 SQL Editor disposition | `PUB(PILOT-CLOSEOUT) PASS`、Cycle 1 accepted | AC6／Human／surface別SQL Editor route | `S5-F1-Q01`。廃止／fallback／併存、owner、review日を決定。pilot 1件で未対応surfaceを廃止しない | PG-28A | decision artifact。source publication／正本変更は未実施 |
| PG-28A Post-pilot route canonical contract | PG-28 PASS、exact disposition artifact固定 | AC0／Tech Lead／PG-28 decision・current 14-file正本・pilot evidence | `S5-F1C-Q01`。surface別route、SQL Editor disposition、protected routeの通常／fallback／禁止、expiry、Cycle 2適用、exact 14-file scope、STOPを固定 | PG-28B | file／settings／credential／deploy 0 |
| PG-28B Post-pilot route operations review | PG-28A PASS、same contract identity | AC0／DevOps／route draft・platform currentness | `S5-F1D-Q01`。operator、credential非到達、failure／partial、fallback、revoke、evidence、current platform成立性を確認 | PG-28C | external mutation 0 |
| PG-28C Post-pilot route Human adoption | PG-28A／B PASS | AC0／Human／review済みpost-pilot route contract | `S5-F1H-Q01`。採用／修正要求／保留を判断し、採用時もfile変更、publication、settings、credential、deployを未承認として維持 | PG-28D | 実装開始は別Human承認 |
| PG-28D Post-pilot route canonical implementation | PG-28C PASS、exact 14-file実装開始の別Human承認 | AC1／PKA／E2-Gと同じ14-file canonical scope | `S5-F1S-Q01`。採用済みsurface別disposition、AI Production write禁止、Human trigger、fallback／禁止、二経路併用禁止を同期し、AGENTS／CLAUDE byte一致、workflow／settings／credential／DB変更0 | PG-28E | source publication未実施 |
| PG-28E F1 canonical decision Draft | PG-28D自己QA PASS | AC1／PKA／exact branch・14-file scope・Draft PR | `S5-PUBD-Q01`。source publicationだけを行いexact Head固定 | PG-28EP | `PUB-DRAFT(F1-DECISION)` |
| PG-28EP F1 product content-owner review | PG-28E PASS | AC0／Claude／exact Draft Head・`docs/03_requirements.md` diff・adopted disposition | `S5-F1P-Q01`。surface別SQL Editor dispositionがproduct要件の意味を超えず、未対応surfaceを推定廃止せず、一般remote writeを許可しないことを確認 | PG-28F | file変更0。技術・運用reviewを代行しない |
| PG-28F F1 canonical technical review | PG-28EP PASS、same Head | AC0／Tech Lead／exact Draft Head・adopted disposition・`docs/04_data-model.md` diff | `S5-F1T-Q01`。surface coverage、route exclusivity、history effect、failure／partial、STOP、04の技術意味と正本意味の一致を確認 | PG-28G | file変更0 |
| PG-28G F1 canonical operations review | PG-28F PASS、same Head | AC0／DevOps／exact Draft Head・Skill routing・platform currentness | `S5-F1O-Q01`。credential非到達、Human trigger、fallback／禁止、revoke、current platform成立性を確認 | PG-28H | file／external mutation 0 |
| PG-28H F1 canonical Ready | PG-28EP／F／G PASS、全DoD完了 | AC1／PKA／same exact PR Head | `S5-PUBR-Q01`。未解決finding 0、checks／scope／Head currentを確認しReady化 | PG-28I | `PUB-READY(F1-DECISION)` |
| PG-28I F1 canonical independent review | PG-28H PASS | AC0／Reviewer／same exact Head | `S5-PUBV-Q01`。独立APPROVED、thread 0、file変更0 | PG-28J | `PUB-REVIEW(F1-DECISION)` |
| PG-28J F1 canonical Human merge | PG-28I PASS、fresh DB／application attestation、`PATH_PRESENT`時はPG-28KDB AC3、`PATH_ABSENT`時はN/A closure plan、PG-28KAPP AC3 authorization ID固定 | AC1／Human／approved Head・current base | `S5-PUBM-Q01`。GitHub repositoryだけを通常mergeし、canonical release commitを固定 | PG-28KDB／PG-28KAPP | `PUB-MERGE(F1-DECISION)` |
| PG-28KDB F1 canonical post-merge DB Git-trigger observation | PG-28J PASS、path分類に対応するDB plan／authorization current | `PATH_PRESENT`: AC3／DevOps／exact merge commit・Production DB deployment metadata。`PATH_ABSENT`: current path identity・exact merge commit・bounded window | `S5-PUBDB-Q01`のpath分岐でbounded windowを固定 | 結果にかかわらずPG-28KRへ渡す | `PUB-POST-DB(F1-DECISION)` |
| PG-28KAPP F1 canonical post-merge application observation | PG-28J PASS、application観測承認current | AC3／DevOps／exact merge commit・Vercel Production metadata | `S5-PUBAPP-Q01`。同じbounded windowのapplication deltaを固定 | 結果にかかわらずPG-28KRへ渡す | `PUB-POST-APP(F1-DECISION)` |
| PG-28KR F1 canonical post-merge rollup | PG-28KDB／KAPP完了 | AC0／DevOps／同一mergeの両観測artifact | `S5-PUBPOST-Q01`。DBがpath分類に対応するPASS結果、applicationが`EXPECTED_APP_DEPLOYMENT / Confirmed`のときだけPASS | PASSならPG-28L。その他はincident／`FOUNDATION_BLOCKED` | `PUB-POST-ROLLUP(F1-DECISION)` |
| PG-28L Post-pilot canonical currentness | PG-28KR PASS | AC0／PKA／canonical release commit・latest `main` blobs | `S5-F1R-Q01`。reviewed Headとmainの14-file path／blob-hash set、AGENTS＝CLAUDE、surface別SQL Editor disposition、current protected route、正本pointer、外部mutation 0を固定 | PASSならPG-29。Cycle 2ではPG-31G0のauthority入力 | driftは`POST_PILOT_AUTHORITY_DRIFT`で有限停止する。使用済み`F1-DECISION`へ戻らず、new logical publication IDを持つ別Process amendment／Execution ContractをHuman判断へ返す |
| PG-29 Change Surface Register | PG-28L PASS | AC1／PKA／tracked route・prohibition register | `S5-F2a-Q01`。全surfaceが正式routeまたは禁止状態、外部設定0 | `PUB(F2A)`、PASS後PG-30AT | **F2a PR** |

#### Operational capability

| PG | Entry state | AC／primary actor／exact target | QAとGate DoD（handoff artifact） | 次工程 | PR境界 |
|---|---|---|---|---|---|
| PG-30AT F2b contract domain review | `PUB(F2A) PASS`、F2b draft identity固定 | AC0／Tech Lead／narrow Production data path draft | `S5-F2bCV-Q01`。技術成立性、scope、STOP、rollback、Production境界を確認 | PG-30A0 | file変更0 |
| PG-30A0 F2b contract adoption | PG-30AT PASS | AC0／Human／review済みnarrow Production data path contract | `S5-F2bC-Q01`。対象、preview、count、transaction、timeout、rollback、Production validationを採用 | PG-30A1 | PRなし |
| PG-30A1 F2b repository implementation | PG-30A0 PASS | AC1／Fullstack Engineer／approved job・script files | `S5-F2bS-Q01`。任意SQL・汎用RPC・無制限accessなし | PG-30A2 | worktree diff |
| PG-30A2 F2b Local qualification | PG-30A1完了 | AC1／Fullstack Engineer／Local Supabase fixture | `S5-F2bL-Q01`。preview、count mismatch、transaction、冪等、timeout、recovery PASS | PG-30A3 | Local stateをPRへ含めない |
| PG-30A3 F2b Draft publication | PG-30A2 PASS | AC1／Fullstack Engineer／F2b branch・Draft PR | `S5-PUBD-Q01`。exact implementation Head固定 | PG-30A4 | `PUB-DRAFT(F2B-IMPL)` |
| PG-30A4 F2b non-Production rehearsal | PG-30A3 exact Head、AC2承認 | AC2／DevOps／exact non-Production target・job | `S5-F2bX-Q01`。全STOP・postcheck、Production接触0 | PG-30A5 | evidenceをHead非変更で記録 |
| PG-30A5 F2b Ready | PG-30A4 PASS、domain review完了 | AC1／Fullstack Engineer／F2b PR Ready state | `S5-PUBR-Q01`。Head・DoD固定 | PG-30A6 | `PUB-READY(F2B-IMPL)` |
| PG-30A6 F2b independent review | PG-30A5 PASS | AC0／Reviewer／exact F2b Head | `S5-PUBV-Q01`。APPROVED、finding 0 | PG-30A7 | `PUB-REVIEW(F2B-IMPL)` |
| PG-30A7 F2b Human merge | PG-30A6 PASS、base・checks、fresh DB／application attestation、`PATH_PRESENT`時のDB AC3または`PATH_ABSENT`時のN/A closure plan、application AC3 authorization ID current | AC1／Human／approved F2b Head・`main` | `S5-PUBM-Q01`。通常merge、merge commit固定 | PG-30A7DB／PG-30A7APP | `PUB-MERGE(F2B-IMPL)` |
| PG-30A7DB F2b post-merge Production DB Git-trigger observation | PG-30A7 PASS、path分類に対応するDB plan／authorization current | `PATH_PRESENT`: AC3／DevOps／exact merge commit・Production DB deployment metadata。`PATH_ABSENT`: current path identity・exact merge commit・bounded window | `S5-PUBDB-Q01`のpath分岐でbounded windowを固定 | 結果にかかわらずPG-30A7Rへ渡す | `PUB-POST-DB(F2B-IMPL)` |
| PG-30A7APP F2b post-merge application observation | PG-30A7 PASS、application観測承認current | AC3／DevOps／exact merge commit・Vercel Production metadata | `S5-PUBAPP-Q01`。同じbounded windowのapplication deltaを固定 | 結果にかかわらずPG-30A7Rへ渡す | `PUB-POST-APP(F2B-IMPL)` |
| PG-30A7R F2b post-merge rollup | PG-30A7DB／APP完了 | AC0／DevOps／同一mergeの両観測artifact | `S5-PUBPOST-Q01`。DBがpath分類に対応するPASS結果、applicationが`EXPECTED_APP_DEPLOYMENT / Confirmed`のときだけPASS | PASSならPG-30A8。その他はincident／`FOUNDATION_BLOCKED` | `PUB-POST-ROLLUP(F2B-IMPL)` |
| PG-30A8 F2b release identity | PG-30A7R PASS | AC0／PKA／F2b PR Head・release commit・job hash | `S5-F2bI-Q01`。Production利用可能なrelease identity固定 | PG-30A9 | PRなし |
| PG-30A9 F2b Production currentness | PG-30A8 PASS | AC3／DevOps／Production target・control-plane metadata | `S5-F2bP0-Q01`。target、credential route、approver、existing settingsを固定 | 変更必要ならPG-30A10、不要ならPG-30A11 | PRなし |
| PG-30A10 F2b Production preparation | PG-30A9でmutation必要、AC4承認 | AC4／DevOps／exact Production control-plane | `S5-F2bP1-Q01`。job access設定、rollback、deploy 0 | PG-30A11 | 外部settings contract |
| PG-30A11 F2b Production package qualification | PG-30A9 currentまたはPG-30A10完了 | AC3／DevOps／current Production package metadata | `S5-F2bP2-Q01`。AC5-D、release、target、settings、approver、timeout、preview／expected-count identity固定 | PG-30A12 | private package＋public hash |
| PG-30A12 F2b Production validation execution | PG-30A11 PASS、AC5-D exact 1 run承認 | AC5-D／Human／exact narrow Production data job・Human-triggered data-job principal | `S5-F2bE-Q01`。Humanが承認済みprincipalでpreview／expected countを再確認し、exact jobをsingle transactionで1回起動する。schema／migration変更、自動retry、別job 0 | PG-30A12V | 実装PR merge、postcheck、追加修正と結合しない。credential値をHuman／AIへ開示しない |
| PG-30A12V F2b Production read-only postcheck | PG-30A12完了、exact run identity固定 | AC3／DevOps／exact Production job result・audit／managed metadata | `S5-F2bEV-Q01`。SELECT-onlyでresult count、transaction outcome、idempotence evidence、schema／migration変更0、retry 0を確認しevidenceを閉じる | PG-30A13 | write、rerun、rollback起動0。Unknown／partialはblocked stateへ停止 |
| PG-30A13 F2b core closeout | PG-30A12V PASS | AC0／Human／F2b capability evidence | `S5-F2b-Q01`。PASSまたはblocked state、residual risk、next review固定 | PG-30AI0 | PRなし |
| PG-30AI0 F2b-AI disposition | PG-30A13 PASS | AC0／Human／SUP-F11 disposition | `S5-F2bAI0-Q01`。`N/A_WITH_PROHIBITION`または`ADOPT_SEPARATE_CONTRACT`を一意化し、AI trigger／credentialの現状を固定 | `PUB(F2B-CLOSEOUT)`。PASS後、不採用はPG-30BT、採用はPG-30AIT | **F2b Closeout PR** |
| PG-30AIT F2b-AI technical／security contract review | `PUB(F2B-CLOSEOUT) PASS`、adopt、draft identity固定 | AC0／Tech Lead／F2b-AI exact draft | `S5-F2bAIT-Q01`。Goal、自由引数／任意SQL／retry禁止、threat、STOP、rollbackを確認 | PG-30AID | file変更0 |
| PG-30AID F2b-AI operations／reachability review | PG-30AIT PASS | AC0／DevOps／same draft identity | `S5-F2bAID-Q01`。principal、credential、target、approval、audit、revoke、evidence lifecycleを確認 | PG-30AI1 | file変更0 |
| PG-30AI1 F2b-AI contract adoption | PG-30AIT／AID PASS | AC0／Human／review済みF2b-AI contract | `S5-F2bAIC-Q01`。exact allowed job／arguments、Human approval、scope、rollbackを採用 | PG-30AI2 | Production利用未承認 |
| PG-30AI2 F2b-AI repository implementation | PG-30AI1 PASS | AC1／Fullstack Engineer／approved trigger・guard・audit files | `S5-F2bAIS-Q01`。任意SQL、汎用RPC、自由引数、自動retry、broad credential 0 | PG-30AI3 | worktree diff |
| PG-30AI3 F2b-AI Local negative qualification | PG-30AI2完了 | AC1／Fullstack Engineer／Local fixtures | `S5-F2bAIL-Q01`。unauthorized trigger、argument tamper、duplicate／retry、count mismatch、rollbackを検証 | PG-30AI4 | remote接触0 |
| PG-30AI4 F2b-AI Draft publication | PG-30AI3 PASS | AC1／Fullstack Engineer／F2b-AI branch・Draft PR | `S5-PUBD-Q01`。exact Head固定 | PG-30AI5 | `PUB-DRAFT(F2B-AI-IMPL)` |
| PG-30AI5 F2b-AI security domain review | PG-30AI4 exact Head | AC0／Tech Lead／same Head・security evidence | `S5-F2bAIST-Q01`。実装と採用contractの技術／security一致を確認 | PG-30AI6 | file変更0 |
| PG-30AI6 F2b-AI reachability domain review | PG-30AI5 PASS | AC0／DevOps／same Head・credential route | `S5-F2bAIOP-Q01`。Production到達0の状態でprincipal、revoke、audit、target guardを確認 | PG-30AI7 | settings変更0 |
| PG-30AI7 F2b-AI non-Production rehearsal | PG-30AI6 PASS、AC2承認 | AC2／DevOps／exact non-Production target・trigger | `S5-F2bAIX-Q01`。承認／拒否、argument固定、single-run、audit、cleanup、Production接触0 | PG-30AI8 | evidenceをHead非変更で記録 |
| PG-30AI8 F2b-AI Ready | PG-30AI7 PASS、domain review完了 | AC1／Fullstack Engineer／F2b-AI PR Ready state | `S5-PUBR-Q01`。Head、DoD、未解決finding 0 | PG-30AI9 | `PUB-READY(F2B-AI-IMPL)` |
| PG-30AI9 F2b-AI independent review | PG-30AI8 PASS | AC0／Reviewer／exact F2b-AI Head | `S5-PUBV-Q01`。APPROVED、thread 0 | PG-30AI10 | `PUB-REVIEW(F2B-AI-IMPL)` |
| PG-30AI10 F2b-AI Human merge | PG-30AI9 PASS、fresh DB／application attestation、`PATH_PRESENT`時のDB AC3または`PATH_ABSENT`時のN/A closure plan、application AC3 authorization ID current | AC1／Human／approved F2b-AI Head・`main` | `S5-PUBM-Q01`。通常merge、release commit固定 | PG-30AI10DB／PG-30AI10APP | `PUB-MERGE(F2B-AI-IMPL)` |
| PG-30AI10DB F2b-AI post-merge Production DB Git-trigger observation | PG-30AI10 PASS、path分類に対応するDB plan／authorization current | `PATH_PRESENT`: AC3／DevOps／exact merge commit・Production DB deployment metadata。`PATH_ABSENT`: current path identity・exact merge commit・bounded window | `S5-PUBDB-Q01`のpath分岐でbounded windowを固定 | 結果にかかわらずPG-30AI10Rへ渡す | `PUB-POST-DB(F2B-AI-IMPL)` |
| PG-30AI10APP F2b-AI post-merge application observation | PG-30AI10 PASS、application観測承認current | AC3／DevOps／exact merge commit・Vercel Production metadata | `S5-PUBAPP-Q01`。同じbounded windowのapplication deltaを固定 | 結果にかかわらずPG-30AI10Rへ渡す | `PUB-POST-APP(F2B-AI-IMPL)` |
| PG-30AI10R F2b-AI post-merge rollup | PG-30AI10DB／APP完了 | AC0／DevOps／同一mergeの両観測artifact | `S5-PUBPOST-Q01`。DBがpath分類に対応するPASS結果、applicationが`EXPECTED_APP_DEPLOYMENT / Confirmed`のときだけPASS | PASSならPG-30AI11。その他はincident／`FOUNDATION_BLOCKED` | `PUB-POST-ROLLUP(F2B-AI-IMPL)` |
| PG-30AI11 F2b-AI release identity | PG-30AI10R PASS | AC0／PKA／release commit・trigger／guard hash | `S5-F2bAII-Q01`。Production候補artifact identity固定 | PG-30AI12 | PRなし |
| PG-30AI12 F2b-AI Production currentness | PG-30AI11 PASS | AC3／DevOps／Production principal・route metadata | `S5-F2bAIP0-Q01`。target、principal、credential、approval、existing settingsを値非表示固定 | mutation必要ならPG-30AI13、不要ならPG-30AI14 | PRなし |
| PG-30AI13 F2b-AI Production capability preparation | PG-30AI12でmutation必要、AC4承認 | AC4／DevOps／exact principal・credential・route | `S5-F2bAIP1-Q01`。最小scope、revoke、rollback、data run 0 | PG-30AI14 | 外部settings contract |
| PG-30AI14 F2b-AI package qualification | PG-30AI12 currentまたはPG-30AI13完了 | AC3／DevOps／current Production package metadata | `S5-F2bAIP2-Q01`。AC5-D、release、target、job、arguments、approver、single-run identity固定 | PG-30AI15 | private package＋public hash |
| PG-30AI15 F2b-AI exact one-run execution | PG-30AI14 PASS、AC5-D exact 1 run承認 | AC5-D／Human／exact job・preapproved arguments・Human-triggered data-job principal | `S5-F2bAIE-Q01`。Humanが承認済みprincipalでexact job／argumentsを1回起動し、self-approval、argument変更、自動retry、schema変更0。run identity固定 | PG-30AI15V | capability作成承認、postcheck、再実行承認と分離。AI自身のProduction dispatch能力を付与しない |
| PG-30AI15V F2b-AI read-only postcheck | PG-30AI15完了、exact run identity固定 | AC3／DevOps／exact job result・audit／managed metadata | `S5-F2bAIEV-Q01`。SELECT-onlyでjob／arguments／result、preview／expected count、retry 0、schema変更0、auditを確認しevidenceを閉じる | PG-30AI16 | write、rerun、rollback起動0。Unknown／partialはblocked stateへ停止 |
| PG-30AI16 F2b-AI closeout | PG-30AI15V PASS | AC0／Human／F2b-AI evidence | `S5-F2bAI-Q01`。受入またはblocked、residual risk、revoke／review日固定 | `PUB(F2B-AI-CLOSEOUT)`、PASS後PG-30BT | **F2b-AI Closeout PR** |
| PG-30BT F2c contract domain review | `PUB(F2B-CLOSEOUT) PASS`、かつPG-30AI0が`N/A_WITH_PROHIBITION`または`PUB(F2B-AI-CLOSEOUT) PASS`。F2c draft identity固定 | AC0／Tech Lead／periodic review draft・F2b disposition evidence | `S5-F2cCV-Q01`。F2b分岐のcloseout、read-only semantics、scheduler、retention、STOP、rollbackを確認 | PG-30B0 | file変更0 |
| PG-30B0 F2c contract adoption | PG-30BT PASS | AC0／Human／review済みperiodic review contract | `S5-F2cC-Q01`。cadence、surface、owner、retention、scheduler、read-only targetを採用 | PG-30B1 | PRなし |
| PG-30B1 F2c repository implementation | PG-30B0 PASS | AC1／Fullstack Engineer／workflow・report files | `S5-F2cS-Q01`。write／remediation capability 0 | PG-30B2 | worktree diff |
| PG-30B2 F2c Local static QA | PG-30B1完了 | AC1／Fullstack Engineer／workflow fixture | `S5-F2cL-Q01`。schedule、timeout、result、exception contract PASS | PG-30B3 | Local stateなし |
| PG-30B3 F2c Draft publication | PG-30B2 PASS | AC1／Fullstack Engineer／F2c branch・Draft PR | `S5-PUBD-Q01`。exact workflow Head固定 | PG-30B4 | `PUB-DRAFT(F2C-IMPL)` |
| PG-30B4 F2c non-Production scheduler rehearsal | PG-30B3 exact Head、AC2承認 | AC2／DevOps／non-Production scheduler・target | `S5-F2cX-Q01`。scheduled result、failure、retention、Production接触0 | PG-30B5 | evidenceをHead非変更で記録 |
| PG-30B5 F2c Ready | PG-30B4 PASS | AC1／Fullstack Engineer／F2c PR Ready state | `S5-PUBR-Q01`。DoD・domain review完了 | PG-30B6 | `PUB-READY(F2C-IMPL)` |
| PG-30B6 F2c independent review | PG-30B5 PASS | AC0／Reviewer／exact F2c Head | `S5-PUBV-Q01`。APPROVED | PG-30B7 | `PUB-REVIEW(F2C-IMPL)` |
| PG-30B7 F2c Human merge | PG-30B6 PASS、fresh DB／application attestation、`PATH_PRESENT`時のDB AC3または`PATH_ABSENT`時のN/A closure plan、application AC3 authorization ID current | AC1／Human／approved F2c Head・`main` | `S5-PUBM-Q01`。通常merge、release commit固定 | PG-30B7DB／PG-30B7APP | `PUB-MERGE(F2C-IMPL)` |
| PG-30B7DB F2c post-merge Production DB Git-trigger observation | PG-30B7 PASS、path分類に対応するDB plan／authorization current | `PATH_PRESENT`: AC3／DevOps／exact merge commit・Production DB deployment metadata。`PATH_ABSENT`: current path identity・exact merge commit・bounded window | `S5-PUBDB-Q01`のpath分岐でbounded windowを固定 | 結果にかかわらずPG-30B7Rへ渡す | `PUB-POST-DB(F2C-IMPL)` |
| PG-30B7APP F2c post-merge application observation | PG-30B7 PASS、application観測承認current | AC3／DevOps／exact merge commit・Vercel Production metadata | `S5-PUBAPP-Q01`。同じbounded windowのapplication deltaを固定 | 結果にかかわらずPG-30B7Rへ渡す | `PUB-POST-APP(F2C-IMPL)` |
| PG-30B7R F2c post-merge rollup | PG-30B7DB／APP完了 | AC0／DevOps／同一mergeの両観測artifact | `S5-PUBPOST-Q01`。DBがpath分類に対応するPASS結果、applicationが`EXPECTED_APP_DEPLOYMENT / Confirmed`のときだけPASS | PASSならPG-30B8。その他はincident／`FOUNDATION_BLOCKED` | `PUB-POST-ROLLUP(F2C-IMPL)` |
| PG-30B8 F2c release identity | PG-30B7R PASS | AC0／PKA／workflow release identity | `S5-F2cI-Q01`。workflow・query・report hash固定 | PG-30B9 | PRなし |
| PG-30B9 F2c Production package currentness | PG-30B8 PASS | AC3／DevOps／Production scheduler・credential・read-only target metadata | `S5-F2cP0-Q01`。release、query、target、scheduler、credential route、retention、existing settingsを値非表示で固定し、mutation要否を判定 | mutation必要ならPG-30B10、不要ならPG-30B11 | currentness manifest＋hash。設定変更0 |
| PG-30B10 Production scheduler preparation | PG-30B9でmutation必要、AC4承認 | AC4／DevOps／exact Production read-only scheduler・credential settings | `S5-F2cP-Q01`。PG-30B9 manifestを入力に最小read-only route、rollback、write capability 0 | PG-30B11 | 外部settings contract |
| PG-30B11 Scheduled Production observation | PG-30B9 currentまたはPG-30B10完了、AC3承認 | AC3／DevOps／exact Production read-only target・current package identity・approved scheduler principal | `S5-F2cO-Q01`。release／query／target hashを再照合し、scheduled result、exception、follow-up、retention固定 | PG-30B12 | remediation自動開始0 |
| PG-30B12 F2c closeout | PG-30B11完了 | AC0／Human／periodic review capability evidence | `S5-F2c-Q01`。currentness manifest、設定結果、first scheduled cycleを受入またはblocked state固定 | `PUB(F2C-CLOSEOUT)`、PASS後PG-30CT | **F2c Closeout PR** |
| PG-30CT F2d technical contract review | `PUB(F2C-CLOSEOUT) PASS`、F2d draft identity固定 | AC0／Tech Lead／rotation・restore・Break-glass cadence draft | `S5-F2dCTV-Q01`。技術成立性、risk、STOP、rollbackを確認 | PG-30CD | file変更0 |
| PG-30CD F2d operations contract review | PG-30CT PASS | AC0／DevOps／same F2d draft identity | `S5-F2dCDV-Q01`。target、credential、期限、recovery、evidence lifecycleを確認 | PG-30C0 | file変更0 |
| PG-30C0 F2d capability contract | PG-30CT／CD PASS | AC0／Human／review済みrotation・restore・Break-glass cadence contract | `S5-F2dC-Q01`。各target、期限、actor、rollbackを分離して採用。Production Break-glass実行を追加しない | PG-30C1 | PRなし |
| PG-30C1 F2d tracked implementation | PG-30C0 PASS | AC1／PKA／cadence・runbook・evidence files | `S5-F2dS-Q01`。3能力のcontract identity固定、外部実行0 | PG-30C2 | worktree diff |
| PG-30C2 F2d Local static QA | PG-30C1完了 | AC1／PKA／tracked schedules・fixtures | `S5-F2dL-Q01`。期限超過、失効、通常復帰判定を静的確認 | PG-30C3 | Local／external mutation 0 |
| PG-30C3 F2d Draft publication | PG-30C2 PASS | AC1／PKA／F2d branch・Draft PR | `S5-PUBD-Q01`。exact contract Head固定 | PG-30C4 | `PUB-DRAFT(F2D-IMPL)` |
| PG-30C4 F2d Ready | PG-30C3 PASS、domain review完了 | AC1／PKA／F2d PR Ready state | `S5-PUBR-Q01`。Head・DoD固定 | PG-30C5 | `PUB-READY(F2D-IMPL)` |
| PG-30C5 F2d independent review | PG-30C4 PASS | AC0／Reviewer／exact F2d Head | `S5-PUBV-Q01`。APPROVED | PG-30C6 | `PUB-REVIEW(F2D-IMPL)` |
| PG-30C6 F2d Human merge | PG-30C5 PASS、fresh DB／application attestation、`PATH_PRESENT`時のDB AC3または`PATH_ABSENT`時のN/A closure plan、application AC3 authorization ID current | AC1／Human／approved F2d Head・`main` | `S5-PUBM-Q01`。通常merge、release commit固定 | PG-30C6DB／PG-30C6APP | `PUB-MERGE(F2D-IMPL)` |
| PG-30C6DB F2d post-merge Production DB Git-trigger observation | PG-30C6 PASS、path分類に対応するDB plan／authorization current | `PATH_PRESENT`: AC3／DevOps／exact merge commit・Production DB deployment metadata。`PATH_ABSENT`: current path identity・exact merge commit・bounded window | `S5-PUBDB-Q01`のpath分岐でbounded windowを固定 | 結果にかかわらずPG-30C6Rへ渡す | `PUB-POST-DB(F2D-IMPL)` |
| PG-30C6APP F2d post-merge application observation | PG-30C6 PASS、application観測承認current | AC3／DevOps／exact merge commit・Vercel Production metadata | `S5-PUBAPP-Q01`。同じbounded windowのapplication deltaを固定 | 結果にかかわらずPG-30C6Rへ渡す | `PUB-POST-APP(F2D-IMPL)` |
| PG-30C6R F2d post-merge rollup | PG-30C6DB／APP完了 | AC0／DevOps／同一mergeの両観測artifact | `S5-PUBPOST-Q01`。DBがpath分類に対応するPASS結果、applicationが`EXPECTED_APP_DEPLOYMENT / Confirmed`のときだけPASS | PASSならPG-30C7。その他はincident／`FOUNDATION_BLOCKED` | `PUB-POST-ROLLUP(F2D-IMPL)` |
| PG-30C7 F2d release identity | PG-30C6R PASS | AC0／PKA／cadence release commit・artifact hash | `S5-F2dI-Q01`。rehearsal入力identity固定 | PG-30C8 | PRなし |
| PG-30C8 Rotation non-Production rehearsal | PG-30C7 PASS、AC2承認 | AC2／DevOps／exact non-Production credential | `S5-F2dRN-Q01`。rotate、old失効、new scope、通常復帰PASS | PG-30C9 | Production credential非変更 |
| PG-30C9 Production rotation currentness | PG-30C8 PASS | AC3／DevOps／Production credential metadata・PG-30C0 disposition | `S5-F2dR0-Q01`。credential identity、owner、scope、expiry、old residual、rotation要否、release hashを値非表示で固定 | rotation必要ならPG-30C10、不要ならPG-30C11 | currentness manifest＋hash。credential変更0 |
| PG-30C10 Production rotation control-plane | PG-30C9でrotation必要、AC4承認 | AC4／DevOps／exact Production credential | `S5-F2dRP-Q01`。PG-30C9 manifestを入力にrotation、rollback、old credential失効 | PG-30C11 | 外部Production contract |
| PG-30C11 Production rotation postcheck | PG-30C9で不要またはPG-30C10完了 | AC3／DevOps／Production credential metadata・currentness identity | `S5-F2dRV-Q01`。release／credential identity、expiry、scope、old residual 0を値非表示で再照合 | PG-30C12 | PRなし |
| PG-30C12 Restore cadence rehearsal | PG-30C11 PASS | AC2／DevOps／exact disposable non-Production restore target | `S5-F2dRS-Q01`。cadence内restore、integrity、cleanup、通常復帰PASS | PG-30C13 | Production dataなし |
| PG-30C13 Break-glass cadence rehearsal | PG-30C12 PASS | AC2／DevOps／exact non-Production Break-glass path | `S5-F2dBG-Q01`。期限、audit、revoke、residual 0、通常復帰PASS | PG-30C14 | Production access発行0 |
| PG-30C14 F2d rollup | PG-30C8、C9、C11、C12、C13 PASS。PG-30C10はrotation必要時PASS、不要時はPG-30C9 identity付き`NOT_REQUIRED_BY_CLASSIFICATION` | AC0／Human／rotation・restore・Break-glass evidence | `S5-F2d-Q01`。Production currentness manifestを含む3能力のcadence受入またはblocked state固定 | `PUB(F2D-CLOSEOUT)`、PASS後PG-31A0 | **F2d Closeout PR** |

#### Cycle 2と最終受入

| PG | Entry state | AC／primary actor／exact target | QAとGate DoD（handoff artifact） | 次工程 | PR境界 |
|---|---|---|---|---|---|
| PG-31A0 Cycle 2 opportunity currentness | `PUB(F2D-CLOSEOUT) PASS`、Cycle 1 accepted。initialまたは後日candidate確認時 | AC0／Tech Lead／Cycle 1・F2d・foundation currentness・独立candidateまたは明示的不在 | `S5-PC2R-Q01`。current route、baseline、Staging、Production package前提とcandidate availabilityを固定 | candidate currentならPG-31A。不在なら`MISSION_ACCEPTANCE_PENDING / SECOND_CYCLE_NOT_AVAILABLE`で有限停止し、後日新identityでPG-31A0を再実施 | PRなし |
| PG-31A Cycle 2 candidate adoption | PG-31A0 PASS | AC0／Human／独立実需candidate | `S5-PCG-Q01`。Cycle 1と別candidate、base、metric、rollback、expiry、Data API三層影響固定 | PG-31B1 | candidate identity変更時はPG-31A0へ戻る |
| PG-31B1 Cycle 2 implementation | PG-31A PASS | AC1／Fullstack Engineer／Cycle 2 tracked files | `S5-CAND-S-Q01`。承認scopeとData API三層diff固定 | PG-31B2 | worktree diff |
| PG-31B2 Cycle 2 Local qualification | PG-31B1完了 | AC1／Fullstack Engineer／Local Supabase | `S5-C1-Q01` candidate mode、`S5-DAPI-Q01(Local candidate)`。migration・test・new app＋old DB／new app＋new DB・cleanup PASS | PG-31B3 | Local state非追跡 |
| PG-31B3 Cycle 2 Draft publication | PG-31B2 PASS | AC1／Fullstack Engineer／Cycle 2 branch・Draft PR | `S5-PUBD-Q01`。exact Head固定 | PG-31B4 | `PUB-DRAFT(CYCLE-2)`／**Cycle 2 Candidate PR** |
| PG-31B4 Cycle 2 trusted hosted CI | PG-31B3 exact Head、current workflow release、AC2承認 | AC2／DevOps／default branch trusted workflow release identity＋Cycle 2 artifact identity | `S5-C2bC-Q01`、`S5-C2bP-Q01(candidate)`、`S5-DAPI-Q01(Candidate CI)`。default branchへdispatchし`run.head_sha=workflow release commit`、typed input／checkout HEAD／PR current Head=Cycle 2 Head、workflow／trust-root hash、separate publisher identity、expected result source、三層result、new app＋old DB compatibilityをCycle 1 evidenceから独立確認 | PG-31C | Head／workflow release変更時PG-31B1／PG-11I。candidate ref workflowと暗黙PR runを使わない |
| PG-31C Cycle 2 Staging deploy | PG-31B4 PASS、current Staging package、AC2承認 | AC2／DevOps／exact Staging target | `S5-E1-Q01`。same Headを1回deploy、Production接触0 | PG-31D | evidenceをHead非変更で記録 |
| PG-31D Cycle 2 Hosted QA | PG-31C PASS | AC2／Fullstack Engineer／deployed Cycle 2 candidate | `S5-D2b-Q01`、`S5-DAPI-Q01(Staging candidate)`。三層result、new app＋new DB journey、cleanup PASS | PG-31E1 | failureはPG-31DR0。直接実装へ戻らない |
| PG-31DR0 Cycle 2 failure identity freeze | PG-31D failure | AC0／PKA／Cycle 2 candidate・deployment・failure・cleanup evidence | `S5-D2bR0-Q01`。failureとfixture cleanup identityを固定 | PG-31DR1 | schema／history復元と区別 |
| PG-31DR1 Cycle 2 applied-state attestation | PG-31DR0 PASS | AC2／DevOps／exact Staging migration history・schema metadata | `S5-D2bR1-Q01`。適用済みmigration、schema、history、fixture stateをread-only固定 | PG-31DR2 | mutation 0 |
| PG-31DR2 Cycle 2 remediation design | PG-31DR1 PASS | AC0／Tech Lead／same failure・applied-state identity | `S5-D2bR2-Q01`。additive correction／disposable recreation／same identity evidence-only 1回／blockedを定義 | PG-31DR3 | 適用済みmigration不変 |
| PG-31DR3 Cycle 2 remediation authorization | PG-31DR2 PASS | AC0／Human／review済みroute | `S5-D2bR3-Q01`。一経路、再実行上限、戻りGateを採用 | additiveはPG-31B1、recreateはPG-13A後PG-31A0、same identityはPG-31Dを1回、判断不能はblocked | 自動loop禁止 |
| PG-31E1 Cycle 2 Ready | PG-31B4〜D PASS、domain review完了 | AC1／Fullstack Engineer／Cycle 2 PR Ready state | `S5-PUBR-Q01`。candidate／trusted workflow二identity、Head、PG-12C2／12V2 currentness固定 | PG-31EV0 | `PUB-READY(CYCLE-2)` |
| PG-31EV0 Cycle 2 Production application expected-deployment preflight | PG-31E1 PASS、PG-12V2 current | AC3／DevOps／Vercel project・current Git-trigger・Cycle 2 Head・current base・通常merge方式 | `S5-VAPP-P0-Q01`。resulting normal-merge commitをsourceとする1 deploymentのexpected source rule、期待Current／alias／domain、rollback、unrelated active／pending 0とzero-business-data smokeのexact route／method／no-token境界を固定 | PG-31E2 | mutation 0。future merge SHAは固定しない。証明不能はSD-05別契約へ停止 |
| PG-31E2 Cycle 2 independent review | PG-31EV0 PASS | AC0／Reviewer／exact Cycle 2 Head | `S5-PUBV-Q01`。APPROVED、thread 0 | PG-31E3 | `PUB-REVIEW(CYCLE-2)` |
| PG-31E3 Cycle 2 Human merge | PG-31E2 PASS、fresh checks・base・PG-12C2／12V2、`PATH_PRESENT`時はPG-31E4 AC3、`PATH_ABSENT`時はN/A closure plan、PG-31E5 AC3 authorization ID固定 | AC1／Human／approved Cycle 2 Head・`main` | `S5-PUBM-Q01`。fresh DB `EXPECTED_DB_EFFECT = NONE` attestationとapplication expected-effect attestationを確認し、GitHub repositoryだけを通常mergeしてmerge commitを固定 | PG-31E4／PG-31E5 | `PUB-MERGE(CYCLE-2)` |
| PG-31E4 Cycle 2 post-merge Production DB Git-trigger observation | PG-31E3 PASS、path分類に対応するDB plan／authorization current | `PATH_PRESENT`: AC3／DevOps／exact merge commit・Production DB deployment metadata。`PATH_ABSENT`: current path identity・exact merge commit・bounded window | `S5-PUBDB-Q01`のpath分岐でbounded windowを固定 | 結果にかかわらずPG-31E6へ渡す | `PUB-POST-DB(CYCLE-2)` |
| PG-31E5 Cycle 2 post-merge application observation | PG-31E3 PASS、application観測承認current | AC3／DevOps／exact merge commit・Vercel Production metadata | `S5-PUBAPP-Q01`。同じbounded windowのapplication deltaとexpected effect一致を固定 | 結果にかかわらずPG-31E6へ渡す | `PUB-POST-APP(CYCLE-2)` |
| PG-31E6 Cycle 2 post-merge rollup | PG-31E4／E5が同一merge commitについて完了 | AC0／DevOps／DB・application観測artifact | `S5-PUBPOST-Q01`。DBがpath分類に対応するPASS結果、applicationが`EXPECTED_APP_DEPLOYMENT / Confirmed`のときだけPASS | PASSならPG-31F。その他はincident／`FOUNDATION_BLOCKED` | `PUB-POST-ROLLUP(CYCLE-2)` |
| PG-31F Cycle 2 Merge Identity | PG-31E6 PASS | AC0／PKA／Cycle 2 release identity | `S5-MIG-Q01`。tree、candidate、migration、workflow hash、QA継承範囲固定 | 同値ならPG-31FV0、影響ありPG-31FR0 | PRなし |
| PG-31FR0 Cycle 2 reverification impact decision | PG-31Fで同値未証明 | AC0／Tech Lead／Cycle 2 release commit・impact manifest | `S5-MIGR0-Q01`。C1、CI、Staging、Hosted QAの必要／N/AをCycle 2 identityへ理由付き固定 | PG-31FR1 | Cycle 1証拠を継承しない |
| PG-31FR1 Cycle 2 release Local revalidation | PG-31FR0でLocal対象 | AC1／Fullstack Engineer／Cycle 2 release commit・Local Supabase | `S5-MIGRL-Q01`。影響Local QA PASS。非対象はimpact N/A | PG-31FR2 | repository修正0 |
| PG-31FR2 Cycle 2 release hosted CI revalidation | PG-31FR1完了／理由付きN/A、PG-31FR0でCI対象 | AC2／DevOps／Cycle 2 release commit hosted run | `S5-MIGRC-Q01`。影響CI PASS、exact run identity固定。非対象はimpact N/A | PG-31FR3 | PRなし |
| PG-31FR3 Cycle 2 release Staging redeploy | PG-31FR2完了／理由付きN/A、PG-31FR0でE1対象 | AC2／DevOps／Cycle 2 release commit・Staging | `S5-MIGRS-Q01`。exact releaseを1回deploy、Production接触0。非対象はimpact N/A | PG-31FR4 | PRなし |
| PG-31FR4 Cycle 2 release Hosted QA | PG-31FR3完了／理由付きN/A、PG-31FR0でD2b対象 | AC2／Fullstack Engineer／Cycle 2 release deployment | `S5-MIGRH-Q01`。影響journey・cleanup PASS。非対象はimpact N/A | PG-31FR5 | PRなし |
| PG-31FR5 Cycle 2 reverification rollup | PG-31FR1〜R4完了／理由付きN/A | AC0／Tech Lead／Cycle 2 revalidation manifest | `S5-MIGR-Q01`。Data API三層を含むQA継承範囲をCycle 2 releaseへ再固定 | repository修正0ならPG-31FV0、corrective candidateはPG-31A0 | 修正時は新Cycle 2 Corrective Candidate PR |
| PG-31FV0 Cycle 2 application package currentness | PG-31FまたはPG-31FR5 PASS、PG-31EV0／PG-31E5 manifest current | AC3／DevOps／Cycle 2 release・Vercel expected deployment metadata | `S5-VAPP-B0-Q01`。release、settings、merge-triggered deployment identity、rollback、active／pending、PG-12V2、zero-data smoke identity固定 | PG-31FV1 | manual deploy 0。driftはPG-12V0またはPG-31EV0へ戻る |
| PG-31FV1 Cycle 2 merge-triggered application deployment adoption | PG-31FV0 PASS | AC0／Human／exact Cycle 2 release・PG-31E5 expected deployment evidence | `S5-VAPP-B-Q01`。Humanがexact merge-triggered deploymentをapplication acceptance対象として採用し、manual deploy／redeploy／settings変更／AC5-Aを`NOT_AUTHORIZED`のまま維持する | PG-31FV2 | evidence adoptionだけ。外部mutation 0 |
| PG-31FV2 Cycle 2 application deployment currentness observation | PG-31FV1 PASS | AC3／DevOps／exact Vercel Production deployment metadata | `S5-VAPP-O-Q01`。source commit＝Cycle 2 release、READY／Current、alias／domain、single deployment、想定外settings／alias delta 0を再確認 | PG-31FV3 | DB write／redeploy 0 |
| PG-31FV3 Cycle 2 zero-business-data smoke | PG-31FV2 PASS、PG-31EV0 smoke manifest current | AC3／Fullstack Engineer／exact Current Production application route | `S5-VAPP-S-Q01`。token／cookie／record／body／Data API／Server Action mutation 0、許可metadataとerrorだけを確認 | PG-31FV4 | zero-data証明不能なら実行せずSD-05別契約へ停止 |
| PG-31FV4 Cycle 2 application acceptance | PG-31FV0〜V3 PASS | AC0／Human／Cycle 2 application evidence | `S5-VAPP-A-Q01`。application release受入またはblocked。DB authorizationを付与しない | PASSならPG-31G0 | failure時PG-31G0以降禁止 |
| PG-31G0 Cycle 2 Production package currentness | PG-31FV4 PASS、PG-28Lのpost-pilot canonical currentness PASS | AC3／DevOps／current Production package metadata | `S5-E2P0-Q01`。PG-24S11を無条件継承せず、PG-28Lのcurrent route／canonical release、PG-03A feasibility、visibility／feature／approver permission／self-review／quorum／approved alternativeを再計算し、C3c、workflow、Environment、credential、approver、target、active／pendingとmanifest identity／hashを照合。不成立は`FOUNDATION_BLOCKED` | currentならPG-31G2、settings driftならPG-31G1 | PRなし |
| PG-31G1 Cycle 2 Production settings correction | PG-31G0 drift、AC4承認 | AC4／DevOps／exact drifted Production settings | `S5-E2PA-Q01`。必要settingsだけ修正、rollback、deploy 0 | PG-31G2 | 外部Production contract |
| PG-31G2 Cycle 2 Production package qualification | PG-31G0 currentまたはPG-31G1完了、PG-03A current feasibility PASS、PG-28L current | AC3／DevOps／post-correction Production metadata | `S5-E2P-Q01`。AC5-S、PG-28Lのcanonical authority release、route selection、current feasibility manifest identity／hashを含むnew execution-package manifest固定。settings driftはPG-03A／PG-15A／PG-31G1へ戻し、authority driftは`POST_PILOT_AUTHORITY_DRIFT`で停止してnew logical publication IDの別Process amendmentへ返す | PG-31H | PRなし |
| PG-31H Cycle 2 Production execution | PG-31G2 PASS、AC5-S exact 1 run承認、同一candidateのSQL Editor適用履歴0 | AC5-S／Human／Cycle 2 release・Production target・Human-triggered protected schema deploy principal | `S5-E2X-Q01`。Humanが承認済みprincipalでschema／migration candidateを1回適用し、managed data job、SQL Editorへの自動切替、自動retry、追加操作0。run identity固定 | PG-31HV | merge、postcheck、settings変更と結合しない。credential値をHuman／AIへ開示しない |
| PG-31HV Cycle 2 Production read-only postcheck | PG-31H完了、exact run identity固定 | AC3／DevOps／Cycle 2 Production result・history／managed metadata | `S5-E2XV-Q01`。SELECT-onlyでmigration result、history、managed postcheck、unexpected change 0を確認しevidenceを閉じる。write、retry、rollback起動0 | PG-31I | drift／partial／Unknownはblocked stateへ停止 |
| PG-31I Cycle 2 closeout | PG-31HV PASS | AC0／Human／Cycle 1・2独立evidence | `S5-F2e-Q01`、`S5-PCL-Q01`。成功時だけ`CYCLE_2_ACCEPTED`、failure／partialはblocked | `PUB(CYCLE-2-CLOSEOUT)`、PASS後PG-32A | **Cycle 2 Closeout PR** |
| PG-32A Final evidence assembly | `PUB(CYCLE-2-CLOSEOUT) PASS` | AC0／PKA／SUP-F01〜F11・Mission DoD evidence register | `S5-F2fA-Q01`。trace完全、blocker・例外を明示 | PG-32B | PRなし |
| PG-32B Final technical domain review | PG-32A PASS | AC0／Tech Lead／same final register identity | `S5-F2fT-Q01`。技術成立性、baseline、risk、未解決High riskを判定 | PG-32C | file変更0 |
| PG-32C Final operations domain review | PG-32B PASS | AC0／DevOps／same final register identity | `S5-F2fD-Q01`。target、credential、recovery、operation evidenceを判定 | PG-32D | file変更0 |
| PG-32D Final independent review | PG-32C PASS | AC0／Reviewer／same final register identity | `S5-F2fV-Q01`。独立判定、unresolved finding 0または明示例外候補 | PG-32E | file変更0 |
| PG-32E Human final acceptance | PG-32D PASS | AC6／Human／Mission acceptance state | `S5-F2f-Q01`。受入またはowner・期限・riskを持つ例外／blocked state固定 | `PUB(FINAL-ACCEPTANCE)`、PASS後`MISSION_ACCEPTED` | **Final Acceptance PR** |

### 5.3 PRとProcess Gateの共通境界

1. Process GateはEntry／QA／DoD／Human判断の境界、PRはtracked artifactのpublication境界であり、同一概念ではない。
2. `PR-00`、`PR-02A`等はprocess version内で一意かつ再利用禁止のlogical publication IDであり、GitHub PR番号、URL、branch名ではない。実PR作成時にrepository、actual PR番号／URL、base、head branch、exact Head SHAをmappingし、GitHubをcurrent stateの正とする。N/A／SUPERSEDEDでも理由を残し、IDを別PRへ再割当しない。
3. 一つのPRには一つの主mutation domainとrollback境界だけを置く。少なくとも、workflow実装とGitHub settings、Staging projectとapplication binding、Environment保護とcredential登録、candidate実装とpilot closeout、Production準備とProduction実行、Recovery ContractとBreak-glass Contract、各contractと外部rehearsalを混在させない。
4. 外部settingsはPRによって実行されない。必要な場合は専用Execution ContractとHuman承認で適用し、before／after／rollback／auditをHead非変更の記録または別closeout PRへ残す。
5. Candidate PRはLocal／CI／Staging／Hosted QAの間、exact Headを変更しない。変更時はCandidate実装Gateへ戻る。Reviewer APPROVED後はHumanがGitHub repositoryだけをmergeし、DB／applicationの独立観測、同一merge identityの`PUB-POST-ROLLUP`、Merge Identityの順にPASSするまでProduction application／DBまたは次Process Gateへ進まない。
6. Human merge直前にC3cとVercel Git-trigger evidenceをfresh再確認し、Production DBは有限管理surface上で`PATH_ABSENT / Confirmed`、Supabase GitHub repository連携なし・branchなし、Human operational attestation、merge開始から対応`PUB-POST-DB`完了までのchange freeze、`EXPECTED_DB_EFFECT = NONE`を確認する。`PATH_PRESENT`時はpost-merge DB metadata観測planとAC3 Human authorization IDを、`PATH_ABSENT`時はcurrent path identity・actual merge commit・bounded windowによる`NOT_APPLICABLE_BY_PATH_ABSENCE` closure planをmerge前に固定する。後者はschema全体またはDB全体の不変を主張しない。applicationはapproved Head SHA、current base SHA、通常merge方式とresulting merge commitをsourceとする想定済み1 deploymentのexpected source rule、期待Current／alias／domain、unrelated active／pending 0を証明する。管理外で具体的兆候のないDB経路は`NotCompared`であり、全経路の不存在を推定しない。Head／base／merge方式／Git-trigger設定の変更、有限surfaceの`PATH_ABSENT`未成立、既知のDB変更、freeze不成立、Unknown、path分類に対応する観測plan／authorization未確定ならmergeせず、DBはPG-12C0、applicationはPG-12V0へ戻る。actual merge commit SHAはmerge後に固定する。
7. merge commitがPR Headと異なる場合も、PR Headがmerge commitのancestorであるだけではQA継承を確定しない。tree、migration hash、candidate manifestとbase driftを確認し、差分があればPG-24R0で影響を決め、PG-24R1〜R4の必要QAを実施してPG-24R5でrollupする。
8. mergeによるProduction DB deployはPG-00C0／PG-12C0で有限管理surfaceを分類し、`PATH_PRESENT / Confirmed`の場合だけ別AC4承認のPG-00C1／PG-12C1で無効化・unlink・分離する。PG-00C2は、`PATH_ABSENT / Confirmed`の分類に影響する有限management surfaceの設定変更がないことをread-onlyで再current化するだけを担う。Human operational attestation、change freeze、`EXPECTED_DB_EFFECT = NONE`、path分類に対応するpost-merge DB plan／authorizationはPG-00Mのmerge準備・Human判断で固定する。PG-12C2以降の恒久lineageでも同じ責任分離とpath分岐を維持する。`PATH_PRESENT`時だけDBはpost-merge AC3 metadata観測を行い、`PATH_ABSENT`時はcurrent path identity・actual merge commit・bounded windowで`NOT_APPLICABLE_BY_PATH_ABSENCE / Confirmed`として閉じ、schema全体またはDB全体の不変を主張しない。Production applicationは、2026-07-23のHuman判断によりPG-00V2／PG-12V2でcurrent Git-triggerとexpected effectを固定し、GitHub mergeからexact 1 deploymentが発生する現行経路を維持する。すべてのpublicationはmerge後にDB／applicationを独立観測し、同一merge identityの`PUB-POST-ROLLUP`がpath分類に対応するDB結果とapplication `EXPECTED_APP_DEPLOYMENT / Confirmed`を確認して初めてterminal PASSとなる。candidateは旧DB／新DB双方と後方互換でなければLow riskとしない。current routeではmerge-triggered deploymentをE0Aで受入れ、manual deploy／redeploy／AC5-Aは行わない。Production DB deployはPG-24S11でpilot route正本化後のAC5-Sとして別Human承認を必要とし、Humanだけが承認済みruntime principalを起動する。DevOpsは別AC3 Gateでread-only post-checkとevidence closureを行い、PG-26までDB変更0件を維持する。
9. QA／domain review後にHead、workflow、target、credential configuration、candidate、artifact hashが変われば、影響するPGを`SUPERSEDED`とし、新identityで再実施する。

## 6. S5-0 Program Gate Contract

### Goal／要件

Mission §12.1を段階別gateへ割り当て、どの条件が未充足でも、どこまでplan／foundationを進められるかを一意にする。

| ID | 要件 |
|---|---|
| S5-0-R01 | SUP-I、SUP-F、SDの全IDをsub-sliceへ対応付ける |
| S5-0-R02 | 各sub-sliceのentry Human gate、実行role、成果物、DoD、QA、STOPを確定する |
| S5-0-R03 | Production read-only、control-plane準備、Production executionを別authorizationにする |
| S5-0-R04 | reference原本の保管、private evidence、public evidenceのlifecycleを決める |

Mission §12.1の条件は次の最初のgateへ割り当てる。

以下はMission §12.1.2の実行traceabilityであり、Missionの開始条件を独自に変更しない。不一致がある場合はMissionを優先して停止し、両文書を同じProcess Contract PRで再同期する。

| Mission開始条件 | 最初に必須となるgate／slice | それ以前に許可できる範囲 |
|---|---|---|
| MissionのGoal／scope／risk承認 | S5-0 | 承認済み事実として確認のみ |
| 非Supabase必須slice完了／例外 | S5-0→A1 | 例外が未承認ならA1開始前に停止 |
| repository／baseline／worktree／owner／publication境界 | 全Execution Contract | plan draftは可能、実行不可 |
| 外部状態read-only scope／authorization | A1 AC0 | repository read-onlyだけ |
| reference原本の保管方針 | S5-0 | 未決なら期限・owner付き暫定保持のみ |
| Production／Staging／application target identity | A2-T0／T1、D1a／D1b、各Hosted PG | A2-P／B1等のrepository設計だけ |
| Tech Lead／DevOps／Reviewer／Human割当 | 各slice開始 | plan draftだけ |
| current Docs／Changelog／CLI／plan制約 | 各slice開始直前 | 古いsnapshotをcurrent事実にしない |
| required reviewer／別Human approverの実現可能性 | PG-03A。PG-15AとProduction package作成前にcurrent再確認 | approver／secretを使わないrepository設計だけ |
| pilot限定protected schema routeと現行SQL Editor fallbackの関係を03／04を含むexact 14-file正本へ一貫して反映し、03／04の内容責任者review、DevOps domain review、Human採用、独立review、Human merge、post-merge両surface観測、main currentnessを完了 | E2-G／PG-24S0〜PG-24S11。PG-25Aより前 | 正本変更案の作成・reviewだけ。current SQL Editor経路を一般則／fallbackとして維持し、pilot例外から一般remote writeを許可せず、settings、credential、deploy、DB writeを行わない |
| pilot後のSQL Editor dispositionとprotected routeの通常／fallback／禁止を同じexact 14-file正本群へ反映し、同じ内容責任者review、DevOps domain review、Human採用、独立review、Human merge、post-merge両surface観測、main currentnessを完了 | F1／PG-28〜PG-28L。PG-29およびCycle 2のProduction packageより前 | PG-28のHuman判断と正本変更案の作成・reviewだけ。未発効decisionをcurrent authorityとして使わず、settings、credential、deploy、DB writeを行わない |
| Production credential非到達設計 | B3a、必要時B3b | credentialを使わないA1／A2-P／B1だけ |
| 未解決High riskの除外 | 各mutation gate | 対象外として明示した低risk foundationだけ |
| 各導入段階の最初のlow-risk変更、metric、rollback | 各導入段階の最初のmutation Gate。Pilot Candidate Gateで再適用 | plan／read-only確認だけ |

今回に限り、A1／実在PR #17は本process採用前に開始済みのbootstrap入力である。PG-00Aで証拠を集約し、PG-00BでHumanがA1を受入れる。merge前に現行正本下の別Execution ContractとHuman承認でPG-00C0により有限なProduction DB Git-trigger経路を分類し、PG-00C2で`PATH_ABSENT / Confirmed`のcurrentnessだけを再確認する。PG-00MでHuman operational attestation、PG-00M開始からPG-00P0完了までのchange freeze、`EXPECTED_DB_EFFECT = NONE`、path分類に対応するmerge後DB plan／authorizationとapplication観測plan／AC3承認を固定し、HumanがPR #17をmergeする。PG-00V0〜V2ではVercel Production applicationをcurrent Git-triggerによる`deployment_effect=EXPECTED_SINGLE_DEPLOYMENT`として別々に固定する。PG-00P0／PG-00P1は結果にかかわらず独立観測を完了し、PG-00P2がpath分類に対応するDB結果とapplication `EXPECTED_APP_DEPLOYMENT / Confirmed`をrollupしてから、最新`main`上にPG-01のProcess Contract PRを作る。過去作業やこれらbootstrap Gateを本書で遡及authorizationせず、`PUB(PR-00) PASS`後の最初の新規実行gateをPG-02とする。

### DoD／QA

- [ ] Mission IDの未対応0件。
- [ ] AC0〜AC6（AC5-A／AC5-S／AC5-Dを含む）の開始権限と禁止操作が相互に競合せず、PG-00AからPG-32Eのsuffix／subgateを含む各Gate DoDが次GateのEntryへ解決する。
- [ ] 依存cycleがなく、各sliceがPASS、BLOCKED、または正式なpending stateで有限に閉じる。
- QA: authority walk-throughで、任意の外部mutationから直前のHuman gateとExecution Contractを逆引きできること。
- STOP: Missionの意味変更、role権限追加、現行正本との矛盾が必要ならHumanへ差し戻す。

## 7. Macro A — Current State／Baseline

### 7.1 S5-A1 Environment／Platform Inventory

**Goal:** 値非表示のread-only証拠で、environment、application target、plan機能、member／role、credential surface、MCP、GitHub integration、backup／recovery能力のKnown／Unknownを確定する。

**要件:**

- A1-R01: Production、Staging／Preview、Local、tracked `remote`の用途と相互関係を分離する。ADR-0008上の`remote=Human確認済みdev project`を、application接続の事実でProductionへ読み替えない。
- A1-R02: project、Reference ID、hostname、port、database、roleを別fieldで扱う。
- A1-R03: plan、Postgres major、region、backup／PITR、Access Control、MFA、Network Restrictions、Temporary Accessの利用可否をcurrent公式仕様と実状態で区別する。
- A1-R04: secret値、business data、Production DB queryを取得しない。
- A1-R05: private packetと公開review recordを分離する。
- A1-R06: target別のData API exposed schema設定とcurrent Changelog applicabilityを`Confirmed / Unknown / Inaccessible`で記録する。DB queryを伴わないA1ではGRANT／RLSを`NotCompared`とし、欠落を推定で埋めない。

**DoD:** inventory対象は`Confirmed / Unknown / Inaccessible`のいずれかで、確認不能を安全と推定していない。private evidenceのhash、mode、review identity、retentionが一致し、必須4 roleであるTech Lead／DevOps／Reviewer／Humanの責任境界が一意である。Fullstack Engineerの実行可能性advisoryは追加できるが、必須4 roleへ算入せずHumanを置換しない。

**QA:** target 6項目のfield completeness、公式plan機能、Data API exposure／Changelog applicability、public leakage scan、private hash／mode／ignore／non-symlink検査を行う。secret値、Production data、権限外操作が必要ならSTOPする。

**Exit:** HumanがA1を受入れ、A2-P／A2-T0／B1／B3aのplan作成を個別に判断する。

### 7.2 S5-A2-P Managed Baseline Plan

**Goal:** fixed Headのmigration manifestから、Production全体ではなく、repositoryが明示的に管理する有限surfaceのManaged Object Register contractとUnknown Sentinel contractを設計する。

**要件:**

- A2P-R01: migration file一覧、hash、versionをfixed Headから動的`N/N`で固定する。
- A2P-R02: Register entryへmanaged object ID、surface、expected identity／final state、source migration／statement、introduced／modified／removed provenance、expected presence／absence、比較fieldを記録する。
- A2P-R03: schema、`pgcrypto`本体、managed table／column／type／default／nullability／constraint／index／routine／trigger／RLS／policy／ACL／expected absenceだけを基本surfaceとする。
- A2P-R04: generic `pg_depend` closure、全extension object、PostgreSQL全surface比較、dump／pull／diff／repairを禁止する。
- A2P-R05: Sentinelの有限surfaceと、対象外`Surface NotCompared`を明示する。

**DoD:** migration `N/N`がRegister sourceへ追跡され、未収録surfaceをMatch扱いしていない。SQL candidate、DB接続、evidence root作成は別承認まで0件である。

**QA:** migration statement coverage、duplicate managed identity、expected absence、surface allowlist、Mission SUP-I03とのtraceabilityを静的reviewする。汎用Comparatorが必要なら別sliceへ送りSTOPする。

### 7.3 S5-A2-T0 Production Target Attestation Contract

**Goal:** Production-serving applicationのcurrent targetと、将来のA2-Rが観測するexact projectを、DB query前に確定するためのattestation手順を設計する。

**要件:**

- A2T-R01: application、Vercel Environment、Supabase project、tracked profileを同一概念として推定しない。
- A2T-R02: exact 6項目、Postgres major、read-only actor、観測surface、取得不能範囲を定義する。
- A2T-R03: targetが不明または複数候補ならA2-Rを開始しない。
- A2T-R04: Production read-only観測の必要性とdata最小化をSD-05のHuman判断へ渡す。

**DoD／QA:** `S5-A2T0-Q01`。確認surface、actor、取得field、private evidence、negative scenario、STOP、A2-T1のHuman gateが固定され、外部接続、DB query、evidence取得0件である。metadata確認だけでProduction schemaを比較済みと扱わない。

### 7.4 S5-A2-T1 Production Target Attestation Execution

**Authorization:** AC3。A2-T0 contract、exact external surface、private evidence、取得項目、停止条件、Humanのread-only確認承認を必要とする。

**Goal:** Production-serving applicationのcurrent targetと、A2-Rが観測するexact projectを、DB query前に実証する。

**要件:** application、Vercel Environment、Supabase project、tracked profileを独立に照合し、project、Reference ID、Database hostname、port、database、role、Postgres major、read-only actorを固定する。targetが不明、複数候補、またはProduction／devの分離に矛盾があればA2-Rを開始しない。

**DoD／QA:** `S5-A2T1-Q01`。exact target 1件、取得不能範囲、evidence hash、review identityが一致し、外部設定変更、DB query、secret値取得0件である。

### 7.5 S5-A2-R Limited Production Read-only Observation

**Authorization:** AC3。C1-Bのsame-Head desired artifact、A2-P Register、A2-T1 attestation、Tech Lead／DevOps review、SD-05 Human承認を必要とする。

**Goal:** hosted migration historyとRegister掲載objectだけを、business dataを取得せずread-only比較する。

**要件:**

- A2R-R01: hosted historyはtable存在、version集合、件数を比較し、SQL本文を取得・推定しない。
- A2R-R02: Managed Object Register identity、field、server-side digest、presence／absenceだけを比較する。
- A2R-R03: raw routine／policy／trigger definitionが必要なら別契約へSTOPする。
- A2R-R04: Sentinel内unattributed objectは`NotCompared / Unknown`、対象外surfaceは`Surface NotCompared`とする。
- A2R-R05: `db pull`、`db diff`、`db dump`、`pg_dump`、`migration repair`、write、追加自動調査を行わない。

**DoD:** execution、History、Managed Catalog、Expected Absence、Unknown Sentinelを別判定し、raw business data 0件、write 0件、query artifact／result hash一致である。

**QA:** exact target再照合、read-only transaction／API、column allowlist、最大件数、timeout、result completeness、Local／Remote major compatibility、Register `N/N`、Unknown countを確認する。HumanがProduction観測を許可しない場合は`NotCompared / Human decision`として閉じ、A2-BをREADYにしない。

### 7.6 S5-A2-B Baseline Decision

**Goal:** 調査完了とProduction baseline eligibilityを分離する。

| baseline_eligibility | 条件 | 次の扱い |
|---|---|---|
| `READY_FOR_BASELINE_DECISION` | History、Managed Catalog、Expected Absenceが許容状態、Unknown 0、target／compatibility PASS | HumanとTech Leadがbaseline採否を判断 |
| `CANDIDATE_REQUIRES_HISTORY_RECONCILIATION` | Managed Catalog Match、Unknown 0、History Drift | repairせず別Execution Contractへ送る |
| `BLOCKED_BY_CATALOG_DRIFT` | managed fieldまたはexpected absenceにDrift | 原因別契約へ送る |
| `BLOCKED_BY_UNKNOWN` | Sentinel UnknownまたはProduction観測未承認 | Production path停止 |
| `BLOCKED_BY_TARGET_OR_COMPATIBILITY` | target／major／権限／evidence不成立 | Production path停止 |

**DoD／QA:** A2-P／T0／T1／R／C1-Bのexact hashを入力registerに固定し、各outcomeとHuman判断を逆引きできる。A2内でhistory repair、schema修正、Unknown解消調査を開始していない。

## 8. Macro B — Governance Design

### 8.1 S5-B1 Preliminary Governance Design

**Goal:** A1のConfirmed／Unknownを基に、環境分離、role、risk、変更surface、evidence、recovery、pilot候補条件の選択肢を作る。

**要件:** currentとtargetを分離し、plan依存機能、SD-01／03／04／06〜09の選択肢、利用不能機能の代替と残余riskを示す。A2-B未確定部分を仮説で埋めない。GitHub Environment依存の保護経路については、PG-15Aまで延期せず、PG-03Aで成立性を早期判定する。

#### GitHub Environment成立性の早期判定

PG-03Aは値を表示しないAC0 read-only確認とし、次を同じfeasibility artifactへ固定する。

- repository visibility、owner type、current GitHub plan／feature availability。
- required reviewersの利用可否、最大6 user／team、1 approvalで進行する仕様、`Prevent self-review`の利用可否。
- Environment設定を行うadmin主体、deploy起動主体、それらと異なる実在Human approver、必要なrepository read権限。
- built-in required reviewerが利用できない、または必要なquorumを強制できない場合の、実行を技術的に停止できるenforced alternative。chat上の手動承認だけはsecret解放の代替controlと扱わない。

設計時点の2026-07-22 snapshotでは、repositoryはpublic、ownerはpersonal account、current connector actorはrepository adminである。一方、GitHub plan名、actual Environment feature visibility、実在する別Human approverとread権限は未確定である。このsnapshotはPG-03AのPASSを代替せず、各実行時のcurrent evidenceを正とする。

public repositoryでは、GitHub公式の全current planでrequired reviewersを利用できることとactual feature availabilityを証拠化できる場合、plan名を取得できないことだけをblockerにしない。repositoryがprivate／internalへ変われば旧判定を失効させ、current planとrequired reviewer capabilityを再確認する。Free／Pro／Teamのprivate／internal repositoryではbuilt-in required reviewersを利用可能と推定しない。

判定は`FEASIBLE`、`FEASIBLE_WITH_APPROVED_ALTERNATIVE`、`FOUNDATION_BLOCKED`のいずれかとする。repository visibility、feature availability、approver権限はPG-15A開始前とProduction execution package作成前にcurrent再確認し、早期evidenceを無条件継承しない。

**DoD／QA:** 選択肢ごとに必須性、依存、効果、risk、可逆性、検証容易性、main metric、rollbackを持つ。HumanがD1a／D1bの方式／cost検討へ進める情報がある。`S5-B1G-Q01`によりfeasibility判定が一意で、publicかつactual feature利用可能の場合はplan名未取得だけで停止せず、private／internalまたはvisibility drift時はcurrent plan／capabilityを再確認する。`FOUNDATION_BLOCKED`を方針不決定と誤認しない。

### 8.2 S5-B2 Baseline-aware Final Architecture

**Goal:** A2-B結果を反映し、Productionへ進める正式経路と、進めないsurfaceを確定する。

**Entry:** A2-Bでbaselineが採用され、D3aでactual recovery capabilityとRTO／RPO gapが確定していることを必要とする。

**要件:** Local／CI／Staging／Production、credential、identity、approval、history、post-check、recovery、evidence retentionを接続し、低・中・高risk別gateを定義する。A2-BがBLOCKEDならProduction architectureを採用済みにしない。Migration Change Contractには、既適用migration不変、後方互換、expand／migrate／contract、lock、timeout、batch、data量評価を必須化し、未評価migrationをProduction候補にしない。Privileged Change Gateには、`SECURITY DEFINER`、privileged role、RLS bypass、workflow／secret／network変更を列挙し、Low分類を禁止してexact domain reviewer、独立専門review、negative testを要求する。

**DoD／QA:** SUP-I04／I10〜I14とSUP-F03／F05／F06をarchitecture decisionへ追跡できる。権限名だけでsecret非到達、data最小化、独立approvalを推定していない。

### 8.3 S5-B3a MCP／Credential Reachability Assessment

**Goal:** Local AI、PR job、MCP client、日常HumanからProduction write capabilityへ到達できない境界を設計・検証する。

**要件:** Production MCPなしを標準とする。例外は別Execution Contractで`project_ref`固定、`read_only=true`、feature限定、account tool無効、business data非取得、Human tool確認を必要とする。client configのowner、path、tracked状態、retention、revokeを固定する。

**DoD／QA:** Local AI／PR jobにProduction write credentialがなく、MCP例外なし、または未有効の例外案だけが存在する。Productionでwrite失敗を試すnegative testは行わず、設定とtool surfaceで判定する。本sliceはAC0の設計・read-only確認で閉じる。不適合時はB3bへ送るか、`EXPLICITLY PROHIBITED / PRODUCTION PATH BLOCKED`として有限に閉じる。

### 8.4 S5-B3b MCP／Credential Control-plane Correction

**Goal:** B3aで検出したLocal AI／PR jobからのProduction capability到達経路を、surface別の承認済み変更で無効化・縮小する。

**Authorization:** local client／non-Production設定はAC2。既存のunsafeなProduction capabilityをdisable／revoke／unlink／restrictする場合だけAC4の独立Human gateを使い、DB write／deployを含まない。新規Production deploy credentialの作成／登録／replacement／rotationはB3bで行わず、E2-Pまで禁止する。

**要件:** client config、MCP project scope、read-only、feature restriction、credential storage／revokeを一括変更せず、exact path／setting／actor／rollback単位へ分ける。Production MCP例外はSD-05／SUP-I05の別承認とする。

**DoD／QA:** correction後にB3aの否定testを新しいartifact identityで再実施し、Local AI／PR jobのProduction write到達経路0件を確認する。是正しない場合も禁止状態、owner、再開条件を記録し、Production pathを停止する。

## 9. Macro C — Local／PR Foundation

### 9.1 S5-C1 Clean Local Replay／Desired Catalog

**Authorization:** AC1。

**Goal:** fixed Headをclean Localで再生し、A2-P Registerをsame-Head desired artifactとして具体化する。

**Entry:** A2-P Register exact hash、B1のLocal境界、B3aのcredential非到達判定（不適合時はB3b PASS）、AC1 Human承認を必要とする。

**要件:** fixed CLI、Local target、localhost bind、sanitized environment、seed disabled、非Production fixture、migration manifest `N/N`を使う。Register、desired result、tool／environment manifestをhash固定する。A2-Bのbaseline commit用`C1-B`と、pilot candidate exact Head用`C1-C`を別identityとして保持し、C1-C更新でC1-B reviewを失効させない。

**DoD:** migration `N/N`、指定DB test `N/N`、Data API exposure設定、SQL GRANT／default privilege、RLS／policyの三層test、cleanupがPASSし、Production data／credential／target接触0件である。`supabase:stop`後のcontainer／process／temporary profileと、仕様上保持するpersistent volumeを別々に報告する。

**QA:** wrapper test、start、reset、migration list、exact DB test paths、advisor、stopを承認commandで実行する。Head drift、remote env混入、localhost外bind、unexpected container、desired artifact不完全ならSTOPする。

### 9.2 S5-C2a Runner Compatibility

**Goal:** GitHub-hosted runnerまたは採用runnerでLocal wrapper／Docker基盤が成立するかを、full PR workflow前に検証する。

**要件:** `npm ci`、wrapper test、Local start、reset、migration list、stop、success／failure cleanup、artifact retention、timeoutを最小workflowで確認する。初回workflowは`workflow_dispatch`限定で静的review・mergeし、default branch上のexact release commitを別AC2でdispatchする。workflow fileがdefault branchにないPR Headを直接dispatchしたと推定しない。

**Repository phase DoD／QA:** `S5-C2aS-Q01`。AC1で最小workflow、timeout、cleanup、artifact schemaをlint／contract testし、workflow hashを固定する。hosted runner run、secret登録、settings変更0件である。

**Hosted execution phase DoD／QA:** `S5-C2aI-Q01`でdefault branch上のrelease identityを固定後、`S5-C2aX-Q01`を別AC2承認で実施する。`workflow_dispatch`の`run.head_sha`がexact release commitと一致する独立2 runをfresh runnerまたは同等のclean初期状態で連続PASSし、migration `N/N`、Production／Staging secret 0件、remote access 0件、unexpected container／profile 0件である。同一attemptのrerunを2回と数えず、前runのartifact／container／profileを再利用しない。成立しなければ`S5-C2aR-Q01`で別corrective PRまたは`FOUNDATION_BLOCKED`へ閉じ、原因不明の再runを行わない。

### 9.3 S5-C2b Full PR Verification Workflow

**Goal:** exact PR Headでstatic、DB、application、governance証拠を再現可能に生成する。

**要件:** Static、DB、Application、Change Brief／riskのjobを分離し、Local-only target、dynamic `N/N`、sanitized logs、artifact retentionを固定する。Data API exposure、SQL GRANT／default privilege、RLS／policyを独立checkとして失敗伝播させる。negative testは専用fixture／validation branchを使う。

**Repository phase DoD／QA:** `S5-C2bS-Q01`。AC1でworkflow path、job／check名、Change Brief、risk分類、target violation、cleanup、artifact schema、candidate SHA input、trusted result publisherを静的fixtureで確認し、workflow／trust-root hash、check context、expected sourceを固定する。hosted run、settings変更0件である。

**Hosted execution phase DoD／QA:** `S5-C2bI-Q01`でdefault branch上のrelease identityを固定後、foundation fixtureは`S5-C2bX-Q01`、candidate modeは`S5-C2bC-Q01`を別AC2承認で実施する。dispatch refはapproved default branch releaseであり、`run.head_sha=workflow release commit`とする。candidate SHAは必須inputとして別checkoutし、checkout HEAD、PR current Head、result対象SHAを照合する。candidate側workflow／local action／publisherの偽成功、wrong input、workflow drift、main SHAだけのsuccess、wrong-source status、Head変更をnegative testする。wrapper、check、build、migration replay、DB tests、advisor、Local E2E、変更説明書、risk分類とData API三層resultをcandidate identityへ紐付ける。Production credential／target接触0件で、workflow path／hash、trust-root hashes、candidate SHA、run ID／attempt、job／check名、expected publisher、success／failure evidenceをrequired-check manifestへ固定する。latest candidate／test-merge SHAとexpected sourceへrequired resultを付与できなければ`FOUNDATION_BLOCKED`であり、workflow successだけでmerge、Staging、Productionを許可しない。

### 9.4 S5-C2c Protected Deploy Workflow Foundation

**Goal:** E1／E2で用いるmanual deploy workflowをversion管理し、StagingとProductionのEnvironment、target、approval、concurrency、failure stop、post-checkを静的に分離する。

**Entry:** B2、D1a／D1bがPASSし、Staging／Production target mappingが推測なしで固定されていることを必要とする。

**要件:** `workflow_dispatch`だけを通常起動面とし、mergeによるProduction DB自動deploy、automatic retry、Production secretのPR job提供を禁止する。Staging／Productionは別Environment、別credential、別concurrency group、別Human authorizationを持つ。workflow作成だけではhosted run、settings変更、credential登録、deployを許可しない。

**DoD／QA:** `S5-C2c-Q01`。workflow contract test、target allowlist、Environment名、concurrency、approval前secret非参照、partial apply停止、post-check、sanitized logを静的fixtureで確認し、deploy 0件、credential 0件である。workflow path／hash、Environment、target mapping、concurrency、post-checkをdeploy-workflow manifestへ固定する。

### 9.5 S5-C3a GitHub Merge Protection

**Authorization:** AC2。外部repository settingsのexact before／afterをHumanが事前承認する。

**Goal:** required check、review、conversation resolution、force／delete、bypass、採用merge方式をactual settingsで強制または検知する。Production Environment／secretは作らない。

**DoD:** 実在check名、latest candidate／test-merge SHA、expected GitHub App sourceがrequired設定へ接続され、main SHAだけのsuccess、別sourceの同名status、failed／unreviewed Headがmerge不可である。candidate flowではPR Head ancestryを保持する通常merge以外を許可しないか、Human手順とPG-24で確実に停止できる。rollback可能なsettings diff、actor、auditがあり、Production secretは0件のままである。

**QA:** protected／unprotected branch、failed check、main-only success、wrong-source同名status、candidate workflow偽成功、review不足、bypass actorを値非表示で検証する。settings scope拡張、check／source不一致、rollback不明ならSTOPする。

### 9.6 S5-C3b1 Staging Environment Protection

**Authorization:** AC2。D1a／D1b受入後。

**Entry:** `PUB(PR-07) PASS`で、exact workflow path／hashを確認できることを必要とする。

**Goal:** Staging専用Environment、branch policy、required reviewer、approval gateをcredential登録前に成立させる。

**要件:** secret gateの検証はdummy canaryを使い、Staging／Production credentialを使わない。Owner／Adminがcontrol-plane上で変更できる能力は残余riskとしてauditする。

**DoD:** unauthorized branch、self-approval、bypass、approval前canaryが期待どおり拒否され、実在する別Human approverが確認できる。credential登録0件である。

**QA:** `S5-C3b1-Q01`。approval前、unauthorized branch、self-approval、bypassを検証する。実在する別Human approverが構成できなければE1／E2を停止する。

### 9.7 S5-C3b2 Staging Credential Registration

**Goal:** C3b1で保護されたStaging Environmentへ、Staging専用credentialだけを登録し、参照、revoke、露出防止を検証する。

**Entry:** `PUB(PR-07) PASS`、C3b1 PASS、D1a／D1b target受入済み、別Human approver実在を必要とする。

**DoD／QA:** `S5-C3b2-Q01`。approval前／PR job／non-deploy jobから参照不能、approval後のStaging deploy jobだけが参照候補、値のlog／artifact露出0、revoke PASS、Production credential 0件である。deploy-workflow manifestのhash、Environment／target／credential configuration identity、approver、concurrencyをstaging execution-package manifestへ固定する。

### 9.8 S5-C3c Production Auto-deploy Guard

**Goal:** Human mergeまたは`main`へのpushからProduction DB migrationへ至る経路を、有限なGitHub／Supabase管理surfaceで分類し、管理外の具体的兆候のない可能性を全世界的な不存在証明へ拡張しない。

**Authorization:** assessmentはAC0の値非表示read-only確認とし、既存auto-deploy triggerをdisable／unlink／Productionから分離するmutationは、exact before／after／rollbackを持つ別AC4 Human承認を必要とする。DB query、migration、deploy、新規credentialを含まない。

**DoD／QA:** assessmentは`S5-C3cA-Q01`、必要なcontrol-plane correctionは`S5-C3cM-Q01`、pre-merge currentness／expected-effect preparationは`S5-C3cV-Q01`とする。assessmentは有限なGitHub／Supabase管理surfaceで`main` merge／push、PR close、branch merge、integration webhookからProduction DB deployへ至る経路を分類し、具体的兆候のない管理外経路は`NotCompared`として不存在を推定しない。C3cVのcurrentness subresultだけがcurrent `PATH_ABSENT / Confirmed`、Supabase GitHub repository連携なし・branchなしと分類に影響する有限surface設定を確認し、PG-12C2が用いる。merge-preparation subresultは両分岐共通のHuman operational attestation、change freeze、`EXPECTED_DB_EFFECT = NONE`を固定し、`PATH_PRESENT`時だけpost-merge DB deployment metadata観測planとAC3承認を、`PATH_ABSENT`時はcurrent path identity・actual merge commit・bounded windowによる`NOT_APPLICABLE_BY_PATH_ABSENCE` closure planを固定する。対応`PUB-MERGE`だけがこれを用いる。platformに存在しないactive／pending deploy件数を`PATH_ABSENT`時に実測必須にせず、後者はschema全体またはDB全体の不変を主張しない。plan／repository visibilityで有限surfaceを判断できない、具体的な不審経路がある、既知のDB変更あり、change freeze不成立、またはpath分類に対応するpost-merge DB plan／authorizationが未固定の場合はPG-23Cへ進まずPG-12C0へ戻り、必要なdisable／分離はPG-12C1の別AC4 Human承認で実施し、PG-12C2で再確認する。

Production DBとProduction applicationのGit-triggerは別surfaceである。A1 merge前に、DB側はPG-00C0で有限管理surfaceを分類し、`PATH_PRESENT / Confirmed`の場合だけPG-00C1の別AC4承認で対象経路を分離する。PG-00C2は、Supabase Dashboard repository connection、branch／project mapping、tracked GitHub Actions workflow、repository webhook、Installed GitHub Appを含む具体的GitHub／Supabase連携設定について、`PATH_ABSENT / Confirmed`の分類に影響する変更がないことの再current化だけを担う。Human operational attestation、PG-00M開始からPG-00P0完了までのchange freeze、`EXPECTED_DB_EFFECT = NONE`、path分類に対応するPG-00P0 plan／authorization、PG-00P1観測planと別AC3承認はPG-00Mのmerge準備・Human判断へ置く。`PATH_PRESENT`時だけPG-00P0は既存deployment metadataでschema／migration effectを観測する。`PATH_ABSENT`時は、同metadataを必須にせず、PG-00C2 current identity、actual merge commit、有限windowによりGit-triggered DB deployment observationを`NOT_APPLICABLE_BY_PATH_ABSENCE / Confirmed`として閉じる。この分類はschema全体またはDB全体の不変を証明しない。application側はPG-00V0〜V2でapproved Head SHA、current base SHA、通常merge方式、current Git-triggerとresulting merge commit source ruleをfresh `deployment_effect=EXPECTED_SINGLE_DEPLOYMENT`として固定し、merge後観測plan／別AC3承認とともにPG-00MのEntryにする。merge前にfuture merge SHAは固定しない。merge後はactual merge commit SHAを固定し、PG-00P0／PG-00P1で両surfaceを独立観測し、PG-00P2でpath分類に対応するDB結果とapplication `EXPECTED_APP_DEPLOYMENT / Confirmed`をrollupする。Process発効後は同じpath分岐をPG-12C0〜C2／PG-12V0〜V2を入力とする全publicationの`PUB-POST-DB`／rollupへ適用し、DB／application観測とrollupを省略しない。DB finite-surface classificationが`PATH_ABSENT / Confirmed`へ到達しない、既知のDB変更がある、change freezeが不成立、またはapplication expected source ruleを1 deploymentとして証明できない場合、通常の`PUB-MERGE`を許可せず`FOUNDATION_BLOCKED`とする。current routeではmanual application deploy／AC5-Aを行わずmerge-triggered deploymentをE0Aで受入れる。DB schema／migration deployはPG-24S11でpilot route正本化後のAC5-SだけでHumanが承認済みruntime principalを起動し、DevOpsは実行前qualificationと別AC3のread-only post-checkを担う。

## 10. Macro D — Hosted Staging／Recovery

### 10.1 S5-D1a Hosted Staging Project Provisioning

**Authorization:** AC2。

**Entry authorization:** A2-B／B2／C3a／C3cがPASSした後、作成前にHumanが方式、cost、plan、region、data方針、retention、credential owner、削除条件、rollbackを承認する。

**Goal:** Productionとidentity、credential、dataを分離したHosted Staging projectを作る。application接続はD1bへ分離する。

**DoD:** exact target 6項目、non-Production data、owner、cost、cleanupがConfirmedで、Production credential／data再利用0件である。

**QA:** `S5-D1a-Q01`。target negative check、fixture policy、cleanup rehearsalを行う。

**Exit acceptance:** 作成後にTech Lead／DevOps／Reviewer証拠を基にHumanが受入れる。作成承認と受入承認を同一応答で代替しない。

### 10.2 S5-D1b Staging Application Binding

**Goal:** Preview／Staging applicationをD1aのexact targetへ接続し、Production application、Production project、Production credentialとの分離を実証する。

**Entry authorization:** D1a受入後、Humanがexact application、Environment、target、変更setting、rollback、post-checkを別に承認する。

**DoD／QA:** `S5-D1b-Q01`。application target negative check、Production application非変更、credential非流用、設定rollback、主要接続smokeをPASSする。D1a作成承認からD1b変更権限を推定しない。

### 10.3 S5-D2a Staging Baseline Qualification

**Authorization／Entry:** AC2。A2-Bでbaselineが採用され、B2、C2b foundation、C3a、D1a／D1b、C2c、C3b1／C3b2がPASSしていることを必要とする。

実行直前にcurrent deploy-workflow manifestとstaging execution-package manifestをcurrent settingsへ照合し、workflow、Environment、target、使用可能なcredential identity、approver、concurrencyが一致していなければ開始しない。C3b2のrevoke test後に使用するcurrent credential identityがmanifestへ固定されていることを必要とする。drift、revoked、不一致は既存review／Human承認を失効させ、PG-14、PG-15AまたはPG-15Bへ戻す。

**Goal:** A2-Bで採用可能とされたbaselineをStagingへ適用し、history、Data API exposure設定、SQL GRANT／default privilege、RLS／policy、application基礎smokeを独立確認する。

**DoD／QA:** exact baseline commit、C1-B migration manifest、target attestation、Staging exposure-setting identityを固定し、migration `N/N`、managed schema、Data API三層とAPI negative smoke、主要smoke、fixture cleanupがPASSする。Staging／Productionの設定差はA1または別AC3で取得したcurrent Production exposure snapshotと照合し、D2aのAC2からProduction観測権限を推定しない。snapshotがない／古い場合は別AC3 planへ停止する。current Changelog確認時刻を記録し、設定是正が必要ならD2a内で変更せず別control-plane contractへ停止する。A2-BがREADYでなければD2aを開始せず、D1a／D1bまでの状態を`STAGING_FOUNDATION_ONLY / BASELINE BLOCKED`として保持する。

### 10.4 Pilot Candidate Gate

**Gate:** Humanの候補採用判断。候補登録だけではrepository、Staging、Productionを変更しない。

実需のlow-risk候補が存在するときだけHumanが次を固定する。

```text
candidate_id
source issue / requirement
base commit / exact Head
migration path and hash
change brief hash
risk classification and reason
main metric
rollback / roll-forward
post-check
candidate expiry
review identities
data_api_exposure_impact: Unchanged / Changed / Unknown / N/A
data_api_grant_default_privilege_impact: Unchanged / Changed / Unknown / N/A
rls_policy_impact: Unchanged / Changed / Unknown / N/A
```

候補がない場合は`FOUNDATION_COMPLETE / PILOT_OPPORTUNITY_PENDING`とし、owner、再開trigger、次回review日、未実施E1／D2b／E2／F1を記録する。これはFAILでも例外承認でもない。

候補採用後は同じexact HeadでC1-Cを実行し、C2b workflowのcandidate runをPASSさせる。`Unchanged`でもData API三層regressionを省略しない。`Changed`または`Unknown`はlow-risk pilotへ自動採用せず、risk再分類と別Execution Contractへ戻す。C1-B／A2-Bのbaseline evidenceは、candidate追加だけでは上書き・失効させない。

**DoD:** candidate manifestが完全であるか、候補なしの正式pending stateが完全であるかのどちらか一方で有限に閉じる。

### 10.5 S5-D2b Candidate Hosted QA（S5-E1後）

**Authorization／Entry:** AC2。E1のexact Staging runがPASSし、candidate identityが不変であることを必要とする。

**Goal:** E1がStagingへ適用した同一candidateについて、application target、migration history、Data API exposure設定、SQL GRANT／default privilege、RLS／policy、実API behavior、主要journey、Realtime、cleanup、main metric、post-checkを別結果で検証する。

**DoD:** E1 runのcandidate identityとD2b evidenceが一致し、Data API三層が`Match + Confirmed`、new application＋new DB journeyがPASS、Production接触0件である。candidate変更時はE1とD2bを再実施する。失敗時はPG-22R0〜R3またはCycle 2のPG-31DR0〜R3で、failure identity、applied migration／schema／history、remediation、Human routeを順に固定する。適用済みmigrationを編集せず、fixture cleanupをschema／history復元と扱わない。

### 10.6 S5-D3a Recovery Capability

**Authorization:** Production recovery metadataを確認する場合はAC3。Production dataやDB queryは対象外。

**Goal:** actual plan、backup／PITR／logical backup、retention、latest restore point、Storage非包含、restore actor、想定downtimeをread-onlyで確定する。

**DoD／QA:** `Confirmed / Unknown / Inaccessible`を分け、HumanがRTO／RPOと能力不足時に禁止するriskを決める。backup存在だけでrestore rehearsedと扱わない。

### 10.7 S5-D3-PR Recovery Contract

**Goal:** D3aのactual capabilityとB2のrisk上限を入力に、restore、RTO／RPO、target、data、integrity、cleanup、rollbackをversion管理されたrunbookへ固定する。

**Entry:** D3a、B2、D2aがPASSし、restore rehearsalに使用できるnon-Production targetとdata方針が確定していることを必要とする。Tech Leadが同一draftの技術成立性、DevOpsがtarget／credential／運用安全性を順にreviewし、そのexact版をHumanが採用するまでtracked実装へ進まない。

**DoD／QA:** `S5-D3PRT-Q01`、`S5-D3PRD-Q01`、`S5-D3PRA-Q01`、`S5-D3PR-Q01`。PG-17A0〜A2でreview／採用を閉じ、PG-17A3でPKAが採用済み意味を補完せずversion管理runbookへ構造化する。D3bのtarget、actor、cost、fixture、integrity、cleanup、STOP、証拠schemaを静的walk-throughし、外部rehearsal、credential発行、Production data取得0件である。tracked差分が採用済み意味を変える場合はPG-17A0へ戻る。

### 10.8 S5-D3b Restore Rehearsal

**Authorization:** AC2。実行前にHumanがexact disposable target、cost、data方針、cleanup、rollbackを承認する。

**Goal:** synthetic／non-Production dataで、Production想定回復方式と同じか同等のrecoveryを別targetへrehearseする。

```text
production_recovery_mechanism
rehearsal_mechanism
equivalence: Same / Equivalent / Different / Unknown
production_recovery_status
```

**DoD／QA:** schema、fixture、application再接続、所要時間、cleanupがPASSし、equivalenceがSame／Equivalentである。Different／Unknownは`RECOVERY_NOT_EQUIVALENT / PILOT_BLOCKED`かつ`Production recovery = NotRehearsed`として閉じ、現行processではE2-P／E2-Xを停止する。例外を検討する場合は、許容candidate、risk上限、復旧代替を定義するprocess改訂と別Human承認を必要とする。

### 10.9 S5-D3-PB Break-glass Contract

**Goal:** D3aのactual access capabilityとB2のrisk上限を入力に、custodian、開始条件、approval、期限、MFA、IP／network、scope、audit、revoke、通常復帰をversion管理されたpolicyへ固定する。

**Entry:** D3bがPASSし、restore通常経路とBreak-glass例外経路を混同せず、rehearsalに使用できるnon-Production targetが確定していることを必要とする。Tech Leadが技術／security成立性、DevOpsがtarget／credential lifecycle／運用安全性を同一draftへ順にreviewし、Humanが採用するまでtracked実装へ進まない。

**DoD／QA:** `S5-D3PBT-Q01`、`S5-D3PBD-Q01`、`S5-D3PBA-Q01`、`S5-D3PB-Q01`。PG-17C0〜C2でreview／採用を閉じ、PG-17C3でPKAが採用済み意味を補完せずversion管理policyへ構造化する。D3cのtarget、custodian、期限、cost、credential lifecycle、cleanup、STOP、証拠schemaを静的walk-throughし、external access発行、rehearsal 0件である。tracked差分が採用済み意味を変える場合はPG-17C0へ戻る。

### 10.10 S5-D3c Break-glass／Temporary Access Rehearsal

**Authorization:** AC2。実行前にHumanがexact non-Production target、custodian、期限、cost、cleanup、rollbackを承認する。

**Goal:** custodian、開始条件、approval、期限、MFA、IP／network、scope、audit、失効、事後reviewを非Productionで検証する。

**DoD／QA:** approval前／期限後は到達不能、rehearsal後residual access 0、通常経路へ復帰する。既発行PATとMFA、Postgres network restrictionとHTTP APIを別surfaceとして確認する。常設credential、失効不能、second custodian不在、audit欠落ならSTOPする。

## 11. Macro E — Protected Production Path

### 11.1 S5-E1 Staging Protected Deploy Dry-run

**Authorization:** AC2。C1-C、C2b candidate run、C3a、C2c、C3b1／C3b2、D1a／D1b、D2a、Pilot Candidate Gateを必要とする。

**開始条件:** candidate PR Head、current deploy-workflow manifest、current staging execution-package manifestをexact hashで固定し、workflow、Environment、target、credential configuration、approver、concurrency identityが一致していることを確認する。いずれかのdriftは既存reviewとHuman承認を失効させ、変化した責任領域に応じてPG-14、PG-15A、PG-15B、PG-19またはPG-20Aへ戻す。

**Goal:** exact candidateをmanual dispatchし、approval、secret gate、single execution、failure stop、post-checkをStagingでend-to-end実証する。

**要件:** Staging credentialだけを使う。concurrency groupを固定し`cancel-in-progress: false`とするが、GitHub concurrencyをFIFOと仮定しない。dispatch前にrunning／pending 0件を確認する。rerunは新attempt・新Human承認、partial apply後はrerunせずdiagnosis／roll-forwardへ戻す。

**DoD:** approval前secret非参照、exact commitだけ、parallel DB apply 0件、automatic retry 0、Staging post-check PASS、Production target／credential接触0件である。

**QA:** success、controlled failure、concurrent dispatch、pending replacement、rerun、partial apply simulationを非Productionで検証する。

### 11.2 S5-E0 Merge Promotion Identity

**Authorization:** AC0 read-only。PG-23Fのpost-merge rollup後に実施する。

**Goal:** Stagingで検証したcandidate PR Headと、Production候補となるmainのmerge commitを一意に対応付け、どのQAを継承できるかを確定する。

**要件:** PR Head ancestryを保持する通常mergeを使用し、PR Head、base SHA、merge commit、parent、tree hash、migration manifest／hash、candidate manifest、workflow hash、base driftを記録する。PR Headのancestor確認だけでtree同値またはQA継承を推定しない。squash／rebase mergeは本flow対象外として停止する。Production DBはPG-23Dで`ZERO_DELTA / Confirmed`、Production applicationはPG-23Eでexact merge commitをsourceとする`EXPECTED_APP_DEPLOYMENT / Confirmed`を必要とし、PG-23Fで同一identity／windowをrollupする。current routeではapplicationをAC5-Aで再deployしない。candidateは旧DB／新DB双方と後方互換でなければLow riskとして扱わない。

**DoD／QA:** `S5-MIG-Q01`。release commitとpromotion identity manifestが一意である。tree／artifact同値を証明できない差分があれば、release commitでC1-C、C2b、E1、D2bの影響QAを再実施し、その完了までE2-Pを開始しない。

merge直後のProduction DB／application観測はPG-23D／Eで別々に完了し、PG-23Fが同一merge identityとbounded windowをrollupする。いずれかが非0、Unknown、staleならauto-deploy incidentとして停止し、E0／E0A／E2-Gへ進まない。

#### PG-24R0〜R5 Release Commit Reverification

PG-24で同値を証明できない場合、merge済みCandidate PRへ戻らない。PG-24R0でexact release commitとData API三層を含む影響範囲を固定し、PG-24R1 Local、PG-24R2 hosted CI、PG-24R3 Staging redeploy、PG-24R4 Hosted QAのうち必要なGateだけを実施し、PG-24R5で継承範囲をrollupする。各Gateは別authorizationと別artifact identityを持つ。repository修正なしでPASSした場合だけpromotion identity manifestへ継承範囲を追記する。code／migration修正が必要なら旧candidateをProduction対象外として閉じ、新しいcorrective candidateをPG-18Cから開始する。

### 11.3 S5-E0A Production Application Acceptance

**Authorization:** preflight、package currentness、deployment observation、zero-business-data smokeはAC3。merge-triggered deployment evidenceの採用とrelease受入はAC0のHuman判断であり、manual deploy、redeploy、AC5-A、Production DB変更権限を含まない。

**Goal:** GitHub mergeによりcurrent Vercel Git-triggerが生成したexact release commitのProduction application deploymentを一意に確認し、追加deployを行わずProduction DB pilotより前に受入れる。

**要件:** Ready後・Reviewer前にVercel project、current Git-trigger、candidate SHA、expected deployment count 1、期待Current／alias／domain、rollback route、unrelated active／pending 0とnew app＋old DB互換を固定する。merge後にrelease commitとdeployment identity／package currentnessを固定し、source commit＝release commit、READY／Current、alias／domain一致、想定外settings／alias delta 0を確認する。manual deploy／redeployを行わず、事前manifestのexact routeでzero-business-data smokeを行う。token、cookie、share／owner token、record、response body、Data API、Server Action mutationを使わず、status、許可header、release identity、browser／Application／Server errorだけを観測する。

**DoD／QA:** `S5-VAPP-P0-Q01`、`S5-VAPP-B0-Q01`、`S5-VAPP-B-Q01`、`S5-VAPP-O-Q01`、`S5-VAPP-S-Q01`、`S5-VAPP-A-Q01`。Humanがapplication releaseを受入れるまでE2-P以降を開始しない。zero-data routeを証明できない、またはbusiness-data readが必要な場合は実行せず、SD-05のexact route／record／token／field／retentionを持つ別Execution ContractとProcess改訂へ停止する。deployment 0件／複数件、別source、failed／stale、想定外settings／alias delta時はincidentとして停止し、rollbackまたはcorrective application releaseを別Execution Contract／PRへ切り出す。DB適用、manual deploy、redeployを自動開始しない。

### 11.4 S5-E2-G Pilot Route Canonicalization

**Authorization:** contract／domain review／Human採用はAC0、承認済み正本実装とsource publicationはAC1、merge後application観測はAC3、DB観測は`PATH_PRESENT`時だけAC3、`PATH_ABSENT`時は既存path identityによるN/A closureである。いずれもProduction deploy、credential登録、DB writeを含まない。

**Goal:** 現行正本のHuman SQL Editor経路を無断で上書きせず、Cycle 1のexact low-risk candidateだけに有効なHuman-triggered protected schema deploy routeをpilot経路として正本化し、PG-25Aより前にcurrent `main`へ発効させる。

**exact canonical scope:** `AGENTS.md`、`CLAUDE.md`、`docs/README.md`、`docs/03_requirements.md`、`docs/04_data-model.md`、`docs/adr/0008-local-supabase-development-workflow.md`、`docs/05_dod.md`、`docs/06_qa-flow.md`、`docs/reports/supabase-cli-docker-development-reference-2026-07-12.md`、`.agents/skills/operate-supabase-live-db/SKILL.md`、`.agents/skills/operate-supabase-live-db/references/project-profile.md`、`.agents/skills/operate-supabase-live-db/references/migration-gates.md`、`.agents/skills/operate-supabase-live-db/references/e2e-git-gates.md`、`.agents/skills/operate-supabase-live-db/references/report-templates.md`の14ファイルに固定する。canonical authority manifestは14件のexact pathとblob hashを持ち、部分更新やhash欠落で正本間のauthorityを分岐させない。

**要件:** AI／CodexのProduction write禁止を維持する。protected routeはCycle 1のexact candidate、exact target、1 run、Human triggerだけに限定し、credential値をHuman／AIへ開示しない。`docs/03_requirements.md`と`docs/04_data-model.md`では現行SQL Editor規定を一般則／fallbackとして残し、この条件を満たすpilotだけを時限例外として追記する。一般的なCLI remote接続、`db push`、migration history repairまたはremote write許可へ拡張しない。SQL EditorはPG-28のdispositionまでfallbackとして維持するが、同一candidateへprotected routeとSQL Editorを併用せず、protected実行開始後のfailure、partial、UnknownでSQL Editorへ自動failoverまたはretryしない。SQL Editor fallbackは未着手の別変更または別Human契約でのみ利用できる。pilot authorityはexpiryを持ち、PG-27でterminal化する。Cycle 2はPG-24S11を無条件継承せず、PG-28A〜PG-28Lで発効したpost-pilot canonical authorityをEntryとする。

**DoD／QA:** PG-24S0〜S3でcontract、operations review、Human採用、exact implementation scopeを固定し、S4〜S10RでDraft、exact HeadのClaudeによる03 product内容確認、Tech Leadによる04技術内容確認、DevOps domain review、Ready、Reviewer、Human merge、DB／application post-merge rollupを原子分離する。`S5-E2RA-C-Q01`、`S5-E2RA-D-Q01`、`S5-E2RA-H-Q01`、`S5-E2RA-S-Q01`、`S5-E2RA-P-Q01`、`S5-E2RA-T-Q01`、`S5-E2RA-O-Q01`、`S5-E2RA-R-Q01`を適用し、PG-24S11でlatest `main`の14-file path／blob-hash set、AGENTS／CLAUDE一致、SQL Editor fallback、pilot expiry、正本pointer、外部mutation 0を確認する。PG-24S11 PASS前はPG-25Aへ進まない。

### 11.5 S5-E2-P Production Control-plane Preparation

**Authorization:** AC4。Production deployは実行しない。

**Goal:** Production Environment、branch policy、deploy identity、Production credential、approval、rotation、revoke、audit、evidence retentionを登録・検証する。

**開始条件:** Cycle 1ではPG-24V4のapplication受入とPG-24S11のpilot route canonical currentnessがPASSし、A2-B、B2、B3a（不適合時はPG-03R0〜R5も）、C3a／PG-12C2／PG-12V2、C2c、D2b、D3a／D3-PR／D3b／D3-PB／D3c、E1がPASSし、実在する別Human Environment approverがいる。Cycle 2ではPG-31FV4に加え、PG-28Lのpost-pilot canonical currentnessを確認する。

**DoD:** Production credentialはEnvironment scopeだけにあり、repository／organization secret、PR job、Local AI、未承認jobから参照不能で、値露出0件、deploy 0件である。Owner／Admin control-plane能力は残余riskとして記録する。Production workflow hash、concurrency group、Environment／credential configuration identity、approver構成、fresh C3c attestation identity／hash／snapshot時刻、deploy count 0をproduction execution-package manifestへ固定する。

**QA:** settings before／after、approval前、unauthorized branch、revoke、rotation metadata、deploy 0件、durable evidence retentionを確認する。Production workflowは固定concurrency group `production-supabase-deploy`と`cancel-in-progress: false`を持つ。credential owner／scope／revoke不明、deploy起動者とは異なるexact Human approver不在、repository read権限または`Prevent self-review`不成立ならSTOPする。

### 11.6 S5-E2-X Low-risk Production Pilot

**Authorization:** AC5-S。E2-Pとは別のProduction schema／migration実行承認を必要とする。managed Production data jobはAC5-Dであり、この承認へ含めない。

**Goal:** PG-24でE1／D2bのPR Headと対応付けたexact release commitのlow-risk candidate 1件を、Humanが保護経路で一度だけProductionへ適用し、その後DevOpsが別AC3 Gateでread-only post-checkする。

**開始条件:** PG-25Bがdeploy 0件でPASSし、current production execution-package manifestのexact hash、PG-24のpromotion identity manifest、PG-24S11のcanonical authority release hashが固定されている。同一candidateのSQL Editor適用履歴が0で、release commit、fresh C3c attestation identity／hash／snapshot時刻、Production workflow hash、Environment／credential configuration identity、approver、concurrency、targetが各manifestおよびcurrent settingsと一致し、Tech Lead／DevOps／Reviewerがcurrent evidenceを確認した後、Humanがexact Production target、release commit、1回の実行を明示承認している。driftまたはC3c Unknownは既存reviewとHuman承認を失効させる。C3c driftはPG-12C0、promotion identity driftはPG-24／PG-24R0〜R5、settings／package driftはPG-25A／PG-25Bへ戻す。pilot canonical authority driftは使用済みlogical IDへ戻さず`PILOT_ROUTE_AUTHORITY_DRIFT`で有限停止し、new logical publication IDと別Human承認を持つProcess amendment／Execution Contractへ返す。

**DoD:** PG-26ではexact commit／migration／approval／Human trigger／run／deployment identityを固定し、parallel apply 0、自動retry 0である。PG-26VではDevOpsがSELECT-onlyでresult／history／post-checkを閉じ、unexpected change 0を確認する。driftまたはpartial applyは実行失敗と一括せず、停止してdiagnosis／roll-forward判断へ戻す。

**QA:** preflight target 6項目、candidate hash、approval identity、migration result、managed post-check、application smoke、evidence retentionに加え、Production固有group `production-supabase-deploy`のrunning／pending 0件をdispatch前に確認する。`cancel-in-progress: false`でもFIFOを仮定せず、pending replacementを検出したらSTOPする。rerunは新attemptと新Human Production承認を必要とし、partial apply後のrerunを禁止する。別candidate、中高risk、raw SQL、target drift、post-check不成立なら実行しない。

## 12. Macro F — Transition／Operations

### 12.1 S5-F1 SQL Editor Disposition

**Authorization:** PG-28のSD-10 Human判断はAC6。PG-28A〜C／F／G／I／LはAC0、PG-28D／E／H／Jの承認済み正本実装・source publicationはAC1、PG-28KAPPのmerge後観測はAC3、PG-28KDBは`PATH_PRESENT`時だけAC3、`PATH_ABSENT`時は既存path identityによるN/A closure、PG-28KRのrollupはAC0である。いずれもProduction deploy、credential登録、DB writeを含まない。

**Goal:** E2-Xの証拠を基に、現行SQL Editor経路を通常経路から廃止、限定fallback、当面併存のいずれかへ決定する。

**DoD／QA:** 新旧経路の対応surface、history、credential、障害時利用、drift、operator負担を比較し、選択、理由、移行日、owner、例外、review日を記録する。pilot 1件だけで未対応surfaceまで廃止しない。PG-28A〜DでdispositionをE2-Gと同じ14-file canonical scopeへ写像し、Tech Lead／DevOps review、Human採用、別実装開始承認を分離する。PG-28E〜KRでDraft、exact HeadのClaudeによる03 product内容確認、Tech Leadによる04技術内容確認、DevOps domain review、Ready、Reviewer、Human merge、DB／application post-merge rollupを原子分離し、PG-28Lでlatest `main`の14-file path／blob-hash currentnessを確認する。PG-28L PASS前はPG-29およびCycle 2のProduction packageへ進まない。

### 12.2 S5-F2 Operations Program

F2は一つの巨大Execution Contractではなく、次の有限な子sliceでMission最終要件を満たす。

| Child | 必要authorization | authority境界 |
|---|---|---|
| F2a | PG-29のtracked正本はAC1。外部設定が必要なら別Gate／別AC | tracked正本／policy実装だけで外部設定を推定しない |
| F2b | PG-30AT、PG-30A0〜A7、PG-30A7DB／A7APP／A7R、PG-30A8〜A12、PG-30A12V、PG-30A13。contract domain review、Human採用、repository、Local、Draft、non-Production、Ready、review、merge、DB／application独立観測、post-merge rollup、release identity、Production currentness／mutation／qualification／Human AC5-D実行／DevOps AC3 post-check／closeoutを各Gateで分離。F2b-AIはPG-30AI0のHuman disposition後、採用時だけPG-30AIT〜AI10、PG-30AI10DB／AI10APP／AI10R、PG-30AI11〜AI15、PG-30AI15V、PG-30AI16の別契約列を使う | Human-triggered narrow path。AI不採用は`N/A_WITH_PROHIBITION`、採用時もcore job scope、Production one-run承認、read-only post-checkを分離 |
| F2c | PG-30BT、PG-30B0〜B7、PG-30B7DB／B7APP／B7R、PG-30B8〜B12。contract domain review、Human採用、repository publication、DB／application独立観測、post-merge rollup、scheduler rehearsal、Production package currentness、settings、read-only観測、closeoutを各GateのACで分離 | read-only結果からremediation権限を推定しない |
| F2d | PG-30CT、PG-30CD、PG-30C0〜C6、PG-30C6DB／C6APP／C6R、PG-30C7〜C14。Tech Lead／DevOps contract review、Human採用、tracked contract、publication、DB／application独立観測、post-merge rollup、non-Production rehearsal、Production currentness／control-plane／postcheck、restore、Break-glass、rollupを各GateのACで分離 | 一つの承認で全surfaceを操作しない |
| F2e | PG-31A0〜E3、PG-31E4／E5／E6、PG-31F〜H、PG-31HV、PG-31I。candidate currentness／採用、publication、Staging、DB／application独立観測、post-merge rollup、merge identity、Humanによるmerge-triggered Production application evidence採用、Production package／Human AC5-S実行／DevOps AC3 post-check／closeoutを各Gateで分離 | 各cycleを独立Production承認する |
| F2f | PG-32A〜DはAC0、PG-32EだけAC6 | evidence assembly、Tech Lead／DevOps domain review、Reviewer独立判定、Human最終受入を分離し、いずれからもAC1〜AC5-A／AC5-S／AC5-Dの操作権限を推定しない |

AC6 PASSからAC1〜AC5-A／AC5-S／AC5-Dのmutation authorityを逆推定しない。

#### S5-F2a Change Surface Register

- 要件: DB migration、managed data、Auth、Storage、Edge Functions、secret、workflow、platform settingsごとに正式経路、owner、risk、禁止、evidenceを定義する。Migration Change ContractとPrivileged Change Gateを正式routeへ組み込み、既定を`AI Production capability = PROHIBITED`とする。
- DoD: 未分類surface 0件、または明示的`Not Implemented / Prohibited`で閉じる。

#### S5-F2b Managed Production Data Change Path

- 要件: SUP-F07の対象条件、preview、期待件数、不一致停止、transaction、冪等性、timeout、batch、前後検証、監査、再実行、復旧を持つHuman-triggeredな狭いjob／scriptを別契約で実証する。
- DoD: 承認済みfixtureで全停止条件とpost-checkがPASSし、任意SQL、汎用RPC、無制限data accessへ拡張していない。

SUP-F07のMission必須能力であるため、F2b全体を通常の`N/A_WITH_PROHIBITION`で閉じない。全Production data changeを禁止する別方針を採る場合は、Mission未達として停止するか、F2fでowner、期限、risk、代替策を持つHuman例外承認を必要とする。

AIがProduction jobを起動、引数指定、再実行できる能力は現行authorityでは許可しない。`S5-F2b-AI`はPG-30AI0で採否を固定し、採用しない場合はSUP-F11を`N/A_WITH_PROHIBITION`として、AI trigger／credential／dispatch capability 0件をdurableに閉じる。採用候補を検討する場合も、このProcessで許可できるのはHuman-triggered exact jobとDevOpsの別AC3 post-checkまでであり、PG-30AIT〜AI15、PG-30AI15V、PG-30AI16で順に閉じる。AI自身のProduction dispatchを必要とする場合は、AGENTS／CLAUDE、ADR-0008、Skill、DoD／QAを含む別Human判断・別PRへ停止し、core F2bのjob scopeを拡張しない。

#### S5-F2c Periodic Drift／Permission／Credential Review

- 要件: migration history、managed schema、Dashboard直接変更、role、MCP、secret、integrationを定期read-only確認する。
- DoD: cadence、owner、result、exception、follow-up、evidence retentionが固定され、少なくとも1回のscheduled resultがreview済みである。

SUP-F02等を継続確認するMission必須能力であり、通常の`N/A_WITH_PROHIBITION`で閉じない。未実装または契約が技術reviewを通過しない場合はPG-30BTで停止する。

#### S5-F2d Rotation／Restore／Break-glass Cadence

- 要件: credential rotation、restore、Break-glassを期限付き運用として再演し、期限超過を検知する。
- DoD: cadence内のrehearsal、失効、通常経路復帰がPASSし、D3の単発PASSを恒久能力と扱っていない。

SUP-F08／F09を継続運用するMission必須能力であり、通常の`N/A_WITH_PROHIBITION`で閉じない。未実装または契約がdomain reviewを通過しない場合はPG-30CTで停止する。

#### S5-F2e Exact Two-cycle Stability Evidence

- 要件: 独立した実需low-risk変更のexact 2 cycleを最低受入証拠として、Local → CI → Staging → risk approval → Production → post-checkを同じ正式経路で完遂する。PG-26のHuman実行とPG-26VのDevOps read-only post-checkが必須fieldを満たす場合はCycle 1として数え、別の実需candidateをCycle 2とする。追加cycleはF2eの有限な完了条件へ加算しない。
- 実行単位: Cycle 2はPG-31A0 opportunity currentness、PG-31A candidate採用、PG-31B1実装、B2 Local、B3 Draft、B4 trusted hosted CI、PG-31C Staging deploy、PG-31D Hosted QA、PG-31E1 Ready、EV0 application preflight、E2独立review、E3 GitHub-only Human merge、E4 Production DB観測、E5 expected application deployment観測、E6 post-merge rollup、PG-31F Merge Identity、同値未証明時のPG-31FR0〜FR5独立reverification、FV0 package currentness、FV1 Human evidence採用、FV2 currentness observation、FV3 zero-data smoke、FV4 application受入、PG-31G0 currentness、必要時G1 settings correction、G2 package qualification、PG-31H Human AC5-S Production実行、PG-31HV DevOps AC3 post-check、PG-31I closeoutを順に行う。Cycle 1のworkflow、credential、Environment、approver、concurrency、targetを無条件継承しない。
- DoD: 2 cycleのcandidate、commit、approval、runが相互に独立し、同じpilotの再実行を2回と数えていない。独立した2件目候補がなければ`MISSION_ACCEPTANCE_PENDING / SECOND_CYCLE_NOT_AVAILABLE`として有限停止する。

#### S5-F2f Final Independent Acceptance

- 要件: Human、Tech Lead、DevOps、Reviewer、必要な外部専門家がSUP-F01〜F11とMission §9.3 DoDを独立reviewする。
- DoD: blocker 0件、またはowner／期限／risk／暫定対策を持つHuman例外承認だけを許し、導入完了、SQL Editor判断、Mission最終受入を別stateとして記録する。

## 13. QA判定Register

QA IDは再利用可能な検証contract定義であり、Gateごとの実行instanceではない。同じQA IDを異なるGate／target／Headで使う場合、それぞれ別の実行証拠、input identity、resultを持つ。件数検証は小文字を含むIDへ対応する`S5-[A-Za-z0-9-]+-Q[0-9]+`を使い、QA Registerのdefinition ID数、Gateからのapplication reference数、参照されたunique ID数を別々に報告する。

本proposal snapshotの機械検証値は、explicit Process Gate definition `252/252 unique`、QA definition ID `172/172 unique`、Gate表のQA application reference `267 instances / 171 unique IDs`である。残る`S5-GC-Q01`は§5.1から全252 explicit Gateへ横断適用するため、解決済みQAは`172/172`である。252件は§5.2の明示的`PG-*`行だけを数え、publication transitionとして既に個別展開した60 Gateを含む。内訳は8 logical PRの7 transition＝56 Gateと、既存PR #17のbootstrap source merge＋DB／application観測＋rollup＝4 Gateである。未展開の`PUB(<id>)`は20 logical PRであり、全placeholderを7 transitionへ展開したdefinition総数はsnapshot上`252 + 7 × 20 = 392`、Gate表QA適用instanceは`267 + 7 × 20 = 407`である。conditional PRを含む実際の実行Gate数はlogical PR instance確定後に再計算し、QA定義数、QA適用instance数、実行証拠数と混同しない。

| QA ID | Execution unit | 検証方法 | PASS | STOP／FAIL |
|---|---|---|---|---|
| S5-0-Q01 | S5-0 | Mission ID、旧11開始条件、現行Mission §12.1.1／12.1.2から最初のGate、成果物、Human判断をwalk-through | Mission ID未対応0、旧開始条件の欠落・緩和0、現行§12.1全行に対応先あり、Mission改訂とProcessが同一exact Head、authority cycle 0 | 意味変更、未割当、条件緩和、文書間不一致、循環 |
| S5-A1-Q01 | A1 | inventory completeness、official/current差分、target別Data API exposure設定とChangelog applicability、public leakage、private identityを検査 | tracked `remote=Human確認済みdev`を固定し、Production／Preview application targetだけをConfirmed／Unknown／Inaccessibleで分類。既存証拠にないexposureはUnknownで後続へ渡し、GRANT／RLSはNotCompared、漏えい0 | secret／data取得、application target推測、`remote`をProductionへ再分類 |
| S5-A1H-Q01 | A1 Human acceptance | PR #17 Head、public record、private packet hash／保護属性、Tech Lead／DevOps／Reviewer判定を同一bundleで照合 | Humanが受入／修正要求／保留を一件で記録し、受入時も次Gateとmergeは`NOT AUTHORIZED` | review／packet identity drift、Human判断不明、受入からmerge権限を推定 |
| S5-A1DBD-Q01 | A1 post-merge DB Git-trigger observation | exact merge commit、PG-00C2 pre-merge identity、有限windowを照合 | `PATH_PRESENT / Confirmed`時だけProduction DB deployment metadataのactive／pending／completed／newとschema／migration effectを`ZERO_DELTA`／`NONZERO_DELTA`／`UNKNOWN`で分類する。`PATH_ABSENT / Confirmed`時は同metadataを要求せず、current path identity・actual merge commit・有限windowでGit-triggered DB deployment observationを`NOT_APPLICABLE_BY_PATH_ABSENCE / Confirmed`として固定する。後者はschema全体またはDB全体の不変を主張しない。write／remediation 0 | path classification未current、identity／window不明、`PATH_PRESENT`で観測未完了、DB write／settings変更／remediation |
| S5-A1APPD-Q01 | A1 post-merge application expected effect | exact merge commit、PG-00V2 pre-merge identity、merge前後のVercel Production build／deployment／Current／alias／settings metadataを値非表示で照合 | exact merge commitをsourceとする1 deployment、READY／Current、期待alias／domain一致、想定外settings／alias delta 0を`EXPECTED_APP_DEPLOYMENT`として固定し、evidence current、observer起動のdeploy／remediation 0 | deployment 0件／複数件、別source、failed／stale、想定外settings／alias delta、Unknown、identity／window不明、observer mutation |
| S5-GC-Q01 | 全Process Gate closure | gate ID、指定closer Role、evidence identity／hash、result、closed_at、blocker／N/A理由、current Human approval bundleを照合 | Gate行のnamed primary actorまたは明記されたHuman／Reviewerがclosureする。次Gate authorizationは別fieldで`NOT AUTHORIZED`または`AUTHORIZED_BY_CURRENT_BUNDLE(<authorization-id>)`だけを取り、Gate PASSから生成しない | undefined aliasがclosure、Gate PASS由来のauthorization、技術PASSからHuman承認を推定、証拠identity欠落、bundle対象外へ拡張 |
| S5-DAPI-Q01 | Data API三層（mode別） | Gate開始時のcurrent Changelogとtarget applicabilityを記録し、exposure設定、SQL GRANT／default privilege、RLS／policyを別artifact・別結果で照合 | 適用全層が`Match + Confirmed`。A1 inventory modeだけは未観測層を理由付きNotCompared／Unknownで後続へhandoff | 一層のPASSから他層を推定、Unknown／InaccessibleをMatch、設定是正を同一read-only Gateで実施 |
| S5-A2P-Q01 | A2-P | fixed Head migration manifestとRegister sourceを照合 | dynamic N/N、duplicate 0、surface境界明示 | 汎用closure／dumpが必要 |
| S5-A2T0-Q01 | A2-T0 | attestation surface、actor、field、private evidence、negative scenarioを静的walk-through | A2-T1 contract一意、外部接続0 | target field欠落、権限曖昧 |
| S5-A2T1-Q01 | A2-T1 | application、Environment、project、6項目を独立照合 | exact target 1件、read-only scope一意 | target不明／複数候補 |
| S5-A2R-Q01 | A2-R | hosted historyとRegisterだけをbounded read-only比較 | result完全、write／business data 0 | raw definition、Unknown、query failure |
| S5-A2B-Q01 | A2-B | input hashと6判定fieldを再計算 | eligibilityが定義済み状態1件 | input drift、結果混同 |
| S5-B1G-Q01 | GitHub Environment feasibility | repository visibility、owner、plan／feature、admin、required reviewer、self-review、別Human approver、quorum、enforced alternativeをread-only確認 | publicではactual feature利用可能ならplan名未取得だけをblockerにせず、built-inまたはHuman承認済み同等controlで別Human gateを強制可能 | private／internalのplan・capability未確認、feature／approver／quorum不明、手動chat承認だけ |
| S5-B1-Q01 | B1 | 選択肢の必須性／依存／効果／risk／可逆性／検証性をreview | 各候補にmetric／rollback | Unknownを仮説で補完 |
| S5-B2-Q01 | B2 | baseline結果とA1 application target evidenceから正式経路・禁止surfaceを逆引き | tracked `remote`をdevのまま維持し、application target分離済み／Unknown停止／dev接続の分離routeが一意 | BLOCKED baselineを採用、`remote`をProductionへ再分類 |
| S5-B3a-Q01 | B3a | client config、tool surface、credential reachabilityを値非表示確認 | Production MCPなし、write経路なし | project／read-only／revoke不明 |
| S5-B3bC-Q01 | B3b correction decomposition | 不適合surfaceごとにtarget、actor、rollback、ACを分類 | non-Production correction／Production disable／禁止・blockedが相互排他 | target／actor／rollback不明 |
| S5-B3bN-Q01 | B3b non-Production correction | exact client／configのbefore／after／rollbackを確認 | Production変更0、承認targetだけ是正 | scope外config、rollback不明 |
| S5-B3bP-Q01 | B3b Production capability correction | exact capabilityのdisable／revoke／unlinkを確認 | new credential／deploy／DB write 0 | capability拡張、target不明 |
| S5-B3bNV-Q01 | B3b non-Production postcheck | correction後identityでnegative reachabilityを再実施 | residual unsafe path 0 | old identity継承、到達残存 |
| S5-B3bPV-Q01 | B3b Production postcheck | 値非表示でProduction capabilityを再確認 | write到達・residual credential・deploy 0 | 値取得、到達残存 |
| S5-B3b-Q01 | B3b rollup | exact correction後にB3a否定testを新identityで再実施し、evidenceをPR-02B publication inputへ同期 | Production write到達経路0、B3a再計算PASS、PR-02B publication input identity固定 | scope外変更、是正不能、evidence identity不明 |
| S5-C1P-Q01 | C1 tooling decision | baseline contractとrepository toolを照合 | tracked tooling変更の要否が理由付き1件 | 不要tool追加、判断不能 |
| S5-C1S-Q01 | C1 tooling implementation | 承認tracked scopeを静的検証 | tool hash固定、remote接触0 | scope外変更、実行を混在 |
| S5-C1-Q01 | C1-B／C1-C | clean reset、migration N/N、exact DB tests、advisor、cleanup、tracked expected exposureとruntimeのData API三層negative caseを別々に確認 | mode別desired artifact hash、三層result固定、remote接触0 | Head drift、localhost外、replay失敗、三層の一つを省略 |
| S5-C2aS-Q01 | C2a repository phase | manual-only `workflow_dispatch` runnerのpermissions、secret／Environment境界、lint／contract fixture | hash固定、hosted run 0、default branch導入前に自動eventなし | timeout／cleanup／artifact不明、自動trigger混入 |
| S5-C2aI-Q01 | C2a release identity | PR Head、merge commit、default branch workflow path／hashを照合 | manual dispatch対象release commitが一意 | workflow path／tree drift、PR Headの無条件継承 |
| S5-C2aX-Q01 | C2a hosted phase | default branchのworkflowをexact release refへ`workflow_dispatch`し独立2 run | `run.head_sha`一致、2/2 PASS、permissions read-only、secret／remote 0、compatibility manifest、cleanup PASS | runner非互換、wrong SHA、secret参照、cleanup不成立 |
| S5-C2aR-Q01 | C2a remediation | failed run、release workflow、原因、corrective scopeをread-only分類 | merged artifactを上書きせず、別corrective PRまたは`FOUNDATION_BLOCKED`が一意 | 原因不明の再run、同一原因loop |
| S5-C2bS-Q01 | C2b repository phase | manual validation可能なfull workflowのjob／check／failure contract、candidate-validation／trusted-publisher別job、job-level permissions、secret assignment、manifest schema、Data API三層を静的fixture検証 | workflow／trust-root hash、check context／expected source、candidate SHA input contract、job／principal分離、candidate job write権限／secret 0、三層artifact固定、hosted run 0、Production secret 0 | target／cleanup／publisher／risk伝播不明、同一job／principal、candidate refをtrust root化、candidate jobへwrite／secret、三層欠落 |
| S5-C2bI-Q01 | C2b release identity | PR Head、merge commit、default branch workflow path／hash、fixture contractを照合 | hosted validation対象release commitが一意 | workflow path／tree drift |
| S5-C2bX-Q01 | C2b foundation hosted phase | default branchのtrusted workflow release自体をexact release refへ`workflow_dispatch`し、pass／failure／missing brief／target violation、candidate job write拒否／publisher secret非到達、publisher job candidate非実行、不正manifest拒否とData API三層を検証 | `run.head_sha=workflow release commit`、workflow／trust-root hash一致、job／principal分離、全job／三層result、publisher manifest、secret／Production 0 | normal migration破壊、wrong release、secret混入、candidate codeをpublisher contextで実行、write成功、不正manifest受理、三層Unknown |
| S5-C2bC-Q01 | Candidate trusted hosted CI | approved default-branch workflow releaseをdispatchし、typed inputのcandidate SHAを別checkoutして二identityとpublisherを照合 | `run.head_sha=workflow release commit`、checkout HEAD＝PR current Head、workflow／trust-root hash一致、candidate自己申告PASS不採用、publisherがcurrent Headを再照合しlatest candidate／test-merge SHAへexpected-source result、secret／Production 0 | candidate ref workflow実行、wrong SHA、candidate trust-root利用、candidate自己申告PASS、mainだけのsuccess、wrong source、Head drift |
| S5-C2bP-Q01 | Trusted publisher isolation（mode別） | candidate-validation jobとpublisher jobのrunner／principal、permissions、Environment／secret assignment、manifest schema／digest、publisher sourceを静的・負系fixtureで確認 | candidate jobからpublisher credential参照不能、check／status write拒否、publisherはcandidate code非実行、current SHAとexpected sourceにだけsuccess発行 | 同一job／runner、shared writable state、candidate jobにwrite permission／secret、candidate自己申告PASS、未検証artifact実行、wrong SHA／wrong sourceへのsuccess |
| S5-C2bR-Q01 | C2b remediation | failed hosted run、required-check impact、corrective scopeをread-only分類 | 別corrective PRと再検証範囲または`FOUNDATION_BLOCKED`が一意 | 原因不明の再run、failureをrequired設定へ採用 |
| S5-C2c-Q01 | C2c | deploy workflowのmanual trigger、Environment、target、concurrency、retry、post-checkを静的fixture検証 | deploy／credential 0、Staging／Production経路分離 | merge自動deploy、target／stop不明 |
| S5-C3a-Q01 | C3a | settings before／after、merge方式、required check context／expected source、failed／unreviewed／bypass／同名wrong-source、candidate jobからの同名check／status write拒否を確認 | latest candidate／test-merge SHAのtrusted publisher resultだけがrequired checkを満たし、通常merge ancestry保持、failed／unreviewed／wrong-source／candidate-published resultでmerge不可、Production secret 0 | main runだけでPASS、candidate workflow／publisher偽装、candidate write成功、merge方式／bypass／rollback不明 |
| S5-C3b1-Q01 | C3b1 | dummy canaryでbranch／reviewer／approval／bypassを確認 | credential 0、別Human approver確認 | self-approvalのみ、bypass不明 |
| S5-C3b2-Q01 | C3b2 | Staging credentialのapproval前後、露出、revokeとexecution-package identityを確認 | 未承認job非参照、Production credential 0、current manifest固定 | scope／revoke／manifest不明、値露出 |
| S5-C3cA-Q01 | C3c finite Git-trigger assessment | Supabase Dashboard GitHub repository連携、repository workflow／webhook、Installed GitHub Appsのrepository access・表示権限・用途、具体的GitHub／Supabase連携からProduction DB schema／migration適用へ至る経路を値非表示分類する。owner／organization ownerのGitHub公式UI read-only確認を有効なevidenceとし、API／connector認証失敗だけではUnknownにしない | 有限surface上で`PATH_ABSENT / Confirmed`またはexact correction対象となる`PATH_PRESENT / Confirmed`が一意。具体的兆候のない管理外経路は`NotCompared`としてPASSを妨げない | 有限surface自体が未確認・判断不能、具体的な不審経路、用途不明の対象repository access。Installed Appの存在だけでPATH_PRESENTを推定 |
| S5-C3cM-Q01 | C3c mutation | exact triggerのdisable／unlink／分離とrollbackを確認 | deploy・new credential・DB write 0 | target／rollback不明、実deploy |
| S5-C3cV-Q01 | C3c finite-surface currentness / expected-effect preparation | correction後または`PATH_ABSENT` classificationのcurrent finite-surface identity、Human operational attestation、change-freeze record、path分類に対応するpost-merge DB plan／authorizationを値非表示で照合 | **currentness subresult**は、有限管理surface上の`PATH_ABSENT / Confirmed`であり、C1後は是正後の同分類を再確認し、Supabase GitHub repository連携なし・branchなし、tracked GitHub Actions workflow、repository webhook、Installed GitHub Appを含む具体的GitHub／Supabase連携設定のcurrent確認を行う。使用Gateは**PG-00C2とPG-12C2だけ**である。**merge-preparation subresult**は、両分岐共通のHumanによる既知のProduction DB変更なしのattestation、merge開始から対応post-merge DB observation完了までのchange freeze、`EXPECTED_DB_EFFECT = NONE`を固定する。`PATH_PRESENT / Confirmed`時はProduction DB deployment metadata観測planとDB用AC3承認を、`PATH_ABSENT / Confirmed`時はcurrent path identity・actual merge commit・bounded windowによる`NOT_APPLICABLE_BY_PATH_ABSENCE` closure planを固定し、DB用AC3を要求しない。使用Gateは**PG-00Mと対応`PUB-MERGE(<id>)`だけ**である。platformに存在しないactive／pending runtime件数を`PATH_ABSENT`時に実測必須にせず、後者はschema全体またはDB全体の不変を主張しない | currentness: path drift、有限surfaceの`PATH_ABSENT`未成立、identity不明。merge preparation: 既知のDB変更、freeze不成立、path分類に対応するpost-merge DB plan／authorization未固定、attestation不明 |
| S5-VAPP-M0-Q01 | Vercel expected-effect assessment | approved Head SHA、current base SHA、通常merge方式、Vercel project、Production branch、Git deployment settings、main merge経路、resulting merge commit source rule、deployment count、Current／alias／domain、active／pendingを値非表示で分類 | resulting normal-merge commitをsourceとする1 deploymentと期待Current／alias／domainを一意に予測でき、rollback route current。future merge SHAは固定しない | route不存在／複数／Unknown、Head／base／merge方式／Git-trigger設定drift、source規則不明、unrelated active／pending、rollback不明 |
| S5-VAPP-M-Q01 | Vercel expected-effect correction | Human採用済みGit-trigger維持方針とcurrent settingの差、before／after／rollbackを確認 | 方針へ一致させる必要最小のsettings是正、application deploy 0、Git-trigger停止／manual deploy移行0、rollback一意 | Production deploy発生、trigger停止、manual route移行、target／rollback不明、partial correction |
| S5-VAPP-MV-Q01 | Vercel expected-effect attestation | approved Head SHA、current base SHA、通常merge方式、current Vercel identityでmain merge経路、resulting merge commit source rule、expected count、Current／alias／domain、active／pendingを再確認 | `deployment_effect=EXPECTED_SINGLE_DEPLOYMENT`、resulting normal-merge commit source rule、count 1、想定外settings／alias delta 0、unrelated active／pending 0。actual merge SHA照合はpost-merge QAへ留保 | Head／base／merge方式／Git-trigger設定drift、count 0／複数、source rule／identity不明、settings／alias不一致 |
| S5-D1a-Q01 | D1a | project target、data、cost、owner、cleanupを照合 | Production分離、作成承認と受入記録 | Production再利用、cost／delete不明 |
| S5-D1b-Q01 | D1b | application／Environment／project接続とrollbackを照合 | exact Staging接続、Production application非変更 | target誤認、credential流用 |
| S5-D2a-Q01 | D2a | current deploy-workflow／staging execution-package／exposure-setting identityをcurrent settingsへ照合後、baseline migration、managed schema、Data API三層、API negative smoke | manifest／credential identity一致、N/N、三層`Match + Confirmed`、fixture cleanup、exact baseline | A2-B未Ready、manifest／credential／target drift、三層Unknown／Drift。設定是正は別contract |
| S5-PC1R-Q01 | Cycle 1 opportunity currentness | Foundation Closeout、baseline、Staging、workflow、recovery、candidate availabilityをcurrent identityで照合 | candidateありはPG-19入力一意、なしは`FOUNDATION_COMPLETE / PILOT_OPPORTUNITY_PENDING` | stale foundation、candidate不明、pendingをfailure扱い |
| S5-PC2R-Q01 | Cycle 2 opportunity currentness | Cycle 1、F2d、foundation、current route、独立candidate availabilityを照合 | candidateありはPG-31A入力一意、なしは`MISSION_ACCEPTANCE_PENDING / SECOND_CYCLE_NOT_AVAILABLE` | Cycle 1再利用、同一candidate、currentness不明 |
| S5-PCG-Q01 | Pilot Candidate Gate | candidate manifestと実需issue、Data API三層への`Unchanged / Changed / Unknown / N/A`影響を照合 | low-risk根拠、metric、rollback、expiry、三層影響が一意。Changed／Unknownは自動採用しない | 不要migration、identity不完全、三層Unknownをlow-risk扱い |
| S5-CAND-S-Q01 | Candidate implementation | 承認scope、migration、config、test、Change Brief、Data API三層diffを照合 | scope内差分だけ、risk／rollback／三層trace完全 | scope外実装、candidate identity不明、公開意図不明 |
| S5-E1-Q01 | E1 | current deploy-workflow／staging execution-package manifestを照合後、Staging manual dispatch、approval、concurrency、failureを検証 | identity一致、parallel apply 0、retry 0、post-check PASS | manifest drift、Production接触、pending誤認、partial rerun |
| S5-D2b-Q01 | D2b | E1と同一candidate／targetのexposure-setting identity、GRANT、RLS、実API behavior、new app＋new DB journeyを別結果で確認 | identity一致、Data API三層`Match + Confirmed`、主要journey／cleanup PASS | candidate差、三層Unknown／Drift、evidence欠落 |
| S5-D2bR0-Q01 | Hosted QA failure identity | candidate、deployment、failure、fixture cleanupを固定 | hash／Head／deployment identity一意、schema／history restorationと別field | evidence上書き、cleanupをschema復元扱い |
| S5-D2bR1-Q01 | Staging applied-state attestation | migration history、applied schema、fixture stateをread-only照合 | 適用済みmigrationとcurrent schema／history一意、mutation 0 | history不明、migration編集、cleanup実行 |
| S5-D2bR2-Q01 | Hosted QA remediation design | failureとapplied stateからadditive／recreate／same-identity one-shot／blockedを分類 | 適用済みmigration不変、finite route、再実行上限一意 | migration書換え、無制限retry、復旧とcleanup混同 |
| S5-D2bR3-Q01 | Hosted QA remediation authorization | Humanがreview済みroute、戻りGate、上限を照合 | 一経路だけ採用、別AC未承認 | 複数route一括承認、自動再実行 |
| S5-VAPP-P0-Q01 | Production application release preflight | Vercel project、current Git-trigger、candidate Head SHA、current base SHA、通常merge方式、resulting merge commit source rule、expected count 1、期待Current／alias／domain、active／pending、rollbackとzero-data route contractをread-only確認 | merge前identityとexpected source ruleが一意、future merge SHA固定0、DB Git-trigger 0、application expected effect一意、exact route／method、token／cookie不使用、business endpoint非到達が証明済み | project／route／source rule／count／rollback不明、Head／base／merge方式／Git-trigger設定drift、future SHA推定、zero-data証明不能、旧DB非互換 |
| S5-VAPP-B0-Q01 | Production application package currentness | release commit、build settings、merge-triggered deployment identity、rollback deployment、active／pending、PG-12V2、smoke manifestを照合 | package identity一意、manual deploy 0、drift 0 | release／setting／deployment drift、unrelated active run、identity不明 |
| S5-VAPP-B-Q01 | Merge-triggered Production application evidence adoption | exact release、expected deployment evidence、Human判断を照合 | exact deploymentを受入対象として採用し、manual deploy／redeploy／settings変更／AC5-A authorization 0、deployment／rollback identity固定 | wrong release、evidence drift、manual deploy／redeploy、settings変更、AC5-Aを推定 |
| S5-VAPP-O-Q01 | Production application observation | release commitとdeployment source、READY／Current、alias／domain、deployment countを照合 | source commit＝release、Current deployment一意、single deployment | wrong commit、failed／stale deployment、alias drift、duplicate deploy |
| S5-VAPP-S-Q01 | Production application zero-business-data smoke | preflight manifestのexact Current routeでstatus、許可header、release identity、browser／Application／Server errorだけを確認 | token／cookie／record／response body／Data API／Server Action mutation／fixture／write 0、error 0 | business dataが必要、routeがDB-backed／不明、token使用、body保持、error |
| S5-VAPP-A-Q01 | Production application acceptance | preflight、package、merge-triggered deployment evidence、currentness observation、zero-data smoke、rollback routeをHumanが照合 | application release受入またはblockedを固定。manual deploy／redeploy／DB authorization 0 | app failureを無視してDBへ進む、manual deploy／redeployを自動実行 |
| S5-D3a-Q01 | D3a | plan、retention、restore point、RTO／RPO gapを確認 | capabilityとgapがConfirmed | backup存在からrehearsalを推定 |
| S5-D3PRT-Q01 | D3-PR technical review | Tech Leadが同一draftのrestore方式、RTO／RPO、integrity、failure、STOP、rollbackを確認 | technical finding 0、review identity一意、file変更0 | draft drift、方式／STOP／rollback不明 |
| S5-D3PRD-Q01 | D3-PR operations review | DevOpsが同一draftのtarget、data、credential、cost、cleanup、evidence lifecycle、通常復帰を確認 | operations finding 0、Human採用候補identity一意、file／external mutation 0 | target／credential／cleanup／owner不明 |
| S5-D3PRA-Q01 | D3-PR adoption | HumanがTech Lead／DevOps review済みexact draftとriskを照合 | 採用版、target、RTO／RPO、risk、rollback一意。rehearsal未承認 | 未review版採用、rehearsalを同時承認、scope不明 |
| S5-D3PR-Q01 | D3-PR tracked implementation | 採用済みrecovery contractとrunbook diffの意味・trace・hashを照合 | 意味差分0、外部run／credential発行／Production data 0、restore contract一意 | PKAによる意味補完、採用版drift、外部操作 |
| S5-D3b-Q01 | D3b | non-Production restore、再接続、cleanup、所要時間 | Same／Equivalent、integrity PASS | Production data、Different／Unknown |
| S5-D3PBT-Q01 | D3-PB technical／security review | Tech Leadが同一draftの開始条件、scope、MFA／network、expiry、audit、revoke、通常復帰を確認 | technical／security finding 0、review identity一意、file変更0 | draft drift、scope／expiry／revoke不明 |
| S5-D3PBD-Q01 | D3-PB operations review | DevOpsが同一draftのcustodian、target、credential lifecycle、cost、cleanup、evidenceを確認 | operations finding 0、Human採用候補identity一意、access mutation 0 | custodian／target／credential／cleanup不明 |
| S5-D3PBA-Q01 | D3-PB adoption | HumanがTech Lead／DevOps review済みexact draftとriskを照合 | 採用版、custodian、期限、scope、revoke、risk一意。access発行未承認 | 未review版採用、access発行を同時承認、scope不明 |
| S5-D3PB-Q01 | D3-PB tracked implementation | 採用済みBreak-glass contractとpolicy diffの意味・trace・hashを照合 | 意味差分0、access発行0、rehearsal contract一意 | PKAによる意味補完、採用版drift、常設access |
| S5-D3c-Q01 | D3c | approval前、期限内、期限後、revoke、通常復帰を検証 | residual access 0、audit完全 | 常設credential、失効不能 |
| S5-E2RA-C-Q01 | Pilot route authority contract | current canonical SQL Editor route、Cycle 1 candidate、history、risk、fallbackを照合 | pilot限定Human-triggered principal、exact candidate／target／1 run、expiry、SQL Editor fallback、二経路併用／自動failover禁止、14-file scopeが一意 | 恒久routeへ拡張、AI write、fallback廃止、history不明、scope不完全 |
| S5-E2RA-D-Q01 | Pilot route operations review | exact contractのcredential、approver、concurrency、target、rollback、history、fallback、evidence lifecycleを値非表示で確認 | operations finding 0、Human採用候補identity一意、external mutation 0 | credential到達／値露出、self-review、fallback／rollback／owner不明 |
| S5-E2RA-H-Q01 | Pilot route Human adoption | Tech Lead contractとDevOps reviewのsame identityを照合 | 採用／修正要求／保留が一意。採用時もfile／publication／settings／credential／deploy未承認 | review identity drift、採用と実装／外部mutationを同時承認 |
| S5-E2RA-S-Q01 | Pilot route canonical implementation | adopted contractとexact 14-file diffを照合 | 14ファイル限定、AGENTS＝CLAUDE、AI Production write禁止、SQL Editor fallback、expiry、二経路禁止が一致し、workflow／settings／credential／DB変更0 | scope外、正本間矛盾、意味補完、外部mutation |
| S5-E2RA-P-Q01 | Pilot route product content-owner review | Claudeがexact Draft Headの`docs/03_requirements.md` diffとadopted contractを照合 | 現行SQL Editor規定を一般則／fallbackとして維持し、exact candidate／target／1 run／expiryだけのpilot例外であり、一般remote write許可へ拡張しない | product意味変更、fallback削除、pilot境界不明、技術／運用reviewの代行 |
| S5-E2RA-T-Q01 | Pilot route technical domain review | Tech Leadがexact Draft Head、adopted contract、`docs/04_data-model.md` diffを照合 | migration history、route exclusivity、failure／partial、STOP、04の技術意味と正本意味のblocking finding 0 | Head drift、04の意味不一致、history／failure route不明、SQL Editor自動failover |
| S5-E2RA-O-Q01 | Pilot route operations domain review | same HeadのSkill routing、principal、credential非到達、fallback、revoke、platform currentnessを照合 | operations finding 0、Human trigger／別approver／revoke／fallback current、file／external mutation 0 | credential reachability、self-review、routing／revoke／platform不成立 |
| S5-E2RA-R-Q01 | Pilot route canonical currentness | reviewed Head、merge commit、latest mainの14-file path／blob-hash set、AGENTS／CLAUDE、pointer、expiryを照合 | 14件のpath／blob hashとmain blobs一致、AGENTS＝CLAUDE、SQL Editor fallbackとpilot expiry current、external mutation 0 | path／blob／pointer drift、03／04欠落、fallback欠落、pilot authority過剰、外部mutation。drift時に使用済みlogical IDを再利用せず`PILOT_ROUTE_AUTHORITY_DRIFT`で停止 |
| S5-E2P0-Q01 | Production package currentness | PG-03A feasibilityをcurrent visibility／feature／approver permission／self-review／quorum／approved alternativeで再計算し、current canonical route、C3c、workflow、Environment、credential、approver、target、active／pendingをread-only照合 | current authority／feasibility manifest identity／hashとsettings identityが一致し、drift 0、mutation 0 | feasibility不成立は`FOUNDATION_BLOCKED`。authority／visibility／feature／approver／quorum／currentness不明、settings drift、値露出 |
| S5-E2PA-Q01 | Production control-plane mutation | approved exact settingsのbefore／after／rollbackを検証 | deploy 0、new identity固定 | scope外settings、rollback不明 |
| S5-E2P-Q01 | E2-P | PG-03A current feasibility、current canonical route、AC5 subclass、Environment／credential settings、fresh C3c identity、否定test、deploy countを確認 | authority／feasibility manifest、AC5-SまたはAC5-D、C3c hash／時刻、selected routeをpackageへ固定、deploy 0、未承認経路非参照 | authority／subclass不明、deploy起動者と異なるHuman approver／read権限／self-review防止不成立、C3c drift、値露出 |
| S5-E2X-Q01 | E2-X execution | AC5-Sのcurrent production execution-package／promotion identity／canonical authority／C3c、Human authorization、Human-triggered principal、同一candidate SQL Editor適用履歴0を照合し、target／schema candidate preflightとsingle deployを確認 | exact identity、exact schema／migration candidate 1件、managed data job 0、Human trigger 1件、SQL Editor failover／自動retry／追加操作0 | C3c Unknown、authority／manifest／settings drift、SQL Editor二重適用、中高risk、target drift、wrong principal、partial apply、AC5-D混入 |
| S5-E2XV-Q01 | E2-X read-only postcheck | exact run identity、migration result、history、managed catalog、unexpected changeをSELECT-onlyで照合 | result／history current、unexpected change 0、write／retry／rollback起動0、evidence closure完全 | run identity drift、Unknown、partial apply、write／rerun、postcheck不成立 |
| S5-FAI-Q01 | Foundation input assembly | 必須責任Gate、publication、条件枝のterminal identityを列挙し、remediation後のnew identityを照合 | PG-10R／PG-11Rのroute記録をterminal成果にせず、必須Gate PASS、条件枝は親分類付きPASS／`NOT_REQUIRED_BY_CLASSIFICATION`、blocked隠蔽0。remediation後はPG-10B／PG-11Bのnew-identity PASS | rangeだけで完了推定、remediation decisionを完了扱い、旧identity継承、conditional未分類、blocked隠蔽 |
| S5-FA-Q01 | Foundation acceptance | PG-17Eのfoundation input registerとcurrentnessをHumanが照合 | register完全。candidate有無とは分離してfoundation PASS | 必須PG未完了、conditional理由欠落、blocked state隠蔽、candidate不在をfoundation failure扱い |
| S5-PUBD-Q01 | Draft source publication | scope、commit、upstream、PR Head、Draft状態、AC1境界を照合 | scope外0、Head一致、merge 0、GitHub source publication以外のsettings／runner／credential／check-status publisher／deploy mutation 0 | scope drift、push／PR identity不一致、AC1外mutation |
| S5-PUBR-Q01 | Ready source publication | exact HeadのDoD、checks、domain review、trusted workflow／candidate二identity、publisher job／principal分離とnegative QA currentness、fresh DB／application Git-trigger attestation、後続観測planを照合 | Head／workflow release／publisher isolation不変、未解決finding 0、DB `EXPECTED_DB_EFFECT = NONE`、application expected effect一意、Ready state以外のGitHub／external mutation 0 | Head／workflow／publisher／permission drift、DoD未完了、Git-trigger Unknown、観測plan未固定 |
| S5-PUBV-Q01 | Independent review | Reviewerがexact Headと証拠をread-only照合 | APPROVED、unresolved thread 0、file変更0 | CHANGES REQUESTED、証拠不足 |
| S5-PUBM-Q01 | Human source merge | approved Head SHA、current base SHA、checks、通常merge方式、current lineageのfresh DB attestation、resulting merge commit source ruleを持つfresh application attestation、DB／application別のpost-merge観測planとauthorizationを照合 | HumanがGitHub repositoryだけを通常mergeし、生成後のactual merge commit SHAを固定する。PG-12C2／PG-12V2初回PASS前はPG-00C2／PG-00V2のcurrent再確認、初回PASS後はPG-12C2／PG-12V2を使用。`PATH_PRESENT`時は`PUB-POST-DB`の既存deployment metadata観測plan／AC3 authorizationを、`PATH_ABSENT`時はcurrent path identity・actual merge commit・bounded windowによる`NOT_APPLICABLE_BY_PATH_ABSENCE` closure planを固定する。settings／credential／runner／deployを同Gateへ含めず、future merge SHAを推定しない | base／Head／merge方式／Git-trigger設定drift、squash／rebase／merge queue／auto-merge、attestation lineage不明／stale／Unknown、path分類に対応する観測plan／authorization未固定、PR Head deployment／manual redeployで代替、Production deployを同Gateへ結合 |
| S5-PUBDB-Q01 | Post-merge Production DB Git-trigger observation | exact merge commit、pre-merge DB identity、bounded window、`PATH_PRESENT`時だけcurrent read-only authorizationを照合 | `PATH_PRESENT / Confirmed`時だけactive／pending／completed／new deploymentとschema／migration effectを`ZERO_DELTA`／`NONZERO_DELTA`／`UNKNOWN`で固定する。`PATH_ABSENT / Confirmed`時は同metadataを要求せず、current path identity・actual merge commit・bounded windowでGit-triggered DB deployment observationを`NOT_APPLICABLE_BY_PATH_ABSENCE / Confirmed`として固定する。後者はschema全体またはDB全体の不変を主張しない。write／settings／remediation 0 | path classification未current、identity／window不明、`PATH_PRESENT`で未承認観測または値露出、mutation／remediation |
| S5-PUBAPP-Q01 | Post-merge application observation | exact merge commit、pre-merge Vercel expected-effect identity、same bounded window、current read-only authorizationを照合 | exact sourceの1 deployment、READY／Current、期待alias／domain一致、想定外settings／alias delta 0を`EXPECTED_APP_DEPLOYMENT`で固定し、observer起動のdeploy／settings／remediation 0 | deployment 0件／複数件、別source、failed／stale、想定外delta、Unknown、identity／window不明、未承認観測、observer mutation |
| S5-PUBPOST-Q01 | Post-merge observation rollup | 同一merge commitに紐づくDB／application両artifactのidentity、window、currentnessを照合 | DBが`PATH_PRESENT`時の`ZERO_DELTA / Confirmed`または`PATH_ABSENT`時の`NOT_APPLICABLE_BY_PATH_ABSENCE / Confirmed`、かつapplicationが`EXPECTED_APP_DEPLOYMENT / Confirmed`のときだけPASSし、`PUB(<id>) PASS`を固定 | DB非0、DB path／identity／window不明、applicationの0件／複数件／別source／failed／stale／想定外delta、Unknown、identity不一致をPASS、片surface省略、incident後の後続開始 |
| S5-MIG-Q01 | Merge Identity | PR Head、base、merge commit、tree、migration／candidate hash、先行`PUB-POST-ROLLUP` identityを照合 | release commit一意、QA継承範囲確定、post-merge両surface rollup current | tree差分未評価、candidate不一致、rollup欠落／stale |
| S5-MIGR0-Q01 | Reverification impact decision | release commit差分からLocal／CI／Staging／Hosted QA、Data API三層の適用を分類 | 各QA／三層が必要または理由付きN/A | 影響範囲不明、三層の無条件継承 |
| S5-MIGRL-Q01 | Release Local revalidation | release commitで影響Local QAを再実施 | repository修正0、影響QA PASS | Local drift、修正必要 |
| S5-MIGRC-Q01 | Release hosted CI revalidation | release commitのhosted runを照合 | exact run PASS、Head一意 | run identity不明、failure |
| S5-MIGRS-Q01 | Release Staging redeploy | release commitをStagingへ1回deploy | Production接触0、postcheck PASS | wrong commit、retry、partial |
| S5-MIGRH-Q01 | Release Hosted QA | release deploymentの影響journeyを再確認 | identity一致、cleanup PASS | deployment差、証拠欠落 |
| S5-MIGR-Q01 | Release Commit Reverification | release commitでC1-C、C2b、E1、D2b、Data API三層の影響QAを再実施 | repository修正0で影響QA PASS、またはcorrective candidateへ明示分岐 | merge済みPRへ戻る、三層未評価、修正を同一identityへ上書き |
| S5-PCL-Q01 | Pilot closeout | Cycle 1 identity、result、risk、cleanup、次state、cycle eligibilityを照合 | 実装修正0、durable evidence完全、PASS時だけ`CYCLE_1_ACCEPTED` | failure／partial applyを成功扱い、candidate PRへ結果混在、証拠欠落 |
| S5-F1-Q01 | F1 | 新旧経路surface／history／障害利用を比較 | disposition、owner、review日確定 | 未対応surfaceを廃止 |
| S5-F1C-Q01 | F1 canonical contract | PG-28 disposition、pilot evidence、current 14-file正本を照合 | surface別route、通常／fallback／禁止、expiry、Cycle 2適用、STOP、exact scope一意 | 未対応surfaceの推定廃止、route競合、scope不明 |
| S5-F1D-Q01 | F1 operations review | DevOpsがsame contractのoperator、credential、failure／partial、fallback、revoke、platform currentnessを確認 | operations blocking finding 0、file／external mutation 0 | contract drift、credential非到達／fallback／revoke不明 |
| S5-F1H-Q01 | F1 Human adoption | Tech Lead／DevOps review済みcontractとriskを照合 | 採用／修正要求／保留を固定し、後続実装authorizationは分離 | review未完、採用と実装／publication／deployを一括承認 |
| S5-F1S-Q01 | F1 canonical implementation | adopted dispositionとexact 14-file diffを照合 | surface別route、AI Production write禁止、Human trigger、fallback／禁止、二経路併用禁止が正本間で一致、AGENTS＝CLAUDE、外部mutation 0 | 意味補完、部分更新、route競合、workflow／settings／credential／DB変更 |
| S5-F1P-Q01 | F1 product content-owner review | Claudeがexact Headの`docs/03_requirements.md` diffとadopted dispositionを照合 | product要件の意味を維持し、未対応surfaceを推定廃止せず、一般remote writeを許可しない | product意味変更、pilot 1件から全surface廃止、内容責任の代行 |
| S5-F1T-Q01 | F1 technical domain review | Tech Leadがexact Head、`docs/04_data-model.md` diff、surface coverage、route exclusivity、history、failure／partial、STOPを確認 | 04の技術意味を含むtechnical blocking finding 0、file変更0 | Head drift、04の意味不一致、未対応surface廃止、技術意味不一致 |
| S5-F1O-Q01 | F1 operations domain review | DevOpsがsame exact HeadのSkill routing、credential非到達、Human trigger、fallback／revoke、platform currentnessを確認 | operations blocking finding 0、file／external mutation 0 | Head／platform drift、権限拡張、fallback／revoke不明 |
| S5-F1R-Q01 | F1 canonical currentness | reviewed Head、merge commit、latest mainの14-file path／blob-hash set、AGENTS／CLAUDE、surface別dispositionを照合 | 14件のpath／blob hashとmain blobs一致、AGENTS＝CLAUDE、current routeと正本pointer一意、external mutation 0 | path／blob／pointer drift、03／04欠落、未発効decisionをCycle 2へ使用、外部mutation。drift時に使用済みlogical IDを再利用せず`POST_PILOT_AUTHORITY_DRIFT`で停止 |
| S5-F2a-Q01 | F2a | Mission全change surface、Migration Contract、Privileged Gateを照合 | 未分類0または明示禁止、未評価migration 0 | route／owner／特別審査不明 |
| S5-F2bCV-Q01 | F2b contract domain review | Tech Leadがnarrow data path draftの技術成立性、scope、STOP、rollback、Production境界を同一identityで確認 | blocking finding 0、Human採用候補identity一意、file変更0 | contract identity drift、scope／rollback／Production境界不明 |
| S5-F2bC-Q01 | F2b contract | narrow data pathの対象、preview、count、transaction、timeout、rollbackを静的確認 | 実行contract一意、Production mutation 0 | arbitrary SQL、target不明 |
| S5-F2bS-Q01 | F2b repository implementation | approved job／script scopeとnegative fixtureを照合 | generic RPC／unbounded access 0 | scope拡張、任意SQL |
| S5-F2bL-Q01 | F2b Local qualification | preview、count mismatch、transaction、冪等、timeout、recoveryをLocal fixtureで検証 | 全STOPとpostcheck PASS | partial apply、cleanup不成立 |
| S5-F2bX-Q01 | F2b non-Production rehearsal | exact jobをnon-Productionでrehearse | Production接触0、全STOP PASS | wrong target、write拡張 |
| S5-F2bI-Q01 | F2b release identity | PR Head、merge commit、job hashを照合 | release identity一意 | tree／artifact差分未評価 |
| S5-F2bP0-Q01 | F2b Production currentness | target、credential route、approver、settingsをread-only確認 | mutation要否が一意 | target／owner不明 |
| S5-F2bP1-Q01 | F2b Production preparation | exact job access settingsとrollbackを確認 | deploy 0、scope限定 | broad credential、rollback不明 |
| S5-F2bP2-Q01 | F2b Production package | AC5-D、release、target、settings、approver、timeout、jobを照合 | package identity一意、schema deploy 0 | currentness drift、subclass混同 |
| S5-F2bE-Q01 | F2b Production execution | Human authorization、Human-triggered principal、preview、expected count、single transaction、idempotence inputを照合しexact jobを1 run | Human trigger 1件、retry／別job／schema／migration変更0、run identity固定 | count mismatch、wrong principal、partial apply、AC5-S混入 |
| S5-F2bEV-Q01 | F2b Production read-only postcheck | exact run、result count、transaction outcome、idempotence、audit、schema／migration状態をSELECT-onlyで照合 | result current、retry／schema／migration変更0、evidence closure完全 | run identity drift、Unknown、partial apply、write／rerun |
| S5-F2b-Q01 | F2b | preview、件数不一致、冪等、timeout、復旧fixture | Human-triggered pathの全STOPとpost-check PASS | 任意SQL／無制限data access |
| S5-F2bAI0-Q01 | F2b-AI disposition | SUP-F11、current capability、必要性、riskを照合 | `N/A_WITH_PROHIBITION`または`ADOPT_SEPARATE_CONTRACT`が一意 | 暗黙採用、既存capability不明 |
| S5-F2bAIT-Q01 | F2b-AI technical/security contract | exact draftのthreat、job／argument、STOP、rollbackを確認 | 任意SQL／自由引数／自動retry禁止、技術finding 0 | contract identity drift、guard不明 |
| S5-F2bAID-Q01 | F2b-AI operations contract | principal、credential、target、approval、audit、revoke、retentionを確認 | operations finding 0、Human採用候補一意 | reachability／revoke／owner不明 |
| S5-F2bAIC-Q01 | F2b-AI contract adoption | Humanがreview済みcontractとexact scopeを照合 | job、arguments、actor、rollback、Human gate一意 | Production利用を同時承認、scope不明 |
| S5-F2bAIS-Q01 | F2b-AI implementation | trigger、guard、audit diffを照合 | generic RPC／任意SQL／自由引数／auto retry 0 | broad capability、scope外変更 |
| S5-F2bAIL-Q01 | F2b-AI Local qualification | unauthorized trigger、tamper、duplicate、count mismatch、rollback fixtures | 全negative case PASS、remote接触0 | bypass、retry、cleanup failure |
| S5-F2bAIST-Q01 | F2b-AI security review | exact PR Headとadopted contractを照合 | security finding 0、self-reviewなし | Head drift、guard／audit差分未評価 |
| S5-F2bAIOP-Q01 | F2b-AI reachability review | exact Headのprincipal、credential route、target guardを値非表示確認 | Production到達0、revoke／audit一意 | credential値取得、到達残存 |
| S5-F2bAIX-Q01 | F2b-AI non-Production | exact triggerでapproval／denial、argument固定、single-run、audit、cleanup | Production接触0、全STOP PASS | wrong target、argument変更、retry |
| S5-F2bAII-Q01 | F2b-AI release identity | PR Head、merge commit、trigger／guard hashを照合 | release identity一意 | tree／artifact差分未評価 |
| S5-F2bAIP0-Q01 | F2b-AI Production currentness | target、principal、credential、approval、settingsをread-only確認 | mutation要否一意、data run 0 | target／owner不明、値露出 |
| S5-F2bAIP1-Q01 | F2b-AI Production preparation | exact principal／routeのbefore／after／revoke／rollbackを確認 | data run 0、最小scope | broad credential、rollback不明 |
| S5-F2bAIP2-Q01 | F2b-AI Production package | AC5-D、release、target、job、arguments、approver、single-runを照合 | package identity一意 | currentness drift、自由引数 |
| S5-F2bAIE-Q01 | F2b-AI Production execution | Human承認済みexact job／argumentsをHuman-triggered AC5-D principalで1 run | Human trigger 1件、AI dispatch／self-approval／retry／schema変更0、run identity固定 | argument drift、wrong principal、AI dispatch、partial apply、auto retry |
| S5-F2bAIEV-Q01 | F2b-AI read-only postcheck | exact job／arguments／run、preview／expected count、result、audit、schema状態をSELECT-onlyで照合 | result current、retry／schema変更0、evidence closure完全 | identity drift、Unknown、partial apply、write／rerun |
| S5-F2bAI-Q01 | F2b-AI closeout | implementation、non-Production、Production one-run、audit、revoke、riskを照合 | 受入またはblocked、review日とprohibition一意 | capabilityを無条件恒久化、evidence欠落 |
| S5-F2cCV-Q01 | F2c contract domain review | F2b core closeoutとAI disposition／closeoutを照合し、Tech Leadがperiodic review draftのread-only semantics、scheduler、retention、STOP、rollbackを同一identityで確認 | F2b分岐が有限に閉じ、blocking finding 0、Human採用候補identity一意、file変更0 | F2b-AI未close、contract identity drift、write／remediation権限混入 |
| S5-F2cC-Q01 | F2c contract | cadence、surface、owner、retention、scheduler、targetを静的確認 | read-only contract一意 | remediation権限混入 |
| S5-F2cS-Q01 | F2c repository implementation | workflow／report diffとwrite pathを照合 | write／remediation capability 0 | hidden mutation path |
| S5-F2cL-Q01 | F2c static QA | schedule、timeout、result、exception fixtureを検証 | contract PASS | result／failure handling不明 |
| S5-F2cX-Q01 | F2c non-Production rehearsal | scheduler、failure、retentionをnon-Productionで検証 | Production接触0、result保存 | wrong target、cleanup不成立 |
| S5-F2cI-Q01 | F2c release identity | workflow、query、report hashをmerge commitへ固定 | identity一意 | artifact drift |
| S5-F2cP0-Q01 | F2c Production package currentness | release、query、target、scheduler、credential route、retention、existing settingsを値非表示で照合 | currentness manifestとhashが一意、mutation要否確定、settings変更0 | target／credential／scheduler不明、release drift、値露出 |
| S5-F2cP-Q01 | F2c Production preparation | read-only scheduler／credential settingsを確認 | write capability 0、rollback固定 | broad credential、rollback不明 |
| S5-F2cO-Q01 | F2c Production observation | currentness manifestとrelease／query／target identityを再照合し、scheduled result、exception、follow-up、retentionを確認 | identity current、result完全、remediation自動開始0 | identity drift、result欠落、write発生 |
| S5-F2c-Q01 | F2c | currentness、settings、scheduled drift／permission／credential runをreview | manifest、result、exception、follow-up追跡 | currentness不明、write capability、結果未保存 |
| S5-F2dCTV-Q01 | F2d technical contract review | Tech Leadがrotation・restore・Break-glass cadence draftの技術成立性、risk、STOP、rollbackを同一identityで確認 | technical blocking finding 0、file変更0 | contract identity drift、技術risk／rollback不明 |
| S5-F2dCDV-Q01 | F2d operations contract review | DevOpsが同じdraftのtarget、credential、期限、recovery、evidence lifecycleを確認 | operations blocking finding 0、Human採用候補identity一意、file変更0 | contract identity drift、target／credential／recovery不明 |
| S5-F2dC-Q01 | F2d contract | rotation、restore、Break-glassのtarget、期限、actor、rollbackを分離 | 3 contract一意、Production実行を暗黙追加しない | surface混在、actor不明 |
| S5-F2dS-Q01 | F2d tracked implementation | cadence／runbook／evidence diffを照合 | external execution 0、identity固定 | unapproved external step |
| S5-F2dL-Q01 | F2d static QA | 期限超過、失効、通常復帰fixtureを検証 | 判定contract PASS | expiry／return不明 |
| S5-F2dI-Q01 | F2d release identity | cadence release commitとartifact hashを照合 | rehearsal input一意 | artifact drift |
| S5-F2dRN-Q01 | F2d non-Production rotation | rotate、old失効、new scope、通常復帰を検証 | Production credential非変更、residual 0 | old credential残存 |
| S5-F2dR0-Q01 | F2d Production rotation currentness | release、credential identity、owner、scope、expiry、old residual、rotation要否を値非表示で照合 | currentness manifest一意、mutation要否確定、credential変更0 | credential／owner不明、release drift、値露出 |
| S5-F2dRP-Q01 | F2d Production rotation | approved exact credentialのrotation／rollbackを検証 | old失効、new scope一意 | unapproved credential、rollback不明 |
| S5-F2dRV-Q01 | F2d Production rotation postcheck | currentness manifestとrelease／credential identity、expiry、scope、old residualを値非表示で再照合 | identity current、old residual 0 | identity drift、value exposure、residual access |
| S5-F2dRS-Q01 | F2d restore cadence | disposable targetでrestore、integrity、cleanup、通常復帰を検証 | cadence内PASS | Production data、cleanup failure |
| S5-F2dBG-Q01 | F2d Break-glass cadence | non-Productionで期限、audit、revoke、通常復帰を検証 | residual 0 | Production access、失効不能 |
| S5-F2d-Q01 | F2d | rotation／restore／Break-glass cadenceを再演 | 期限内PASS、通常経路復帰 | 期限切れ、residual access |
| S5-F2e-Q01 | F2e | PG-31A0、A、B1〜B4、C、D／DR0〜DR3、E1、EV0、E2〜E6、F、必要時FR0〜FR5、FV0〜FV4、G0〜G2、H、HV、Iのcandidate currentness、Local／trusted CI、Staging、publication、DB／application post-merge観測／rollup、merge identity、release reverification、Human application evidence採用、current package、Human AC5-S実行、DevOps AC3 post-check、closeoutをCycle 1と照合 | 独立2 cycle完遂、`CYCLE_1_ACCEPTED`／`CYCLE_2_ACCEPTED`、必要なrelease reverification、application／package／post-check currentness確認済み | failureをcycle計上、release差分未評価、rerunを別cycleに計上、Cycle 1 packageの無条件継承 |
| S5-F2fA-Q01 | F2f evidence assembly | SUP-F01〜F11、Mission DoD、2 cycleのtraceを再計算 | evidence register完全、blocker／例外明示 | trace欠落、state混同 |
| S5-F2fT-Q01 | F2f technical domain review | Tech Leadが同一final register identityの技術成立性、baseline、risk、未解決High riskを確認 | technical finding閉鎖またはHuman例外候補を明示、file変更0 | evidence identity drift、技術risk未評価 |
| S5-F2fD-Q01 | F2f operations domain review | DevOpsが同一final register identityのtarget、credential、recovery、operation evidenceを確認 | operations finding閉鎖またはHuman例外候補を明示、file変更0 | evidence identity drift、運用risk未評価 |
| S5-F2fV-Q01 | F2f independent review | Reviewerがdomain review済みの同一final register identityを独立確認 | unresolved finding 0またはowner・期限・riskを持つ明示例外候補、file変更0 | evidence identity drift、独立性不成立、review未完 |
| S5-F2f-Q01 | F2f | SUP-F01〜F11とMission DoDを独立review | blocker 0または明示例外 | unresolved High risk |

## 14. Mission Traceability

### 14.1 導入要件

| Mission ID | 主実装slice | 継続／受入slice |
|---|---|---|
| SUP-I01 | A1、A2-T0／T1、D1a／D1b | D2a、B2 |
| SUP-I02 | A1、B3a／B3b、D3a、D3c | F2c、F2d |
| SUP-I03 | A2-P、C1、A2-R、A2-B | F2c |
| SUP-I04 | B3a／B3b、C3b1／C3b2、E2-G、E2-P | F2c、F2d |
| SUP-I05 | B3a／B3b | F2c |
| SUP-I06 | C1 | C2a、C2b |
| SUP-I07 | C2a、C2b | C3a |
| SUP-I08 | A1、C1、C2b | D2a、Pilot Candidate Gate、C1-C／C2b candidate run、D2b、PG-24R0〜R5（影響時） |
| SUP-I09 | D1a／D1b、D2a、D2b | E1 |
| SUP-I10 | C3c、全publicationの`PUB-MERGE`／`PUB-POST-DB`／`PUB-POST-APP`／`PUB-POST-ROLLUP`、PG-00C0〜PG-00C2／PG-00V0〜PG-00V2／PG-00M／PG-00P0〜PG-00P2／PG-12C0〜PG-12C2／PG-12V0〜PG-12V2、Pilot Candidate Gate、E1、E0、E0A、E2-G、E2-X／E2-XV | F2e |
| SUP-I11 | C2c、C3b1／C3b2、C3c、全publicationのpost-merge rollup、PG-00C0〜PG-00C2／PG-00V0〜PG-00V2／PG-00M／PG-00P0〜PG-00P2／PG-12C0〜PG-12C2／PG-12V0〜PG-12V2、E1、E0、E0A、E2-G、E2-P、E2-X／E2-XV | F2e |
| SUP-I12 | E1、E2-G、E2-X／E2-XV | F1／PG-28A〜PG-28L |
| SUP-I13 | D3-PB、D3c | F2d |
| SUP-I14 | A1、B1、B2、C3、D3 | F2f |

### 14.2 最終要件

| Mission ID | 主実装slice |
|---|---|
| SUP-F01 | F2a |
| SUP-F02 | A2-R、E2-G、E2-X／E2-XV、F1／PG-28A〜PG-28L、F2c |
| SUP-F03 | B2、Pilot Candidate Gate、F2a |
| SUP-F04 | C1、C2、D2、E1 |
| SUP-F05 | B2、C1、C2b、F2a |
| SUP-F06 | B2、C2b、D2、F2a |
| SUP-F07 | F2b |
| SUP-F08 | B3a／B3b、C3、D3、F2d |
| SUP-F09 | D3a、D3b、F2d |
| SUP-F10 | 全sliceの`S5-GC-Q01` closure／evidence、F2f |
| SUP-F11 | F2aの既定禁止、必要時のみF2b-AIの別Human承認／不採用時`N/A_WITH_PROHIBITION` |

### 14.3 Human判断

| SD ID | 事実入力 | 決定／再確認gate |
|---|---|---|
| SD-01 Staging方式 | A1、B1 | D1a Entry |
| SD-02 application target分離 | A1のProduction／Preview current target証拠、A2-T0／T1 | B2で分離継続／Unknown停止／dev接続時のenvironment分離routeを採用。`remote`はdevのまま維持 |
| SD-03 deploy方式 | B1、B2 | E1、E2-G、E2-P |
| SD-04 plan／cost | A1 | D1a、D3 |
| SD-05 Production観測 | A2-T0、E0A zero-data smoke preflight | A2-T1／A2-R AC3。applicationでbusiness-data readが必要ならexact route／record／token／field／retentionを持つ別契約へ停止 |
| SD-06 identity／credential | B2、B3a／B3b | C3b1／C3b2、E2-G、E2-P |
| SD-07 高risk review | B2 | F2f |
| SD-08 RTO／RPO | D3a | D3b、E2-X |
| SD-09 Break-glass custodian | A1 | D3c |
| SD-10 SQL Editor | E2-X／E2-XV evidence | F1／PG-28〜PG-28L |
| SD-11 段階別開始 | 各Execution Contract | 各PGと対応AC |
| SD-12 reference保管 | S5-0 | 初回program受入 |

## 15. Phase stateと完了境界

| State | 意味 |
|---|---|
| `PROCESS_APPROVED / NOT STARTED` | 本書のprocessだけ承認、sub-slice未開始 |
| `PROCESS_APPROVED / A1 BOOTSTRAP ACCEPTED` | PG-00A／PG-00B、PG-00C2／PG-00V2、PG-00M、PG-00P0／PG-00P1完了、PG-00P2 PASS後にProcess Contract PRをmergeした初期状態。既存A1／bootstrap分離を遡及authorizationせず受入済み入力とし、次の新規gateはPG-02 |
| `FOUNDATION_IN_PROGRESS` | A〜DおよびCの非Production foundationを実施中 |
| `FOUNDATION_BLOCKED` | target、baseline、plan、approver、recovery等の必須条件が不成立。Production pathへ進まない |
| `FOUNDATION_COMPLETE / PILOT_OPPORTUNITY_PENDING` | foundation完了、実需low-risk候補なし。Production変更0件 |
| `PILOT_ROUTE_AUTHORITY_DRIFT` | PG-24S11またはPG-25Bで、review済みpilot authorityとlatest `main`／current routeの不一致を検出。使用済み`PILOT-ROUTE-AUTHORITY`を再利用せず、new logical publication IDと別Human承認を持つProcess amendment／Execution ContractまでPG-25A以降を停止 |
| `PILOT_READY / PRODUCTION NOT AUTHORIZED` | merge-triggered Production application deployment観測／受入、E2-Gのpilot route canonical currentness、E2-PのProduction DB deploy 0件がPASSし、exact release commit、canonical authority release、Production前提が揃った。manual application deploy／AC5-AとAC5-Sは未承認 |
| `PILOT_COMPLETE / TRANSITION PENDING` | E2-XのPG-26／PG-26V PASSかつPilot Closeout PASS、`cycle_1_eligibility=CYCLE_1_ACCEPTED`。F1 disposition／post-pilot正本化とF2未完了 |
| `POST_PILOT_AUTHORITY_DRIFT` | PG-28LまたはCycle 2 package確認で、review済みpost-pilot authorityとlatest `main`／current routeの不一致を検出。使用済み`F1-DECISION`を再利用せず、new logical publication IDと別Human承認を持つProcess amendment／Execution Contractまで後続停止 |
| `INTRODUCTION_COMPLETE / MISSION NOT ACCEPTED` | PG-28Lを含む導入要件完了。複数surface／cycleの最終受入前 |
| `MISSION_ACCEPTED` | F2fでMission §9.3を受入済み |

`FOUNDATION_COMPLETE / PILOT_OPPORTUNITY_PENDING`は、A2-Bでbaselineが採用され、B2、B3a（不適合時はB3bも）、C1／C2／C3、D1a／D1b／D2a／D3がPASSし、candidate依存のE1／D2b／E2だけが未開始の場合に限る。A2-BがBLOCKEDの場合は`FOUNDATION_BLOCKED`であり、候補待ちとは扱わない。

導入完了はA2-B、C2b／C2c、C3a／C3b1／C3b2／PG-12C2／PG-12V2、D1a／D1b、D2、D3、E1、PG-23F、PG-24 Merge Identity（必要時PG-24R0〜R5も）、PG-24V0〜V4、E2-GのPG-24S0〜S11、PG-25A／B、E2-XのPG-26／PG-26V PASS、Pilot Closeoutのpublication macro PASS、F1のPG-28〜PG-28L完了で判定する。Mission最終受入はF2a〜F2fを必要とし、pilot 1件だけでは到達しない。

## 16. 共通STOP RULES／ESCAPE HATCH

次の場合は現在sliceを拡張せず停止する。

- exact target、Head、scope、owner、credential主体を証明できない。
- business data、secret値、Production write、未承認外部設定が必要になる。
- AC1 source publicationとGitHub settings、runner、credential、check／status publisher、DB実行、manual application deployを分離できない、またはexpected Git-trigger effectを一意に固定できない。
- merge済みpilot route authorityにdriftがあり、new logical publication IDと別Human承認を持つcorrective Process amendmentを一意に作れない。
- merge済みpost-pilot authorityにdriftがあり、new logical publication IDと別Human承認を持つcorrective Process amendmentを一意に作れない。
- `PUB-MERGE`でProduction DB deploymentを分離できない、merge前にapproved Head SHA／current base SHA／通常merge方式／current Git-trigger設定／resulting merge commit source ruleを固定できない、path分類に対応するpost-merge DB観測plan／authorizationを固定できない、またはmerge後のactual merge commit SHA照合とrollupが`PATH_PRESENT`時のDB `ZERO_DELTA / Confirmed`または`PATH_ABSENT`時の`NOT_APPLICABLE_BY_PATH_ABSENCE / Confirmed`、かつapplication `EXPECTED_APP_DEPLOYMENT / Confirmed`でない。
- PG-25A前にpilot限定protected routeとSQL Editor fallbackをexact 14-file正本へ一貫して発効できない。
- zero-business-data application smokeを証明できず、SD-05の限定例外契約も未承認である。
- plan／repository visibilityにより想定gateを強制できない。
- second Human approver、専門review、recovery能力が必要だが確保できない。
- managed comparisonを汎用PostgreSQL comparatorへ拡張しないと進めない。
- candidate identityまたはartifact hashがreview後に変わった。
- partial apply、unexpected drift、evidence欠落、retention不明がある。
- Process Issue Registerで同じissue familyが`occurrence 2`へ達した。この場合は局所patchを止め、Gate構造、scope、問題設定、標準tool利用を再評価し、Humanが次方針を判断するまで同じlineageの追加versionを作らない。

Escape Hatchは、対象を縮小する、UnknownとしてProduction pathだけを止める、標準toolを別Execution Contractで評価する、別専門sliceへ切り出す、`FOUNDATION_COMPLETE / PILOT_OPPORTUNITY_PENDING`で閉じる、またはHuman例外判断へ戻す、のいずれかとする。force、推測、追加自動調査、直接SQLで突破しない。

## 17. 実装時に再確認する一次資料

- [Supabase Deployment](https://supabase.com/docs/guides/deployment)
- [Supabase Managing Environments](https://supabase.com/docs/guides/deployment/managing-environments)
- [Supabase Branching](https://supabase.com/docs/guides/deployment/branching)
- [Supabase MCP](https://supabase.com/docs/guides/ai-tools/mcp)
- [Supabase Platform Access Control](https://supabase.com/docs/guides/platform/access-control)
- [Supabase Database Backups](https://supabase.com/docs/guides/platform/backups)
- [Supabase Temporary Access](https://supabase.com/docs/guides/platform/temporary-access)
- [Supabase Organization MFA](https://supabase.com/docs/guides/platform/mfa/org-mfa-enforcement)
- [Supabase Data API exposure／GRANT change](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically)
- [GitHub Deployments and Environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments)
- [GitHub Deployment Controls](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/control-deployments)
- [GitHub Concurrency](https://docs.github.com/en/actions/concepts/workflows-and-actions/concurrency)
- [GitHub Secure use reference](https://docs.github.com/en/actions/reference/security/secure-use)
- [GitHub Manually running a workflow](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow)
- [GitHub Troubleshooting required status checks](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks)
- [GitHub workflow syntax: `workflow_dispatch`](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#onworkflow_dispatch)
- [GitHub About pull request merges](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/about-pull-request-merges)
- [Vercel Git deployments](https://vercel.com/docs/git)
- [Vercel Git configuration](https://vercel.com/docs/project-configuration/git-configuration)
- [Vercel Production deployment states](https://vercel.com/docs/deployments/environments#production-environment)

一次資料は設計時点の参考でありteam ruleではない。採用する制約は、各Execution Contract開始時のcurrent確認とHuman承認後に適切な正本へ反映する。

## 18. 本書のreviewと次gate

本書の採用前に、少なくとも次を独立確認する。

- Tech Lead: Mission要件、依存関係、有限な終了条件、A2縮小、candidate pinning。
- DevOps: target／credential、GitHub settings、Staging／Production gate、recovery、evidence retention。
- Fullstack Engineer: Local／CIの実行可能性、dynamic N/N、Hosted QA、workflow failure／cleanup。
- Reviewer: Mission ID全件、現行正本との非競合、authorization非拡張、各DoD／QAの客観性。
- Human: A〜F macro、sub-slice粒度、AC0〜AC6（AC5-A／AC5-S／AC5-Dを含む）、PG-00AからPG-32E、PR境界、cost／risk判断、正式なpending state。

review evidenceは、role、対象Head／diff identity、finding、前roundとの差分、再検証結果、判定を1 roundにつき1記録へ集約する。同一role・同一identity・同一内容の再掲は新しいreview roundまたは追加PASSとして数えず、`DUPLICATE / NO NEW EVIDENCE`として元記録へ参照する。

既存domain reviewは、review対象domainの内容、authority、risk、失効条件、および当該domainに対応するevidence identity／lineageが不変であることを照合できる場合に再利用できる。内容不変は、既存section、diff、source review identity、artifact lineageから照合し、domain review再利用用の新しいmanifest、artifact、QA、Gateは作らない。bundle全体、Process file全体、または4-file bundleのSHA-256が変わったことだけでは、内容不変を照合できる未影響domain reviewを失効させない。review対象domainの内容、authority、risk、失効条件、または当該domainに対応するevidence identity／lineageが変わった場合だけ、そのdomain reviewを失効させる。

fresh reviewは今回変更した影響domainだけに限定し、initial Process全体のreview evidenceとMinimal Process Amendmentのfocused reviewを区別する。今回変更した§2.1と§18はfresh focused review対象とし、今回変更していないFullstack Engineer／Claude等のdomain reviewを自動的に再実施しない。Gate／QAがfresh observation、fresh review、独立reviewを明示要求する場合、その要件をevidence再利用で省略しない。個別Gate／QAの明示要件は横断的なcurrentness／review再利用規則に優先する。明示されたIndependent Reviewer Gateはcurrentな対象に対して実施し、省略できるのは変更の影響を受けないdomainの再reviewだけである。

- PG-00A〜PG-00P2のA1 bootstrapは完了した。actual merge commitは`4bdf5701b4b5bb80c9636c8026f4421f52258cd9`、PG-00P0は`NOT_APPLICABLE_BY_PATH_ABSENCE / Confirmed`、PG-00P1は`EXPECTED_APP_DEPLOYMENT / Confirmed`、PG-00P2は`PASS`であり、現在のGateはPG-01 Process Contract authoringである。
- Process Contract PR merge後、PG-01 PASS時の次GateはPG-02のExecution Contract plan draftである。
- `S5-0`はPG-01の実行単位であり、次Gate名ではない。
- いずれの状態もDB、Docker、外部状態、GitHub settings、Production操作、Git publicationを自動開始しない。
