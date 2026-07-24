# きめのすけ Supabase権限・変更管理基盤 ミッション定義（2026-07-20）

- ステータス: **CLOSED / GOAL ABANDONED / NOT IMPLEMENTED / HISTORICAL**
- 作成日: 2026-07-20 JST
- repository: `kcyth39/Where-to-Visit`
- repository baseline: `origin/main` `80f4a93efc9b2ecfd2a21ea9c789e76577b86a74`
- GitHub外部状態snapshot: 2026-07-20 JST
- 内容責任者: Human（事業目的、ユーザー影響、risk許容度）／Supabase・DBの技術内容は将来のTech Lead・DevOps・独立専門Reviewerによる確認が必要
- lifecycle責任者: PKA

> **CLOSED / GOAL ABANDONED / NOT IMPLEMENTED / HISTORICAL**
>
> Humanは2026-07-24にSlice 5のGoalを断念した。本書は実装せず、current implementation input、current Process、次アクションまたは実行authorizationとして使用しない。以下の旧Goal、要件、DoD、未決事項、開始条件は検討履歴として保持するhistorical contentである。
>
> **NO EXECUTION AUTHORIZATION** — PG-02以降を開始しない。Supabase、GitHub、MCP、credential、CI/CD、DB、migration、Staging、Productionの変更を承認しない。

## Authorityと優先関係

- HumanはSlice 5のGoalを断念した。本書は`CLOSED / GOAL ABANDONED / NOT IMPLEMENTED / HISTORICAL`であり、実装しない。
- 本書はcurrent implementation input、current Processまたは後続GateのEntryではない。PG-02以降を承認せず、開始しない。
- PR #17〜#19とSlice 5の検討履歴を確認する目的だけで保持する。PR #17で完了したA1の実施・review・Human受入の事実は取り消さない。
- 将来同様の課題へ取り組む場合も本Missionを自動再開せず、新しいGoal／DoDから別活動として定義し、別途Human判断を得る。
- Slice 5の断念は、現在有効なADR-0008、repository SkillまたはHumanによるSupabase SQL Editor運用を変更しない。
- 現在のlocal／remote／Production運用は、最新mainの`docs/adr/0008-local-supabase-development-workflow.md`、`docs/05_dod.md`、`docs/06_qa-flow.md`、`.agents/skills/operate-supabase-live-db/`、`docs/reports/supabase-cli-docker-development-reference-2026-07-12.md`を優先する。
- 以下の旧Goal、要件、DoD、開始条件は当時の判断内容を保存するhistorical contentであり、現在のrequirementへ読み替えない。

## Reference Input Register

| Reference ID | 原本 | SHA-256 | status／authority | 内容責任者 | lifecycle責任者 | 本書との関係 |
|---|---|---|---|---|---|---|
| SUP-GOV-REF-01 | `/Users/shige/Downloads/2026-07-20_kimenosuke_supabase_access_governance_pka_prompt.md` | `3d495ba5ca5c0c11dc0dd43ff18d5eadd015a2887c9d68a5104df8d4b8b7bd6a` | **USER-PROVIDED REFERENCE / NON-CANONICAL** | Human | PKA | ミッションの目的、責任分担、目標権限model、導入段階・最終ゴールの要件とDoDを本書へ意味を変えずに構造化した入力。repository内へ複製せず、正本や実行authorizationとして扱わない |

現在のDownloads pathは受領場所であり、永続保管先として確定していない。保管方針が承認されるまで原本を削除・移動・上書きせず、path変更時は移動前後のSHA-256一致を確認して本registerを更新する。永続的なmanaged pathの選定はSD-12へ集約する。

## 1. エグゼクティブサマリー

本ミッションの中心方針は、Productionの変更権限を人間またはAIへ直接与えるのではなく、検証・承認・監査を備えた変更経路だけへ与えることである。AIはLocalおよび隔離されたStaging／Previewで承認境界まで高い自律性を持ち、HumanはRaw SQLの技術保証ではなく、製品目的、ユーザー影響、risk、停止・復旧方針を判断する。通常のProduction適用は、承認されたcommitに対する保護された経路だけが行う。

ただし、これは**将来state**である。確認できた**current state**では、repositoryの明示的targetは`local`と`remote`だけであり、remote migrationの正本上の通常経路は別承認後にHumanがSupabase SQL Editorで実行する方式である。version管理されたGitHub Actions workflow、`main` protection、ruleset、保護されたGitHub Environmentは確認できない。Local側にはtarget検証、command allowlist、environment sanitization、CLI version固定、migration／test資産があり、基礎安全性は比較的強い。

したがって、現行経路を先に廃止せず、次の順で別ミッションとして扱う。

1. current stateをread-onlyで確定し、Production／remote／Stagingの正体、credential、plan、drift、backup、MCP、GitHub integrationを確認する。
2. Local再現性、PR検証、隔離Staging、変更説明書、risk分類を成立させる。
3. 低risk変更だけを対象に、Humanの目的・risk承認を伴う手動起動型の保護されたProduction経路を検証する。
4. 証拠が揃った後にのみ、現行Human SQL Editor経路を通常経路から外すか判断する。

