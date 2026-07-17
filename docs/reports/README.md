# docs/reports/ 索引

reportは「恒久記録」「正本から参照される詳細ドキュメント」「作業履歴（完了・SUPERSEDED）」に分かれる。
実装（Codex）は正本（`docs/`・`docs/adr/`）を優先し、作業履歴は履歴としてのみ扱う（再実行しない）。
役目を終えた作業履歴は `archive/` サブフォルダへ退避してある。

## 恒久記録（現行の参照価値あり）

- [ui-copy-decisions.md](ui-copy-decisions.md) — 画面文言の確定正本（ADR-0005 ほかから参照）
- [db-implementation-and-development-status-2026-07-13.md](db-implementation-and-development-status-2026-07-13.md) — DB実装経緯・開発ステータス（AGENTS/CLAUDE から参照）
- [supabase-cli-docker-development-reference-2026-07-12.md](supabase-cli-docker-development-reference-2026-07-12.md) — Supabase CLI/Docker 開発リファレンス（承認済み・AGENTS/CLAUDE から参照）
- [audit-postcss-GHSA-qx2v-qp2m-jg93.md](audit-postcss-GHSA-qx2v-qp2m-jg93.md) — postcss 脆弱性の監査記録
- [current-service-specification-A-2026-07-17.md](current-service-specification-A-2026-07-17.md) — PR #1〜3 baseline closeout後の現行サービス仕様
- [current-technical-specification-and-pr1-3-implementation-B-2026-07-17.md](current-technical-specification-and-pr1-3-implementation-B-2026-07-17.md) — 現行技術仕様とPR #1〜3実装・検証結果
- [fixes-and-remaining-tasks-C-2026-07-17.md](fixes-and-remaining-tasks-C-2026-07-17.md) — Track A完了後の残課題とTrack B引継ぎ
- [current-service-and-technical-reporting-procedure.md](current-service-and-technical-reporting-procedure.md) — 現行サービス・技術レポート作成手順（運用リファレンス、非正本）

## 正本から参照される詳細ドキュメント（移動不可・リンク維持）

- [collaborative-response-row-requirements-2026-07-11.md](collaborative-response-row-requirements-2026-07-11.md) — `03_requirements` から参照
- [collaborative-response-row-spec-draft-2026-07-11.md](collaborative-response-row-spec-draft-2026-07-11.md) — `04_data-model` から参照
- [collaborative-response-row-dod-2026-07-11.md](collaborative-response-row-dod-2026-07-11.md) — `05_dod` から参照
- [collaborative-response-row-qa-2026-07-11.md](collaborative-response-row-qa-2026-07-11.md) — `06_qa-flow` から参照

## 完了スライス B-1/B-2（main統合・local検証・Production browser QA済み／`03_requirements` §3.6・§6 から参照）

- [dashboard-summary-and-back-nav-requirements-2026-07-15.md](dashboard-summary-and-back-nav-requirements-2026-07-15.md) — 戻り導線改善＋サマリー表 要件定義書（承認済み）
- [dashboard-summary-and-back-nav-dod-2026-07-15.md](dashboard-summary-and-back-nav-dod-2026-07-15.md) — 同DoD（承認済み）
- [dashboard-summary-and-back-nav-qa-2026-07-15.md](dashboard-summary-and-back-nav-qa-2026-07-15.md) — 同QA実施書（承認済み）
- [development-preparation-and-documentation-2026-07-15.md](development-preparation-and-documentation-2026-07-15.md) — 準備作業の棚卸し
- [development-preparation-and-documentation-review-2026-07-15.md](development-preparation-and-documentation-review-2026-07-15.md) — 同レビュー記録（承認済み）
- [development-and-business-activity-status-2026-07-16.md](development-and-business-activity-status-2026-07-16.md) — 現在地レポート（B-1/B-2 Production browser QA完了）。現在地の参照先
- デザイン正本は repo直下 [`DESIGN.md`](../../DESIGN.md)（AGENTS/CLAUDE から参照）

## 完了スライス B-3／PR #3（main統合・正式local gate・200% resize・Production受入・cleanup済み）

- [brand-header-refresh-requirements-2026-07-16.md](brand-header-refresh-requirements-2026-07-16.md) — ブランドヘッダー刷新 要件定義書（承認済み）
- [brand-header-refresh-dod-2026-07-16.md](brand-header-refresh-dod-2026-07-16.md) — 同DoD（承認済み）
- [brand-header-refresh-qa-2026-07-16.md](brand-header-refresh-qa-2026-07-16.md) — 同QA実施書（正式受入PASS）

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

※ 次のレポートは現在Git未追跡のため本索引に含めない: `development-and-business-activity-plan-2026-07-14.md` / `documentation-maintenance-plan-2026-07-14.md` / `pc-migration-local-supabase-recovery-and-cleanup-2026-07-14.md`。追跡化する場合は分類・statusを付けて本索引へ追記する（方針変更のため明示承認が必要）。追跡化するまでは、追跡対象の文書からこれらへMarkdownリンクせずGit上のリンク切れを避ける。
※ おしげさんの自由メモ・調査は `docs/memos/`（Git非追跡・正本ではない）に置く。
