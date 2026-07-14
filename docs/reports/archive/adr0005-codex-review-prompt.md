# Codex レビュー依頼プロンプト: ADR-0005（属性撤廃・判断基準の動的化）の正本反映レビュー

> **✅ COMPLETED / SUPERSEDED（履歴のみ・再実行不要）**: ADR-0005反映レビューは完了済み。本書内の当時の確認前提より、現在の `AGENTS.md` / `CLAUDE.md` とSlice 5文書を優先する。

作成: Cowork / 日付: 2026-07-10 / 用途: 下の「Codexプロンプト」をそのまま Codex に貼る。
目的: **今回の大きな前提変更（属性撤廃＋判断基準の動的化）が、正本ドキュメント群に矛盾なく反映されているか**を Codex に厳密レビューさせる。**実装・コード変更・コミット・push はしない**（レビューのみ）。

---

## Codexプロンプト（ここから貼り付け）

あなたはレビュアー（Codex）。今回は**実装をしない**。決定権はおしげさんにある。作業リポジトリは `/Users/shige/Projects/Where-to-Visit`。

### 0. タスクの性質（厳守）

- **ドキュメントの整合性レビューのみ**。コード変更・migration作成・コミット・push・doc編集は**一切しない**。
- 既存コードは「変更ではなく影響把握のための読み取り」だけ許可（属性がどこで使われているか等の確認）。
- 疑問・曖昧・矛盾を見つけたら、勝手に解釈して進めず、**質問として書き出す**。

### 1. 今回の変更の Before / After（レビューの土台）

**Before（従来仕様）**
- お題作成時に**属性（食事 / 宿泊 / アクティビティ / そのた）を必ず選ぶ**。属性は `events.attribute`（enum・NOT NULL）。
- ❤️は**属性ごとに固定**（食事=price/taste/facility/place、宿泊=price/facility/place、アクティビティ=price/interest、そのた=interest）。`Reaction.type` は固定enum（`heart_*` / `concern`）。
- 候補タイトルの placeholder は**属性連動**（属性別マップ）。トップの eyebrow は属性表示。

**After（今回の確定仕様＝[ADR-0005](../../adr/0005-drop-attribute-dynamic-criteria.md)。ここを重点レビュー）**
- **属性は撤廃**。お題は**種別に縛られない自由テキスト**（タイトル＋メモ）。作成時に属性選択は無い。トップの eyebrow の属性表示・属性連動placeholderも無し。**候補/お題の placeholder は汎用**（例：「例）〇〇 など」）。
- **判断基準（Criterion）**: ❤️は属性固定ではなく、**お題ごとの「判断基準」ごと**に付ける（付ける/付けないの2値・**非決定＝確定判定に影響しない**）。
  - 判断基準は**イベント単位の共有リスト**。**オーナーも参加者も誰でも追加・編集・削除**できる（性善説）。**削除は2重確認**。重複は割り切り（技術上限のみ）。
  - **デフォルト**: お題作成直後に「**興味ある？**」を1件付与。
  - **プリセット選択肢**: 「価格どう？」「雰囲気どう？」「場所はどう？」「色はどう？」＋**自由記述**。
- **🌀（懸念）**: 判断基準とは**別**の、**全お題に常設の単一の懸念**（非決定）。Criterionには統合しない。
- **総合評価 ○/−/× と確定ロジック（×拒否・「×ゼロ・○1つ以上・○最多」を自動ハイライト）は不変。**
- **データモデル**: `Event.attribute` 削除。新設 **Criterion**（`id/event_id/label/source(preset|custom)/created_by(NULL可)/created_at`）、**Reaction 改**（`type`enum→`criterion_id` 参照）、**Concern（🌀）**（`candidate_id/participant_id`・全お題常設）。
- **重要な実装スコープの線引き**: **判断基準（Criterion/Reaction/Concern）の実装本体は Slice 5**。**今回の再pushベースラインで行うのは「属性の最小撤去（＋placeholder汎用化）」のみ**で、Criterion系テーブルやUIは**まだ作らない**。

### 2. レビュー対象ファイル（パス明示・すべて読む）

