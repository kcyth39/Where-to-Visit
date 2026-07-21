# きめのすけ Knowledge入口

このファイルは、repository内の正本、現行運用、Roadmap、実装・検証記録、履歴を区別して辿るための唯一のKnowledge入口である。個別taskを開始するauthorizationやExecution Contractではない。実装時は本書から対象domainの正本へ進み、正本と承認済みExecution Contractを優先する。

## 読む順序

1. AI共通原則は[`AGENTS.md`](../AGENTS.md)／[`CLAUDE.md`](../CLAUDE.md)を読む（両fileは同一内容）。
2. roleと内容責任は[`00_master-plan.md` §0](00_master-plan.md#0-前提-役割分担と運用ルール)を確認する。
3. product・技術・QAは下表から該当正本へ進む。
4. 現在の優先順位と次gateは[`development-and-business-activity-plan-2026-07-17.md`](reports/development-and-business-activity-plan-2026-07-17.md)を確認する。Roadmap単体は実装許可ではない。
5. reportと履歴の詳細分類は[`reports/README.md`](reports/README.md)を使う。

## Authorityとstatus

- `main`へmerge済みの文書・設定をrepositoryの有効情報とする。ただし、merge済みであることだけで全fileを仕様正本とは扱わず、下表の正本性とstatusに従う。
- 内容の意味はdomain ownerが持つ。PKAは配置、参照、重複・矛盾、status、更新経路、lifecycleを管理し、意味を独自変更しない。
- `docs/memos/`、chat、agent memory、primary checkoutだけの未追跡fileは正本ではない。必要な内容はdomain ownerの確認とHuman承認を経て、適切なtracked正本へ最小単位で昇格する。
- statusは日本語を主とし、検索補助として次のlabelを使う。

| 補助label | 日本語での意味 |
|---|---|
| `CURRENT CANONICAL` | 現在の判断に使う正本 |
| `CURRENT OPERATIONAL` | 現在有効な運用手順・reference |
| `CURRENT ROADMAP` | 現在の優先順位・現在地を示す計画。Execution Contract／authorizationではない |
| `APPROVED / NOT IMPLEMENTED` | 方針・契約は承認済みだが未実装 |
| `IMPLEMENTED / ACCEPTED` | 実装・検証・受入済みの成果物・証跡 |
| `SNAPSHOT / HISTORICAL` | 特定時点の記録。現在判断は現行正本で再確認する |
| `SUPERSEDED / DO NOT EXECUTE` | 置換済み。手順を再実行しない |
| `DRAFT / NON-CANONICAL` | 検討用。正本・実行根拠にしない |

## Knowledge Map：共通context・正本・ADR

| 文書・group | 目的 | 正本性・status | 内容責任者 | lifecycle責任者 | 重複 | 矛盾 | 主な参照先 | 主な参照元 | 更新契機 |
|---|---|---|---|---|---|---|---|---|---|
| [`docs/README.md`](README.md) | repository全体のKnowledge入口 | 入口正本・`CURRENT CANONICAL` | PKA（構造のみ） | PKA | reports索引と分類項目が重なる | 意味は各domain正本を優先 | 本表の全対象 | AGENTS／CLAUDE | tracked文書・Skillの追加、移動、status・owner・参照変更 |
| [`AGENTS.md`](../AGENTS.md)／[`CLAUDE.md`](../CLAUDE.md) | AI共通の長期安定原則、禁止・停止条件、入口pointer | 共通context正本・`CURRENT CANONICAL`。byte-for-byte同一 | sectionごとのdomain owner | PKA | 2 fileは意図的複製 | 差分発生は不整合 | 本書、該当正本 | agent起動時 | 長期原則、安全境界、入口変更。片方変更時は必ず同期 |
| [`00_master-plan.md`](00_master-plan.md) | role正本と立ち上げPhaseの履歴・原則 | §0 roleは`CURRENT CANONICAL`、初期Phase記述は`SNAPSHOT / HISTORICAL`を含む | §0は各roleのdomain owner、事業PhaseはClaude／Human | PKA | RoadmapとPhase表が重なる | product・実装判断は03〜06とADRを優先 | 03〜06、ADR、Roadmap | AGENTS／CLAUDE、本書 | role変更、事業Phase原則変更、置換先追加 |
| [`01_lean-canvas.md`](01_lean-canvas.md) | 事業仮説・価値・収益構造 | 事業Knowledge正本・`CURRENT CANONICAL` | Claude／Human | PKA | Roadmapの事業項目と一部重なる | 優先順位はRoadmap、product要件は03を優先 | 03、Roadmap | 00 | 事業目的・方針のHuman承認済み変更 |
| [`02_competitive.md`](02_competitive.md) | 競合調査と事業上の比較 | 事業reference・`SNAPSHOT / HISTORICAL` | Claude | PKA | 01の市場仮説と一部重なる | 時点依存情報は再調査を優先 | 01、Roadmap | 00 | 競合再調査、事業方針変更 |
| [`03_requirements.md`](03_requirements.md) | product要件、表示用語、実装状態 | product正本・`CURRENT CANONICAL` | Claude | PKA | AGENTS旧要約とreports詳細を集約 | ADRの技術判断と役割分離 | 04〜06、ADR、DESIGN | AGENTS／CLAUDE、00、各report | product意味変更、承認済み実装・受入状態変更 |
| [`04_data-model.md`](04_data-model.md) | data modelと不変条件 | 技術正本・`CURRENT CANONICAL` | Tech Lead | PKA | ADR・実装reportに詳細あり | schema実態差分は停止してTech Leadへ戻す | ADR、03、05、06 | AGENTS／CLAUDE、各技術report | schema／architecture変更 |
| [`05_dod.md`](05_dod.md) | 完了定義とquality gate | quality正本・`CURRENT CANONICAL` | Tech Lead | PKA | slice別DoD reportと重なる | 個別contractは本書の共通gateを弱めない | 03、04、06 | AGENTS／CLAUDE、Reviewer | 共通DoD・publication gate変更 |
| [`06_qa-flow.md`](06_qa-flow.md) | QA scenario、review、publication、closeout | QA・運用正本・`CURRENT CANONICAL` | Tech Lead（定義）／Reviewer（独立判定）／Human（重要gate） | PKA | Skill・slice別QA reportと重なる | Skillは本書を上書きしない | 03〜05、Skill | AGENTS／CLAUDE、各Execution Contract | QA scenario、review・Git運用変更 |
| [`DESIGN.md`](../DESIGN.md) | design systemとUI表現 | design正本・`CURRENT CANONICAL` | Claude（product表現）／Fullstack Engineer（実装表現） | PKA | 03・UI copyと一部重なる | 文言意味は03／ui-copyを優先 | 03、ui-copy | AGENTS／CLAUDE、UI実装 | design変更を含む承認済みslice |
| [`adr/0001`](adr/0001-go-decision.md) | Go判断と理由 | 事業決定記録・`CURRENT CANONICAL` | Human／Claude | PKA | 01と背景が重なる | 後続の明示ADRだけが置換可能 | 01、Roadmap | 00 | Go／pivot判断の変更 |
| [`adr/0002`](adr/0002-tech-stack.md)、[`0003`](adr/0003-evaluation-and-decision-logic.md)、[`0004`](adr/0004-permission-model.md)、[`0005`](adr/0005-drop-attribute-dynamic-criteria.md)、[`0006`](adr/0006-collaborative-response-row-model.md)、[`0007`](adr/0007-event-views-and-criterion-feedback.md)、[`0008`](adr/0008-local-supabase-development-workflow.md) | architecture・data・permission・運用上の決定と理由 | 技術／product決定正本・`CURRENT CANONICAL` | Tech Lead（技術）／Claude（product意味）／Human（重要risk） | PKA | 03〜06に結論が反映される | 後続ADRと03〜06の明示優先関係に従う | 03〜06、Skill | AGENTS／CLAUDE、実装contract | architecture・product意味・安全境界の承認済み変更 |
| [`adr/open-questions.md`](adr/open-questions.md) | 未決事項の一時集約 | 検討register・`DRAFT / NON-CANONICAL` | 各questionのdomain owner | PKA | Roadmapの保留事項と重なる | 決定後はADR／正本を優先 | ADR、Roadmap | 03、Tech Lead、Claude | question追加、決定、保留解除 |

## Knowledge Map：Roadmap・reports・Skill

| 文書・group | 目的 | 正本性・status | 内容責任者 | lifecycle責任者 | 重複 | 矛盾 | 主な参照先 | 主な参照元 | 更新契機 |
|---|---|---|---|---|---|---|---|---|---|
| [`development-and-business-activity-plan-2026-07-17.md`](reports/development-and-business-activity-plan-2026-07-17.md) | 現在地、優先順位、依存、次gate | 計画正本・`CURRENT ROADMAP`。Execution Contract／authorizationではない | Human（優先順位・status判断）／各項目のdomain owner | PKA | 00 Phase、残課題snapshotと重なる | 仕様意味は各正本、実行scopeは個別contractを優先 | 00、03〜06、ADR、GitHub | 本書、reports索引 | PR merge・closeout、承認、status・優先順位・baseline変更 |
| [`reports/README.md`](reports/README.md) | reportsとarchiveの副索引 | 副索引正本・`CURRENT CANONICAL` | PKA（分類のみ） | PKA | 本書のreports要約と意図的に重なる | 個別文書の意味はdomain ownerが保持 | reports全件 | 本書 | report追加、status・参照・owner変更、archive処置 |
| [`reports/`](reports/README.md#knowledge-map現行reports)の現行report群 | product・技術・QA・運用の詳細と証跡 | 個別またはgroupごとに`CURRENT CANONICAL`／`CURRENT OPERATIONAL`／`IMPLEMENTED / ACCEPTED`／`SNAPSHOT / HISTORICAL`／`DRAFT / NON-CANONICAL` | reports副索引に記載 | PKA | 正本の詳細・証跡として重なる | 正本との不一致時は正本を優先 | reports副索引 | 03〜06、ADR、Roadmap | 実装・QA・受入・再監査・置換時 |
| [`reports/archive/`](reports/README.md#knowledge-maparchive) | 完了・置換済み作業の履歴保存 | `SNAPSHOT / HISTORICAL`または`SUPERSEDED / DO NOT EXECUTE` | 作成時のdomain owner | PKA | 現行正本と意図的に重なる | 現行判断・手順へ再利用しない | reports副索引、置換先 | reports副索引 | archive追加、置換先変更、保持方針変更 |
| [`close-merged-worktree`](../.agents/skills/close-merged-worktree/SKILL.md) | task-owned worktree／local branchの安全なpost-merge closeout | repository Skill・`CURRENT OPERATIONAL` | PKA（process）／Tech Lead（技術妥当性） | PKA | 06 §1.1と手順が重なる | 06の権限・安全条件を上書きしない | 06 §1.1 | agent Skill discovery | closeout正本、安全条件、tool interface変更 |
| [`operate-supabase-live-db`](../.agents/skills/operate-supabase-live-db/SKILL.md)（[`cleanup`](../.agents/skills/operate-supabase-live-db/references/cleanup-protocol.md)／[`E2E・Git gate`](../.agents/skills/operate-supabase-live-db/references/e2e-git-gates.md)／[`migration gate`](../.agents/skills/operate-supabase-live-db/references/migration-gates.md)／[`profile`](../.agents/skills/operate-supabase-live-db/references/project-profile.md)／[`report template`](../.agents/skills/operate-supabase-live-db/references/report-templates.md)） | local-first Supabase、remote／Production Human gate、証跡 | repository Skill・`CURRENT OPERATIONAL` | DevOps／Tech Lead | PKA | ADR-0008、06、Supabase referenceと重なる | Production writeはHuman操作。ADR-0008と06を弱めない | ADR-0008、05、06、Supabase reference | agent Skill discovery | migration・cleanup・profile・安全gate変更 |

## 更新ルール

- 新しい文書・Skillを追加するtaskは、同じ変更で本書またはreports副索引を更新する。
- 既存正本へ追記できる場合、同じ意味の新規正本を作らない。
- status変更は証拠となるPR、受入、置換先を確認して行う。時点snapshotは現在状態へ書き換えず、現行Roadmapまたは正本へ誘導する。
- 文書の意味変更はdomain owner、優先順位・risk・重要gateはHumanの判断を必要とする。PKAは分類・参照・lifecycleだけを独自に変更できる。
