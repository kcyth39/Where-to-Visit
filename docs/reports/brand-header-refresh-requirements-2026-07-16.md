# ブランドヘッダー刷新（B-3） 要件定義書

- 作成日: 2026-07-16
- 最終改訂: 2026-07-16（実装・local自動検証結果を反映）
- ステータス: **実装済み・local自動検証済み（手動resize・Production確認待ち）**
- 対象: フェーズB-3（ブランドヘッダー刷新）
- 決定者: おしげさん
- 実装状態: **実装済み**（共通component・metadata・responsive CSS・専用E2Eを反映）
- 関連: [DoD](brand-header-refresh-dod-2026-07-16.md) / [QA](brand-header-refresh-qa-2026-07-16.md) / [03要件](../03_requirements.md) §6 / [ui-copy-decisions](ui-copy-decisions.md) / [DESIGN.md](../../DESIGN.md)

> 本書は、全画面共通のブランドヘッダーを「タグライン（左）・ブランド名（中央）・ナビゲーション（右）」の3領域構造へ刷新するB-3の詳細要件である。2026-07-16にコード実装・`DESIGN.md`同期・local自動検証を行った。データモデル・公開API・Server Action・DB・migration・状態管理は変更しない。画像ロゴ・外部font・ブランドストーリー文・新依存は追加しない。200% resizeの手動確認とProduction確認は後続ゲートとする。

---

## 1. 目的

トップ画面とEvent画面で別々に描画されている重複トップバーを、全画面共通の3領域ブランドヘッダーへ統一し、ブランド表現を明確にする。具体的には、上段左のタグライン `Clarity Before Choice`（System serif）、上段右のview mode別ナビゲーション、下段中央のブランド名 `きめのすけ`（ゴシック・ホームリンク）を、トップページとEventの全view modeで同一のDOM契約で表示する。

---

## 2. 用語

| 用語 | 定義 |
|---|---|
| ブランドヘッダー | 全対象画面上部の共通ヘッダー。上段左=タグライン、上段右=ナビゲーション、下段中央=ブランド名の3領域 |
| タグライン | `Clarity Before Choice`。非リンク・非focus・System serif表示 |
| ブランド名 | `きめのすけ`。ゴシック維持・`/`（トップ）へのリンク・唯一のキーボードfocus可能なホーム導線 |
| ナビゲーション（右） | view modeにより文言・有無が変わる右領域の導線 |
| view mode | 画面状態。本スライス対象は「トップページ」＋Eventの `loading / guest-selection / owner-setup / dashboard / candidate-detail` |
| 真の中央 | ブランド名の水平中心が、左右要素の幅に影響されず `.page-shell` の水平中心と一致すること |

---

## 3. 基本原則

### 3.1 UI実装・非改変

- 本スライスはブランドヘッダーのコード実装・`DESIGN.md`確定値反映・E2E追加を含む。
- 公開API・DB・Server Action・migration・状態管理・集約ロジックを変更しない。
- 画像ロゴ・外部font・ブランドストーリー文・新しい依存を追加しない。

### 3.2 全対象画面で共通のDOM契約

- 共通ヘッダーを内部componentへ切り出し、トップページとEvent画面で**同じDOM契約**（同じ要素構成・DOM順）を使う。
- DOM順は「タグライン → ブランドリンク → 右レイアウトスロット」で固定する。右スロットは全対象画面で常設し、その内部だけをview modeに応じて「ナビゲーションlink 1件」または「interactive elementなし」とする。

---

## 4. 機能要件

### 4.1 3領域構造と確定文言

