# PKA Slice 3・4 要件定義・DoD（2026-07-21）

- ステータス: **APPROVED / MIXED IMPLEMENTATION STATUS / REQUIREMENTS ONLY**
- 作成日: 2026-07-21 JST
- repository: `kcyth39/Where-to-Visit`
- 抽出元: `pka-initial-activity-requirements-and-dod-v2-2026-07-20.md` v2.5
- 抽出元SHA-256: `e64556d1a606b9dd31b618771a9988aad2e48d2d7bdb3492d49ee6ad13e05e77`
- 抽出対象: Slice 3「共通遂行原則・Human gate」／Slice 4「Execution Contract」
- 内容責任者: Human（方針・risk・重要gate）／Tech Lead（Execution Contract・技術方針）／PKA（process・Knowledge構造）
- lifecycle責任者: PKA

> **NO EXECUTION AUTHORIZATION**
>
> 本書はSlice 3・4の要件とDoDを、元V2.5の意味を変更せずに切り出した実装準備文書である。本書の追跡化またはmergeは、正本変更、template採用、CI/CD変更、GitHub設定変更、個別sliceの実装開始、Production操作を自動承認しない。各sliceは、最新mainと現行正本を再確認したExecution ContractおよびHumanの個別開始承認を必要とする。

## Authorityと優先関係

- 本書は、Slice 3・4の承認済み実装準備要件である。元V2.5のSlice 3・4記述に代わり、今後のExecution Contract作成時の参照先とする。
- Slice 3・4が実装・受入されるまでは、現在有効なruleは最新mainの`AGENTS.md`／`CLAUDE.md`、`docs/00_master-plan.md`、`docs/05_dod.md`、`docs/06_qa-flow.md`、ADR、repository Skillを優先する。
- 本書と現行正本に差がある場合、その差は将来の変更候補である。本書のmergeだけを根拠に現行rule、template、gate、権限、運用を変更しない。
- 実際の変更scope、実行role、Git publication、DoD、停止条件は、SliceごとのExecution ContractとHumanの開始承認で確定する。
- 本書はExecution Contractを作成するための入力であり、本書単独では実装を開始できない。

## Slice別lifecycle

