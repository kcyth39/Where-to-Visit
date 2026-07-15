# ダッシュボードサマリー表・戻り導線改善 要件定義書

- 作成日: 2026-07-15
- 最終改訂: 2026-07-15（最終レビューPASS・承認。authority同期）
- ステータス: **承認済み（実装未着手）**
- 対象: フェーズB-1（戻り導線改善）＋ B-2（ダッシュボード読み取り専用サマリー表）を同一リリースで実施
- 決定者: おしげさん
- 実装状態: **未実装**
- 関連: [DoD](dashboard-summary-and-back-nav-dod-2026-07-15.md) / [QA](dashboard-summary-and-back-nav-qa-2026-07-15.md) / [03要件](../03_requirements.md) §3.6 / [ui-copy-decisions](ui-copy-decisions.md) / [DESIGN.md](../../DESIGN.md)
- 背景（起点）: 本スライスは `development-and-business-activity-plan-2026-07-14.md`（Git未追跡・非正本ドラフト）§2 #1/#2・§8 手順2/3 に挙がったUI/UX課題（候補編集からダッシュボードへ戻る導線が分かりにくい／ダッシュボードに候補を一覧できるサマリーがない）に対応する。当該planはリンクせず、起点情報は本§1で自己完結させる。

> 本書は、`dac0f11` で確定した候補一覧ダッシュボード・候補編集画面に対する **UI/UX追補** の詳細要件である。候補編集からダッシュボードへの戻り導線を分かりやすく整え（B-1）、ダッシュボード上部へ候補を1行1件で見渡せる読み取り専用サマリー表を新設する（B-2）。**本スライスはUI専用であり、データモデル・migration・新規Server Action・確定ロジックを変更しない。** 既存の集約読取モデル（`CandidateSummary`）だけを再利用する。コード・migrationは未実装であり、別途明示された実装タスクまで変更しない。矛盾・曖昧さを見つけた場合は実装せず質問して停止する。

---

## 1. 目的

きめのすけの役割は、候補に対するみんなの意見を少ない操作で見える化し、グループが決めやすい状態を作ることである。本スライスでは、`dac0f11` までに成立した候補一覧ダッシュボードと候補編集画面の往復と一覧性を、次の2点で改善する。

1. 候補編集画面からダッシュボード（候補一覧）へ戻る導線を、迷わず認識できる形に整える（B-1）。既存ヘッダーの「候補一覧」リンクを改善し、新しいナビゲーション要素は追加しない。
2. ダッシュボード上部へ、候補名・リンク・総合評価（⭕️ / ➖ / ❌）・❤️・🌀を1候補1行で一覧できる読み取り専用サマリー表を新設する（B-2）。従来のダッシュボードカードには手をつけず、上部に一覧性のためのビューを重ねる。

いずれも意見の可視化を助ける表示改善であり、確定・ロック・非表示や新しい判定は導入しない。

---

## 2. 用語

| 用語 | 定義 |
|---|---|
| ダッシュボード（候補一覧） | 共有URLの通常閲覧先。きめること・つたえておきたいことと全Candidateのカードを表示する既存画面（route: `/e/[shareToken]`） |
| 候補編集画面 | 1 Candidateの情報・判断基準・全回答者行を表示・共同編集する既存画面（route: `/e/[shareToken]/c/[candidateId]`） |
| ヘッダー（トップバー） | 全Event画面（読み込み中／ゲスト名前選択／オーナー初期セットアップ／候補編集／ダッシュボード）で `EventApp` の分岐より前に常時描画される既存の `EventTopbar`。現状はブランド名リンク（`/`）と「候補一覧」リンク（`/e/[shareToken]`）を持つ |
| 戻り導線 | 候補編集画面からダッシュボードへ戻るための、ヘッダー内のナビゲーション。本スライスで既存「候補一覧」リンクを「一覧に戻る」へ改善し、画面状態（view mode）ごとに活性/非活性を定義する |
| サマリー表 | ダッシュボード上部へ新設する、候補を1行1件で読む読み取り専用の一覧ビュー |
| 総合評価トリプル | 候補ごとの `⭕️`（positive数）/ `➖`（能動neutral数）/ `❌`（veto数）の3件数表示。`➖` はunratedを含めない |
| 最終候補状態 | 既存の `clear / discussion / fallback / none`。本スライスで判定ロジックは変更しない |

