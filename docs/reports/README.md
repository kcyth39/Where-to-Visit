# docs/reports/ 索引

reportは「恒久記録」「正本から参照される詳細ドキュメント」「作業履歴（完了・SUPERSEDED）」に分かれる。
実装（Codex）は正本（`docs/`・`docs/adr/`）を優先し、作業履歴は履歴としてのみ扱う（再実行しない）。
役目を終えた作業履歴は `archive/` サブフォルダへ退避してある。

## 恒久記録（現行の参照価値あり）

- [ui-copy-decisions.md](ui-copy-decisions.md) — 画面文言の確定正本（ADR-0005 ほかから参照）
- [db-implementation-and-development-status-2026-07-13.md](db-implementation-and-development-status-2026-07-13.md) — DB実装経緯・開発ステータス（AGENTS/CLAUDE から参照）
- [supabase-cli-docker-development-reference-2026-07-12.md](supabase-cli-docker-development-reference-2026-07-12.md) — Supabase CLI/Docker 開発リファレンス（承認済み・AGENTS/CLAUDE から参照）
- [audit-postcss-GHSA-qx2v-qp2m-jg93.md](audit-postcss-GHSA-qx2v-qp2m-jg93.md) — postcss 脆弱性の監査記録

## 正本から参照される詳細ドキュメント（移動不可・リンク維持）

- [collaborative-response-row-requirements-2026-07-11.md](collaborative-response-row-requirements-2026-07-11.md) — `03_requirements` から参照
- [collaborative-response-row-spec-draft-2026-07-11.md](collaborative-response-row-spec-draft-2026-07-11.md) — `04_data-model` から参照
- [collaborative-response-row-dod-2026-07-11.md](collaborative-response-row-dod-2026-07-11.md) — `05_dod` から参照
- [collaborative-response-row-qa-2026-07-11.md](collaborative-response-row-qa-2026-07-11.md) — `06_qa-flow` から参照

## 作業履歴（archive/・完了・SUPERSEDED／履歴としてのみ保持・再実行しない）

- [archive/adr0005-codex-review-prompt.md](archive/adr0005-codex-review-prompt.md)
- [archive/adr0005-review-answers-2026-07-10.md](archive/adr0005-review-answers-2026-07-10.md)
- [archive/attribute-removal-codex-prompt.md](archive/attribute-removal-codex-prompt.md)
- [archive/handoff-2026-07-10.md](archive/handoff-2026-07-10.md)
- [archive/collaborative-response-row-review-2026-07-11.md](archive/collaborative-response-row-review-2026-07-11.md)
- [archive/slice-1-completion-report.md](archive/slice-1-completion-report.md)
- [archive/slice-1-ui-codex-handoff.md](archive/slice-1-ui-codex-handoff.md)
- [archive/slice-1-ui-copy-review.md](archive/slice-1-ui-copy-review.md)
- [archive/slice-2-chat-handoff.md](archive/slice-2-chat-handoff.md)
- [archive/slice-2-chat-review-2026-07-09.md](archive/slice-2-chat-review-2026-07-09.md)
- [archive/slice-2-codex-prompt.md](archive/slice-2-codex-prompt.md)
- [archive/slice-2-decisions-2026-07-09.md](archive/slice-2-decisions-2026-07-09.md)
- [archive/slice-2-implementation-diff.md](archive/slice-2-implementation-diff.md)
- [archive/slice-2-instructions-draft.md](archive/slice-2-instructions-draft.md)
- [archive/slice-2-prep-decisions.md](archive/slice-2-prep-decisions.md)
- [archive/slice-2-requirements-and-dod.md](archive/slice-2-requirements-and-dod.md)
- [archive/slice-5-codex-prompt.md](archive/slice-5-codex-prompt.md)
- [archive/slice-5-requirements-and-dod.md](archive/slice-5-requirements-and-dod.md)

---

※ 計画・整理レポート（`development-and-business-activity-plan-2026-07-14.md` / `documentation-maintenance-plan-2026-07-14.md`）は現在Git未追跡のため本索引に含めない。追跡化する場合は本索引へ追記する。
※ おしげさんの自由メモ・調査は `docs/memos/`（Git非追跡・正本ではない）に置く。