| ID | 受け入れ条件 |
|---|---|
| BH-1.1 左：タグライン | **Given** ブランドヘッダー **When** 表示 **Then** 左に `Clarity Before Choice` を**非リンク要素**で表示する。リンク・button・キーボードfocus対象にしない。改行・省略（ellipsis）を発生させない |
| BH-1.2 左：フォント | **Given** タグライン **When** 表示 **Then** System serifスタック `Georgia, "Times New Roman", serif` のitalicを用いる。外部fontは読み込まず、利用できない環境ではgeneric family `serif`へfallbackする |
| BH-1.3 中央：ブランド名 | **Given** ブランドヘッダー **When** 表示 **Then** 中央に `きめのすけ` をゴシック（既存 `system-ui` 系）で表示し、`/`（トップ）へのリンクにする |
| BH-1.4 中央：唯一のホーム導線 | **Given** ヘッダー **When** キーボード操作 **Then** `きめのすけ` だけがキーボードfocus可能なホーム導線であり、Enterで `/` へ遷移する |
| BH-1.5 右：ナビゲーション | **Given** ブランドヘッダー **When** view modeが決まる **Then** 右スロット内部を次のとおり表示する。candidate-detail=`一覧に戻る`（`/e/[shareToken]` への実リンク）、loading / guest-selection / owner-setup=既存 `候補一覧`（`/e/[shareToken]` への実リンク）、dashboard / トップ=interactive elementなし |
| BH-1.6 DOM順 | **Given** ヘッダー **When** DOMを構成 **Then** 「タグライン → ブランドリンク → 右レイアウトスロット」の順で配置する。右ナビがない画面でも右スロット自体は削除しない |
| BH-1.7 共通component | **Given** トップページとEvent画面 **When** ヘッダーを描画 **Then** 同一の内部componentで同じDOM契約を用いる |
| BH-1.8 `aria-current` | **Given** トップページ **When** ブランドリンクを表示 **Then** `きめのすけ` にだけ `aria-current="page"` を付ける。Event各modeではブランドリンク・右ナビのどちらにも `aria-current` を付けない |

- 右ナビの文言・有無以外（左・中央）は全view modeで不変とする。

### 4.2 真の中央（実装契約）

| ID | 受け入れ条件 |
|---|---|
| BH-2.1 3領域レイアウト | **Given** ヘッダー **When** レイアウト **Then** `grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr)` を用い、タグラインを上段左、ナビを上段右、ブランド名を下段中央へ配置する |
| BH-2.2 幅非依存の中央 | **Given** ヘッダー **When** 左右の文言幅が異なる **Then** 中央領域は左右要素の幅に影響されず、`きめのすけ` の水平中心が `.page-shell` の水平中心と1 CSS px以内で一致する（現行 `display:flex; justify-content:space-between` では成立しないため採用しない） |
| BH-2.3 右ナビなし時の中央維持 | **Given** dashboard / トップ（右ナビなし） **When** 表示 **Then** 空の右レイアウトスロットを維持し、中央のブランド名位置を維持する |
| BH-2.4 中央の検証 | **Given** 実装 **When** QA **Then** 1366×768と375×812・標準zoomでbounding boxの中心差が1 CSS px以内であること、要素の重なり・overflowがないことを検証する。320 CSS pxまたは拡大時に複数段となる場合、ブランド名は自身の段の中央へ配置する |

### 4.3 レスポンシブ（375px成立条件）

| ID | 受け入れ条件 |
|---|---|
| BH-3.1 対象条件 | **Given** `375×812`・ブラウザ標準zoom・標準文字サイズ **When** ヘッダーを表示 **Then** タグラインを上段左、ナビを上段右、ブランド名を下段中央に保ち、いずれも全文表示（文言内折返し・ellipsisなし）にする |
| BH-3.2 破綻なし | **Given** 375×812 標準条件 **When** 表示 **Then** ページ横overflow・要素の重なり・クリック領域の重複を発生させない |
| BH-3.3 固定font・狭gap | **Given** 375px **When** 実装 **Then** 固定font sizeと狭いgapを用い、viewport比例（vw等）の文字サイズは使わない |
| BH-3.4 200% resize | **Given** ブラウザのページzoomを100% / 125% / 150% / 175% / 200%へ段階的に変更 **When** レイアウトが変化 **Then** 折返し・複数段化を許容する一方、文言・link・機能の欠落、クリップ、重なり、操作不能を発生させない。CSSの`zoom` propertyで代替しない |
| BH-3.5 320 CSS px reflow | **Given** 320 CSS px相当のviewport **When** ヘッダーを表示 **Then** タグラインを上段左、ナビを上段右、ブランドを下段中央に保ち、情報・機能を失わず、2方向scroll・横overflow・要素重なりを発生させない |
| BH-3.6 デスクトップ | **Given** `1366×768` **When** 表示 **Then** 3領域が読みやすく並び、BH-2.2の中央一致を維持する |

