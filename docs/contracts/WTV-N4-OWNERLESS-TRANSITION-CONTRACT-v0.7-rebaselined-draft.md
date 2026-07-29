# WTV-N4-OWNERLESS-TRANSITION-CONTRACT v0.7-rebaselined-draft

## 1. Artifact identity

- Contract ID: `WTV-N4-OWNERLESS-TRANSITION-CONTRACT`
- Version: `v0.7-rebaselined-draft`
- Status: `PROPOSED / NOT ADOPTED / NOT IMPLEMENTATION AUTHORIZED`
- Baseline: `main@e3a6d0bed953dd40b8c3e180b3ac645af78b51d1`
- Governing decision: `ADR-0009: Ownerless Collaborative Model Decision`
- Reference artifact:
  - Version: `v0.6-integrated-draft`
  - SHA-256: `e5879f3e3d361b833d2296b06c1fd8591872eab2142ef929e334ca39a6610a0f`
- v0.6 verdict `N4_INTEGRATED_CONTRACT_HUMAN_DECISIONS_NOT_READY`は、本rebaselineのHuman decision候補としてはsupersededとする。
- Lifecycle owner: PKA
- Focused reviewers:
  - Tech Lead: application、schema、RLS、GRANT、least privilege、atomicity、migration／deployment compatibility
  - DevOps: maintenance boundary、Data API、deployment、rebuild、cleanup、change freeze、evidence、Production sequence
  - Independent Reviewer: authority、責任分離、矛盾、過剰設計
- Adoption、N5実装、Git publication、Production operation authority: Human

本artifactはv0.6を上書きしない。Humanが本Contractを採用するまでは、v0.6も本artifactもN5以降の実装、dependency追加、migration、credential設定、Git publication、Supabase／Vercel／Production操作を許可しない。

## 2. Rebaseline rationale

v0.6は、既存business dataを保全し、旧applicationとownerless applicationのrollback可能期間を持つことを前提に、M1／M2 bridgeと9-state compatibility matrixを設計した。

今回Humanが、N12 Public Launch前には保全対象ユーザー・保全対象データがなく、N8で全business rowを削除してrow 0からownerless transitionを開始すると確定した。このpremiseでは、既存rowの変換、owner権限継承、旧applicationへのservice rollbackを守るfailure modeは存在しない。

したがって本Contractは、N8後のbusiness row 0から、外部公開とbusiness mutationを停止したまま、ownerless final migrationとownerless applicationを一つのrelease lineとして導入し、空のhosted targetから同じfinal stateを再構築できることに責任を限定する。

## 3. Governing premise

### Pre-launch no-user / no-preserved-data premise

1. N12 Public Launchより前には、きめのすけのユーザーはいない。
2. N12より前にProduction DBへ存在するEventおよび関連rowは、件数、作成主体、作成経路にかかわらず、継続保全またはownerless modelへの移行を要するユーザーデータではない。
3. 上記rowは、開発、QA、smoke、旧owner model、spam等を含む`pre-launch non-preserved data`として扱う。
4. N8でHuman承認のもと全件削除し、ownerless Production transitionはEventおよび関連business rowが0の状態から開始する。
5. N4、N5、N8、N9では、既存Eventの互換、変換、保存、owner権限継承を設計しない。
6. N9／N12公開前の障害対応は、Production user dataのrestoreではなく、migration、application、role、credential、environmentからのfull rebuildを基本とする。
7. Platform backup／PITRは、pre-launch ownerless migrationの必須条件としない。
8. N12 Public Launch後のデータ保全、backup、recovery契約は、launch readinessの別Human gateで採用する。

この8項目にPKA判断で例外を追加しない。現状rowが0であることと、N8で全件削除後にrow 0を確認することを混同しない。

## 4. v0.6 premise-error inventory

| v0.6 concept | Disposition | Rebaseline理由／routing |
|---|---|---|
| existing user／preserved customer data | 削除 | Governing premiseによりpre-launchの保全対象ではない |
| user／owner migration | 削除 | row変換と権限継承を行わない |
| `owner_token` nullable bridge | 削除 | N8後row 0でfinal column dropへ進める |
| old anon INSERTとの共存 | 削除 | Data API停止、外部access 0、business mutation 0で隔離する |
| M1 bridge／M2 point-of-no-return | 削除 | single final migrationを第一候補とする |
| old application rollback service | 削除 | 中間状態を利用者へ提供しない |
| mixed old／new row、ownerless row移行 | 削除 | final migration前のfixture 0 |
| 9-state compatibility matrix | 縮小 | permissionが異なる4状態だけを残す |
| pre-M2／post-M2 cleanup profile | 修正 | N8全件cleanupとownerless smoke cleanupの責任別profileへ分ける |
| Recovery／PITR migration gate | 削除 | pre-launchはfull rebuild、post-launchはN12へ移管 |
| backup、logical backup、retention、RPO／RTO、restore proof | Post-launchへ移管 | N11-c／N12 launch-readinessの別Human gate |
| data retention | 修正 | N4で保持するのはsecret-free execution evidenceだけ |
| Layer 2 compatibility proof | 修正 | empty hosted targetへのfull rebuild proofとする |
| dedicated role bridge policy | 修正 | final ownerless schema専用policy／GRANTとする |

`recovery`という語は、pre-launch full rebuildまたはpost-launch handoffだけに使用する。旧owner stateへのservice rollbackを意味しない。

## 5. Maintained sections

次はv0.6から維持する。