| Slice | 要件status | 実装status |
|---|---|---|
| Slice 3 | APPROVED | [PR #14](https://github.com/kcyth39/Where-to-Visit/pull/14)を固定追跡先とし、current publication状態はGitHubを正とする。Ready化、domain review、Reviewer APPROVEDだけでは未発効であり、Reviewerによるexact HeadのAPPROVED後にHumanがmergeした時点でmain上の現行ruleとして発効する |
| Slice 4 | APPROVED | H-03補完と実装開始をHuman承認済み。[PR #15](https://github.com/kcyth39/Where-to-Visit/pull/15)を固定追跡先とし、current publication状態はGitHubを正とする。Human mergeまでは現行ruleへ未発効 |

本書は要件、Human判断、lifecycleだけを保持する。Slice 3の実装・検証証拠はPR #14本文、Slice 4の実装・検証証拠はPR #15本文を参照し、本書へ複製しない。

## 1. 本書の役割

Slice 1・2の実施履歴、PR、branch、worktree、Archiveの経緯は本書へ再掲しない。現在有効なrole、Knowledge、Git publication、worktree、closeoutのruleは、最新main上の`docs/README.md`から現行正本へ進んで確認する。

抽出した各要件行とDoD行は元V2.5の文言を維持する。見出し、metadata、authority pointer、実行authorization境界だけを、本書が単独で利用できるように追加した。

## 3. ゴール

「きめのすけ」開発チームのPKAとして、開発processと運用Knowledge基盤の現状を監査し、品質・安全性・追跡可能性を維持しながら、人間介入、待ち時間、手戻り、手動操作、文書不整合を減らすための改善基盤を確立する。

初回活動は観測と提案に限定する。既存rule、CI/CD、権限、承認gate、文書体系を直ちに変更しない。削減量そのものを目的にせず、必要な人間判断と安全gateを維持した上で、構造的な摩擦だけを対象とする。

## 6. 要件定義

### 6.1 証拠・監査要件

| ID | 要件 |
|---|---|
| RQ-E01 | 推測よりrepository、Git、PR、review、CI、設定、実行logなどの確認可能な証拠を優先する |
| RQ-E02 | 監査ごとにrepository、baseline SHA、取得日時、調査対象、調査不能範囲を記録する |
| RQ-E03 | 確認済み事実、単独事例、反復事象、原因仮説、提案、未確認事項を混同しない |
| RQ-E04 | 文書上の想定ではなく、確認できた実態に基づくCurrent Flow Matrixを作る。必須fieldは`工程 / 実担当 / 入力 / 成果物 / 承認者 / 停止条件 / 証拠`とする |
| RQ-E05 | Human Intervention Mapの必須fieldを`介入箇所 / 理由分類 / 必須性 / 証拠 / 判断責任者`とし、削減候補と維持すべき介入を区別する |
| RQ-E06 | Recurrence Registerは、同種のreview指摘、CI失敗、再作業、手動操作、情報不足を必須調査対象とし、複数の確認可能な事例を持つ構造的patternだけを反復課題として扱う。個別メンバーの評価に使用しない |
| RQ-E07 | 証拠がGitHub外、欠落、または取得不能の場合は「行われなかった」と断定せず、追跡不能範囲として明示する |

### 6.3.2 初期最低限の権限制約

- Tech LeadとPKAはcode実装を行わない。
- Reviewerは、自身が新規作成したreview成果物以外の既存fileを更新しない。review対象を自分で修正せず、修正要求を実行担当へ返す。
- 上記は初期の最低限制約であり、他roleへの包括的な権限付与を意味しない。
- Execution Contractは明示された変更scopeを示すが、この最低限制約を上書きしない。
- Git publicationを許可する承認済みExecution Contractでは、標準実装担当はcommit、作業branch push、Draft PR作成・更新、Ready化、remote branch削除提案、安全条件を満たした自身のtask worktree／local branch closeoutを行える。Reviewerはreviewとexact Headへの最終判定、Humanはmerge判断・merge操作とGitHub上のremote branch削除を担当する。
- Ready化、ReviewerのAPPROVED、Humanのmerge、Production反映は相互に異なるgateであり、自動的に次のgateを承認しない。ただしAPPROVED後にHuman自身が行うmerge操作は、最終承認とmerge実行を兼ねる。

### 6.4 改善候補・人間判断要件

| ID | 要件 |
|---|---|
| RQ-I01 | 各改善候補は`観測事象 / 証拠 / 原因仮説1件 / 提案変更 / 影響範囲 / risk / 承認者 / 評価指標1件 / rollback1件`を持つ |
| RQ-I02 | 全改善項目を必須性、依存関係、効果、risk、可逆性、検証容易性でslice化する。必須項目の実施順は重要度rankingではなく、安全に完了するための依存順として示す |
| RQ-I04 | 一つの改善に複数の原因仮説、主評価指標、rollbackを混在させない |
| RQ-I05 | deterministicな検査は自動化適性を評価し、意味判断は該当domain ownerの判断を残す。事業目的・事業方針、risk許容、権限、Claudeの委任範囲外の意味変更はHuman承認を残す。自動化自体は個別承認まで実施しない |
| RQ-I06 | 人間判断事項は一表へ集約し、`判断事項 / 人間判断が必要な理由 / 選択肢 / 各選択肢の影響`を記載する |
| RQ-I07 | repository調査またはdomain ownerの委任範囲で解決できる事項を人間へ戻さず、事業目的・事業方針、risk許容、権限、Claudeの委任範囲外の意味変更など、本当にHuman判断が必要な事項だけを質問する |
| RQ-I09 | 必須残課題を残したままsliceまたはprogramを完了扱いにする場合は、`残課題 / 理由 / risk / 暫定対策 / owner / 再開条件 / Human承認者`を一件ごとに記録し、明示的なHuman例外承認を得る |

### 6.5 成果物・変更管理要件

| ID | 要件 |
|---|---|
| RQ-C01 | 監査結果、要件、改善提案、承認済みrule、実施結果をstatusと目的で区別する |
| RQ-C02 | authorizationはscopeとgateごとに分離する。調査結果の保存authorizationを改善案の採用、実装、Git publication、Production操作へ自動拡張しない。承認済みExecution ContractがGit publicationを含む場合は、標準実装担当のcommit、作業branch push、Draft PR作成・更新、Ready化を一つの標準遂行scopeとして扱える。最初からReadyのPR作成、merge、未merge PRのclose、remote削除、条件未充足のlocal削除、force push、`main`直接push、Productionは含めない。条件付きtask-local closeoutはHuman終了意思、remote不在、改訂Slice 1cの正本ruleを別根拠とする |
| RQ-C03 | 初回活動の変更案は小さくreview可能な単位にする。V2要件更新turnでは正本ruleやSkillを変更・mergeしない。後続実装では§6.13の標準flowに従い、Reviewerのexact HeadへのAPPROVED後、Human自身が最終判断してmergeする |
| RQ-C04 | 既存構成と命名規則を確認して配置を決め、追跡化する場合は索引、status、参照関係が整合していることを確認する。具体的な変更単位とreview方法は後続判断とする |
| RQ-C05 | 元監査は時点固定の観測snapshot、本v2は要件契約案として現在の用途を区別する。統合、置換、併存、最終配置は後続判断とし、どちらも正本の代替にしない |

### 6.7 Goal-Drivenな契約型prompt要件

確認済みの人間の意思をExecution Contractへ明文化し、未確定の意味・scope・riskをagentが勝手に補わない。

| ID | 要件 |
|---|---|
| RQ-P01 | contractは明確なGoalを持つ。承認済み要件定義書がGoalを十分に定義する場合は、その参照で代用できる |
| RQ-P02 | contractには遂行scopeと計画策定scopeを分けて示し、遂行と判断に必要な正本、証拠、前提情報、制約を重要な欠落なく簡潔に記載する |
| RQ-P03 | 許可しない変更、操作、判断、scope外をguardrailとして明記する |
| RQ-P04 | contract作成者は詳細な遂行手順を固定しない。H-03でplan review・承認対象と定めるtaskでは、遂行agentがGoalとDoDを満たす計画draftを作り、人間が実行可否を判断する |
| RQ-P05 | 人間の判断が有益な場合は、計画作成者とは別のagentが、計画・risk・不足情報について助言できる |
| RQ-P06 | 「終わった」を判定できる、客観的かつ検証可能なDoDを設定する |
| RQ-P07 | `STOP RULES / ESCAPE HATCH`として、停止条件、報告すべき情報、解除を判断できるrole、安全な代替行動を定義する |
| RQ-P08 | contractは人間の意思を明文化して補完するが、productの意味、技術判断、承認を推測で新設しない |
| RQ-P09 | plan承認を適用するtaskの範囲、軽微taskの扱い、approval粒度、template形式、review／CIとの接続はH-03の後続設計事項とし、本v2だけで現行gateを変更しない |
| RQ-P10 | contractは実行roleと許可された成果物・変更種別を明示する。role名だけで権限を推論せず、§6.3.2の初期最低限の権限制約を上書きしない |

### 6.8 実装・文書作成に共通する遂行原則

参考資料は、指定された[外部`CLAUDE.md`（commit `2c60614`）](https://github.com/multica-ai/andrej-karpathy-skills/blob/2c606141936f1eeef17fa3043a72095b4765b9c2/CLAUDE.md)である。同資料のGoal-Driven節は§6.7と重複するため再掲せず、残る3原則をcode、設定、test、文書、Knowledge整理へ共通適用できる表現へ調整する。

| ID | 要件 |
|---|---|
| RQ-X01 | 着手前に利用可能な正本と証拠を確認し、前提、曖昧さ、複数解釈、重要なtrade-offを明示する。意味・scope・riskに関わる不明点を解消できなければ停止する |
| RQ-X02 | より単純な方法がある場合は判断材料として示し、Goal、Scope、DoDを満たす必要十分な成果物に限定する |
| RQ-X03 | 依頼されていない機能、記述、抽象化、柔軟性、設定項目、将来対応、例外規則を追加しない |
| RQ-X04 | 必要なpath、行、節だけを変更し、隣接するcode、文書、format、rename、再構成を任意に改善しない。既存の用語、style、構造へ合わせる |
| RQ-X05 | scope外の問題は報告に留め、自分の変更によって生じた参照切れ、不要な記述・codeだけを承認scope内で解消する |
| RQ-X06 | 各変更行・変更節をGoal、要件、DoDのいずれかへ追跡できるようにする |
| RQ-X07 | 外部URLは参考資料として扱い、採用するteam ruleはlocal正本だけで意味が完結する文言にする |

### 6.9 おしげさんとのやりとり要件

| ID | 要件 |
|---|---|
| RQ-U01 | 人間の操作または承認が必要になった時点で、該当する実行を停止する |
| RQ-U02 | 停止時は、なぜ人間判断が必要か、選択肢、影響、必要な操作、実行後に起きること、停止条件を説明する |
| RQ-U03 | 説明と操作手順は、おしげさんが判断・実行できる日本語を使い、不要な技術用語を避ける。安全上必要な識別子・技術用語には短い意味説明を添える |
| RQ-U04 | 方針承認、計画承認、実行承認、Git publication、Production操作を相互に拡張解釈しない。Git publicationを許可するExecution Contractではcommit、作業branch push、Draft PR作成・更新、Ready化を標準遂行scopeとしてまとめられるが、最初からReadyのPR作成、merge、未merge PRのclose、remote削除、条件未充足のlocal削除、force push、`main`直接push、Productionは含めない |

### 6.12 必須sliceと推奨完了順

以下は重要度rankingではない。全sliceは同じ必須classであり、順序は後続sliceが必要とする追跡、owner、正本、共通原則を先に整えるための依存順である。§6.1、§6.4、§6.5の証拠、改善candidate schema、小規模・可逆性、評価指標、rollbackは全slice共通gateとする。

| 推奨順 | Slice | 主な関連項目 | 到達点 | 依存理由 |
|---:|---|---|---|---|
| 3 | 共通遂行原則・Human gate | §6.8、§6.9 | code・文書共通の局所変更原則と、人間操作時の停止・説明契約を正本候補化する | Execution Contractごとの重複を減らし、安全動作を先に定義する |
| 4 | Execution Contract | §6.7、H-03 | Goal、scope、reference、guardrail、DoD、STOP、実行roleを備えたtemplateと適用範囲を設計する | slice 1〜3の状態、owner、正本、共通原則を入力に必要とする |

### 抽出要件内の現行参照対応表

抽出元との文字列一致を保つため、要件行に残る歴史的な名称・節番号は書き換えない。Execution Contract作成時は次のtracked参照先へ読み替え、元V2.5または未追跡資料を実行根拠にしない。

| 抽出要件内の表現 | 現在の意味 | tracked参照先 |
|---|---|---|
| `本v2`／`V2要件更新turn` | 抽出元V2.5と、その要件文書だけを更新した当時のturnを示す歴史的表現。Slice 3・4の現行実装準備要件は本書を参照する | 本書、`docs/README.md`、`docs/reports/README.md` |
| `元監査` | 2026-07-20時点の非正本snapshotを示す歴史的表現。現在状態や実行可否の根拠にはしない | `docs/reports/development-and-business-activity-plan-2026-07-17.md`、最新mainの正本、GitHub上のmerge済み成果 |
| `改訂Slice 1cの正本rule` | task-owned worktree／local branchのpost-merge closeout rule | `docs/06_qa-flow.md` §1.1、`.agents/skills/close-merged-worktree/SKILL.md` |
| `§6.13の標準flow` | PR Ready・review・Human merge・remote branch終了を分離した現行Git publication flow | `docs/06_qa-flow.md` §1.1 |
| `§6.3.2` | 初期最低限の権限制約 | 本書「6.3.2 初期最低限の権限制約」。実装時は最新mainの`docs/00_master-plan.md`と`docs/06_qa-flow.md` §1.1も確認する |
| `§6.1`／`§6.4`／`§6.5`／`§6.7`〜`§6.9`／`§6.12` | 本書へ文字列一致で抽出した要件群 | 本書の同番号節 |
| `H-03` | Slice 4で設計するExecution Contractの未決事項 | 本書「10. Human判断事項」H-03 |
| `slice 1〜3の状態` | 抽出時の固定状態ではなく、Execution Contract作成時点の受入・残課題状態 | `docs/reports/development-and-business-activity-plan-2026-07-17.md`、最新mainの正本、merge済みPR |

## 7. Definition of Done

以下はSlice 3・4で参照する受入条件であり、本書の作成だけでは達成済みにならない。各項目は、必要な改善方針が提示され、証拠とdomain ownerのreviewを伴って初めて完了判定できる。

- [ ] **DoD-01 Baseline**: 承認対象のrepository、baseline SHA、調査日時、対象、対象外、取得不能範囲が一意である（RQ-E02）。
- [ ] **DoD-08 Improvement Candidates**: 改善方針受領後に作成した全候補が指定schemaを満たし、事実、仮説、提案を分離している（RQ-I01、RQ-I04）。
- [ ] **DoD-10 Measurement and Rollback**: 各改善候補に主評価指標1件とrollback1件があり、効果と撤回条件を判定できる（RQ-I01、RQ-I04）。
- [ ] **DoD-11 Human Decisions**: 人間判断が必要な事項が、理由と選択肢の影響を伴う一表へ集約されている（RQ-I06、RQ-I07）。
- [ ] **DoD-13 Traceability**: 各主要結論から根拠、内容責任者、承認状態を逆引きでき、確認不能範囲が過大評価されていない（RQ-E01〜RQ-E07）。
- [ ] **DoD-15 Reviewable Artifact**: 調査結果と提案が既存構成に適したreview可能な形で保存され、保存と採用、implementation、publicationが分離されている（RQ-C02〜RQ-C05）。
- [ ] **DoD-17 Contract Prompt Requirements**: Goal、遂行／計画scope、必要な参照情報、guardrail、遂行agentのplan draft、人間判断、検証可能DoD、`STOP RULES / ESCAPE HATCH`、実行role・許可成果物が定義され、詳細手順を過剰固定せず、初期権限制約を上書きしていない（RQ-P01〜RQ-P10）。
- [ ] **DoD-18 Common Work Principles**: 着手前確認、必要十分な成果物、局所変更、変更のtraceabilityがcodeと文書へ共通適用でき、Goal-Driven要件を重複規定していない（RQ-X01〜RQ-X07）。
- [ ] **DoD-19 Human Gate Communication**: 人間操作・承認が必要な場合の停止と、平易な判断説明・操作説明の必須内容が定義されている（RQ-U01〜RQ-U04）。
- [ ] **DoD-22 Residual Exception Control**: 必須残課題を残したままsliceまたはprogramを完了扱いにする場合、残課題ごとの理由、risk、暫定対策、owner、再開条件、Human承認者が記録され、明示的な例外承認がある（RQ-I09）。

## 9. 停止条件

次のいずれかに該当する場合は、該当作業を開始せず、人間の追加指示または内容責任者の判断を待つ。

- 採用判断、実行判断、許容riskが必要なのに、人間からまだ提示されていない。
- contractにGoal、scope、必要な参照情報、guardrail、検証可能DoD、`STOP RULES / ESCAPE HATCH`の重要項目が欠けている。
- 遂行agentのplanについて人間判断が必要なのに、実行可否がまだ示されていない。
- 人間だけが行える操作または承認が必要になった。
- product要件の意味、個別Execution Contract、architectureに矛盾または曖昧さがある。
- repository、worktree、baseline、変更owner、publication対象が一意でない。
- 承認済みの「扱い」と、移動・編集・Git操作の「実行承認」を区別できない。
- 既存正本へ追記すべきか、別目的のsnapshotとして保存すべきか決まっていない。
- 依頼scopeを超えてrule、CI/CD、権限、正本、Productionへ触れる必要がある。
- Reviewerが自身の新規review成果物以外の既存fileを更新しなければ進められない。
- Tech LeadまたはPKAがcode実装を行わなければ進められない。
- role名だけを根拠に、明示されていないwrite、承認、publication、Production操作を行う必要がある。
- 必須残課題をRQ-I09の記録とHuman承認なしに完了扱いにする必要がある。

## 10. Human判断事項

| ID | 保留事項 | Human判断が必要な理由 | 選択肢と影響 |
|---|---|---|---|
| H-03 | Execution Contract template形式、plan承認の適用範囲・軽微task例外、approval粒度、review／CIとの接続 | 共通templateの採用は全taskの待ち時間と安全gateへ影響するため | `Slice 4で設計`なら先行sliceの証拠を入力に統一する。`現行個別契約を維持`なら共通化を延期する |

### H-03 承認済み補完（2026-07-22）

次はHuman（おしげさん）が本対話で確定し、Slice 4の実装開始承認で採用した要件補完である。特にH03-D04／D05は、HumanがTech Lead review前に長文契約の欠落・版違いriskを理由としてMarkdownの選択肢を残すと明示し、H03-D13を含む統合版を承認した結果である。Markdown作成承認はstage、commit、push、PR追加、plan作成、実装開始を許可しない。実装証拠はPR #15本文へ保存し、本節へ複製しない。

| ID | 承認済み補完 |
|---|---|
| H03-D01 | prompt設計を二層に分け、第一レイヤーはprompt生成全般、第二レイヤーはExecution Contract生成Skillとする |
| H03-D02 | 第一レイヤーはHuman意思の正確な反映、不要な会話文脈の除去、事実・決定・仮説・未決事項の区別、実現方法の過剰固定防止を扱う |
| H03-D03 | agentは第二レイヤーの利用を提案できるが、発動を決定するのはHumanとする。Skillは暗黙発動しない |
| H03-D04 | 第二レイヤーの成果物はchatまたはMarkdownのExecution Contractとし、agentは形式を提案できるがHumanが決定する |
| H03-D05 | chatではfileを変更しない。MarkdownではHumanが承認したexact pathだけを作成・更新し、契約生成権限を実装、Git publication、外部状態変更へ拡張しない |
| H03-D06 | 別agentへの指示と、agent自身の後続taskを定義する実装提案の両方に利用できる |
| H03-D07 | 同一agentでも契約策定と実行のgateを分離する |
| H03-D08 | 必須項目を`Goal / Scope / 前提条件 / 参照先 / 禁止事項 / DoD / STOP RULES / ESCAPE HATCH / Human判断事項`とする |
| H03-D09 | 第二レイヤー対象taskでは実行agentがread-only確認後にplan draftを提示して停止し、Human承認前に変更しない。軽微task例外は設けない |
| H03-D10 | 実装開始承認後、Git publicationを含む承認scopeでは既存flowに従ってReady化まで自走できる |
| H03-D11 | review／CIを再設計せず、Reviewerへ必要な証拠の引渡し条件を契約で定義する |
| H03-D12 | 自動task分類、plan省略、Production DB向けExecution ContractはSlice 4で導入しない |
| H03-D13 | Skill発動承認、契約採用・plan作成許可、planに基づく実装開始承認を別gateとし、同一agentでも各Human応答をまたいで自動継続しない |

## 11. 抽出境界

本書へ収録したのは、元V2.5の§3、§6.1、§6.3.2、§6.4のうちSlice 3・4共通gate、§6.5のうち継続適用する変更管理要件、§6.7〜§6.9、§6.12のSlice 3・4行、対応するDoD、停止条件、H-03である。Slice 1・2の実施履歴と完了記録、Slice 5のSupabase要件は収録しない。