Supabaseの改善実装は、PKA v2で定義した非Supabase必須sliceが完了した後に行う。残課題を残して進む場合は、残課題、理由、risk、暫定対策、owner、再開条件、Human承認者を記録した例外承認を必要とする。

## 2. 確認できた現状

### 2.1 調査境界

- repository調査は、dirtyなprimary checkoutを正本とせず、local refの`origin/main` `80f4a93`を`git show origin/main:<path>`で確認した。
- primary checkoutは`origin/main`より11 commits behindであり、確認済みの別worktree開発結果による状態である。未mergeや異常とは断定しない。
- GitHub外部状態は2026-07-20にread-onlyで確認した時点固定snapshotである。
- Supabase Dashboard、hosted DB、organization、credentialの値、Production dataには接続していない。

### 2.2 Repositoryで確認済みのcurrent state

| 領域 | 確認済み事実 | 主な証拠 |
|---|---|---|
| target model | 明示的targetは`local`と`remote`の2種類であり、Production、Staging、Previewを別々に識別するprofile／target contractはない | `package.json`、`config/supabase-targets.json`、`scripts/lib/supabase-target.mjs` |
| CLI | Supabase CLIは`2.109.1`に固定されている | `package.json` |
| Local command safety | local wrapperはallowlistを持ち、`--local`を要求し、`link`、`pull`、`push`、`repair`、`--db-url`等を拒否する | `scripts/supabase-local-command.mjs` |
| target safety | URLの完全一致、profile field制限、Supabase／Postgres系environment variableのsanitize、localhost bindのfail-closed ruleがある | `scripts/lib/supabase-target.mjs`、`docs/adr/0008-local-supabase-development-workflow.md` |
| migration／test | `origin/main`にはmigration 9件、`supabase/tests` 13件、Playwright spec 8件、wrapper unit test 2件がある。RLSとGRANTを別layerで検証するpgTAPがある | `supabase/migrations/`、`supabase/tests/`、`tests/`、`scripts/tests/` |
| seed／fixture | Supabase seedは無効でtracked `supabase/seed.sql`はない。test fixtureは存在する | `supabase/config.toml`、`supabase/tests/fixtures/` |
| remote適用 | 現行正本の通常経路は、別承認後にHumanがmigration全文をSupabase SQL Editorで実行する方式である | `docs/adr/0008-local-supabase-development-workflow.md`、`.agents/skills/operate-supabase-live-db/` |
| migration history | SQL Editor適用はCLI migration historyを自動更新しないことが現行文書に明記されている | ADR-0008、Skill reference |
| remote E2E | `test:e2e:remote`はanon keyとrequest tokenによる通常application writeを行いうる。remoteがProductionかは未確認である | `package.json`、`tests/helpers.ts` |
| repo CI／governance | `origin/main`に`.github/workflows/`、`CODEOWNERS`、tracked `.mcp.json`、DB lint script、risk分類template、変更説明書template、Break-glass手順は確認できない | `origin/main` tree／grep |

### 2.3 Local workspaceで値を読まずに確認した事項

- `.env.supabase.remote`はGit ignore対象として存在し、file modeは`0600`である。
- `.env.supabase.local`は存在しない。
- `.mcp.json`／`.mcp/`と`supabase/.temp/project-ref`は存在しない。
- remote profileの値、接続先、key種別、有効性は読んでいない。

### 2.4 GitHubで確認済みのcurrent state

| 領域 | 2026-07-20 snapshot |
|---|---|
| repository | `kcyth39/Where-to-Visit`、public、default branch `main` |
| Actions | repository設定上は有効、allowed actionsは`all`、repository内workflow 0 |
| branch rule | `main` branch protectionなし、ruleset 0 |
| environments | 5件あるが、全件でprotection rule 0、deployment branch policyなし |
| repository Actions secrets | repository levelでは0件 |

organization／environmentから継承されるsecret、external integration、Vercel、Supabase GitHub Integrationの実態はこのsnapshotで確認していない。repository secret 0を「Production credentialが存在しない」という意味に拡張しない。

### 2.5 公式仕様として確認した設計上の制約