- owner token、owner URL、owner Cookie、owner-session、`x-owner-token` header、owner helper／policy／grantの完全撤去
- share URLだけをEvent access capabilityとする
- Event作成者と有効なshare URLを用いる共有利用者の権限同一化
- titleの作成後不変
- `memo`の共同編集
- Participant、Candidate、Criterion、Vote、Reaction、Concern、Commentの現行共同編集権限とParticipant削除仕様
- anonymous／authenticated Data APIからのdirect Event INSERT禁止
- Vercel server routeからdedicated least-privilege Postgres roleを使うEvent作成
- `service_role`不採用
- Eventとdefault Criterionのtransaction atomicity
- N5〜N7 stacked release line、単一final Head、normal merge commit
- N7で受入済みのEvent作成WAF rule／runbookを、N9の別Human gateでapply／controlled verificationする境界
- Vercel Authentication `All Deployments`をN12まで維持
- Data API stop／restartの独立Human gate
- B／H／M deployment identity
- maintenance surface inventory、change freeze、automatic retry 0
- ownerless final schema用cleanup profile
- durable evidence directory
- raw share pathname、token、Cookie、password、connection stringの非記録
- N9 internal acceptance、N12 public opening、N13 advertising activationの責任分離

## 6. Removed／simplified sections

次をContractから外す。

- M1／M2 phase設計と二段階を前提としたmigration ordering
- `owner_token IS NULL` bridge policy
- owner-token付きrowとownerless rowの同時service
- 旧applicationによる新規Event作成の継続
- old app rollbackのためのschema compatibility
- 9-state matrixと同じpermission結果を持つ細分類
- Production fixtureをfinal state前に作成する経路
- pre-launch backup／PITR／restore proof
- pre-launch business rowの保存、export、convert、carry-over
- cleanup artifactをsource codeまたはcredential storeとして扱う設計

二段階migrationは、Layer 1／Layer 2で単一migrationが成立しない具体的な技術failure modeが判明した場合だけContract repairへ戻す。

## 7. Revised ownerless final contract

Final stateは次を同時に満たす。

### Application

- Event作成前にexact確認文を表示する。
  - `この内容で作成してもよろしいですか？`
  - `作成後に「きめること」は変更できません。`
- 作成requestはVercel server-only routeで処理する。
- 作成成功後はshare URLだけを返し、owner固有token、Cookie、session、permission stateを作成しない。
- `/o/[ownerToken]`、owner-session API、owner claim、owner URL表示／copy、owner Cookie、owner headerを残さない。
- Event readと共同mutationはshare capabilityだけを使う。
- application log、analytics、error report、test artifactへraw share pathnameまたはsecretを記録しない。

### Database

- `events.owner_token`、owner-token index、owner helper、owner-specific RLS、owner-specific GRANT／EXECUTEをfinal migrationで撤去する。
- Event SELECTは有効なshare capabilityに限定する。
- Event UPDATEは`memo`だけを許可し、title mutationを拒否する。
- anon／authenticated Data API roleにはEvent INSERTを許可しない。
- Event作成専用roleだけに、作成に必要な最小column INSERTを許可する。
- share tokenは現行の32-byte CSPRNG→unpadded base64urlを維持し、`NOT NULL`、`UNIQUE`、exact 43文字、`[A-Za-z0-9_-]`だけというDB invariantをfinal migrationで強制する。
- Participant以下のshare-based共同編集契約は意味変更しない。
- Event INSERTとdefault Criterion INSERTは一つのtransactionとして成功または全rollbackする。

### Release

- N5はownerless transitionだけを含むLayer 2 candidate `C5`へ固定し、N6／N7を混入させない。Layer 2 PASS後に変更0で同じSHAだけをaccepted review Head `H5`へpromoteする。
- N6／N7は`H5`の後へ同じstacked release lineとして積み、N5〜N7を含む唯一のfinal release Head `H`へ固定する。
- N5／N6／N7の個別review／Readyはmain merge permissionを生成せず、mainへmergeできるのは`H`をHeadとするfinal release PRだけとする。
- final ownerless migrationとownerless applicationを別々にmainへmergeしない。
- N8完了、final Head acceptance、Layer 1／Layer 2 proof、Human gateまではProduction mutationを行わない。
- N9はVercel Authentication下のinternal Production acceptanceであり、一般公開ではない。

## 8. Single migration vs two-phase assessment

### Assessment

`SINGLE_FINAL_MIGRATION_RECOMMENDED`

### Reasoning

- N8後の8 business table rowが0なら、`owner_token` nullable化、backfill、mixed row handlingは不要。
- 現行owner依存はcolumn、index、helper、policy、GRANT、application owner assetsとして特定可能で、final stateへのdrop／replaceを一つのreviewed migration責任へまとめられる。
- 中間の`old app＋ownerless DB`と`ownerless app＋old DB`は、Vercel Authentication、Data API停止、external surface遮断、business mutation 0、fixture 0のmaintenance stateであり、service compatibilityを要求しない。
- Event＋default Criterionの既存trigger atomicityをfinal role INSERTでも維持できる。
- normal merge前にexact final migrationをHumanが一度だけ適用し、DB postflight後にnormal merge由来のownerless deploymentへ進めることで、automatic deploymentとの競合を避けられる。

Current source evidence:

- `events.owner_token`は現行migrationで`NOT NULL UNIQUE`であり、N8後row 0ならrow変換をせずfinal dropを検証できる: [20260708000000_slice_1_events_participants.sql](/Users/shige/Projects/Where-to-Visit/supabase/migrations/20260708000000_slice_1_events_participants.sql)
- owner依存のEvent policy／column GRANTは現行migrationに明示されている: [20260712032527_collaborative_response_row_model.sql](/Users/shige/Projects/Where-to-Visit/supabase/migrations/20260712032527_collaborative_response_row_model.sql)
- Event INSERT後にdefault Criterionを作成し、失敗時に同じtransactionをrollbackするtriggerが存在する: [20260725010551_event_default_criterion_atomic_create.sql](/Users/shige/Projects/Where-to-Visit/supabase/migrations/20260725010551_event_default_criterion_atomic_create.sql)

### Conditionality

この判定は、Layer 1 clean-chainとLayer 2 empty-hosted-targetで、次を実証できることを条件とする。

