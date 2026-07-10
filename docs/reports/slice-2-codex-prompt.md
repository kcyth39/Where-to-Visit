# Codex 実装プロンプト: Slice 2（候補管理）＋ Slice 1 文言改訂

作成: Cowork / 日付: 2026-07-09 / 用途: 下の「Codexプロンプト」をそのまま Codex に貼る。
特徴: **実装前にワイヤーフレーム＋全体テイストの画像を生成 → おしげさん承認 → 実装**。画像生成できなければ**そこで停止**。QAは厳格実行。

> **⛔ DEPRECATED（廃止・2026-07-10）— このプロンプトは使わない。** 理由: [ADR-0005](../adr/0005-drop-attribute-dynamic-criteria.md) で属性を撤廃、かつ Slice 2 は既にローカル実装済み（属性あり・未push）。**下部の指示（属性ありのfrom-scratch建付け・既存migration不変 等）は実行しないこと。** 次は別途「**属性の最小撤去＋（案2で）フルmigration適用＋Slice1+2まとめてpush**」の新プロンプトを作成し、それを唯一の実装指示とする。以下は履歴として残すのみ。

---

## Codexプロンプト（ここから貼り付け）

あなたは実装AI（Codex）。判断はせず、指示書と正本ドキュメントに従う。決定権はおしげさんにある。作業リポジトリは `/Users/shige/Projects/Where-to-Visit`（branch `main`、remote `origin`）。

### 0. 参照する正本（着手前に必ず読む・パス明示）

- `/Users/shige/Projects/Where-to-Visit/CLAUDE.md`
- `/Users/shige/Projects/Where-to-Visit/AGENTS.md`（CLAUDE.md と同一内容）
- `/Users/shige/Projects/Where-to-Visit/docs/reports/slice-2-instructions-draft.md`（**新4ファイル基準の実装土台**。旧版は破棄済み）
- `/Users/shige/Projects/Where-to-Visit/docs/reports/slice-2-requirements-and-dod.md`（**Slice 2 要件・DoD・UI文言の正本 v3**）
- `/Users/shige/Projects/Where-to-Visit/docs/04_data-model.md`
- `/Users/shige/Projects/Where-to-Visit/docs/03_requirements.md`（§2 スライス2 ＝ AC-2.1〜2.6、AC-1.4）
- `/Users/shige/Projects/Where-to-Visit/docs/adr/0004-permission-model.md`
- `/Users/shige/Projects/Where-to-Visit/docs/reports/ui-copy-decisions.md`（漢字優先化・確定文言）
- `/Users/shige/Projects/Where-to-Visit/docs/reports/slice-2-decisions-2026-07-09.md`（Chat決定・OPEN確定＋漢字優先化）
- `/Users/shige/Projects/Where-to-Visit/docs/reports/slice-2-chat-review-2026-07-09.md`（Chatレビュー・技術欠落修正＋削除2回目文言）
- `/Users/shige/Projects/Where-to-Visit/docs/reports/slice-2-prep-decisions.md`（テストデータ方針）
- `/Users/shige/Projects/Where-to-Visit/docs/05_dod.md`・`/Users/shige/Projects/Where-to-Visit/docs/06_qa-flow.md`

### 1. 着手前チェック（必須）

1. 上記の正本を読む。
2. `git status` で状態確認。作業フォルダが上記と異なる／Git未初期化なら、実装せず停止して報告。`.git/index.lock` が残り git 操作が失敗する場合は、他に git プロセスが無いことを確認して `rm -f .git/index.lock`。
3. **未コミットの docs を先にコミットする（画像生成・コード実装より前）**: 現在 `docs/` 配下に Slice 2 仕様確定の未コミット変更（変更7＋新規6ファイル・**すべて docs。src/・supabase/ の変更は無い**）がある。これを **docs のみ1コミット**にまとめる: `git add docs/` → commit（例: `docs: finalize slice-2 spec, review records and codex prompt`）。以降のワイヤー生成・コード実装は clean な状態から始める。`src/`・`supabase/` 等コードはこのコミットに含めない。
4. `main` は origin より ahead（Slice 1 の未push分＋この docs コミット）。**push はしない**。

### 2. 【ゲート】ワイヤーフレーム＋全体テイストの画像生成 → 承認待ち（コード実装より前）

**コードを書く前に**、実装後に想定する各ページのワイヤーフレーム／全体テイストを**画像として生成**し、提示してレビューを求める。対象ページ・状態（モバイル375px と デスクトップの両方のテイストが分かるように）:

- トップ（`/`・お題作成）— 漢字優先化後の文言
- イベント詳細（`/e/{shareToken}`・`/o/{ownerToken}`）中核: 候補リスト（タイトル/URL・**提案者表示（未設定は「ー」）**）／候補追加フォーム（タイトル・URL・お名前は任意）／オーナーの控えめな編集表示（「オーナーメニュー」パネルは無し）／**評価UIは無い**
- 候補の編集（タイトル/URL/提案者プルダウン）と「**変更します、よろしいですか？**」確認
- 候補削除の**2段階ダイアログ**（1回目「この候補を消しますか？」／2回目「本当によろしいですか？」・**2回目はより強い警告色**）
- 状態表示（404「ページが みつかりません」／イベント不明「お題が みつかりません」）

**停止条件（厳守）**: 画像生成が**できなかった場合は、そこで作業を停止**し、その旨を報告する。**エラーを無視して進めない／画像なしで実装に進まない／画像を作らず確認を求めるだけで先に進む、のいずれも禁止**。

