# Handoff: きめのすけ Slice 2（新Chatスレッド用 文脈引き継ぎ）

作成: Cowork / 日付: 2026-07-09
用途: Slice 2 から新しい Chat スレッドを立てるための「これだけ読めば再開できる」引き継ぎ書。冒頭でこのファイルと下記の正本を読ませる。

---

## 0. 使い方（新スレッド冒頭に貼る想定）

> あなたは調整役AI（Chat）。決定権はおしげさんにある。きめのすけ Slice 2（候補管理）の指示書づくりから再開する。まず `docs/reports/slice-2-chat-handoff.md`（本書）と、正本 `CLAUDE.md`／`AGENTS.md`、`docs/03_requirements.md`・`docs/04_data-model.md`・`docs/adr/0004-permission-model.md`・`docs/reports/slice-2-prep-decisions.md`・`docs/reports/slice-2-instructions-draft.md` を読んで、状況を把握してから動くこと。

## 1. サービスと体制

- **きめのすけ**: 複数人で「どこで食事／宿泊／何をする／その他」を決める意思決定支援。候補に ○/−/× を付け、確定候補を自動ハイライト。**×（拒否権）を尊重**し「全員が許容できる決定」を支援。登録不要・URL共有。ドメイン `kimenosuke.com`。
- **3アクター**: おしげさん（全決定）／ Chat（調整・指示書作成、決定権なし）／ Cowork（文書化）／ Codex（実装）。使用量運用: 議論=Chat、清書=Cowork、実装=Codex（別ツール）。

## 2. 現在地（2026-07-09 JST）

- **Phase 0〜2 完了**（構想・要件定義・DoD/QA）。**ADR 0001〜0004 確定、open-questions 全決着**。
- **Slice 1 完了**（お題作成・共有/オーナー編集URL・ゲスト閲覧・権限回復・URLコピー・noindex・Supabase RLS）＋ **UI文言仕上げ反映済み**（きめのすけ口調）。Coworkレビュー承認済み。
- Git: GitHub `kcyth39/Where-to-Visit`、`main` は commit `96c7622`（origin より **ahead 2・未push**）。本番 Vercel `https://kimenosuke.com` は稼働（未pushぶんは未反映）。
- **次 = Slice 2（候補管理）**。指示書ドラフトは [slice-2-instructions-draft.md](slice-2-instructions-draft.md)。

## 3. 確定済みキー仕様（Slice 2で崩さない）

- **確定ロジック**（[ADR-0003](../adr/0003-evaluation-and-decision-logic.md)）: ○/−/×（デフォルト−・排他）。確定行為なし＝「×ゼロ・○1つ以上・○最多」を自動ハイライトのみ。×が1つでも除外＋イシュー化（「理由確認中」テキスト不使用・非ブラックアウト）。○タイ並列。可視性=○・−・× 付与者を全員公開（マトリクス）、❤️・🌀も公開。※評価は Slice 3。
- **属性**: 食事/宿泊/アクティビティ/そのた（enum値。UI表示ラベルは「たべたりのんだり」等・[ui-copy-decisions.md](ui-copy-decisions.md)）。有効❤️/🌀は [04_data-model](../04_data-model.md)。
- **権限（性善説・[ADR-0004](../adr/0004-permission-model.md)）**: URLを知る全員が編集可。**候補の編集・削除は B案＝共有URL保持者なら誰でも（参加＝表示名入力を前提にしない）**。候補追加のみ参加（Participant生成）を伴う。削除は物理削除＋カスケード＋2重確認。履歴なし。
- **スタック（[ADR-0002](../adr/0002-tech-stack.md)）**: Next.js（App Router）+ Supabase（Postgres/Realtime・**Auth不使用**）+ Vercel Pro。トークン識別（share/owner/guest_token）＋RLS（`x-*-token` ヘッダ）。
- **UI口調**: きめのすけのやさしい口調（子供っぽすぎない）。名前欄は全画面「おなまえ」。「きめたいひと」「オーナーメニュー」はUIで使わない。

## 4. 決定済み（2026-07-09 Chat）／保留

- **テストデータ方針＝確定**: 当面A案（マーカー＋SQL一括削除）、認証導入スライスでB案（別Supabaseプロジェクト）へ移行。
- **Slice 2 UI文言＝確定**: 候補を追加／追加／この候補を消しますか？／消す／キャンセル（漢字優先化・[slice-2-instructions-draft §4](slice-2-instructions-draft.md)）。
- **AC-2.3 境界＝確定（A案）**: 評価UIは作らない（Slice 3）。QAはE2EのDBアサーション。
- **文言方針転換＝漢字優先化**（2026-07-09）: Slice 1 文言を遡及改訂（[ui-copy-decisions.md](ui-copy-decisions.md) §漢字優先化 改訂）。Slice 2 着手前に先行適用。
- **本番 push**: Slice 1＋2 をまとめて後日 push（＝デプロイ）。それまで `main` はローカル先行。

## 5. 正本ファイルマップ

- `CLAUDE.md` / `AGENTS.md`（同一・AI共通コンテキスト）
- `docs/00_master-plan.md`（全体マップ）／`01`〜`06`（構想・要件・データモデル・DoD・QA）
- `docs/adr/0001〜0004` ＋ `open-questions.md`（全決着）
- `docs/reports/`: `slice-1-completion-report`（+UI仕上げ付記）／`slice-1-ui-copy-review`／`ui-copy-decisions`（承認済UI文言）／`audit-postcss-…`（保留）／`slice-2-prep-decisions`（B案・RLS・引き継ぎ）／`slice-2-instructions-draft`（本タスクの指示書ドラフト）／`slice-1-ui-codex-handoff`
- コード: `src/`（Next.js）／`supabase/migrations/`（既存 slice1 migration・**編集禁止**）／`tests/slice-1.spec.ts`

## 6. Slice 2 の進め方

1. 新Chatで [slice-2-instructions-draft.md](slice-2-instructions-draft.md) をレビューし、§OPEN（テストデータA/B・新規UI文言・AC-2.3境界）をおしげさんが決定。
2. Cowork が決定を指示書に反映して確定版に。
3. Codex に確定指示書を渡して実装 → 受け入れ（QA S2＋S1回帰）→ 完了報告 → Cowork レビュー・保管。
4. Slice 1＋2 をまとめて push（本番反映）。