- final migrationが一つの短いtransaction責任として適用できる
- dedicated role定義とfinal RLS／GRANTがhosted targetで成立する
- migration failure時にpartial ownerless schemaを残さない
- final migration適用後、ownerless deploymentまでbusiness mutation 0を維持できる

role lifecycle等にtransaction外操作が必要でも、password provisioningの別Human gateとして分離でき、schema bridgeを必要としない限り「two-phase data migration」とは扱わない。単一migrationが成立しない場合は実装中に分割せず、具体的failure modeと必要なpermissionを示して`TWO_PHASE_MIGRATION_STILL_REQUIRED`のContract repairへ戻す。

## 9. Minimal compatibility matrix

N8 cleanupは§10の独立permissionで完了させ、matrixのpreconditionとする。次の4状態はN8 postcheckでbusiness row 0を確認した後から管理する。

| State | External access | Business mutation | Allowed action | Acceptance |
|---|---|---:|---|---|
| old app＋old DB＋N8完了／row 0 | なし | 0 | N8 postcheck、final migration preflight | 不可 |
| old app＋ownerless DB | なし | 0 | DB postflight、ownerless deployment待機 | 不可 |
| ownerless app＋old DB | なし | 0 | drift／誤順序検出、route availability確認のみ | 不可 |
| ownerless app＋ownerless DB | なし | 最初のownerless smoke fixture exact 1件。cleanup後、別Human gateのN7 WAF controlled request set | ownerless smoke／cleanup、WAF functional verification／cleanup | N9 internal acceptance対象 |

中間2状態でEvent作成、SQL business mutation、fixture作成、Data API再開、外部公開を行わない。Ownerless smokeとWAF verificationは同じfinal state上の別Human gateとし、各gateの前後でfixture 0を確認する。状態を追加する場合は異なるpermissionまたはHuman handoffが必要な理由を示す。

## 10. Revised N8 contract

- Target:
  - `events`
  - `participants`
  - `candidates`
  - `criteria`
  - `votes`
  - `reactions`
  - `concerns`
  - `comments`
- Classification: 全rowを`pre-launch non-preserved data`として扱う。
- Preservation／conversion／migration: 0
- Human gate: Production全件削除のexact scope、SQL artifact、target identity、COMMITをHumanが別途承認する。
- Required flow:
  1. fresh target identityとold-schema fingerprint
  2. table別row countとrelation inventory
  3. no-replace cleanup artifact生成
  4. ROLLBACK verification
  5. Human review
  6. Human-only COMMIT
  7. table別postcheck
- Completion: 8 business tableのrow 0、SQL error 0、retry 0。
- Boundary: N8開始前からrow 0だったとは主張しない。cleanup結果をownerless migration proofへ読み替えない。

現行`[E2E]` fixture cleanup profileを全件削除へ流用しない。N8専用のpre-transition all-business-row cleanup profile／generator contractを、N8実装前の別Human gateで採用する。

## 11. Dedicated role contract

### Candidate definition

- Candidate role name: `kimenosuke_event_creator`
- Attributes:
  - `LOGIN`
  - `NOINHERIT`
  - `NOSUPERUSER`
  - `NOCREATEDB`
  - `NOCREATEROLE`
  - `NOREPLICATION`
  - `NOBYPASSRLS`
- Minimum privileges:
  - database接続に必要な権限
  - `public` schemaの必要最小`USAGE`
  - `events(title, memo, share_token)`への`INSERT`
- Explicitly absent:
  - `events`の`SELECT`／`UPDATE`／`DELETE`
  - related table privilege
  - owner role membership
  - `private` schemaの一般利用
  - `service_role`
  - RLS bypass

Role専用Event INSERT policyはfinal ownerless schemaだけを対象とする。share tokenはapplicationが生成し、`RETURNING`を必要としないrequest shapeを第一候補とする。default Criterionは既存のprivate `SECURITY DEFINER` triggerで作成し、roleへCriterion INSERTまたはtrigger function EXECUTEを付与しない。

title、memo、share tokenはdriverのparameter bindingで渡し、値をSQL文字列へ連結しない。transaction pooler向けにprepared statementを無効化する設定はparameter bindingの放棄を意味せず、driverが両立できない場合は採用しない。table、column、SQL statement shapeはapplicationでstaticに固定する。

### Secret／connection boundary

- role属性・RLS・GRANTはmigration-owned、passwordはHuman-ownedとする。
- password、connection string、tokenをmigration、Git、artifact、log、reportへ保存しない。
- Preview／Layer 2／Production credentialを分離する。
- server-only environment variableのexact名、driver／version、SSL、timeout、retry 0、rotation／revocation順序をN5 Contractで固定する。
- Supavisor transaction-mode接続を使う場合は公式要件に従い、prepared statementを無効化してLayer 2で証明する。

