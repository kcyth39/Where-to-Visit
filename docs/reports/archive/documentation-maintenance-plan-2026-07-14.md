> **Status: SNAPSHOT / HISTORICAL**
>
> 2026-07-14時点の文書整備計画snapshotである。現在の正本性、status、owner、参照先、更新契機は[Knowledge入口](../../README.md)を確認する。本書は現行の文書運用手順ではない。

# ドキュメント整備 整理レポート（2026-07-14）

## 0. 位置づけ

本書は、きめのすけのドキュメント体系の現状を診断し、**AGENTS.md／CLAUDE.md を本来の役割（大原則・大方針）に特化させ、詳細仕様と手順を正本ドキュメントやSkillへ移管・整理する**ための方針をまとめた整理レポートである。本書自体はレポートであり、ここで提案するスリム化・移管・整理は別途おしげさんの承認のうえで実施する（本書と姉妹編は未追跡のまま保持し、直近の実装コミット `dac0f11` には含めていない）。姉妹編は同日付の `development-and-business-activity-plan-2026-07-14.md`。

---

## 1. 現在のドキュメント体系

ドキュメントは4層に整理できる。全体で正本系9ファイル・ADR 10本・reports 27本が存在する。

| 層 | 役割 | 主なファイル | 行数の目安 |
|---|---|---|---|
| コンテキスト（橋渡し） | 全AI（Chat/Cowork/Codex）共通の前提。`AGENTS.md`＝`CLAUDE.md`で同一内容を同期 | `AGENTS.md` / `CLAUDE.md` | 各96行 |
| 正本（docs/） | 計画・要件・データモデル・DoD・QAの正本 | `00_master-plan`〜`06_qa-flow` | 25〜311行 |
| 決定記録（docs/adr/） | 技術・仕様の決定記録。個別論点の最終正本 | `0001`〜`0008`, `open-questions` | 29〜150行 |
| 記録・作業物（docs/reports/） | 経緯レポート・スライス指示書・handoff・レビュー・参照資料 | 27ファイル | — |
| Skill（.agents/skills/） | Codex向けの運用手順（Supabase live DB操作） | `operate-supabase-live-db/` | SKILL.md＋references 5本＋scripts |
| 退避（archive/） | 着手前資料・旧版下書き。実装は参照しない旨を明記済み | 8ファイル | — |

archiveは `README.md` で「正本は docs/ と CLAUDE.md。実装はここを参照しない」と明記され、各旧ファイルの現行正本への対応表も整備されており、**すでに健全**である。

---

## 2. 課題の診断

### 2-1. AGENTS.md／CLAUDE.md に「大方針」と「詳細仕様・手順」が混在

現行のコンテキストファイルは96行の中に、大方針（サービス概要・技術スタック・MVP境界・実装規約・着手前チェック）と、**本来は正本やADRが持つべき詳細仕様**（確定ロジックの厳密な場合分け、Criterion/❤️/🌀の集約規則、識別方式のtoken詳細、ローカルSupabase運用の細目）が同居している。この結果、次の摩擦が生じている。

- 仕様が変わるたびに「正本・ADR・コンテキストファイル」を三重に直す必要があり、同期漏れのリスクがある。実例として、2026-07-13に正本側の「未移行」注記漏れが是正されたほか、**2026-07-14の用語統一・2ステップ化コミット（`dac0f11`）でも、初期セットアップの旧3ステップ表現が `06_qa-flow.md`（S2）だけでなく `AGENTS.md`・`CLAUDE.md`・`05_dod.md` にも取りこぼされており、事実確認の過程で現行仕様へ修正した**。同じ仕様が複数ファイルに散在するほど、この種のドリフトが起きやすいことを示している。
- コンテキストファイルが詳細に踏み込むほど、Codexが「どちらが正本か」を判断しにくくなる。CLAUDE.md自身は「実装判断は正本を優先」と述べているが、記述の粒度がそれと逆行している。

### 2-2. docs/reports/ に一時作業物と恒久記録が混在

27ファイルのうち、`slice-2-codex-prompt`・`slice-5-codex-prompt`・`attribute-removal-codex-prompt`・各種 `*-handoff`・`*-draft`・`*-review` などは、**特定スライスの実装時にだけ意味を持つ一時作業物**である。一方 `db-implementation-and-development-status-2026-07-13`・`supabase-cli-docker-development-reference-2026-07-12`・`ui-copy-decisions`・`audit-postcss-*` は、後から参照する価値のある恒久記録である。両者が同一フォルダにフラットに並んでいるため、「いま参照すべき正本的レポート」を見つけにくい。

