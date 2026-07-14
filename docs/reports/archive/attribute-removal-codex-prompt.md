# Codex 実装プロンプト: 属性撤去 ＋ 案2でフルmigration適用＋Slice1+2まとめてpush

> **⛔ COMPLETED / SUPERSEDED（履歴のみ・実行禁止）**: 属性撤去ベースラインは完了済み。現在地は `AGENTS.md` / `CLAUDE.md` と、承認済み正本 [slice-5-requirements-and-dod.md](slice-5-requirements-and-dod.md) を参照する。

作成: Cowork / 日付: 2026-07-10 / 用途: 下の「Codexプロンプト」をそのまま Codex に貼る。
これは**属性撤去実施時点の旧実装指示**（完了済み・再実行禁止）。

---

## Codexプロンプト（ここから貼り付け）

あなたは実装AI（Codex）。判断はせず正本に従う。決定権はおしげさんにある。作業リポジトリは `/Users/shige/Projects/Where-to-Visit`（branch `main`、remote `origin`）。**本番 kimenosuke.com に実利用者はいない**。

### 0. 参照する正本（着手前に必ず読む・パス明示）

- `/Users/shige/Projects/Where-to-Visit/CLAUDE.md`・`/Users/shige/Projects/Where-to-Visit/AGENTS.md`（同一）
- `/Users/shige/Projects/Where-to-Visit/docs/adr/0005-drop-attribute-dynamic-criteria.md`（属性撤廃・判断基準の動的化・**本タスクの起点**）
- `/Users/shige/Projects/Where-to-Visit/docs/reports/adr0005-review-answers-2026-07-10.md`（Codexレビュー29件の回答・確定事項）
- `/Users/shige/Projects/Where-to-Visit/docs/04_data-model.md`・`/Users/shige/Projects/Where-to-Visit/docs/03_requirements.md`・`/Users/shige/Projects/Where-to-Visit/docs/06_qa-flow.md`
- `/Users/shige/Projects/Where-to-Visit/docs/reports/ui-copy-decisions.md`・`/Users/shige/Projects/Where-to-Visit/docs/reports/slice-2-requirements-and-dod.md`
- `/Users/shige/Projects/Where-to-Visit/docs/05_dod.md`

### 1. 着手前チェック（必須）

1. 上記正本を読む。`git status` で状態確認。作業フォルダ相違／Git未初期化なら停止・報告。`.git/index.lock` が残り操作が失敗する場合は他にgitプロセスが無いことを確認して `rm -f .git/index.lock`。
2. 現状: `main` は origin より ahead（Slice 1＋Slice 2 の未pushコード）＋ **ADR-0005 反映の docs が未コミット**。

### 2. 先にコミット（docsのみ・画像/実装より前）

- 未コミットの docs（ADR-0005 反映：`CLAUDE.md`/`AGENTS.md`/`docs/03`/`04`/`06`/`adr/0003`/`adr/0004`/`adr/0005`/`docs/reports/*`）を **docsのみ1コミット**にまとめる: `git add -A docs CLAUDE.md AGENTS.md` → commit（例: `docs: reflect ADR-0005 (drop attribute, dynamic criteria) across specs`）。src/・supabase/ は含めない。**push しない**。

### 3. 実装（属性の撤去のみ。Criterion系は作らない）

**スコープ（ADR-0005・今回の再push分）**: 属性UI・属性依存コード・属性表示・属性連動placeholder の撤去＋汎用placeholder化＋DBの属性列/型の削除。**Criterion / Reaction / Concern のテーブル・RLS・UI・seed は作らない（Slice 5）**。○/−/×・確定ロジック・候補管理・提案者・guest_tokenハードニングは不変。

- **コード（属性を全撤去）**:
  - `src/lib/constants.ts`: `EVENT_ATTRIBUTES` / `EVENT_ATTRIBUTE_LABELS` / 属性別お題placeholderマップ / 候補用属性placeholderマップを削除。**お題placeholder＝「例）週末どこ行く？ など」**、**候補タイトルplaceholder＝「例）候補の名前 など」**（単一文言）。
  - `src/components/CreateEventForm.tsx`: 属性選択フィールド（「どんなこと？」ラジオ等）を削除。お題→メモ→お名前 の順。お題placeholderは上記固定。
  - `src/lib/events.ts`: `EVENT_SELECT_COLUMNS` から `attribute` を除去。作成/読取から `attribute` を除去。
  - `src/components/EventView.tsx`: イベント詳細の属性 eyebrow を撤去。
  - `src/components/CandidateSection.tsx`: 候補タイトルの属性連動placeholderを撤去し固定文言に。
  - `src/app/e/[shareToken]/page.tsx`・`src/app/o/[ownerToken]/page.tsx`: 属性の受け渡しが残っていれば除去。
- **DB（新規migration・既存は編集しない）**: `/Users/shige/Projects/Where-to-Visit/supabase/migrations/<新しいタイムスタンプ>_drop_attribute.sql` を追加し、**`ALTER TABLE public.events DROP COLUMN attribute;`** と **`DROP TYPE public.event_attribute;`** を行う（型削除は列削除の後）。既存 `20260708000000_...` と `20260710000000_...` は編集しない。
- **矛盾・曖昧があれば実装せず質問して停止**。local JSON fallback を作らない。Supabase Auth・service role は使わない。依存はバージョン固定。

### 4. 検証（コード側で先に）

- `npm run check` / `npm run build` を pass。
- E2E（`tests/slice-1.spec.ts` / `tests/slice-2.spec.ts`）の**属性関連アサーションを撤去/更新**（属性選択が無い前提、新placeholder文言）。※E2Eの実行はDBにmigration適用後（§5）。

### 5. 本番反映（案2・適用＋pushを連続で・**人間の承認ゲートあり**）

**背景**: 本番デプロイ済みの旧Slice 1コードは `participants.guest_token` を anon select しており、Slice 2 migration の `revoke select(guest_token)` を当てると壊れる。よって**migration適用とコードpushを連続**で行い、間の故障ウィンドウを最小化する（利用者なし・許容）。

手順（**この順で・人間の操作/承認を挟む**）:
1. Codex: §2〜§4 まで完了（コード＋新規migration＋E2E更新をコミット。用途別に分ける。まだpushしない）。
2. **【人間操作】** おしげさんが Supabase SQL Editor で、未適用の **`20260710000000_slice_2_candidates.sql`** と **`<新>_drop_attribute.sql`** を順に適用する。
3. Codex: `npm run test:e2e` を実行し**グリーン**を確認（実DBで全フロー）。
4. **【承認ゲート】** Codex は結果（トップ/イベント詳細の見た目の説明、test:e2e結果、変更ファイル・migration名）を提示し、**おしげさんの push 承認を待つ**（push＝本番デプロイのため勝手にpushしない）。
5. 承認後、Codex: `git push`（Vercel が自動デプロイ→本番が新コードで復旧）。デプロイ後に本番URL（`https://kimenosuke.com`）で主要動線（お題作成・共有・候補追加・提案者・削除2段階・権限回復）を確認。

### 6. 完了報告

(1) docsコミット/コード各コミットのハッシュ、(2) 新規migration名、(3) 変更ファイル一覧、(4) `check`/`build`/`test:e2e` 結果、(5) 属性の残存ゼロ（UI・コード・DB）の確認、(6) 本番デプロイ後の動作確認、(7) 未解決の質問（あれば）。

（プロンプトここまで）