Supabaseのtransaction poolerとprepared statementの制約は、実装時に公式の[Connect to your database](https://supabase.com/docs/guides/database/connecting-to-postgres)をfresh確認する。role名、driver、接続methodはfocused review／Human adoption前の候補であり、現時点でcredential設定permissionを生成しない。

## 12. Title／memo contract

### Title

- UI edit control: 0
- server update field: 0
- memo mutation requestに`title` fieldが含まれる場合、値が同一でもrequest全体を拒否する。
- runtime SQLのtitle UPDATE privilege: 0
- DB triggerまたは同等のfinal guardでruntime title差分を拒否する。
- Human承認済みmigration／recoveryによるDDL・データ操作は、runtime mutationとは別Contractとする。

### Memo

- Internal identifier: Human decisionにより`memo`を維持する。
- UI label: `つたえたいこと`
- Authorization: 有効なshare capabilityを持つ共有利用者が共同編集できる。
- Normalization:
  - missing fieldと明示的な更新を区別する
  - trim後emptyは`NULL`
  - non-emptyはtrim後の値
- Concurrency: 現行正本どおりlast-write-wins。
- Responsibility:
  - UI: label、draft保持、error表示
  - server: exact field allowlist、normalization、share capability確認
  - DB: `UPDATE(memo)`だけのcolumn privilege、RLS、title guard
- Max length: 未決定。N5実装開始前にHumanがUI／server／DBで同じ上限を採用するか、上限なしとするか確定する。

`memo`維持は今回のHuman inputによる未決事項の解消であり、既存正本ですでに確定済みだったとは記載しない。

## 13. Layer 2 rebuild proof

### Purpose

空のhosted Supabase targetへownerless final stateを最初から再現し、Productionを破棄した場合でも同じ構成を再構築できることを証明する。

### Target

- 第一候補: dedicated non-Production QA project
- `empty target`はapplication migration未適用かつbusiness row 0を意味し、Supabaseのplatform-managed schemaまで空であることを要求しない。
- Production project: 使用禁止
- Vercel binding: Humanがexact Preview environmentへmanual binding
- Production credential: 使用禁止
- automatic integration: 新規有効化しない。既存integrationがあればidentityとredeploy lineageを記録する。
- target identity、owner、availability period、retirement、cleanup、cost responsibilityをHuman decision recordで固定する。

### Proof

1. empty target identity
2. immutable migration hashesとfull clean-chain replay
3. ownerless final schema fingerprint
4. dedicated role attributes、RLS、GRANT
5. exact driverとSupavisor transaction mode
6. server routeからのEvent creation
7. Event＋default Criterion atomicity
8. anon／authenticated direct Event INSERT拒否
9. share read
10. memo共同編集
11. title更新拒否
12. Participant以下の共同編集
13. Vercel Preview binding
14. Data API integration
15. exact fixture cleanup
16. target identityとsecret-free evidence

Layer 2では、Production相当の技術順序として次をrehearseする。

1. Preview accessを閉じ、targetの各surface stateを確認する。
2. Data APIを停止する。
3. empty targetへ、final ownerless migrationを末尾に含むfull migration chainをhistory順に各exact 1回replayする。final migrationを別途二重適用しない。
4. DB／role postflightを行う。
5. HumanがQA role credentialをprovisioningし、exact Preview environmentへmanual bindingする。
6. exact N5 candidate `C5`由来のPreview deploymentを一意に作成・特定する。
7. route availabilityだけを確認し、fixture 0を維持する。
8. Data APIを再開する。
9. controlled fixture exact 1件でsmokeを行う。
10. ownerless profileでfixtureを0へ戻す。

Layer 2 PASS後にartifact変更が0なら、同じ`C5` SHAを`H5`へpromoteする。修正が必要なら新しい`C5`を固定し、Layer 2 proofを全件再実行する。

normal main mergeと`M`由来Production deploymentはLayer 2の実行対象外とする。Layer 2のaccepted `H5` Preview artifactがN5〜N7 final release Headへ保持され、normal merge後の`M` treeに含まれること、およびProduction automatic deploymentが`M`だけをsourceにすることは、Production runbookのtopology／lineage dry reviewで別に固定する。

N6／N7を積んだfinal `H`では、同じnon-Production targetへexact `H`をdeployし、direct DB routeによるownerless Event creation、Event＋Criterion atomicity、anon／authenticated direct INSERT拒否、share read、memo update、title rejectionのfocused runtime regressionとfixture cleanupを再実行する。`H5`のmigration SHA、schema fingerprint、role／connection boundaryが`H`で変わった場合はfocused regressionへ縮小せず、Layer 2 proofを全件再実行する。

Layer 2のretirementはfinal `H` regression完了前に開始しない。Retirement recordは、final `H` fixture cleanup、durable evidence移管、Preview unbind、credential revoke、target retirementの順序を固定する。各mutationは別Human gateであり、本Contract draftから実行permissionを生成しない。

現行wrapperはlocalとProduction-serving remoteだけを表し、dedicated QA targetを一意に選択できない。既存remote profileをQA targetへ読み替えず、N5開始前にexact target profile／wrapperまたはHuman-only replay methodを別途採用する。`link`、remote `db push`、Production credential利用を本Contractから推定しない。

## 14. Pre-launch rebuild contract

Pre-launch recoveryはbusiness data restoreではなくfull rebuildとする。

1. Humanが新しいnon-public Supabase project作成を承認・実行する。
2. display name、project ref、database、region、owner、environmentを確認する。
3. final ownerless migrationを末尾に含むimmutable migration chainを空のprojectへhistory順に各exact 1回replayする。
4. final schema、RLS、GRANT、function、trigger、extensionをpostflightする。
5. dedicated roleの属性とprivilegeを再構築する。
6. Humanがrole password／credentialを新規provisioningする。
7. HumanがVercelのexact environmentをnew targetへrebindする。
8. accepted application commitから再deployする。
9. Data API、全external surface、N7 accepted WAF ruleの意図した状態を確認する。
10. controlled fixture exact 1件でownerless smokeを行う。
11. ownerless cleanup profileでfixtureを0へ戻す。
12. N7 runbookどおりWAF controlled verificationとexact fixture cleanupを行う。
13. external openingは別Human gateとし、N12まではVercel Authenticationを維持する。

Required evidence:

- target identity
- migration relative path／size／SHA-256 manifest
- final schema fingerprint
- application commit
- deployment source
- role attributes
- credential値を含まないprovisioning結果
- Data API／surface status
- WAF rule identity／controlled verification／cleanup result
- smoke result
- cleanup result

Humanは停止時間とpre-launch data全消失を受容する。automatic retry、旧projectへの無断切戻し、credentialコピー、Production projectをLayer 2として使うことは禁止する。

## 15. Post-launch recovery handoff

次はN4で決めない。

- backup
- PITR
- logical backup
- retention
- RPO
- RTO
- restore proof
- N12後のデータ損失許容
- plan変更

N11-c／N12は、一般公開前にpost-launch user dataを保全するrecovery ContractをHuman採用し、実効性を確認する。未採用または未確認ならN12 public-openingをblockするが、N4／N5／N8／N9のpre-launch ownerless transitionをblockしない。

## 16. Revised N5 slicing

N5は一つのfeature branch／worktree、単一review Head `H5`、単一N5 implementation PR／review unitで扱う。`H5`はmain merge対象ではなく、N6／N7を積むrelease lineのaccepted inputである。内部review単位は次の8つとする。

1. **Ownerless final migration＋pgTAP**
   - row 0 precondition
   - owner column／index／helper／policy／GRANT撤去
   - final share-only RLS
   - dedicated role definition
   - title immutable／memo-only
   - Event＋Criterion atomicity
2. **Direct DB adapter／Event creation route**
   - pinned driver
   - server-only credential
   - exact connection、SSL、timeout、prepared statement、retry 0
   - title、memo、share tokenのparameter binding。SQL value interpolation 0
   - anon direct Event INSERT 0
3. **Owner asset撤去＋share-only routing**
   - owner route、session route、Cookie、header、token、URL、UI撤去
   - creation後share URLへ遷移
4. **Creation confirmation／memo-only mutation**
   - exact confirmation copy
   - title edit／update 0
   - `つたえたいこと`
   - memo normalization／LWW
5. **Application tests／E2E**
   - share-only create／read／collaboration
   - title negative
   - owner route、Cookie、header不在
   - secret-free artifact
6. **Clean-chain replay／ownerless cleanup profile**
   - local incremental replay
   - empty local clean-chain
   - ownerless smoke cleanup profile
   - final ownerless schema fingerprint以外を拒否
7. **Layer 2 hosted rebuild proof**
   - exact candidate `C5`
   - empty QA target
   - full chain、role、driver、Preview binding、smoke、cleanup
8. **Exact N5 review Head `H5`**
   - migration、application、lockfile、tests、profilesを同じHeadへ固定
   - N6／N7混入0
   - Layer 2 PASS後の`C5`から変更0。same SHAだけを`H5`へpromote
   - N5 Ready対象は`H5`だけ。Readyはmain merge permissionを生成しない

dependency追加はN3 ownershipと調整する。N3のdependency patchをN5へ混ぜず、N5が必要とするdriver追加のauthorityとpublication順はHumanが別途確定する。N6／N7完了後、final release reviewは`H5`のownerless migration／application identityが`H`に保持されていることを再確認する。

## 17. Revised Production sequence

### Identity

- `B`: release PRのexact baseとなるcurrent `main`
- `C5`: Layer 2 proof対象として固定したN5 ownerless transition candidate SHA
- `H5`: Layer 1／Layer 2をPASSした`C5`と同じSHAのN5 review Head。N6／N7混入0、main merge permission 0
- `H`: accepted `H5`にN6／N7を積み、final release reviewを通過したN5〜N7 final Head
- `M`: normal merge commit。parent 1は`B`、parent 2は`H`
- `SQL`: `H`に含まれるfinal ownerless migrationのexact relative path、byte count、SHA-256
- Production deployment source: `M`

### Change freeze

Freezeは`H`のfinal acceptance後、Data API停止およびN8 discovery前に開始する。対象はmain merge、Production deployment、schema／RLS／GRANT／function、Data API、WAF、Vercel environment、DNS、cleanup artifact、evidence、QA target bindingである。

Freeze中はaccepted input、manifest、既存artifact／evidenceの改変・置換・削除を禁止する。Human承認済みのexact N8、final migration、Production role credential provisioning、exact Vercel Production environment binding、normal merge、mergeが起動するexact automatic deployment、Data API restart、ownerless smoke／cleanup、N7 accepted WAF apply／controlled verification／cleanup、no-replace evidence capture／durable移管だけを例外として許可する。Credential provisioningとenvironment bindingは§17 step 11のsingle Human gate、secret非記録、pre-merge Production deployment 0へ拘束する。WAF例外はN7 accepted rule／runbookのexact identityに拘束し、rule再設計またはthreshold変更を含めない。

### Maintenance surface gate

REST、GraphQL、Realtime、Storage、Auth、Edge Functions、direct Postgres、SQL Editor、Vercel application routeを個別に、次のexact 1 stateへ分類する。

- `BLOCKED`: 外部またはapplicationからのread／business mutation経路が遮断済み
- `HUMAN_ONLY`: Human承認済みのexact maintenance operationだけが利用可能
- `VERIFIED_N/A`: 未構成または本projectで利用していないことを証拠化

REST／GraphQLのData API停止を、Realtime、Storage、Auth、Edge Functions、direct Postgres、SQL Editor、Vercel routeの停止証拠へ読み替えない。未認証read／business mutation経路、active application mutation route、`UNKNOWN`／未分類surfaceが1件でもあればN8 discovery、N8 COMMIT、final migrationを禁止する。Data API restart authorizationまでの各Human operation後にsurface matrixをread-only再確認する。

この3-state maintenance classificationは、N8開始からData API restart直前までのpermission gateである。Data API restart成功後、REST／GraphQLはこのmaintenance分類を離れ、§9の`ownerless app＋ownerless DB` stateへ遷移する。他surfaceは意図した遮断／Human-only／非該当状態を維持し、§9で分離したownerless smokeとWAF controlled verification以外のbusiness mutationを許可しない。

### Automatic deployment preflight

ProductionのVercel Git integration、Supabase integration、environment update behavior、deployment policyをfresh確認する。N9用Human merge gateは、exact `B`／`H`／`SQL`と、normal mergeが起動するexact 1 automatic Production deploymentを一体として事前承認する。manual redeploy、pre-merge Production deployment、unexpected replacement deployment、同じ`M`からの複数Production deploymentは含めない。

### Sequence

1. Vercel Authentication `All Deployments`と非公開状態を確認する。
2. 全surfaceのidentityとcurrent stateをinventoryし、unknown surface identity 0を確認する。この時点のactive stateを安全stateとは扱わない。
3. `B`、`H`、`SQL`、Layer 1／Layer 2とfinal `H` regression evidence、accepted N8 cleanup profile identity、N7 WAF rule／runbook identity、durable evidence destinationを固定する。
4. Data APIをHuman gateで停止し、maintenance surface gateを完了する。全surfaceが`BLOCKED`、`HUMAN_ONLY`、`VERIFIED_N/A`のexact 1 state、未認証read／business mutation経路0であることを確認する。
5. N8 discoveryとROLLBACK verificationを実行する。
6. HumanがN8 COMMITをexact 1回実行する。
7. 8 business table row 0を確認する。
8. schema drift 0、fixture 0、active mutation 0を再確認する。
9. Humanが`SQL`をexact 1回適用する。automatic retry 0。
10. ownerless DB postflight、role属性、RLS／GRANT、title guard、atomic triggerを確認する。
11. HumanがProduction role passwordをprovisioningし、Vercel Production environmentへexact credentialを設定する。設定直後にpre-merge Production deployment 0をfresh確認する。
12. `origin/main == B`、accepted `H`、`SQL` path／byte count／SHA、checks、conflict 0、Production deployment lineageをfresh再確認する。
13. Humanがnormal merge exact 1回と、それが起動するexact 1 automatic Production deploymentを明示承認する。
14. release PRをnormal mergeし、`M`のparent 1が`B`、parent 2が`H`、`M`内の`SQL`が承認artifactと同一であることを確認する。
15. exact 1 automatic Production deploymentのsourceが`M`であることを確認する。manual redeployは0。
16. Vercel Authentication下でdeployment／route availabilityだけをread-only確認する。fixture 0を維持する。
17. maintenance surface matrixの最終PASS後、Human gateでData APIを再開する。REST／GraphQLがownerless final stateへ遷移し、他surfaceに予期しないread／mutation経路が生じていないことをpostflightする。
18. controlled ownerless fixtureをexact 1件だけ作成する。
19. full ownerless smokeを行う。
20. ownerless smoke fixtureをcleanupし、business row 0を確認する。
21. HumanがN7 accepted runbookどおり、Event作成WAF ruleを`10分間に5件まで、6件目拒否`のblock状態へexact 1回applyする。
22. Vercel Authentication下のcontrolled requestで、rule matching、5件成功、6件目拒否、window expiry後の復帰、他route非干渉、Event／Criterion atomicityを確認する。これは一般traffic観測ではない。
23. WAF verificationで成功作成されたexact Eventと関連rowをN7 WAF verification cleanup profileの別authorizationでcleanupし、business row 0を確認する。
24. WAF blockのcurrent identityとstatusをread-only再確認する。
25. no-replace evidenceをdurable locationへ移管し、independent reviewを行う。
26. N9 internal acceptanceを記録する。
27. Vercel Authenticationを維持したままfreezeを終了する。

Migration適用前、DB postflight前、deployment availability前、Data API restart前にfixtureを作成しない。Data API restart後に最初のownerless smoke fixture exact 1件を作成・cleanupしてrow 0へ戻した後だけ、WAF controlled request setへ進む。Migrationまたはdeploymentが失敗した場合、external accessとData APIを閉じたままSTOPし、旧application compatibilityへ戻さず、修正Contractまたはfull rebuildへhandoffする。

Environment設定または既存integrationがpre-merge／replacement Production deploymentを生成した場合はSTOPし、各deploymentのsource、environment、statusを記録する。期待するautomatic Production deploymentが0件、複数、`M`以外のsource、またはfinal active identity不明の場合もSTOPする。manual redeployが必要なら別Human gateへ戻す。

Layer 2で§13の非Production相当順序が成立しない、または`H5` Preview artifactと`H`／`M` Production treeの対応およびautomatic deployment lineageをdry reviewで一意にできない場合、Production runbookを作らずContract repairへ戻す。

## 18. Cleanup／evidence boundary

### Cleanup profiles

1. **N8 pre-transition full cleanup profile**
   - old schema fingerprint専用
   - 8 business table全row対象
   - preservation 0
   - ROLLBACKとHuman-only COMMITを分離
   - N8専用Contract／実装gateで作成・採用し、N5 scopeへ含めない
   - State: `IMPLEMENTATION_REQUIRED_BEFORE_N8`
2. **Ownerless smoke cleanup profile**
   - final ownerless schema fingerprint専用
   - exact controlled fixtureだけを対象
   - unrelated row削除0
   - N5 ownerless smoke exact 1件のauthorizationだけを扱う
3. **N7 WAF verification cleanup profile**
   - final ownerless schema fingerprint専用
   - N7 controlled verificationで成功作成されたexact Event ID manifestだけを対象
   - rejected requestはrow 0、window expiry後の成功Eventもmanifestへ含める
   - N7専用Contract／runbookで採用し、N5 `H5`へ混入させない

3 profileは対象schema／manifest family以外を拒否する。現行`[E2E]` profileを暗黙に拡張しない。各profileのgenerator、authorization、executionは既存`operate-supabase-live-db`のHuman gateとfail-closed境界を維持する。Ownerless smokeとWAF verificationを同じCOMMIT authorizationへ束ねない。

### Durable evidence

- Exact path: `/Users/shige/Projects/Where-to-Visit-Evidence/N4-ownerless-transition`
- Purpose: Git外のsecret-free execution evidence
- Owner: Human
- Deletion authority: Human-only
- Retention: N9 internal acceptanceと独立review完了まで
- Git: sanitized summaryとartifact SHAだけ
- Prohibited content:
  - password
  - connection string
  - raw token／Cookie
  - raw share pathname
  - source codeの作業copy

2026-07-29のdraft作成時snapshotではdirectory ownerは`shige`、modeは`0755`であり、証拠保存条件を満たさなかった。使用直前に`lstat`でexact pathがnon-symlink directoryであること、owner、modeをfresh確認する。条件を満たさない場合は、別Human gateでroot directoryを`0700`、evidence fileを`0600`、per-execution childをno-replaceにしてから使用する。Agentはpermission変更またはdirectory削除を行わない。

移管manifestはrelative path、file size、file SHA-256のcanonical一覧とする。source／destinationのfile count、byte count、manifest、SHA、secret scanを一致確認する。execution中の`/private/tmp`は一時保存だけに使い、durable移管と再取得確認前に次gateへ進まない。

## 19. Tech Lead review inputs

Tech Leadは次だけをfocused reviewする。

- single final migrationのtransaction／hosted成立性
- owner column／helper／policy／GRANT撤去の完全性
- final ownerless RLSとshare-only access
- dedicated role名、属性、column privilege、RLS、`RETURNING`不要性
- driver／Supavisor transaction mode／prepared statement boundary
- Event＋default Criterion atomicity
- titleのUI／server／DB三層不変性
- memo normalization、LWW、max length decision
- 4-state matrixと中間state mutation 0
- N5内部slice、`H5` review identity、N5〜N7 final release `H`の分離
- Layer 2 clean rebuild proofの技術実行可能性

## 20. DevOps review inputs

DevOpsは次だけをfocused reviewする。

- Layer 2 target identity、lifecycle、manual Preview binding
- hosted migration replay／migration historyの一意な方法
- Vercel Authenticationと全external surface inventory
- Data API stop／restartとunknown surface 0
- change freezeの開始／終了／exception
- N8、ownerless smoke、N7 WAF verification cleanup profileの責任分離
- `B`／`H`／`M`／`SQL` identityとautomatic deployment race
- migration→merge→deploy→Data API restartの順序
- N7 accepted WAF rule／runbook、Human-only apply、controlled verification、exact cleanup
- role credential provisioning／rotation／revocationとsecret非記録
- full rebuild runbook
- durable evidence mode、no-replace移管、retention、Human-only deletion
- N9 internal acceptanceとN12 public openingの分離

## 21. DoD

- Governing premise 8項目がContract最上位にあり、例外追加0。
- pre-launch business rowをユーザーまたは保全対象ユーザーデータと表現していない。
- N8の8 business table全件削除、Human-only COMMIT、postcheck row 0が一意。
- existing data preservation、conversion、owner privilege inheritanceが0。
- single／two-phaseをゼロベース評価し、`SINGLE_FINAL_MIGRATION_RECOMMENDED`に技術根拠とconditionalityがある。
- nullable bridge、M1／M2、old app service rollback、9-state matrixがfinal designから除去されている。
- 4-state matrixの中間stateでexternal access、business mutation、fixtureが0。
- final ownerless application、schema、RLS、GRANT、owner asset removalが一意。
- anonymous／authenticated direct Event INSERTが拒否され、dedicated roleがleast privilege。
- share tokenの現行推測困難性がDB invariantで維持され、direct DB値はparameter bindingされる。
- Event＋default Criterionが全成功または全rollback。
- titleはUI／server／DBでruntime mutation不可。
- `memo`はshare共同編集、normalization、LWW、責任分担が一意で、max lengthは未決定として明示。
- Layer 1 clean-chainとLayer 2 empty-hosted rebuild proofが定義されている。
- pre-launch recoveryはfull rebuild、post-launch recoveryはN12へhandoff。
- N5の8内部sliceが単一feature／`H5`を維持し、N6／N7混入0。`H5`と唯一merge可能なN5〜N7 final release `H`が分離されている。
- Production sequenceで`B`／`H`／`M`／`SQL`、Human gate、retry 0が一意。
- maintenance surfaceが個別分類され、Data API停止を他surfaceの証拠へ読み替えていない。
- pre-merge deployment 0と、Human承認したnormal merge由来のexact 1 automatic `M` deploymentが一意。
- final migration／deployment／Data API restart前のProduction fixture 0。
- 最初のownerless smoke exact 1件をcleanupしてrow 0に戻した後だけ、N7 WAF controlled verificationを行う。
- N8、ownerless smoke、N7 WAF verification profileが責任分離され、相互誤用を拒否する。
- N9 acceptance前にWAF block apply、5件成功／6件目拒否／window expiry復帰／他route非干渉／atomicity、fixture cleanupを完了する。
- durable evidence path、mode gate、manifest、retention、Human-only deletionが一意。
- Vercel AuthenticationはN12まで維持し、N9をpublic launchと表現していない。
- new implementation、dependency、Git publication、credential、Production permission 0。

## 22. QA

### Contract QA

- 26 required sectionsが存在する。
- Governing premiseがexact 8項目。
- verdict vocabularyが指定範囲内。
- `existing user data`、`preserved data`、`customer data`、`user migration`、`owner migration`はpremise-error inventoryまたは明示的な否定以外に0。
- `M1`、`M2`、`9-state`、`nullable owner_token`、`mixed old／new row`は削除説明以外にfinal permissionを生成する記述0。
- `backup`、`PITR`、`RPO`、`RTO`、`restore`はpost-launch handoffまたは「pre-launch必須ではない」以外に0。
- Production fixtureの最初の作成はfinal migration、ownerless deployment、Data API restartの成功後だけ。
- Ownerless smoke exact 1件とN7 WAF controlled request setは別Human gate／別cleanup authorizationである。
- repository、Git、DB、Supabase、Vercel、Production mutation 0。

### Implementation QA required after adoption

- local old-schema incremental replay
- empty local clean-chain＋final migration
- migration transaction rollback proof
- pgTAP:
  - anon／authenticated Event INSERT拒否
  - dedicated role Event INSERT成功
  - dedicated role INSERTでempty／short／invalid-format share token拒否
  - Event 1／default Criterion 1／Participant 0
  - Criterion failure時に全rollback
  - related table privilege 0
  - title UPDATE拒否
  - share memo UPDATE成功
- RLS policy performance review
- referencing-side FK index reviewを関係するFK変更に限り実施し、非該当なら`N/A`
- migration、cleanup、correction SQLを短いtransaction責任に限定
- application unit／integration／E2E
  - title、memo、share tokenをdriver parameter bindingし、injection payloadをdataとして扱う
  - exact final `H`でdirect DB route、Event＋Criterion、anon拒否、share read、memo、titleのfocused runtime regression
- owner URL／Cookie／session／header／policy残存検索
- raw share pathname／secretのlog、report、trace、screenshot残存0
- Layer 2 empty-hosted full rebuild、Preview binding、smoke、cleanup
- N8専用Contractでpre-transition full cleanup profileを検証し、N5 DoDへ混入させない
- N7 accepted runbookでWAF block apply／controlled verification／exact fixture cleanupを検証し、一般traffic観測とは扱わない
- Production sequence dry reviewとindependent evidence review

Postgres Best Practicesの3観点は対象変更に関係する場合だけ既存`operate-supabase-live-db`のreviewとして使い、新しいgate、verdict、evidence packetを作らない。

## 23. STOP conditions

次の場合は条件を追加して実装へ進まず、Human／該当ownerへhandoffする。

- Governing premiseとADR-0009／current Roadmapが矛盾する。
- N12前に保全対象ユーザーまたは保全対象business dataが存在する。
- N8で8 business tableを全削除できない、またはHumanがCOMMITを承認しない。
- current source／migration確認なしにsingle／two-phaseを決める必要がある。
- Layer 1／Layer 2でsingle final migrationが成立しない。
- dedicated role、RLS、GRANT、driver／Supavisor、atomicityがhosted targetで成立しない。
- Layer 2にProduction project／Production credentialが必要になる。
- Layer 2 exact targetまたはhosted migration replay methodが確定しない。
- unknown external surfaceが1件以上ある。
- Data API停止／再開、change freeze、automatic deploymentを一意に制御できない。
- final migration前またはData API restart前にProduction fixtureが必要になる。
- N8／ownerless cleanup profileを安全に分離できない。
- N7 accepted WAF rule／runbook identity、Human-only apply、controlled verification、exact fixture cleanupを一意にできない。
- durable evidence directoryのowner／mode／retention／deletion authorityを満たせない。
- post-launch recovery方式をN4で決める必要が生じる。
- ADR変更、§24に列挙済みのdecision以外の新しいHuman decision、§25に列挙していない新しいpermission／Production operationが必要になる。
- N5にN6／N7またはN13の責任を混入しないと成立しない。

STOP時は、conflicting premise、affected section、取得済みevidence、必要なHuman decision、最小Contract repair、再開条件を報告する。automatic retry、fallback credential、service role、旧owner compatibilityを追加しない。

## 24. Unresolved decisions

Human adoption／N5 implementation authorization前に次を確定する。

1. **Layer 2 exact target／replay method**
   - project identity、owner、lifecycle、retirement
   - dedicated target profile／wrapperまたはHuman-only replay method
   - hosted migration historyの記録方法
2. **Dedicated role／connection contract**
   - exact role name
   - pinned driver／versionとN3・N5 ownership
   - server-only environment variable名
   - SSL、timeout、prepared statement、retry、rotation／revocation
   - hosted secretを流用せずlocal clean-chain／E2Eでrepeatable role loginを成立させるlocal-only credential provisioning
3. **Memo max length**
   - UI／server／DBで同じ上限を採用するか、上限なしとするか

Durable evidence locationは確定済みである。2026-07-29 snapshotのmodeは`0755`だったため、使用直前のfresh `lstat`で`0700`でなければHuman gateによるpermission変更が必要であり、そのoperationは未承認の実行時preconditionとして残る。

## 25. Authority boundary

本Contract draftの作成とfocused reviewが生成するpermissionは0。

| Action | Authority |
|---|---|
| Contract adoption | Human |
| N5 implementation開始 | Humanによる別承認 |
| dependency／driver追加 | HumanによるN3／N5 scope承認 |
| Git stage／commit／push／PR／merge | 各publication gateのHuman |
| Layer 2 project作成／binding／retirement | Human |
| role password／credential provision／rotation／revocation | Human |
| N8 Production cleanup COMMIT | Human-only |
| final Production migration | Human-only |
| Data API stop／restart | Human-only |
| N7 accepted WAF rule apply／controlled verification | Human-only。rule再設計／threshold変更は別Human gate |
| Vercel environment／Authentication／manual deployment | Human-only |
| normal mergeが起動するautomatic Production deployment | Humanがexact `B`／`H`／`SQL`、normal merge 1回、expected Production deployment 1件を一体で事前承認 |
| durable evidence permission変更／削除 | Human-only |
| N12 public opening | Human-only |

CodexのProduction Supabaseはread-onlyである。SQL artifact generation、ROLLBACK evidence、sanitized reportを別Contractで準備できても、Production SQL EditorでのCOMMIT／migration実行を代理しない。

## 26. Verdict

`N4_REBASELINED_CONTRACT_READY_FOR_FOCUSED_REVIEW`

Focused review対象:

- Tech Lead: §8、§11、§12、§13、§16、§19
- DevOps: §10、§13、§14、§17、§18、§20
- Independent Reviewer: §2〜§7、§9、§15、§21〜§25

本verdictはContract採用、N5実装、dependency追加、Git publication、credential設定、Layer 2／Production操作を許可しない。§24の3 decisionとfocused review結果をHumanへ提示し、Human adoption gateで停止する。