### 2-3. 運用手順の正本が分散

ローカルSupabase／remote適用／cleanupの手順は、CLAUDE.md本文・ADR-0008・`supabase-cli-docker-development-reference`・`.agents/skills/operate-supabase-live-db/`（SKILL.md＋references 5本）に分散している。Codexが実行時に見るべき「実行手順の単一正本」がSkillであるべきだが、CLAUDE.md本文にも手順の細目が残っているため、どこを直せば運用が変わるのかが曖昧になっている。

---

## 3. AGENTS.md／CLAUDE.md スリム化の方針

**原則**: コンテキストファイルは「Codexが最初に読む地図」に徹する。すなわち、①サービスの一言説明、②絶対に破ってはいけない大原則、③各詳細の正本へのポインタ、の3点に絞る。詳細な場合分け・数値・token仕様・運用細目は正本／ADR／Skillに置き、コンテキストファイルからはリンクで参照する。

### 3-1. コンテキストファイルに「残す」もの（大原則・大方針）

- サービス概要の一言説明（きめのすけが何か）。
- 表示用語の統一ルール（「きめること／つたえておきたいこと」を使い、内部は`title`/`memo`）——ただし要点のみ。
- 技術スタック（Next.js＋Supabase＋Vercel、Authなし、ドメイン）。
- MVP境界（In/Outの見出しレベル）。
- 実装の大原則: 「仕様を勝手に変えない」「矛盾・曖昧は実装せず質問して停止」「指示書外実装を足さない」「依存はバージョン固定」「スコープ厳守」。
- 着手前チェックの必須ルール（git status確認、target不明時はDB操作しない、スコープ・停止条件を最優先）。
- 各詳細の正本への参照表（下記）。

### 3-2. コンテキストファイルから「移す」もの（詳細仕様・手順）

| 現在CLAUDE.md本文にある詳細 | 本来の正本（移管先） |
|---|---|
| 確定ロジックの厳密な場合分け（clear/discussion/fallback/none、同数・×混在の扱い） | `adr/0003-evaluation-and-decision-logic.md`＋`04_data-model.md` |
| 判断基準（Criterion）と❤️/🌀の集約規則・共同編集モデル | `adr/0007-event-views-and-criterion-feedback.md`＋`03_requirements.md` |
| 共同編集型・回答者行モデルの細目（owner_token、選択記憶キー等） | `adr/0006-collaborative-response-row-model.md` |
| 識別方式のtoken詳細（Cookie保存・localStorageキー） | `adr/0004-permission-model.md`＋`adr/0006` |
| ローカルSupabase開発・検証の運用細目 | `adr/0008-local-supabase-development-workflow.md`＋`.agents/skills/operate-supabase-live-db/` |

移管といっても、これらの詳細は**すでに各正本・ADR・Skillに存在している**（CLAUDE.mdはその要約を重複保持している状態）。したがって作業の実体は「新規に書き写す」ことではなく、**コンテキストファイル側の重複記述を、正本へのポインタ＋一行要約に置き換える**ことである。これにより三重更新が二重（正本＋要約リンク）に減り、同期漏れリスクが下がる。

### 3-3. 参照表の例（コンテキストファイルに置く形）

```
## 詳細仕様の正本
- 確定ロジック: adr/0003 ＋ 04_data-model.md
- 判断基準・❤️・🌀: adr/0007 ＋ 03_requirements.md
- 回答者行モデル・識別: adr/0006 ＋ adr/0004
- ローカル/remote Supabase運用: adr/0008 ＋ .agents/skills/operate-supabase-live-db/
- 画面文言: reports/ui-copy-decisions.md
```

### 3-4. 同期規律の維持

「AGENTS.md と CLAUDE.md は同一内容を保つ」という既存ルールは維持する。スリム化後も両ファイルを同時に更新する。加えて、詳細を正本へ寄せたぶん、**正本を変えたらコンテキストファイルの一行要約と齟齬がないかを確認する**という軽いチェックを、着手前チェックに一項目として足すことを推奨する。

---

## 4. Skillへの手順移管