### 4.4 metadata

| ID | 受け入れ条件 |
|---|---|
| BH-4.1 title | **Given** サイト内の任意route **When** root layoutからmetadataを出力 **Then** title を `きめのすけ | Clarity Before Choice` にする。画面ヘッダーの対象範囲とは別に、404 / error / 将来routeを含むサイト全体へ適用する明示的例外とする |
| BH-4.2 description / robots | **Given** metadata **When** 出力 **Then** 既存の description（`登録なしで使える、みんなで決めるための共有サービス`）と `noindex` / robots 設定を維持する |

### 4.5 対象ページの範囲

対象は次に限定する（「全ページ固定」ではなく「トップページと全Event view modeで共通」）。

- トップページ（`/`）
- Event: `loading`
- Event: `guest-selection`
- Event: `owner-setup`
- Event: `dashboard`
- Event: `candidate-detail`

Next.js標準404、予期しないerror画面、将来追加されるページは**ブランドヘッダー表示**の対象外とする。ただしroot layoutのmetadata titleは§4.4の明示的例外としてサイト全体へ適用する。

---

## 5. B-1 refinementとの整合

- B-1の初回承認時はdashboardへ非リンクの「一覧に戻る」＋`aria-current="page"`を置く契約だったが、実機確認で自己参照表示が残り続ける問題が確認された。
- **決定（2026-07-16・おしげさん）**: B-1の仕様refinementとして、dashboardでは戻り導線を表示しない契約へ変更した。feature branch上のB-1要件・DoD・QAと現行`EventTopbar`は、commit `ed84d9b`以降この承認済み契約へ一致している。
- B-3はこの承認済みB-1契約を新たにsupersedeせず、そのまま継承する。B-1正本には初回契約からの変更日・決定者・理由を履歴注記として同時反映する。

---

## 6. 実装方針

- desktop / mobile とも3列gridで真の中央を維持する。
- トップ画面とEvent画面の重複トップバーを、共通の内部componentへ統合する。
- 上記は本要件の受け入れ条件（§4）に従い、共通componentとresponsive CSSへ実装する。

---

## 7. 今回の実装範囲

### In Scope

- B-3 要件・DoD・QAの3点セット確定（本書ほか）。
- `ui-copy-decisions.md`・`03_requirements`・`05_dod`・`06_qa-flow`・reports READMEへ、承認済みB-3 authorityを同期する。
- B-3コード実装（`BrandHeader.tsx` / `EventApp.tsx` / `page.tsx` / `layout.tsx` / `globals.css`）。
- `DESIGN.md`への確定値反映とPlaywright回帰追加。

### Out of Scope

- 画像ロゴ・外部font・ブランドストーリー文・新依存の追加。
- 公開API・DB・Server Action・migration・状態管理の変更。
- 性能改善、Vercel設定変更。

---

## 8. 正本反映対象（B-3承認時）

- `docs/03_requirements.md` §6 画面一覧（共通ブランドヘッダーを追記）。
- `docs/05_dod.md` / `docs/06_qa-flow.md`（B-3のDoD・QA観点を反映）。
- `docs/reports/ui-copy-decisions.md`（タグライン・ブランド名・ナビ文言・metadata title）。
- `docs/reports/README.md`（statusを承認済みへ）。
- `DESIGN.md` は**B-3実装スライス**で確定値（serifスタック・3領域レイアウト・中央契約）を反映する。
- `AGENTS.md` / `CLAUDE.md` は正本ポインタ表との齟齬がない限り変更しない。