---

## 3. 基本原則

### 3.1 UI専用・既存モデル再利用

- データモデル、migration、DB制約、RLS/policy、Server Action、`event-state.ts` の読取集約ロジック（`CandidateSummary` 生成・`decisionState` 判定・件数算出）を変更しない。
- `DashboardSummaryTable` のpropsは `candidates: CandidateSummary[]` と `shareToken: string` の2つとする。**表示データ**は `CandidateSummary`（`positiveCount` / `neutralCount` / `vetoCount` / `heartCount` / `concernCount` / `decisionState` / `relativeCreatedAt` / `proposerName` / `candidate.title` / `candidate.url` / `candidate.id`）以外から再集計せず、新しい集計列・時刻列・状態を追加しない。`shareToken` は候補編集href（`/e/[shareToken]/c/[candidateId]`）の生成にのみ使う。URL列（外部URL）は `candidate.url` から表示し、`shareToken` は使わない。`shareToken` を表示データの再集計に使わない（現行 `Dashboard` が `state.event.share_token` を候補リンクへ渡すのと同じパターン）。
- 最終候補状態の判定は既存境界の結果を受け取るだけとし、component内で再実装しない。

### 3.2 既存導線を壊さず改善する（B-1）

- 戻り導線は新しいナビゲーション要素を追加せず、既存ヘッダーの「候補一覧」リンクを改善する。
- 遷移先は既存挙動と同一の `/e/[shareToken]`（ダッシュボード）に固定する。候補削除後の `router.push('/e/[shareToken]')` と同じ遷移先である。
- ブランド名リンク（`/` へのトップ遷移）と戻り導線を混同させない。両者の役割を文言・配置で区別する。

### 3.3 一覧性のための読み取り専用に徹する（B-2）

- サマリー表は閲覧専用とし、○ / − / ×・❤️・🌀・コメントの編集controlを持たない。個人名義操作を発生させない。
- 従来のダッシュボードカード（`DashboardCandidateControls` を含む対話操作）には手をつけない。サマリー表はカード群の**上部**へ重ねて新設する。
- サマリー表とカード群は同じ候補順（既存の `state.candidates` の並び順）で表示し、二重の並び基準を持ち込まない。

### 3.4 モバイル・デスクトップ同格

- 375×812 と 1366×768 を基準に、両幅で成立させる。デスクトップ（1366px）の表レイアウトが主な事前検討点である。
- サマリー表がページ全体の横スクロールを発生させないことを、両スライス共通の必須条件とする。

---

## 4. 機能要件

### 4.1 戻り導線改善（B-1）

対象は既存 `EventTopbar` 内のダッシュボードへ戻るリンクである。新規ナビゲーション要素は追加しない。`EventTopbar` は全Event画面で共用されるため、`EventApp` から明示的な view mode を渡し、状態ごとの表示・動作を一意に定義する。

#### トップバー view mode 状態表

| view mode | 戻り導線の表示 | 動作 |
|---|---|---|
| `candidate-detail`（候補編集） | 「一覧に戻る」active link（実体 `<a href="/e/[shareToken]">`） | クリック／Enterで `/e/[shareToken]` へ遷移 |
| `dashboard`（ダッシュボード） | 「一覧に戻る」**非リンク要素**（`<a>`ではない） | `aria-current="page"`、クリック・Enter・Spaceで遷移しない |
| `guest-selection`（ゲスト名前選択） | 現行挙動を維持（文言・動作を変更しない） | 自己リンクを意図的に残す（本スライスでは触らない） |
| `owner-setup`（オーナー初期セットアップ） | 現行挙動を維持（文言・動作を変更しない） | セットアップ離脱リンクを意図的に残す |
| `loading`（読み込み中） | 現行挙動を維持 | 誤操作を起こさない |