正本・仕様:
- `/Users/shige/Projects/Where-to-Visit/docs/adr/0005-drop-attribute-dynamic-criteria.md`（今回の転換ADR・起点）
- `/Users/shige/Projects/Where-to-Visit/docs/adr/0003-evaluation-and-decision-logic.md`（属性・❤️節→判断基準に置換されたか）
- `/Users/shige/Projects/Where-to-Visit/docs/04_data-model.md`（attribute削除・Criterion/Reaction/Concern）
- `/Users/shige/Projects/Where-to-Visit/docs/03_requirements.md`（作成フロー・AC-1.x/AC-5.x・画面一覧・In Scope）
- `/Users/shige/Projects/Where-to-Visit/docs/06_qa-flow.md`（S1/S6）
- `/Users/shige/Projects/Where-to-Visit/docs/adr/0004-permission-model.md`（判断基準の追加/編集/削除権限が権限モデルと矛盾しないか）
- `/Users/shige/Projects/Where-to-Visit/CLAUDE.md` と `/Users/shige/Projects/Where-to-Visit/AGENTS.md`（**同一内容か**・判断基準節）
- `/Users/shige/Projects/Where-to-Visit/docs/reports/ui-copy-decisions.md`（属性UI撤去・placeholder汎用の記述）
- `/Users/shige/Projects/Where-to-Visit/docs/reports/slice-2-requirements-and-dod.md`
- `/Users/shige/Projects/Where-to-Visit/docs/reports/slice-2-instructions-draft.md`
- `/Users/shige/Projects/Where-to-Visit/docs/reports/slice-2-codex-prompt.md`

影響把握のための既存コード（読み取りのみ）:
- `/Users/shige/Projects/Where-to-Visit/src/lib/constants.ts`（`EVENT_ATTRIBUTES` / `EVENT_ATTRIBUTE_LABELS` / お題placeholderマップ）
- `/Users/shige/Projects/Where-to-Visit/src/components/CreateEventForm.tsx`（属性選択フィールド）
- `/Users/shige/Projects/Where-to-Visit/src/lib/events.ts`（`attribute` の select/insert/read）
- `/Users/shige/Projects/Where-to-Visit/src/app/e/[shareToken]/page.tsx`・`/Users/shige/Projects/Where-to-Visit/src/app/o/[ownerToken]/page.tsx`（eyebrow の属性表示）
- `/Users/shige/Projects/Where-to-Visit/supabase/migrations/20260708000000_slice_1_events_participants.sql`（`events.attribute` 列・`event_attribute` 型）

### 3. 重点的に検証してほしい観点

1. **属性の“生きた”残存がないか**: どの正本にも、撤廃後なのに属性選択・属性別❤️・属性連動placeholderを前提とする記述が残っていないか（履歴・「撤廃」注記は可）。
2. **判断基準モデルの一貫性**: Criterion（❤️ポジ・動的・共有・誰でも編集）／🌀（別・常設）／Reaction(criterion_id)／確定ロジック不変、が全ファイルで矛盾なく一致しているか。
3. **スコープ境界の明確さ**: 「今回の再push＝属性撤去のみ／判断基準の実装＝Slice 5」が全ファイルで一貫し、誤って“今Criterionを作る”ように読めないか。
4. **DBの属性撤去の扱い（要注意）**: `events.attribute` は enum・NOT NULL で既存migrationにある。正本は列削除まで求めているのか、列は残して未使用にするのか、**新規migrationでどうするか**が曖昧でないか。曖昧なら質問に含める。
5. **権限モデルの整合**: 「判断基準を誰でも追加/編集/削除・削除は2重確認」が [ADR-0004](../../adr/0004-permission-model.md) の性善説権限と矛盾しないか（ADR-0004本文に判断基準の権限が明記されているか、抜けていないか）。
6. **CLAUDE.md と AGENTS.md が完全一致**か。

### 4. 進め方（この手順で回す）

1. 上記すべてを読み、§3の観点で**徹底的にレビュー**する（疑問を残さず洗い出す）。
2. **レビュー結果レポートを作成**する。必ず次の2部構成にする:
   - **(A) Codexの理解**: After仕様（§1）を**あなた自身の言葉で要約し直し**、「この理解で合っているか？」と確認を求める。
   - **(B) 曖昧点・矛盾点の質問リスト**: 見つかった曖昧・矛盾・欠落を**1件ずつ**、「どちらの解釈か／おしげさんはどう判断したか」を問う形で列挙する（例: DBの属性列は削除か残置か、判断基準権限のADR-0004明記の要否 等）。
3. レポートを出したら**そこで停止**し、おしげさんの回答を待つ（実装・doc編集・コミットはしない）。
4. おしげさんの回答で**誤解と曖昧点を解消**した後、**再度レビューをかける**（1〜3を繰り返し、疑問ゼロになるまで）。
5. 疑問が無くなった段階で「レビュー完了・矛盾なし」を報告する。ここまでコードは触らない。

### 5. 出力フォーマット

- 冒頭に「(A) Codexの理解」→ 続けて「(B) 質問リスト（番号付き）」→ 末尾に「レビューで参照したファイル一覧」。
- 断定できないことは断定しない。推測が要る箇所は必ず質問に回す。

（プロンプトここまで）