- SupabaseはLocal、Staging、Productionを分離し、Production変更をCI/CDで管理する成熟modelを案内している。BranchingによるPreview環境はplan依存であり、GitHub integrationが扱う変更面にも限界があるため、採用前に実planと対象surfaceを確認する必要がある。[Supabase Deployment](https://supabase.com/docs/guides/deployment)、[Managing Environments](https://supabase.com/docs/guides/deployment/managing-environments)、[Maturity Model](https://supabase.com/docs/guides/deployment/maturity-model)
- Supabase MCPには`read_only`、`project_ref`、feature制限があるが、公式はProductionへ接続しないことを推奨している。Productionの実dataへ必要性なく接続しない。[Supabase MCP](https://supabase.com/docs/guides/ai-tools/mcp)
- Supabase PlatformのRead-Only／project-scoped roleはplan依存であり、Read-Only roleもsecret閲覧や広いSELECT能力を持ちうる。名称だけでdata最小化を保証しない。[Supabase Access Control](https://supabase.com/docs/guides/platform/access-control)
- GitHub Environmentはrequired reviewer等のprotection ruleでapprovalを要求した場合、approval前のjobによるenvironment secret参照を抑止でき、deployment branch制限も構成できる。利用可能機能はrepository visibility／planに依存し、現在の5 environmentsはprotection rule 0なので、この保護は現時点で有効ではない。[GitHub Deployments and Environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments)
- 2026年のSupabase Data API変更では、RLSとGRANTを別々に明示・検証する必要性が高まっている。既存projectへの強制時期を含め、実装時にChangelogを再確認する。[Data API GRANT change](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically)

### 2.6 未確認事項

- Production／Staging／Preview Supabase projectの実在、用途、Reference ID、region、plan、Postgres version。
- Production applicationとSupabase project、`remote` profile、remote E2E targetの対応関係。
- Supabase organization member、role、MFA、Network Restrictions、backup、PITR、Temporary Access。
- hosted schema、migration history、Git migration間のdriftとDashboard／SQL Editor直接変更履歴。
- credentialの保管場所、権限、rotation、失効、PR job／AIからの到達可能性。
- MCP認証主体、接続project、read-only、feature groups、Human confirmation。
- GitHub／Supabase integration、Vercel secret、organization／environment secret、external checks。

## 3. 課題とリスク

| ID | 観測事象 | 原因仮説 | 主なrisk | 現段階の扱い |
|---|---|---|---|---|
| SR-01 | `local`／`remote`だけでProduction・Stagingの識別がない | 環境増加より先にlocal-first安全基盤を整えた | 接続先誤認、remote E2Eの影響範囲誤認 | 最初のread-only inventoryでtarget identityを確定する |
| SR-02 | version管理されたPR CIとDB lintがない | local／Human gate中心で開発してきた | migration全履歴、RLS／GRANT、application testの再現証拠がPRに残らない | 導入段階でPR verificationを要求する |
| SR-03 | remote migrationはHuman SQL Editor実行でCLI historyを自動更新しない | Production writeをAIから分離するためHuman直接実行を採用した | copy／選択範囲誤り、適用historyとGitのdrift | 現行gateは維持し、保護経路が実証された後に置換判断する |
| SR-04 | GitHub branch／environment protectionとdeployment workflowがない | deployment経路をまだversion管理していない | 未承認commit、parallel deploy、secret exposureを技術的に止められない | GitHub管理sliceとSupabase導入段階を接続する |
| SR-05 | Production write credentialの所在・到達可能性が未確認 | 外部設定とlocal ignored profileを今回読んでいない | AI、PR job、日常Human accountが広い権限へ到達する可能性を否定できない | 値を表示しないread-only inventoryと否定testを開始条件にする |
| SR-06 | Staging／Previewの実在と非本番data方針が未確認 | repository target modelに含まれていない | Local成功だけでProductionへ進む、Production dataが検証環境へ流出する | 隔離Hosted環境を導入段階の必須gateにする |
| SR-07 | MCPの設定・scopeが未確認 | repositoryにtracked MCP設定がない | Production data参照、広いtool surface、誤project接続 | 原則Production MCP禁止。例外はproject固定・read-only・feature限定・Human確認 |
| SR-08 | risk分類、変更説明書、Break-glass、定期drift確認がrepo正本にない | 個別contractとHuman操作で補ってきた | 判断材料不足、緊急時の逸脱、直接変更の恒久化 | version管理前にmissionとownerを承認する |
| SR-09 | plan、backup／PITR、Temporary Access、復旧所要時間が未確認 | hosted外部状態へ未接続 | 利用不能な保護機能を前提にする、復旧可能性を過大評価する | plan／version／restore能力を事実確認するまで高riskを禁止する |

Local安全基盤が存在することは重要な強みだが、Productionの安全を証明しない。自動test、Read-only、backup、別AI reviewのいずれも単独では完全保証にならない。

## 4. 更新版権限モデル

以下は**将来のmission target**であり、現行権限でも一般role権限でもない。採用には技術的強制可能性の確認とHuman承認が必要である。Tech Lead／PKAのcode実装禁止、Reviewerの既存file read-only制約を上書きしない。

| 主体 | Local | Staging／Preview | Production参照・観測 | Production変更 | credential原則 |
|---|---|---|---|---|---|
| Fullstack／DevOps execution agent | 承認済みExecution Contractと隔離Local内で必要な権限 | 非Production dataの隔離環境で必要な権限 | 原則なし。例外は目的限定・read-only・project固定・feature／data最小化 | 任意SQL、migration、設定、secret変更不可 | Production write credentialを保持・表示・保存しない |
| Tech Lead | contract、技術方針、architectureをread-only evidenceから整理 | 技術的成立性を確認 | 必要最小限の証拠を参照 | code／migrationを実装せず、Productionを操作しない | role名からcredential accessを導出しない |
| PKA | process／Knowledge evidenceを観測 | process証跡を観測 | 原則集約済み証拠のみ | code実装、Production操作、自己承認を行わない | credentialを管理対象metadataとして扱っても値を取得しない |
| Reviewer | 自身のreview成果物を作成 | 証拠をread-only review | 必要最小限の事後証拠 | review対象fileやProductionを変更しない | credentialを必要としないreview経路を使う |
| Human | Full accessが必要な場合も個別contract内 | Full accessが必要な場合も記録対象 | 日常は必要最小限 | 通常は直接SQL／Dashboard変更を行わず、目的・影響・riskを承認 | 日常credentialとBreak-glassを分離する |
| PR検証job | 一時Localで必要な権限 | 必要に応じて検証 | なし | 不可 | Production secretを渡さない |
| 保護されたdeploy経路 | 対象外 | 承認済みcommitを適用 | pre／post checkに必要な最小範囲 | 承認済み・version管理済み変更だけを単独実行 | Production credentialは経路だけが参照し、値をHuman／AIへ開示しない |
| Application実行主体 | 開発用権限 | Staging用権限 | business要件内 | 通常の業務data writeだけ | browserへsecret／旧service role keyを公開せず、RLSと最小権限を使う |
| Break-glass担当 | 対象外 | 非本番rehearsal | 障害対応に必要な範囲 | 緊急条件を満たす場合のみ、期限・理由・監査・事後version管理を必須化 | 可能なら期限付きaccess、IP制限、MFA、終了時失効を使う |

権限modelの中心は「誰が強い権限を持つか」ではなく、「通常経路で強い権限へ直接到達できないこと」と「承認済みcommitだけを経路が適用すること」である。個人PAT等を使う場合は、独立service identityであるかのように表現せず、個人権限を継承する残余riskを記録する。

## 5. ユーザーのスキル前提を踏まえた責任分担

Humanであるおしげさんの通常承認責任は、次に限定する。

- 変更目的が「きめのすけ」の製品要件として正しいか。
- ユーザー影響、停止、data変更、互換性への影響を受容できるか。
- 根拠を伴うrisk区分と残余riskに納得できるか。
- 異常時の停止条件、ロールフォワード、復旧方針を理解できるか。
- 未解決または「不明」の事項を残して進む例外を承認するか。

Humanへ求めない責任は次のとおりである。

- Raw SQLの構文、Postgres内部挙動、lock、transaction、RLS、GRANT、権限継承を最終保証すること。
- terminalからProductionへ接続し、SQLやCLI commandを手作業で実行すること。
- AIの説明だけを根拠に形式的に承認すること。

技術的妥当性は、再現可能なLocal／CI test、Staging rehearsal、RLS／GRANT・権限test、target／credential否定test、必要な独立reviewで証拠化する。高risk変更は、同じAIとHumanだけでは適用せず、Supabase／Postgresに習熟した独立Human reviewを得るか、複数の低risk段階へ再設計する。別AI reviewは補助証拠であり、唯一の安全装置にしない。

変更説明書は、少なくとも`目的 / 対象 / current問題 / 変更後 / 既存user・data影響 / 不可逆性 / 後方互換性 / RLS・GRANT・Auth・Storage・secret影響 / lock・停止・性能 / 対象件数前提 / riskと根拠 / 停止・復旧・roll-forward / Local証拠 / Staging証拠 / post-check / 未解決事項`を日本語で示す。「安全」「影響なし」「rollback可能」という結論だけでなく、根拠を併記する。

## 6. 想定開発プロセス

以下は目標となる標準flowであり、現在の運用ではない。

1. Humanが製品上のGoalと変更目的を提示し、Tech Leadが個別Execution Contractとしてscope、guardrail、DoD、停止条件、必要な技術判断を構造化する。
2. 許可されたexecution agentがLocalで再現し、変更をmigrationまたは適切なversion管理対象として作る。
3. クリーンなLocal Supabaseへ全migrationを再生し、DB、RLS／GRANT、lint／Advisor、型、application testを行う。
4. 日本語の変更説明書、risk区分、証拠、未解決事項、復旧方針を伴うPRを作る。
5. 非Production dataのStaging／Previewへ適用し、hosted環境でRLS、接続、主要smokeを検証する。
6. Reviewerと必要な独立専門家が、riskに応じてread-only reviewを行う。
7. Humanがおしげさん向け説明に基づき、製品目的、影響、risk許容度を承認する。
8. 保護されたdeploy経路が、明示された承認済みcommitだけを手動起動でProductionへ一件ずつ適用する。
9. 失敗時は後続処理を停止し、事前定義されたroll-forward／application切戻し／復旧判断へ移る。
10. agentまたは監視処理が必要最小限のread-only post-checkを行い、commit、migration、経路、結果、異常を記録する。

通常flowには、HumanによるSQL Editorへのcopy＆paste、local terminalからのProduction `db push`、AIによる自己承認、mergeだけをtriggerにした無条件Production deployを含めない。回復は未検証のdown migrationへ依存せず、後方互換、application切戻し、追加migrationによるroll-forwardを優先する。

## 7. リスク分類と承認境界

| 区分 | 判定の中心 | 追加証拠・gate | Production承認境界 |
|---|---|---|---|
| 低risk | 後方互換、data削除・広範updateなし、認可拡大なし、lock／性能影響が小さく根拠あり、安全な追加migrationまたは機能無効化が可能、Local／Staging成功 | 標準test、変更説明書、対象commit、post-check | 導入段階で唯一のProduction対象。Humanが目的・影響・riskを承認し、保護経路を手動起動する |
| 中risk | RLS／GRANT、constraint、backfill、大table index、Auth／Storage／Edge Function、data量依存のlock／時間 | 独立review、対象件数、Staging rehearsal、停止条件、具体的復旧、必要な性能証拠 | 導入段階ではProduction対象外。将来、強化gateを別承認してから扱う |
| 高risk | drop／rename／type全行書換、広範UPDATE／DELETE、広い認可変更、`SECURITY DEFINER`、privileged role、RLS bypass、history repair／squash、workflow／secret／network変更、不可逆操作 | Supabase／Postgres専門Human review、またはexpand／migrate／contract等への再設計 | Humanと同一AIだけでは適用不可。専門reviewまたは低risk段階化を必須とする |

risk labelだけを保存せず、判定根拠と証拠を残す。未分類の変更、証拠不足、対象件数不明、復旧未確認は低riskとして扱わない。workflow、secret、credential、network protection自体の変更は、それが安全機能を追加する場合でも高risk review対象とする。

## 8. 導入段階のスコープ、要件、DoD

### 8.1 Scope

対象に含める。

- Supabase project／branch／Local、plan、GitHub、MCP、CLI、migration、credential、access routeのread-only inventory。
- Production／Staging／Preview／Localの環境、用途、data、target、credential分離の確認。
- Git migration、本番migration history、本番schemaのdrift調査。
- clean Local replay、PR verification、非Production Hosted Staging、変更説明書、risk分類。
- 低risk変更だけを対象にした、Human承認・手動起動型の保護されたProduction deploy経路。
- read-only post-check、監査記録、Break-glass文書と非Production rehearsal。

対象外とする。

- AIのProduction任意SQL、Production write credential、無条件auto deploy。
- 中・高risk変更の通常運用化。
- 全Supabase surfaceの完全自動化、大規模Production data補正、DB全面再設計、歴史migrationの全面整理。
- 専門reviewなしの不可逆変更。

### 8.2 要件

| ID | 要件 |
|---|---|
| SUP-I01 | Production、Staging／Preview、Localのproject、用途、Reference ID、plan、data方針、application接続先、`remote`との対応を値非表示のread-only証拠で確定する |
| SUP-I02 | Dashboard member／role／MFA、Network Restrictions、backup／PITR、Temporary Access、MCP、CLI link、GitHub integration／Actions／Environment／rule／secret、DB接続経路を棚卸しする |
| SUP-I03 | Git migration、本番migration history、本番schemaをread-only比較し、driftを記録する。`db pull`、`repair`、既適用migration書換を自動実行しない |
| SUP-I04 | Production password、PAT、secret key、旧service role keyをLocal AIとPR jobから排除し、deploy経路だけが必要最小範囲で参照する。値をlog、artifact、説明書へ出さない |
| SUP-I05 | MCPは原則Local／testに限定する。Production例外は必要性、read-only、project固定、feature限定、data最小化、Human tool確認を個別承認する |
| SUP-I06 | 固定CLI versionと明示的Local targetで、clean環境へ全migrationと非Production fixtureを再生できる。Production dataをそのまま複製しない |
| SUP-I07 | PRで全migration replay、DB lint、DB test、RLSとGRANTのrole別test、型整合、application test、変更説明書、risk分類を再現可能に検証し、変更説明書templateとrisk分類ruleをversion管理する |
| SUP-I08 | exposed schemaはRLSとData API GRANTを別layerで検証し、2026年のplatform変更を実装時のcurrent Changelogで再確認する |
| SUP-I09 | 本番と分離したHosted Stagingを使い、Production dataを自動copyせず、migration、RLS、application接続、主要smokeを検証する |
| SUP-I10 | Production対象を低riskだけに限定し、protected branch上の明示commit、successful check、Staging証拠、Human approval、manual triggerを必要とする |
| SUP-I11 | PR jobへProduction secretを渡さず、deployを同時1件に制限し、対象変更を事前表示し、失敗時停止、read-only post-check、log保存を行う |
| SUP-I12 | HumanがLocal terminalやSQL EditorでProduction SQL／`db push`を行う手順を新しい通常経路に含めない。現行SQL Editor経路は新経路の実証と別承認まで維持する |
| SUP-I13 | Break-glassの条件、担当、理由、開始・終了、実行内容、失効、監査、事後version管理を定義し、非Productionでrehearsalする |
| SUP-I14 | Supabase／GitHub planで強制できないgateは、利用不能、代替手段、残余risk、検知方法を明示する |

### 8.3 DoD

- [ ] Supabase project／branch／Local環境、用途、application接続、`remote`対応が一覧化されている。
- [ ] Supabase／GitHub plan、repository visibility、利用可能な保護機能が確認されている。
- [ ] member、role、MCP、CLI link、GitHub integration、workflow、secret、DB接続経路が値非表示で棚卸しされている。
- [ ] Production write credentialの所在と参照主体が明文化され、Local AI／PR jobから到達できないことが設定確認と否定testで確認されている。
- [ ] Production MCPが無効、または承認済み例外としてread-only・project固定・feature限定・Human確認になっている。
- [ ] Git migration、hosted migration history、hosted schemaのdrift調査が完了し、未承認のpull／repair／history書換を行っていない。
- [ ] driftがある場合、安全な基準点案がHumanと技術責任者に承認されている。
- [ ] clean Local環境で全migrationを再生でき、非Production fixtureだけを使用している。
- [ ] PRでmigration replay、lint、DB test、RLS／GRANT、型、application test、変更説明書、risk分類を検証でき、変更説明書templateとrisk分類ruleがversion管理されている。
- [ ] 中・高risk変更が導入段階のProduction経路へ進めない。
- [ ] 本番と分離したHosted Stagingで少なくとも1件の低risk migrationと主要smokeが成功している。
- [ ] Production secretをPR jobへ渡さず、承認済みcommitだけを対象にするmanual deploy経路が成立している。
- [ ] parallel Production deployが防止されている。
- [ ] 低risk変更1件がLocal → PR検証 → Staging → Human承認 → protected deploy → read-only post-checkを完遂している。
- [ ] 実行commit、migration、実行経路、結果、post-checkを追跡できる。
- [ ] Break-glassが文書化され、非Productionでrehearsal済みである。
- [ ] HumanがRaw SQLを技術保証せず、目的、影響、risk、停止・復旧を判断できる日本語証拠がある。
- [ ] 未確定事項、残余risk、最終ゴールへの持越しが明示され、残課題を伴う完了にはHuman例外承認がある。

## 9. 最終ゴールのスコープ、要件、DoD

### 9.1 Scope

対象は、DB migration、RLS、GRANT、Function、Trigger、View、Extension、管理されたdata change、Auth、Storage、Edge Functions、必要なSupabase設定、Local／Staging／Production環境、CI/CD、secret、backup／restore、Break-glass、drift、監査、継続的権限reviewである。

最終ゴールでも、AIのProduction任意SQL、Humanの日常的Dashboard／SQL Editor直接変更、test成功だけによる無条件deploy、高riskをHumanと同一AIだけで承認すること、Production dataの無制限なAI参照、復旧不能な例外の標準化は対象外である。

### 9.2 要件

| ID | 要件 |
|---|---|
| SUP-F01 | Supabaseの全変更面を分類し、schema、data、Auth、Storage、Edge Functions、secret、platform workflowごとに正式なversion管理または変更記録経路を定義する |
| SUP-F02 | 通常のProduction変更主体を、保護deploy経路または事前定義した狭い能力単位へ限定し、直接変更を定期drift検知する |
| SUP-F03 | 低・中・高riskの機械判定とHuman判断を組み合わせ、risk別gateと根拠証拠を強制・保存する |
| SUP-F04 | execution agentはLocal／Stagingで調査、再現、変更、migration、test、検証、PR、説明書まで完遂できるが、自己承認とProduction write credential accessはできない |
| SUP-F05 | migrationはversion管理し、既適用fileを原則変更せず、後方互換とexpand／migrate／contractを優先する。lock、timeout、batch、data量を評価する |
| SUP-F06 | `SECURITY DEFINER`、privileged role、RLS bypass、workflow／secret／network変更を特別審査対象にし、RLSとData API GRANTを別々にtestする |
| SUP-F07 | Production data changeは、対象条件、preview、期待件数、件数不一致停止、transaction、冪等性、timeout、batch、前後検証、監査、再実行、復旧を持つ専用job／scriptから行う |
| SUP-F08 | secret最小scope、rotation、MFA、Network Restrictions、Temporary Access、GitHub rule／check／environment／secret scope／concurrencyをplan内で最大限活用し、利用不能機能の残余riskを示す |
| SUP-F09 | backup／restore能力を確認し、riskに対して不足する場合は高riskを制限する。非Production restore rehearsalとBreak-glass事後reviewを継続する |
| SUP-F10 | deploy history、migration history、変更説明書、検証、approval、post-checkを相互追跡可能にし、Human向けに確認済み、未確認、残余riskを日本語で分ける |
| SUP-F11 | 将来AIへProduction操作を許す場合も任意SQLではなく、許可済みRPC、job、再実行、queue等の狭い能力とし、対象、件数、引数、停止条件、監査を別承認する |

### 9.3 DoD

- [ ] Local、Staging／Preview、Productionの役割、data、接続、credential境界が文書と実設定で一致する。
- [ ] execution agentはLocal／Stagingで必要なSupabase変更を承認境界まで自律完遂できる。
- [ ] AIがProduction write credential、任意SQL、migration適用、secret変更へ到達できないことが否定test済みである。
- [ ] Humanの日常経路から直接SQLを行わずに運用できる。
- [ ] Production通常変更は保護deploy経路または承認済み限定操作だけから実行される。
- [ ] DB、data fix、Auth、Storage、Edge Functions、secret、workflowの正式経路とrisk別approvalが定義されている。
- [ ] required check／Stagingを通過していないcommitはProductionへ進めない。
- [ ] Production secretは未承認job、PR job、Local AIから参照できない。
- [ ] Production deployは同時1件に限定される。
- [ ] 高risk変更はHumanと同一AIだけではdeployできない。
- [ ] Production data changeは自由SQLでなく、件数・停止・冪等性・監査を持つ専用経路で行われる。
- [ ] RLSとData API GRANTが別々にtestされ、特権code／workflow／secret変更が特別審査される。
- [ ] migration driftとDashboard／SQL Editor直接変更を定期検知・是正できる。
- [ ] backup／restore能力が確認され、非Production restore rehearsalに成功している。
- [ ] Break-glassが権限付与、実行、失効、監査、事後version管理まで検証されている。
- [ ] secret rotationが文書化され、少なくとも非Productionで検証されている。
- [ ] 各Production変更の目的、影響、証拠、risk、復旧、commit、post-checkを追跡できる。
- [ ] 複数回の変更でLocal → CI → Staging → risk別approval → Production → post-checkが安定完遂している。
- [ ] HumanがRaw SQLを技術保証せず、製品判断とrisk受容を行える。
- [ ] 残余risk、plan制約、将来改善が定期review対象になっている。

## 10. 現状との差分

| 領域 | Current state | Mission target | Gapの性質 |
|---|---|---|---|
| environment | repo targetは`local`／`remote`のみ | Local／Staging／Productionを一意に識別 | 外部inventoryと設計が必要 |
| Local safety | wrapper、target検証、CLI固定、migration／test資産あり | clean replayとPR evidenceを標準化 | 既存基盤をCIへ接続するgap |
| Staging | 実在・用途・data方針未確認 | Production分離Hosted検証 | plan／project判断が必要 |
| PR verification | tracked Actions workflowなし | replay、lint、DB、RLS／GRANT、app test | workflow設計・secret境界が必要 |
| Production deploy | Human SQL Editor直接実行 | approved commitだけのmanual protected route | 大きな運用変更。実証後に置換判断 |
| migration history | SQL Editor適用はCLI historyを自動更新しない | Git、hosted history、schemaが追跡一致 | read-only drift baselineが必要 |
| GitHub protection | `main` protection／rulesetなし、5 environmentにprotectionなし | required checks、environment approval、concurrency | GitHub管理sliceとの依存あり |
| credential | local ignored profileはあるが値・target未確認 | Local AI／PR jobからProduction writeへ到達不可 | 値非表示inventoryと否定testが必要 |
| MCP | tracked設定なし、実態未確認 | 原則非Production、例外は狭く制限 | 外部client設定の調査が必要 |
| risk／explanation | repo template未確認 | 日本語説明書、3区分、risk別gate | owner、正本配置、強制方法が必要 |
| recovery | backup／PITR／Temporary Access／Break-glass未確認 | restore rehearsal、期限付き緊急経路、事後version管理 | planと専門reviewが必要 |
| change surfaces | 主にDB migrationの現行flow | DB、data、Auth、Storage、Edge、secret、workflowを分類管理 | 最終ゴールへ段階的に拡張 |

## 11. 未確定事項と判断が必要な点

人間判断を必要とする事項は次の一表へ集約する。read-only調査で解消できる事実は、判断事項に昇格する前に調査する。

| ID | 判断事項 | Human判断が必要な理由 | 選択肢 | 主な影響 |
|---|---|---|---|---|
| SD-01 | Staging方式 | plan、cost、data隔離、運用負荷に関わる | Supabase Branching／独立Staging project／同等Hosted環境 | Preview自動化、cost、Production類似性、credential分離が変わる |
| SD-02 | `remote`とProductionの対応 | 誤target防止とremote E2Eの許容riskに直結する | remoteをdev固定／Production固定／profileを環境別再設計 | 現行command、E2E、正本、credential配置へ影響 |
| SD-03 | 保護deploy方式 | Production変更経路の採用はriskと運用方針の変更である | Supabase GitHub Integration／GitHub Actions中心／組合せ | 対象surface、secret、approval、history、plan制約が異なる |
| SD-04 | plan変更の許容 | Branching、access role、backup／PITR等の利用可否とcostに関わる | 現plan内で代替／必要機能のためupgrade | 技術的強制力と残余risk、月額costが変わる |
| SD-05 | Production観測方針 | Read-onlyにもdata漏えい・負荷riskがある | 原則禁止／集約証拠のみ／限定read-only例外 | AIの診断速度とProduction data保護のbalanceが変わる |
| SD-06 | deploy identity／credential | 個人PAT継承risk、失効、継続運用に関わる | platform integration／専用identity／個人credentialを限定利用 | credential owner、rotation、退任時riskが変わる |
| SD-07 | 高risk独立review体制 | Humanと同一AIだけでは専門的妥当性を保証できない | 外部／内部Supabase専門家を確保／低risk段階へ再設計し高riskを禁止 | lead time、cost、扱える変更範囲が変わる |
| SD-08 | 復旧目標 | backupの存在だけでは停止許容時間・data loss許容を決められない | RTO／RPOとPITR要否を定義／高risk禁止を継続 | plan、rehearsal、release制限へ影響 |
| SD-09 | Break-glass custodian | 強い緊急権限と監査責任の割当が必要 | 指名Human expert／platform temporary access中心／未整備中は利用禁止 | 障害対応速度と権限濫用riskが変わる |
| SD-10 | 現行SQL Editor経路の終了条件 | 新経路未実証のまま廃止すると変更不能、併存が長いとdrift riskが残る | pilot完遂後に廃止／限定fallback化／当面併存 | 操作負荷、drift、rollback可能性が変わる |
| SD-11 | 導入段階のExecution Contractと実装開始承認 | 本ミッションのGoal、scope、対象外、責任分担、risk境界はHuman承認済みだが、GitHub／Supabase外部状態の調査、設定、credential、各段階の実装は別authorityを要する | 段階別に承認／修正要求／保留 | 当該導入段階のExecution Contract確定と実装開始可否を決める |
| SD-12 | SUP-GOV-REF-01の永続保管先 | Downloadsは受領場所であり、管理対象referenceの長期追跡には不安定である | 承認済みrepository内非正本領域／外部managed storage／原本は廃止し本書を派生記録として保持 | 重複、正本誤認、将来の証拠再確認可能性が変わる。移動・廃止前にHuman承認とhash確認が必要 |

## 12. 実行計画へ進むための開始条件

### 12.1 必須開始条件

次をすべて満たすまで、詳細task分解、workflow実装、credential変更、Staging／Production操作へ進まない。

- [x] Humanが本ミッションのGoal、scope、対象外、責任分担、risk境界を承認している（2026-07-21）。
- [ ] PKA v2の非Supabase必須sliceが完了している。残課題がある場合は、残課題、理由、risk、暫定対策、owner、再開条件、Human承認者を持つ例外承認がある。
- [ ] 実行対象repository、baseline、branch／worktree、owner、GitHub publication境界が一意で、他ownerのdirty変更と分離されている。
- [ ] Supabase／GitHub外部状態を値非表示・read-onlyで確認するscopeとauthorizationがある。
- [ ] SUP-GOV-REF-01の永続保管方針が承認されている、または受領pathを維持する期限・owner・再判断条件が記録されている。
- [ ] Production、Staging、remote、applicationのproject identityと、Reference ID、Database hostname、port、database、roleが混同されずに確認できる。
- [ ] Tech Lead、DevOps、独立Reviewer、Human approverが割り当てられ、Tech Lead／PKAのcode実装禁止とReviewerのwrite制限を維持できる。
- [ ] current Supabase Changelog、公式Docs、対象CLI `--help`、GitHubのcurrent plan制約を実装開始時点で再確認している。
- [ ] Production write credentialへLocal AI／PR jobが到達しない設計案と、secret値を表示しない検証方法がreview済みである。
- [ ] 未解決の高risk事項がない。残す場合は導入段階のProduction対象から明示的に除外されている。
- [ ] 導入段階の最初の変更は低risk、可逆的、効果測定可能であり、主指標1件とrollback1件を持つ。

上記のうち完了しているのはミッション承認だけである。各導入段階のExecution Contractと実装開始は未承認であり、残る開始条件を確認した後にHumanが段階ごとに判断する。

### 12.2 本書が承認しない操作

本書の作成・review・承認だけでは、Supabase／GitHub設定変更、credential取得・移動、MCP変更、migration作成・適用、`db pull`、`db push`、`migration repair`、remote reset、Staging／Production query、workflow作成、secret登録、branch protection、Environment protection、commit、push、PR、merge、deployを実行できない。各変更は別Execution Contract、risk分類、必要なHuman承認を持つ。

### 12.3 実装時に再確認する一次資料

- [Supabase Deployment](https://supabase.com/docs/guides/deployment)
- [Supabase Managing Environments](https://supabase.com/docs/guides/deployment/managing-environments)
- [Supabase Maturity Model](https://supabase.com/docs/guides/deployment/maturity-model)
- [Supabase GitHub Integration](https://supabase.com/docs/guides/deployment/branching/github-integration)
- [Supabase Branching](https://supabase.com/docs/guides/deployment/branching)
- [Supabase MCP](https://supabase.com/docs/guides/ai-tools/mcp)
- [Supabase Platform Access Control](https://supabase.com/docs/guides/platform/access-control)
- [Supabase Temporary Access](https://supabase.com/docs/guides/platform/temporary-access)
- [Supabase Changelog](https://supabase.com/changelog)
- [Supabase Data API GRANT change](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically)
- [Supabase pg_graphql 1.6.0 change](https://supabase.com/changelog/46320-breaking-change-in-pg-graphql-1-6-0-graphql-introspection-disabled-by-default)
- [GitHub Deployments and Environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments)
- [GitHub Deploying with Actions](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/control-deployments)
- [GitHub Workflow Concurrency](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency)

これらは設計時点のreferenceであり、team ruleそのものではない。採用する制約は、実装前のcurrent確認とHuman承認後に、適切なrepository正本へ自立した文言として反映する。