本スライスは `candidate-detail` と `dashboard` のみ改善対象とし、他状態は現行の文言・動作を変更しない（意図的に維持することを明記）。

| ID | 受け入れ条件 |
|---|---|
| BN-1.1 常時可視 | **Given** 候補編集画面（`/e/[shareToken]/c/[candidateId]`） **When** 375px / 1366px で表示 **Then** 「一覧に戻る」がトップバー内に収まって常時可視で、スクロールなしに到達できる |
| BN-1.2 遷移先 | **Given** 候補編集の「一覧に戻る」active link **When** クリック／Enter **Then** 同一Eventの `/e/[shareToken]`（ダッシュボード）へ遷移する。トップ（`/`）や別Eventへ遷移しない |
| BN-1.3 文言 | **Given** ヘッダーの戻り導線 **When** 表示 **Then** 文言を「**一覧に戻る**」とする（決定・2026-07-15）。`ui-copy-decisions.md` を正本とし、Visual QAで確認する |
| BN-1.4 役割分離 | **Given** ヘッダー **When** ブランド名リンクと戻り導線が並ぶ **Then** ブランド名は `/`（トップ）、戻り導線はダッシュボードという役割の違いが、文言・配置・見え方で区別できる |
| BN-1.5 ダッシュボード上の非活性（DOM契約） | **Given** ダッシュボード（view mode `dashboard`）を表示中 **When** 戻り導線が自己参照になる **Then** リンクを描画せず、同じ位置に文言「一覧に戻る」の**非リンク要素**（`event-nav-link is-disabled` 相当）を表示する。`aria-current="page"` で現在地を伝え、クリック・Enter・Spaceで遷移しない。`<a>` ではないため `<a disabled>` は使用しない（`disabled` 属性は `<a>` の標準無効化にならない） |
| BN-1.6 view mode の明示 | **Given** `EventTopbar` **When** 各Event画面から呼ばれる **Then** 上記状態表の view mode を明示的に受け取り、`candidate-detail` / `dashboard` 以外では現行挙動を変更しない |
| BN-1.7 新規要素の不追加 | **Given** 本スライス **When** 戻り導線を実装 **Then** ヘッダー以外に新しい戻るボタン・パンくず等のナビ要素を追加しない |
| BN-1.8 アクセシブル名 | **Given** 支援技術 **When** 戻り導線を読む **Then** active時は遷移先が分かるaccessible name、非活性時は `aria-current="page"` で現在地が分かる |

- 非活性時の見え方の細部（色・カーソル）は実装時のVisual QAで詰める design detail とするが、上記のDOM契約（非リンク要素・`aria-current="page"`・遷移なし）は仕様として固定する。

### 4.2 読み取り専用サマリー表（B-2）

