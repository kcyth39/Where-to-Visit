# セキュリティ監査メモ: postcss moderate 警告（保留判断）

- **日付:** 2026-07-09
- **判断:** 今回は**対応せず保留**（force downgrade は実施しない）
- **決定者:** おしげさん
- **調査:** Codex（依存ファイルは未変更。`npm audit fix` / `npm install` / `npm update` / commit / push いずれも未実行）
- **関連:** [Slice 1完了報告](slice-1-completion-report.md) §8 / [Slice 2準備メモ](slice-2-prep-decisions.md) ①

## 調査時の環境

- 作業場所: `/Users/shige/Projects/Where-to-Visit`
- Node `v24.14.0` / npm `11.9.0`
- `npm ls next postcss`: `next@16.2.10` └── `postcss@8.4.31`
- 最新log: `3e89fcb`（HEAD -> main, origin/main）
- ※調査時の作業ツリーは clean ではなかった（`M docs/adr/0004-permission-model.md` / `?? docs/reports/` ＝ Cowork の文書更新分。audit調査では未変更）。

## 警告の正体

| 項目 | 内容 |
|---|---|
| Advisory | PostCSS has XSS via Unescaped `</style>` in its CSS Stringify Output |
| Advisory URL | `GHSA-qx2v-qp2m-jg93` |
| Severity | moderate（CVSS 6.1） |
| 影響package | `postcss@8.4.31`（`next@16.2.10` 経由で検出） |
| 依存経路 | `where-to-visit` └ `next@16.2.10` └ `postcss@8.4.31` |
| vulnerable range | `postcss < 8.5.10` / `next 9.3.4-canary.0 – 16.3.0-canary.5` |

- 現在の `next@16.2.10` は npm registry 上の latest **stable**。内部依存として `postcss@8.4.31` を固定。
- `postcss@8.5.10` は存在（`postcss@latest` は `8.5.16`）。`next@canary`（`16.3.0-canary.81`）は `postcss@8.5.10` に更新済み。

## `npm audit fix` の挙動

- `npm audit` の提示は `npm audit fix --force` のみ。非force では解決不可。
- `npm audit fix --force` は `next@9.3.3` を入れようとする → App Router / React 19 / 現行構成に対して破壊的。**実行禁止**。

## 選択肢

| 案 | 内容 | 評価 |
|---|---|---|
| A. 安全に即対応 | stable Next の patch/minor で解消 | **不可**（`next@latest` が現状の `16.2.10` のため解消見込みなし） |
| B. 条件付き対応 | `package.json` の npm `overrides` で `postcss` を `8.5.10`/`8.5.16` に固定 | 可能だが stable Next の内部固定を上書きするため要検証（`npm install`→`check`/`build`/`test:e2e`/Vercel確認が必要） |
| C. 保留 | 既知残課題として記録し、Next stable が `postcss >= 8.5.10` を取り込むまで監視 | **推奨** |

## 決定

**C（保留）を採用。**

- `npm audit fix --force`（`next@9.3.3` への破壊的 downgrade）は行わない。
- Next canary への更新も production cleanup としては避け、**stable release 待ち**とする。
- 本警告は moderate の**既知残課題**として記録し、監視する。

## 監視・再評価トリガー

- Next.js stable が `postcss >= 8.5.10` を取り込んだら、通常のバージョン更新で解消 → その時点で対応。
- audit をゼロにする必要が生じた場合のみ、**人間承認のうえ** B案（`overrides` で `postcss@8.5.10`）を検証する（`npm install` 後に `check`/`build`/`test:e2e`/Vercel確認）。
