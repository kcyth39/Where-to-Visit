# Slice 2 準備メモ（着手前の確定事項）

> **HISTORICAL / PARTIALLY SUPERSEDED（2026-07-11・ADR-0006）:** Slice 2着手時の決定記録。`guest_token`、候補追加時のお名前、Participant暗黙生成・提案者自動設定に関する判断は[ADR-0006](../adr/0006-collaborative-response-row-model.md)が優先する。

作成: Cowork / 日付: 2026-07-09 / 決定者: おしげさん
関連: [Slice 1完了報告](slice-1-completion-report.md) / [ADR-0004](../adr/0004-permission-model.md) / [03_requirements](../03_requirements.md)（スライス2: 候補管理）

Slice 1 完了報告の残課題・確認事項に対する決定を記録する。Slice 2 の指示書（Chat作成）と実装（Codex）はこれを前提とする。

## 着手前タスク（Slice 2 実装より前に完了させる）

| # | 項目 | 決定 |
|---|---|---|
| ① | `npm audit`（Next/PostCSS の moderate 警告） | **保留**（対応しない）。調査の結果、stable Next が `postcss<8.5.10` を内部固定しており安全な即時解消は不可。force downgrade は破壊的なため実施せず、既知残課題として監視。詳細: [audit報告](audit-postcss-GHSA-qx2v-qp2m-jg93.md) |
| ② | UI・文言の最終確認 | **完了・確定・反映済み**。承認済み [ui-copy-decisions.md](ui-copy-decisions.md) を Codex が実装（docs `bc78349` / UI `96c7622`、表示層のみ・enum不変、check/build/test:e2e pass）。Cowork検証済み |

## 候補（candidate）の権限方針 ＝ ③（B案）

- 候補の**編集・削除**は、**共有URL（share_token）を知る全員**に開放する。表示名の入力（参加）を前提にしない（B案）。
- 候補の**追加**は従来どおり、初回の能動アクション時に表示名入力＝Participant生成を伴う（AC-2.1）。
- 削除は物理削除＋カスケード＋**2重確認ダイアログ**（UI）。
- 詳細は [ADR-0004](../adr/0004-permission-model.md) に反映済み。

## Slice 2 の RLS 設計メモ（指示書作成時の前提・実装詳細は Codex）

Slice 1 のトークンヘッダ方式（`x-share-token` / `x-owner-token` / `x-guest-token` ＋ RLS）を踏襲する。**既存 migration は編集せず、新規 migration で追加**する。

- **candidates テーブル追加**: `id / event_id(FK, cascade) / title(必須) / url(任意) / created_by(FK→participants) / created_at`（[04_data-model.md](../04_data-model.md)）。
- **select**: そのイベントの `share_token`（またはオーナー編集URLの `owner_token`）を持つ人に開放。
- **insert**: 有効な `guest_token` の参加者行が必要（＝追加時に参加が発生）。→ **ゲスト用の participant insert ポリシー追加が必須**（Slice 1 は「オーナーのイベント作成時」のみだったため）。`created_by` はその参加者に一致すること。
- **update / delete**: `share_token` を知る全員（B案）。参加者行を要求しない。**delete ポリシーは新規追加**（Slice 1 では未作成）。
- 方針維持: local JSON fallback を作らない / Supabase Auth を使わない / トークン＋RLS を崩さない。

## Slice 1 からの引き継ぎ（Slice 2 で扱う）

- **本番反映（push/デプロイ）**: Slice 1 の docs/UI コミット（`main` が origin より ahead 2・未push）は、**Slice 2 の成果とまとめて push**する（＝本番 `kimenosuke.com` デプロイは Slice 2 完了時にまとめて）。それまで `main` はローカル先行のまま。
- **テストデータ整理方針（2026-07-09 確定）**: **当面 A案**＝E2Eデータに識別マーカー（例: タイトル/お名前に `[E2E]` 等）を付け、後で Supabase の SQL でマーカー一致を**一括削除**（本番の削除機能は増やさない）。**移行条件**＝**ユーザー認証を導入するスライスのタイミングで B案**（テスト用の別 Supabase プロジェクト）へ移行し、E2E を本番相当DBから分離する。理由: 現行の性善説モデルでは実害が限定的だが、認証導入後は実アカウント・個人情報が絡むため隔離が必須要件に格上げされる。→ 将来の**認証スライス着手時チェックリストに「B案移行」を明記**。

## 次アクション

1. 着手前タスク①②は完了（①保留・記録／②実装・検証済み）。
2. Chat で Slice 2 指示書を作成（本メモ＋ [03_requirements](../03_requirements.md) スライス2＋ [06_qa-flow](../06_qa-flow.md) S2 を凝縮）。**テストデータ方針(A/B)の選定**と、まとめてpushの前提を指示書に含める。
3. Codex で実装 → 受け入れ（S2）→ 完了報告 → Cowork がレビュー・保管 → Slice 1+2 まとめて push（本番反映）。