**承認ゲート**: 生成した画像を提示し、**おしげさんの承認を得るまでコード実装に進まない**。承認後に §3 へ。

### 3. 実装（承認後）— 表示層＋新規migration。既存migrationは編集しない

**先行（Slice 1 への改訂・同一バッチ）**:
- `/Users/shige/Projects/Where-to-Visit/docs/reports/ui-copy-decisions.md` §「漢字優先化 改訂」を適用。対象:
  - `src/lib/constants.ts`（漢字化・`.env.local`表記。※属性ラベル・属性別お題placeholderは撤去＝ADR-0005）
  - `src/components/CreateEventForm.tsx`（お名前・作ってます・選んでね 等）
  - `src/app/page.tsx`（みんなに聞いてみよう！／説明文の漢字版）
  - `src/components/EventView.tsx`（直せます／直す／保存／みんなに送るリンク／保存しました！／無くさないように）
  - `src/app/e/[shareToken]/page.tsx`・`src/app/o/[ownerToken]/page.tsx`（notice・イベント不明本文）
  - `src/app/not-found.tsx`（本文の漢字版）
- **EventView 変更確認**: `src/components/EventView.tsx` のイベント名・メモ編集の確定時に「変更します、よろしいですか？」確認を追加。

**本体（Slice 2 候補管理）**:
- **新規 migration**: `/Users/shige/Projects/Where-to-Visit/supabase/migrations/<新しいタイムスタンプ>_slice_2_candidates.sql`（既存 `20260708000000_slice_1_events_participants.sql` は**編集しない**）。
  - `candidates`（`id / event_id FK on delete cascade / title NULL可 / url NULL可 / created_by FK→participants NULL可 ON DELETE SET NULL / created_at`、`CHECK(title IS NOT NULL OR url IS NOT NULL)`）。
  - `participants` に **SELECT ポリシー追加**（`share_token`/`owner_token` 保持者に開放）＋**ゲスト参加 insert ポリシー追加**。
  - `candidates` の select/insert/update/delete ポリシー（B案）。**提案者付け替えは `created_by` が NULL または同一 `event_id` の Participant のみ**を RLS/トリガーで保証。
- **アプリ**: `src/app/actions.ts`（候補の追加/編集/削除/提案者変更のサーバーアクション。**候補追加時にお名前入力があれば同一 `guest_token` の `display_name` を upsert**）、候補まわりのコンポーネント（例: `src/components/CandidateList.tsx` / `CandidateForm.tsx` / `ProposerSelect.tsx` / `DeleteConfirmDialog.tsx` 等・命名は任せる）、`src/app/e/[shareToken]/page.tsx`・`src/app/o/[ownerToken]/page.tsx` に候補表示を組み込む。候補タイトルplaceholderは**汎用**（属性別マップは作らない・ADR-0005）。
- 仕様は §0 の正本（特に slice-2-requirements-and-dod.md v3）に厳密に従う。曖昧・矛盾があれば実装せず質問して停止。

### 4. QA（厳格に実行）

`/Users/shige/Projects/Where-to-Visit/docs/06_qa-flow.md` と `docs/05_dod.md`・slice-2要件&DoD §B に従い、必ず実施:

- 新規 E2E `/Users/shige/Projects/Where-to-Visit/tests/slice-2.spec.ts` を追加し、次を網羅:
  - 候補追加（**タイトルのみ／URLのみ／両方**）、両方空は弾く
  - お名前 空でも追加できる／入れれば提案者に反映
  - 提案者の**自動設定**と**プルダウン編集**（既存参加者＋「ー」）＋「変更します、よろしいですか？」
  - **お名前の再追加上書き**: 同じブラウザがお名前を入れて再度候補追加すると自分の `display_name` が更新され、**自分の既存候補の提案者名も変わる**（専用の名前編集UIは無い）
  - タイトル/URL 編集の変更確認
  - 削除の**2段階確認**（1回目/2回目の文言・配色差）→ 物理削除＋カスケード
  - **QA S2**: ゲスト候補追加 → DBで **candidates/participants 行＋提案者(created_by) が作られる** ＋ 画面に **評価操作UI（○/−/×）が無い** ことを確認。**`votes` テーブルは Slice 3 のため「vote行なし＝−」は照会しない**（このDBアサーションは Slice 3 のQAへ持ち越し・Slice 2 では実施しない）
  - テストデータに識別マーカー（例: タイトル/お名前に `[E2E]`）を付ける
- 先行分の E2E `tests/slice-1.spec.ts` の文言アサーションを漢字改訂に合わせて更新。
- **回帰**: S1（作成・共有・ゲスト閲覧・オーナー権限回復・URLコピー）を再実行しグリーン。
- モバイル幅 **375px** とデスクトップの両方で表示崩れが無いこと（E2Eの viewport 確認を含む）。
- `npm run check` / `npm run build` / `npm run test:e2e` を実行し、**すべて pass** にする。

### 5. 完了報告（push はしない）

コミットは用途別に分ける（例: 先行文言改訂／Slice 2 本体）。**push しない**（Slice 1＋2 をまとめて後日デプロイ）。報告に含める: (1) 生成・承認されたワイヤー画像の所在、(2) 各コミットのハッシュ、(3) 変更ファイル一覧＋新規 migration 名、(4) `check`/`build`/`test:e2e` 結果、(5) QA各シナリオの結果、(6) 差分要約、(7) 未解決の質問（あれば）。

（プロンプトここまで）
