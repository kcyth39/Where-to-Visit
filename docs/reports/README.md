# docs/reports/ Knowledge副索引

repository全体の入口は[`docs/README.md`](../README.md)である。本書は`docs/reports/`と`archive/`だけを分類する副索引であり、個別taskのExecution Contractまたは実行authorizationではない。仕様判断は`docs/03_requirements.md`〜`06_qa-flow.md`、ADR、`DESIGN.md`を優先する。

## Knowledge Map：現行reports

各group内の文書は、groupの目的・正本性・owner・lifecycle・参照規則を共有する。文書内部に古い実装状態が残るsnapshotは現在状態へ読み替えず、現行正本とRoadmapで再確認する。

| group | 目的 | 正本性・status | 内容責任者 | lifecycle責任者 | 重複 | 矛盾 | 参照先 | 参照元 | 更新契機 |
|---|---|---|---|---|---|---|---|---|---|
| 画面文言正本 | 確定copyと文言連動挙動 | 詳細正本・`CURRENT CANONICAL` | Claude | PKA | 03・DESIGNと一部重なる | product意味は03、visualはDESIGNと整合する | 03、DESIGN、ADR | AGENTS／CLAUDE、UI実装 | 文言・連動挙動の承認済み変更 |
| Supabase運用reference | CLI／Docker、local-first、target分離、安全gateの詳細 | 運用reference・`CURRENT OPERATIONAL` | DevOps／Tech Lead | PKA | ADR-0008・Skillと重なる | ADR・05・06・SkillのHuman gateを優先 | ADR-0008、05、06、Skill | AGENTS／CLAUDE、Skill | CLI、profile、安全gate、運用実態変更 |
| reporting手順 | 現行service／技術reportの作成経路 | 運用reference・`CURRENT OPERATIONAL` | PKA（構造）／各domain owner（意味） | PKA | 本索引と一部重なる | 正本の意味を複製・変更しない | docs入口、各正本 | report作成task | report template・参照経路変更 |
| PKA改善program承認済み将来変更入力 | Slice 3・4の共通遂行原則／Execution Contract要件と、Slice 5のSupabaseミッション | `APPROVED / MIXED IMPLEMENTATION STATUS`。Slice 3は実装・受入済み、Slice 4はH-03補完・実装開始承認済みでHuman mergeまでは未発効、Slice 5は未実装。current publication状態は固定PR URLのGitHub状態を正とする | Human／Tech Lead／PKA／DevOps（各domain） | PKA | 現行正本・Skill・Roadmapと一部重なる | 現行ruleは最新mainの正本・Skillを優先する。個別Execution ContractとHuman承認なしに実装・運用を変更しない | docs入口、00、05、06、ADR-0008、Skill、Roadmap | 本索引、後続sliceのExecution Contract | 個別slice承認、要件・DoD・status・未決事項変更 |
| 現行Roadmap | 現在地、優先順位、依存、次gate | 計画正本・`CURRENT ROADMAP` | Human／各項目のdomain owner | PKA | 00 Phase、残課題snapshotと重なる | 仕様は正本、実行scopeは個別contractを優先 | 00、03〜06、ADR、GitHub | docs入口、本索引 | PR merge・closeout、承認、baseline・status・優先順位変更 |
| 実装・受入済みslice | 承認要件、DoD、QA証跡 | `IMPLEMENTED / ACCEPTED` | Claude／Tech Lead／Reviewer（各成果物） | PKA | 03〜06に結果が反映済み | 現在仕様は03〜06を優先 | 03〜06、DESIGN、ADR | 03〜06、本索引 | 回帰、置換、受入状態変更 |
| 共同編集model詳細 | 2026-07-11時点の要件・仕様・DoD・QA | `SNAPSHOT / HISTORICAL`。本文の「未実装」は後続実装前の時点事実 | Claude／Tech Lead | PKA | ADR-0006／0007、03〜06と重なる | 現在の実装・受入状態は03〜06を優先 | ADR-0006／0007、03〜06 | 03〜06、本索引 | 原則書換えず、置換先・status変更時だけ索引更新 |
| DB実装経緯 | 2026-07-13時点のDB実装・検証結果 | `SNAPSHOT / HISTORICAL` | Tech Lead／DevOps | PKA | ADR・Skill・03〜06と重なる | 現在状態は正本・最新証跡を優先 | ADR-0008、03〜06、Skill | AGENTS／CLAUDE、本索引 | 原則書換えず、置換先変更時だけ索引更新 |
| 07-17仕様・残課題snapshot | PR #1〜3 baselineと当時の仕様・課題 | `SNAPSHOT / HISTORICAL` | 各domain owner | PKA | 現行正本・Roadmapと重なる | 現在仕様・完了状態は03〜06・Roadmapを優先 | 03〜06、Roadmap | 本索引 | 原則書換えず、参照先変更時だけ索引更新 |
| 開発準備・baseline closeout履歴 | 07-15〜07-16の準備・review・closeout | `SNAPSHOT / HISTORICAL` | 当時の実装担当／Reviewer | PKA | Roadmap・Git履歴と重なる | 現在状態はRoadmapとGitHubを優先 | Roadmap、GitHub | 本索引 | 原則書換えず、lifecycle変更時だけ索引更新 |
| postcss保留判断 | 脆弱性警告の調査と対応保留理由 | risk判断記録・`CURRENT OPERATIONAL` | Tech Lead／Human | PKA | Roadmapの依存警告と重なる | 現在version・advisoryは再調査する | Roadmap、package state | Roadmap、本索引 | dependency・advisory・risk許容度変更 |