Codexが実行時に参照すべき運用手順（Supabase live DB操作、remote migration承認ゲート、cleanupプロトコル、E2E gate）は、`.agents/skills/operate-supabase-live-db/` に SKILL.md＋references（`cleanup-protocol` / `e2e-git-gates` / `migration-gates` / `project-profile` / `report-templates`）＋scriptsとして整備済みである。**このSkillを運用手順の単一正本とし、CLAUDE.md本文からは手順の細目を落として「運用手順はこのSkillを正とする」というポインタだけを残す**のが望ましい。

将来的に、Cowork側の反復作業（例: docs同期チェック、reportテンプレート適用）を独立したSkill化する余地もあるが、現時点では既存Skillへの集約を優先し、Skillの新規乱立は避ける。

---

## 5. docs/reports/ の整理

恒久記録と一時作業物を見分けやすくするため、次を提案する（実施は承認後）。

- **恒久記録として残す**: `db-implementation-and-development-status-2026-07-13`、`supabase-cli-docker-development-reference-2026-07-12`、`ui-copy-decisions`、`audit-postcss-GHSA-*`、本書と姉妹編。
- **一時作業物としてアーカイブ候補**: `*-codex-prompt`、`*-handoff`、`*-draft`、スライス個別の `*-review` / `*-decisions` / `*-requirements-and-dod` 系。これらは役目を終えているため、`docs/reports/` 直下から `docs/reports/archive/`（新設）または既存 `archive/` へ移し、reports直下は現行の正本的レポートだけを残す。
- **索引の新設**: `docs/reports/README.md` を置き、「恒久記録」と「作業履歴」を分けた一覧を持たせると、参照性が大きく上がる。

これらはいずれも**内容の削除ではなく整理（移動と索引化）**であり、履歴としての価値は保ったまま見通しを改善する。

> 補足: `archive/README.md` はすでに旧資料と現行正本の対応表を持ち、良い先例になっている。reports側の索引もこれに倣うとよい。

---

## 6. 整備後のあるべき姿

- **AGENTS.md／CLAUDE.md**: 一言説明・大原則・MVP境界・実装規約・着手前チェック・正本への参照表だけを持つ、Codexの「地図」。詳細な数値や場合分けは持たない。
- **docs/ 正本＋ADR**: 仕様・データモデル・決定の唯一の正本。変更はここから始める。
- **.agents/skills/**: 実行手順の単一正本。運用が変わったらここを直す。
- **docs/reports/**: 恒久記録（索引付き）と、archive化された作業履歴に分離。
- **archive/**: 着手前資料・旧版。現状維持で健全。

この形にすると、「仕様を変える＝正本/ADRを直す」「手順を変える＝Skillを直す」「方針を変える＝コンテキストファイルを直す」という**変更起点の一対一対応**が成立し、三重更新と同期漏れが構造的に起きにくくなる。

---

## 7. 推奨アクション（順序）

1. **参照表の設計を確定**: コンテキストファイルに置く「詳細仕様の正本」参照表の項目立てをおしげさんと確定する。
2. **コンテキストファイルのスリム化（要承認）**: CLAUDE.mdの詳細記述を、正本ポインタ＋一行要約へ置換。AGENTS.mdも同一内容で同期。移管先に既存の正本があることを確認しながら行い、正本にしか無い情報を落とさない。
3. **運用手順のSkill一本化（要承認）**: CLAUDE.md本文の運用細目をSkillへのポインタに置換。
4. **reports整理（要承認）**: 一時作業物をarchive化し、`docs/reports/README.md` の索引を新設。
5. **同期チェックの制度化**: 「正本変更時にコンテキストファイル要約との齟齬を確認」を着手前チェックへ追記。

いずれも本書の提案段階であり、実ファイルの変更は各項目でおしげさんの承認を得てから行う。

---

## 8. 参照

- `AGENTS.md` / `CLAUDE.md`
- `docs/00_master-plan.md`（役割分担・成果物の置き場）
- `docs/adr/0003`〜`0008`
- `docs/reports/db-implementation-and-development-status-2026-07-13.md`
- `docs/reports/supabase-cli-docker-development-reference-2026-07-12.md`
- `.agents/skills/operate-supabase-live-db/`（SKILL.md＋references＋scripts）
- `archive/README.md`（退避資料と現行正本の対応表）
- 姉妹編: `docs/reports/development-and-business-activity-plan-2026-07-14.md`