| ID | 受け入れ条件 |
|---|---|
| DS-2.1 挿入位置 | **Given** ダッシュボード（`Dashboard` component） **When** 表示 **Then** `EventHeading` の直後、既存 `section.dashboard-section`（`dashboard-identity-bar` とカードグリッドを含む）の**前**へ、独立した `DashboardSummaryTable` section を置く。既存 `dashboard-identity-bar`・`candidate-dashboard-grid`・`CandidateAddForm`・`ShareLinks` の構造と順序は変えない |
| DS-2.2 1行1候補 | **Given** サマリー表 **When** 表示 **Then** 1候補を1行として、全Candidateを既存 `state.candidates` の並び順（`created_at ASC, id ASC`）で表示する |
| DS-2.3 semantic table | **Given** サマリー表 **When** desktopで表示 **Then** semantic な `<table>` を用い、列見出しを「候補名 / リンク / ⭕️ ➖ ❌ / ❤️ / 🌀」とする。可視コピーを増やさないため `<caption className="sr-only">候補のまとめ</caption>` を付ける（CSS gridの見せかけ表にしない） |
| DS-2.4 候補名列 | **Given** サマリー行 **When** 表示 **Then** Candidate名（未入力時は既存コードと同じ正確な表示文字列「リンク候補」）を、実体のある `<a href="/e/[shareToken]/c/[candidateId]">` として表示する |
| DS-2.5 リンク列 | **Given** サマリー行 **When** 候補にURLがある **Then** URLを外部リンク `target="_blank"` かつ `rel="noopener noreferrer"`（一案に固定）として表示し、URLがなければ「URLなし」を示す。anchorの**DOMテキストは保存URL全文**とし、視覚上のみ `overflow:hidden; text-overflow:ellipsis; white-space:nowrap` で省略する（accessible nameもDOMテキスト＝全文になる）。`title` 属性は付けない（DOMテキストで全文が担保されるため） |
| DS-2.6 総合評価列 | **Given** サマリー行 **When** 表示 **Then** `⭕️`（positiveCount）/ `➖`（neutralCount）/ `❌`（vetoCount）を1行内で読める形で表示する。`➖` は能動neutralのみで、unratedを含めない |
| DS-2.7 ❤️列 | **Given** サマリー行 **When** 表示 **Then** 候補全体の❤️合計（`heartCount`）を表示する |
| DS-2.8 🌀列 | **Given** サマリー行 **When** 表示 **Then** 候補全体の🌀合計（`concernCount`）を表示する |
| DS-2.9 行クリック遷移（DOM契約） | **Given** サマリー行 **When** 行内の**非interactive領域**（余白）をポインターでクリック／タップ **Then** 対象Candidateの候補編集画面（`/e/[shareToken]/c/[candidateId]`）へ遷移する。行コンテナに `role="link"` と `tabIndex=0` を重ねて二重フォーカスを作らない。キーボード利用者の正規ナビゲーション対象は候補名の実リンク（DS-2.4）とする |
| DS-2.10 interactive伝播分離 | **Given** サマリー行 **When** 行内の `a` / `button` 等interactive descendantから発火 **Then** 行クリックhandlerはそのイベントを無視する。URLリンク（DS-2.5）のクリックは外部URLを別タブで開き、候補編集遷移を発火させない |
| DS-2.11 読み取り専用 | **Given** サマリー表 **When** 表示 **Then** ○ / − / ×・❤️・🌀・コメントの編集controlを一切持たず、個人名義操作を発生させない |
| DS-2.12 最終候補状態の一貫表示 | **Given** サマリー行 **When** 表示 **Then** 対象候補の `decisionState` に応じて、**カードと同じCSS custom properties**を用い、`clear / discussion / fallback` はsoft背景を行全体へ、同じ前景色を先頭セルの左境界（5px相当）へ適用する。`none` は通常背景と `--line`。支援技術向け状態名を付け、可視の説明ラベルは追加せず、判定ロジックは再実装しない |
| DS-2.13 空状態 | **Given** Candidateが0件 **When** ダッシュボードを表示 **Then** サマリー表（`<table>`）自体を描画せず、既存の空状態表示「候補はまだありません。」だけを維持する |
| DS-2.14 カード非改変 | **Given** 従来のダッシュボードカード（`DashboardCandidateControls` 含む）と回答者名義control **When** サマリー表を新設 **Then** カードの内容・操作・並び順を変更しない |
| DS-2.15 状態同期 | **Given** ダッシュボードでのmutation成功後の完全状態再取得 **When** 状態が更新される **Then** サマリー表もカードと同じ最新状態を反映する（サマリー表独自のfetch・pollingを追加しない） |
| DS-2.16 入力の限定 | **Given** サマリー表 **When** 実装 **Then** 表示データは既存 `CandidateSummary` だけ、routing用に `shareToken` を別propで受ける（§3.1のprops契約）。`event-state.ts` / `event-types.ts` / actions / migration を変更しない |

