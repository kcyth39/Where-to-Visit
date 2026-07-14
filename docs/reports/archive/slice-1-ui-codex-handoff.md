# Codex 引き渡し: Slice 1 UI文言の反映 ＋ 未コミットdocsの整理

作成: Cowork / 日付: 2026-07-09
用途: 下の「Codexプロンプト」をそのまま Codex に貼る。状況説明＋対応指示込み。

---

## Codexプロンプト（ここから貼り付け）

あなたは実装AI（Codex）。判断はせず、指示書と正本ドキュメントに従って実装する。決定権はおしげさんにある。

### 0. 前提・状況

- プロジェクト: きめのすけ（`/Users/shige/Projects/Where-to-Visit`、branch `main`、remote `origin`）。
- 直近: Slice 1（お題作成・共有/オーナー編集URL・ゲスト閲覧・権限回復・noindex・Supabase RLS）は実装・本番稼働済み（Vercel `https://kimenosuke.com`、HEAD `3e89fcb`）。
- 今回のタスクは **Slice 1 の仕上げ = 承認済みUI文言の反映のみ**。Slice 2（候補・評価等）には着手しない。
- 現在、作業ツリーに **Cowork が作成/更新した docs の未コミット変更**がある（コード変更は無い）。これを先に1コミットしてから、UI実装に入る。

### 1. 着手前チェック（必須・CLAUDE.md/AGENTS.md準拠）

1. `CLAUDE.md` と `AGENTS.md`（同一内容）を読む。次に `docs/reports/ui-copy-decisions.md`（**承認済み・実装の正本**）を読む。
2. `git status` で状態確認。作業フォルダが上記と異なる、またはGit未初期化なら、実装せず停止して報告。
3. もし `.git/index.lock` が残っていて git 操作が失敗する場合、他に git プロセスが動いていないことを確認してから `rm -f .git/index.lock`。

### 2. 未コミット docs を先にコミット（docsのみ・1コミット）

- 対象は docs のみ（`docs/01_lean-canvas.md` `docs/02_competitive.md` `docs/03_requirements.md` `docs/04_data-model.md` `docs/05_dod.md` `docs/06_qa-flow.md` `docs/adr/0001-go-decision.md` `docs/adr/0003-evaluation-and-decision-logic.md` `docs/adr/0004-permission-model.md` `docs/adr/open-questions.md` と新規 `docs/reports/`）。
- `git add docs/` → コミット。メッセージ例:
  `docs: finalize Phase 0-2 specs, slice-1 review & approved UI copy, JST date fixes`
- ※ `archive/` は `.gitignore` 済み。コードやsrcは触らない。

### 3. UI文言の反映（`docs/reports/ui-copy-decisions.md` の §Codex実装タスク が正本）

**表示層のみ**。DBの属性 enum値（`食事/宿泊/アクティビティ/そのた`）・データモデル・**既存migrationは変更しない**。要約:

1. `src/lib/constants.ts`: 属性の順序＝アクティビティ→食事→宿泊→そのた。表示ラベル＝みんなでやること／たべたりのんだり／とまるところ／ほかのこと（**value（enum）は不変**）。属性別「お題」placeholderのマップを追加（各文言は正本参照）。`SUPABASE_MISSING_MESSAGE` の `.env`→`.env.local`。
2. `src/components/CreateEventForm.tsx`: フィールド順「どんなこと？（属性）→ お題 → メモ → おなまえ」。属性選択に応じ「お題」placeholderを動的切替（client state）。ラベル/ボタン確定文言（お題・どんなこと？・おなまえ・ボタン「きめよう！」／送信中「つくってます」）。
3. `src/app/page.tsx`: eyebrow「どうしようか...」／見出し「みんなにきいてみよう！」／説明（A案の確定文言）。
4. `src/components/EventView.tsx`: 「オーナーメニュー」独立パネル廃止 → ゲストと同一レイアウト＋控えめ所有表示「あなたは お題とメモをなおせます」＋小さな「なおす」→保存「ほぞん」。URLラベルを「みんなにおくるリンク」「あなた専用リンク」、通知を確定版（作成直後「あなた専用リンクだよ。なくさないように保存してね。」／保存後「ほぞんしました！」）。入力ラベル「お題」。※「きめたいひと」という語はUIで使わない。
5. `src/components/CopyButton.tsx`: 成功時にチェックマーク（✓）へ変化（約1.8秒で戻る）。失敗時の文言は追加しない。
6. `src/app/not-found.tsx` ＋ `src/components/SetupMessage.tsx`（呼び出し側含む）: 見出しを状況別に出し分け（404＝「ページが みつかりません」／イベント不明＝「お題が みつかりません」／Supabase設定エラー＝「設定を確認してください」据え置き）。`SetupMessage` に見出しを渡せるよう調整。

### 4. 制約（厳守）

- 仕様を勝手に変えない。曖昧・矛盾があれば実装せず質問リストを出して停止。
- 今回スコープ外（候補・評価・コメント・確定ロジック・❤️・🌀・広告・マイイベント一覧）に触れない。
- 依存追加・バージョン変更をしない（latest禁止）。local JSON fallbackを作らない。Supabase Auth不使用を維持。
- トークン＋RLSのアクセス設計を崩さない。

### 5. テストと完了

- 文言変更に伴い、E2E（`tests/slice-1.spec.ts`）内の旧文字列アサーション（例: ボタン「作成」、「設定を確認してください」等）を新文言に更新。
- `npm run check` / `npm run build` / `npm run test:e2e` を実行しグリーンにする。
- UI変更は docs コミットとは**別コミット**に。メッセージ例: `feat(ui): apply approved slice-1 copy (きめのすけ tone)`。
- **push はしない**（`main` への push は本番 `kimenosuke.com` へ自動デプロイされるため）。コミットまで済んだら、変更ファイル一覧・テスト結果・差分要約を報告し、pushの可否はおしげさんの確認を待つ。

### 6. 報告

完了時: (1) docsコミットのハッシュ、(2) UIコミットのハッシュ、(3) 変更ファイル一覧、(4) `check`/`build`/`test:e2e` の結果、(5) 差分要約、(6) 未解決の質問（あれば）。

（プロンプトここまで）