### 画面文言正本

- [`ui-copy-decisions.md`](ui-copy-decisions.md)

### Supabase運用reference

- [`supabase-cli-docker-development-reference-2026-07-12.md`](supabase-cli-docker-development-reference-2026-07-12.md)

### reporting手順

- [`current-service-and-technical-reporting-procedure.md`](current-service-and-technical-reporting-procedure.md)

### PKA改善program承認済み将来変更入力

次の2文書は、元V2.5の対応部分に代わるExecution Contract作成時の参照先である。現在有効なruleは最新mainの正本・ADR・Skillを優先し、各文書のmergeだけでは実装・運用を変更しない。個別Sliceまたは導入段階ごとのExecution ContractとHuman承認を必要とする。

- Slice 3・4: [`pka-slices-3-4-requirements-and-dod-2026-07-21.md`](pka-slices-3-4-requirements-and-dod-2026-07-21.md)。Slice 3は[PR #14](https://github.com/kcyth39/Where-to-Visit/pull/14)で実装・受入済み。Slice 4はH-03補完・実装開始承認済みで、[PR #15](https://github.com/kcyth39/Where-to-Visit/pull/15)を固定追跡先としHuman mergeまでは未発効
- Slice 5: [`supabase-access-and-change-governance-mission-definition-2026-07-20.md`](supabase-access-and-change-governance-mission-definition-2026-07-20.md)

### 現行Roadmap

- [`development-and-business-activity-plan-2026-07-17.md`](development-and-business-activity-plan-2026-07-17.md)

### 実装・受入済みslice

- Dashboard summary／back navigation（B-1／B-2）: [`requirements`](dashboard-summary-and-back-nav-requirements-2026-07-15.md)／[`DoD`](dashboard-summary-and-back-nav-dod-2026-07-15.md)／[`QA`](dashboard-summary-and-back-nav-qa-2026-07-15.md)
- Brand header refresh（B-3）: [`requirements`](brand-header-refresh-requirements-2026-07-16.md)／[`DoD`](brand-header-refresh-dod-2026-07-16.md)／[`QA`](brand-header-refresh-qa-2026-07-16.md)

### 共同編集model詳細

- [`collaborative-response-row-requirements-2026-07-11.md`](collaborative-response-row-requirements-2026-07-11.md)
- [`collaborative-response-row-spec-draft-2026-07-11.md`](collaborative-response-row-spec-draft-2026-07-11.md)
- [`collaborative-response-row-dod-2026-07-11.md`](collaborative-response-row-dod-2026-07-11.md)
- [`collaborative-response-row-qa-2026-07-11.md`](collaborative-response-row-qa-2026-07-11.md)

### DB実装経緯

- [`db-implementation-and-development-status-2026-07-13.md`](db-implementation-and-development-status-2026-07-13.md)

### 07-17仕様・残課題snapshot

- [`current-service-specification-A-2026-07-17.md`](current-service-specification-A-2026-07-17.md)
- [`current-technical-specification-and-pr1-3-implementation-B-2026-07-17.md`](current-technical-specification-and-pr1-3-implementation-B-2026-07-17.md)
- [`fixes-and-remaining-tasks-C-2026-07-17.md`](fixes-and-remaining-tasks-C-2026-07-17.md)

### 開発準備・baseline closeout履歴

- [`development-preparation-and-documentation-2026-07-15.md`](development-preparation-and-documentation-2026-07-15.md)
- [`development-preparation-and-documentation-review-2026-07-15.md`](development-preparation-and-documentation-review-2026-07-15.md)
- [`development-and-business-activity-status-2026-07-16.md`](development-and-business-activity-status-2026-07-16.md)

### postcss保留判断

- [`audit-postcss-GHSA-qx2v-qp2m-jg93.md`](audit-postcss-GHSA-qx2v-qp2m-jg93.md)

## Knowledge Map：archive

`archive/`は現行仕様・現行手順の入口ではない。次のgroup metadataを共有し、現行判断には各正本を使う。

| group | 目的 | 正本性・status | 内容責任者 | lifecycle責任者 | 重複 | 矛盾 | 参照先 | 参照元 | 更新契機 |
|---|---|---|---|---|---|---|---|---|---|
| 決定・回答・完了記録 | 当時の判断と結果を保存 | `SNAPSHOT / HISTORICAL` | 作成時のdomain owner | PKA | 現行正本と意図的に重なる | 現在判断には使わない | 現行正本、本索引 | 本索引 | 保持方針・置換先変更 |
| prompt・指示・handoff | 当時の実行入力を証跡として保存 | `SUPERSEDED / DO NOT EXECUTE` | 作成時のdomain owner | PKA | 現行contract・Skillと重なる | 再実行禁止。現行正本・Skillを優先 | 現行正本、Skill、本索引 | 本索引 | 保持方針・置換先変更 |

### 決定・回答・完了記録（`SNAPSHOT / HISTORICAL`）

- [`development-and-business-activity-plan-2026-07-14.md`](archive/development-and-business-activity-plan-2026-07-14.md)
- [`documentation-maintenance-plan-2026-07-14.md`](archive/documentation-maintenance-plan-2026-07-14.md)
- [`pc-migration-local-supabase-recovery-and-cleanup-2026-07-14.md`](archive/pc-migration-local-supabase-recovery-and-cleanup-2026-07-14.md)
- [`adr0005-review-answers-2026-07-10.md`](archive/adr0005-review-answers-2026-07-10.md)
- [`collaborative-response-row-review-2026-07-11.md`](archive/collaborative-response-row-review-2026-07-11.md)
- [`slice-1-completion-report.md`](archive/slice-1-completion-report.md)
- [`slice-2-chat-review-2026-07-09.md`](archive/slice-2-chat-review-2026-07-09.md)
- [`slice-2-decisions-2026-07-09.md`](archive/slice-2-decisions-2026-07-09.md)
- [`slice-2-implementation-diff.md`](archive/slice-2-implementation-diff.md)
- [`slice-2-prep-decisions.md`](archive/slice-2-prep-decisions.md)

### prompt・指示・handoff（`SUPERSEDED / DO NOT EXECUTE`）

- [`e2e-data-cleanup-operator-guide-2026-07-17.md`](archive/e2e-data-cleanup-operator-guide-2026-07-17.md) — 現行cleanupは`operate-supabase-live-db` Skillを使用
- [`claude-codex-collaboration-protocol-2026-07-18.md`](archive/claude-codex-collaboration-protocol-2026-07-18.md) — 現行coordinationは`coordinate-claude-codex-worktree` Skillを使用
- [`adr0005-codex-review-prompt.md`](archive/adr0005-codex-review-prompt.md)
- [`attribute-removal-codex-prompt.md`](archive/attribute-removal-codex-prompt.md)
- [`handoff-2026-07-10.md`](archive/handoff-2026-07-10.md)
- [`slice-1-ui-codex-handoff.md`](archive/slice-1-ui-codex-handoff.md)
- [`slice-1-ui-copy-review.md`](archive/slice-1-ui-copy-review.md)
- [`slice-2-chat-handoff.md`](archive/slice-2-chat-handoff.md)
- [`slice-2-codex-prompt.md`](archive/slice-2-codex-prompt.md)
- [`slice-2-instructions-draft.md`](archive/slice-2-instructions-draft.md)
- [`slice-2-requirements-and-dod.md`](archive/slice-2-requirements-and-dod.md)
- [`slice-5-codex-prompt.md`](archive/slice-5-codex-prompt.md)
- [`slice-5-requirements-and-dod.md`](archive/slice-5-requirements-and-dod.md)

## 未追跡・後続処置

- `docs/memos/`とprimary checkoutだけの未追跡文書は正本ではなく、本索引からlinkしない。
- 07-14旧計画3件は`SNAPSHOT / HISTORICAL`、旧cleanup guideと旧Claude／Codex共同作業protocolは`SUPERSEDED / DO NOT EXECUTE`として上記archiveへ保存済みである。現在判断・実行には各bannerの置換先を使う。
- 新規reportを追加するtaskは、同じ変更で本索引と必要に応じてrepository入口を更新する。