- サマリー表の列は「候補名 / リンク / ⭕️ ➖ ❌ / ❤️ / 🌀」を最小構成とする。追加時期・提案者・コメントはサマリー表には出さず、従来カードと候補編集画面に委ねる。

### 4.3 レスポンシブ

| ID | 受け入れ条件 |
|---|---|
| RS-3.1 デスクトップ | **Given** 1366px幅 **When** サマリー表を表示 **Then** semantic `<table>` の各列が読みやすく並び、候補間を上下に比較できる。ページ幅は既存 `.page-shell`（最大1120px）を維持する |
| RS-3.2 モバイル契約（2段grid） | **Given** 375px幅 **When** サマリー表を表示 **Then** 次の契約で実装する。DOMは全幅で同一のsemantic table（`table/thead/tbody/tr/th/td`）を維持し、375pxでは**CSS上の見せ方だけを2段化**する（div一覧へ差し替えない）。1候補を2段で見せ、1段目は候補名を全幅・URLをその下の全幅、2段目は `⭕️ ➖ ❌`・❤️・🌀 を3領域で横並びし必要時だけ領域内で折り返す。URLは DS-2.5 の省略規則で表示する。**ページ全体の横スクロールを禁止**し、table wrapperだけの横スクロールへ逃がさない。Visual QAで変更できるのは余白・文字サイズ等の契約を変えない細部だけ |
| RS-3.3 タップ領域 | **Given** 375px幅のサマリー行 **When** 行余白クリック遷移と候補名リンク・URLリンクが同居 **Then** それぞれのタップ対象が重ならず、誤タップしにくい大きさ・間隔にする |
| RS-3.4 操作モデル一致 | **Given** モバイルとデスクトップ **When** サマリー行を操作 **Then** 「行余白クリックで候補編集・候補名リンクはキーボード正規ナビ・URLは別タブ」という操作モデルを両幅で一致させる |

---

## 5. 権限要件

本スライスは表示改善であり、既存の権限モデル（[ADR-0004](../adr/0004-permission-model.md) / [共同編集型・回答者行モデル要件](collaborative-response-row-requirements-2026-07-11.md) §5）を変更しない。

- サマリー表・戻り導線の表示に、追加のtoken・権限判定を導入しない。
- サマリー表は読取専用でmutationを発生させないため、新しいRLS/policy/GRANTを必要としない。
- 既存の「閲覧＝有効なshare tokenまたはowner token」の条件をそのまま満たす画面上でのみ表示される。

---

## 6. 非機能要件

| 区分 | 要件 |
|---|---|
| 対応幅 | 375×812 と 1366×768 を基準に、モバイル・デスクトップ同格で成立する |
| アクセシビリティ | 戻りリンク・サマリー行・URLリンクに適切なaccessible nameを付ける。可視の状態説明ラベルを増やさず、支援技術向け状態名と総合評価の実数でsemantic colorを補完する |
| 性能 | サマリー表は既存の完全状態取得結果を描画するだけとし、候補ごとのN+1照会・追加fetch・timer・pollingを持ち込まない |
| 整合性 | サマリー表とカードが同一の `CandidateSummary` を参照し、件数・状態・並び順が一致する |
| データ非改変 | データモデル・migration・時刻列・確定ロジックを一切変更しない |
| エラー | 既存のエラー表示・空状態表示を退行させない |

---

## 7. 今回の実装範囲

### In Scope

