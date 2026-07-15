# きめのすけ デザインシステム

ステータス: 承認済み（実装未着手） ／ 最終改訂: 2026-07-15

デザインの正本。色・タイポグラフィ・レイアウト・状態色・コンポーネント表現の大方針を定義する。実装（`src/app/globals.css` ほか）は本書と一致させる。

- 画面文言の正本は `docs/reports/ui-copy-decisions.md`、機能・確定ロジックの正本は `docs/` および `docs/adr/`。本書はそれらの見た目・トークン面を担い、矛盾しないようにする。
- 値・方針を変えたら本書を更新する。

---

## カラートークン

`:root` に定義する。

| トークン | 値 | 用途 |
|---|---|---|
| `--ink` | `#18201c` | 基本テキスト |
| `--muted` | `#5c6a61` | 補助テキスト |
| `--line` | `#d6ded8` | 罫線・境界 |
| `--surface` | `#ffffff` | カード等の面 |
| `--surface-soft` | `#eef6f0` | 淡い面 |
| `--accent` | `#1e7a57` | アクセント（緑） |
| `--accent-strong` | `#13583f` | 強アクセント（ブランド・リンク） |
| `--danger` | `#b3261e` | 危険・エラー |
| `--success` | `#166534` | 成功 |
| `--shadow` | `0 16px 45px rgba(24, 32, 28, 0.08)` | 影 |
| ページ背景 | `#f7faf7` | `html` 全体背景 |

緑（`--accent` 系）を基調にした、明るく落ち着いたトーン。

### 最終候補状態の状態色

`decisionState`（`clear / discussion / fallback / none`）を表す。カード左枠線＋淡い背景で示し、可視の説明ラベルは付けない。状態は支援技術向けの状態名と `⭕️ / ➖ / ❌` の実数でも判別できるようにする。

| 状態 | 前景 | 背景 | 意味 |
|---|---|---|---|
| `clear` | `--decision-clear` `#2d7a55` | `--decision-clear-soft` `#eef8f2` | 議論なしで決めやすい最有力 |
| `discussion` | `--decision-discussion` `#b64b45` | `--decision-discussion-soft` `#fff3f2` | 人気最多だが議論が必要 |
| `fallback` | `--decision-fallback` `#ad7a13` | `--decision-fallback-soft` `#fff9e8` | 消去法で残る安全な代替 |
| `none` | 色付けなし | — | 通常表示 |

同じ `decisionState` は、カードでもサマリー表でも同一の色・意味で用いる。

---

## タイポグラフィ

- 全体フォント: `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`（ゴシック／サンセリフ）。
- `letter-spacing: 0`。
- ウェイト: 見出し・ブランド・ナビリンクは `700`〜`800`、本文は標準。
- ブランドワードマーク: `--accent-strong` / `font-size 1.1rem` / `font-weight 800`。

---

## レイアウト

- ページ枠 `.page-shell`: `width: min(1120px, calc(100% - 32px))`、中央寄せ、`padding: 24px 0 56px`。
- ヘッダー `.topbar`: `display:flex` / `justify-content:space-between` / `min-height:44px` / `margin-bottom:32px`。
- サーフェス幅: `.event-surface` は `.page-shell` 幅内で max-width を持たない（`min-width: 0` のみ）。max-width `760px` を持つのは `.setup-message`。ページ外枠は `.page-shell` の最大 `1120px`。
- 角丸: 標準 `8px`、ピル／チップは `999px`。
- 対応幅の基準: モバイル `375×812` とデスクトップ `1366×768` を同格で成立させ、ページ全体の横スクロールを出さない。

---

## コンポーネント表現

- 総合評価トリプル: `⭕️`（positive）／`➖`（能動neutral・unrated除外）／`❌`（veto）を別々のチップで、件数とともに表示。
- 参考情報: `❤️`（Reaction合計）／`🌀`（Concern合計）を小さく表示。確定ロジックには反映しない。
- コピーボタン: 既定ラベル「コピー」、成功時にチェック（✓）へ約1.8秒変化。失敗文言は出さない。
- 無効状態: `:disabled` は `cursor: not-allowed` / `opacity: 0.58`。
- ヘッダー戻り導線: 候補編集では「一覧に戻る」を実リンク（`.event-nav-link`）。ダッシュボードでは非活性で、非リンク要素（`.event-nav-link.is-disabled` 相当）＋ `aria-current="page"` とし、クリック・Enter・Spaceで遷移しない（`<a disabled>` は使わない）。

---

## ダッシュボードサマリー表

ダッシュボード上部の読み取り専用一覧。1候補1行で候補名・リンク・総合評価・❤️・🌀を見渡す。

- DOM: 全幅で同一の semantic table（`table/thead/tbody/tr/th/td`）。列は「候補名 / リンク / ⭕️ ➖ ❌ / ❤️ / 🌀」。可視の表題は増やさず `caption` は sr-only。
- Desktop（1366px）: 5列の表形式で候補間を上下に比較。ページ外枠は `.page-shell`（最大1120px）を維持。
- Mobile（375px）: DOMは同一 semantic table のまま、**CSSの見せ方だけを2段化**する（div一覧へ差し替えない）。1段目=候補名を全幅・URLをその下の全幅、2段目=`⭕️ ➖ ❌`・❤️・🌀 を3領域で横並び。ページ／wrapper の横スクロールは使わない。
- 候補名: 実リンク。URL: `target="_blank"` ＋ `rel="noopener noreferrer"`。DOMテキストは保存URL全文、視覚上のみ ellipsis 省略。
- 状態色（`decisionState`）: 「最終候補状態の状態色」の custom properties を用い、`clear/discussion/fallback` は soft 背景を行全体、前景色を先頭セルの左境界（5px相当）へ適用。`none` は通常面＋`--line`。
- 読み取り専用: 評価・❤️・🌀・コメントの編集controlを持たない。

---

## アクセシビリティ

- 色だけに依存させない。状態は数値・状態名でも判別できるようにする。
- 可視の状態説明ラベルを増やさず、支援技術向けの状態名と評価実数で状態色を補完する。
- ボタン・入力・ダイアログ・ナビリンクに、役割や遷移先が分かる accessible name を付ける。

---

## 表現の原則

- 画像アセットは使わず、テキストと CSS で表現する。
