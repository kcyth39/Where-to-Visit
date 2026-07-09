# Slice 2 準備メモ（着手前の確定事項）

作成: Cowork / 日付: 2026-07-09 / 決定者: おしげさん
関連: [Slice 1完了報告](slice-1-completion-report.md) / [ADR-0004](../adr/0004-permission-model.md) / [03_requirements](../03_requirements.md)（スライス2: 候補管理）

Slice 1 完了報告の残課題・確認事項に対する決定を記録する。Slice 2 の指示書（Chat作成）と実装（Codex）はこれを前提とする。

## 着手前タスク（Slice 2 実装より前に完了させる）

| # | 項目 | 決定 |
|---|---|---|
| ① | `npm audit`（Next/PostCSS の moderate 警告） | **保留**（対応しない）。調査の結果、stable Next が `postcss<8.5.10` を内部固定しており安全な即時解消は不可。force downgrade は破壊的なため実施せず、既知残課題として監視。詳細: [audit報告](audit-postcss-GHSA-qx2v-qp2m-jg93.md) |
| ② | UI・文言の最終確認 | **完了・確定**。全画面の確定文言と実装タスクを [ui-copy-decisions.md](ui-copy-decisions.md) に集約（点検経緯は [slice-1-ui-copy-review.md](slice-1-ui-copy-review.md)）。表示層のみ・enum不変。Slice 2 着手前に Codex が反映 |

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

## 次アクション

1. ①②（audit・UI文言）を着手前に片付ける。
2. Chat で Slice 2 指示書を作成（本メモ＋ [03_requirements](../03_requirements.md) スライス2＋ [06_qa-flow](../06_qa-flow.md) S2 を凝縮）。
3. Codex で実装 → 受け入れ（S2）→ 完了報告 → Cowork がレビュー・保管。