- 既存ヘッダー戻り導線の「一覧に戻る」への文言変更・view mode化・役割分離の改善（B-1）。`candidate-detail` は active link、`dashboard` は非リンク＋`aria-current="page"`。他view modeは現行維持
- ダッシュボード上部への読み取り専用サマリー表（semantic `<table>`）の新設（B-2）
- サマリー行の候補名（実リンク）・URL（別タブ・省略表示）・総合評価トリプル・❤️・🌀の表示
- 行余白クリックで候補編集への遷移、interactive descendant伝播分離、URL別タブの安全属性
- `decisionState` をカードと同じCSS custom propertiesで反映
- 375px / 1366px 対応とページ横溢れ防止（375pxは2段grid）
- `DESIGN.md` の更新: サマリー表のdesktop/mobile構造と状態色の適用単位（soft背景を行全体・前景色を先頭セル左境界）を `DESIGN.md` へ転記し、実装は `DESIGN.md` を直接参照する（statusの承認済み化と転記は2026-07-15のauthority同期で実施済み。§9参照）
- 既存E2Eのlocator更新: 「候補一覧」→「一覧に戻る」変更に伴い `tests/slice-2.spec.ts` / `tests/slice-5.spec.ts` の該当locatorを更新する
- 検証は既存Playwright（`test:e2e:local`）に追加する。新しいtest frameworkは導入しない
- 既存カード群・候補編集画面・E2Eの回帰確認

### Out of Scope

- データモデル・migration・DB制約・RLS/policy/GRANTの変更
- 新規Server Action、集計・時刻・状態の新規追加
- 確定ロジック（`clear / discussion / fallback / none`）の判定変更
- 従来ダッシュボードカードの内容・操作・並び順の変更
- サマリー表からの評価・❤️・🌀・コメント編集
- サマリー表への追加時期・提案者・コメント列の追加
- 列の並び替え・ソート・フィルタ・表示切替
- ロゴ刷新（B-3）、ブランドストーリー文（#4）、性能計測（#5）
- Realtime、polling、通知

---

## 8. 決定事項（2026-07-15 解消済み）

要件ドラフト時の未決4点は次のとおり確定した。いずれも各要件IDへ反映済みである。

1. **BN-1.3 戻り導線の文言** → 「**一覧に戻る**」に確定。`ui-copy-decisions.md` へ反映する。
2. **BN-1.5 ダッシュボード上の扱い** → 「**非活性（非リンク要素＋`aria-current="page"`、クリック・Enter・Spaceで遷移なし。`<a disabled>` は使わない）**」に確定。
3. **RS-3.2 モバイル表示** → 「**375pxは指定の2段grid**（1段目=候補名全幅＋URL全幅、2段目=⭕️➖❌・❤️・🌀を3領域横並び）」に確定。ページ／wrapperの横スクロールは使わない。Visual QAで変更できるのは余白・文字サイズ等、契約を変えない細部だけとする。
4. **DS-2.12 サマリー行への色反映** → 「**カードと同じCSS custom properties**（soft背景を行全体・前景色を先頭セル左境界、`none`は通常面＋`--line`）」に確定。

上記は各要件IDの本文と一致する。実装時のVisual QAで詰めるのは、契約を変えない見た目の細部（余白・色調・文字サイズ等）だけである。

---

## 9. 正本反映対象

次はいずれも2026-07-15のauthority同期（承認時）で**反映済み**である。

- `docs/03_requirements.md` §3.6（候補一覧ダッシュボードにサマリー表を追記）・§6 画面一覧 — 反映済み
- `docs/reports/ui-copy-decisions.md`（戻り導線文言「一覧に戻る」・サマリー表文言。2026-07-15項目のauthorityは承認済みへ同期済み） — 反映済み
- `DESIGN.md`（statusを「承認済み（実装未着手）」へ更新し、サマリー表のdesktop（semantic table・5列）/mobile（2段grid）構造と状態色の適用単位を転記済み。以後、新規サマリー表の見た目は `DESIGN.md` を支配的正本とし、実装は `DESIGN.md` を直接参照する） — 反映済み
- `docs/reports/README.md`（3点セットのstatusを「承認済み・実装未着手」へ同期） — 反映済み
- `AGENTS.md` / `CLAUDE.md` の一行要約・正本ポインタ — 本スライスは大方針を変えないため対象外（両ファイルは引き続きbyte一致）

実装完了後は、第3commit（docs完了同期）で3点セット・準備レポートの実装状態を「実装済み」へ更新する。
