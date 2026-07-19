# ダッシュボードサマリー表・戻り導線改善 要件定義書

- 作成日: 2026-07-15
- 最終改訂: 2026-07-19（owner-session安全対策による後続例外を追補）
- ステータス: **完了（main統合・local検証・Production browser QA済み）**
- 対象: フェーズB-1（戻り導線改善）＋ B-2（ダッシュボード操作可能サマリー表）を同一リリースで実施
- 決定者: おしげさん
- 実装状態: **完了**（PR #1、merge commit `bc53f71`、2026-07-16 Production browser QA PASS）
- 関連: [DoD](dashboard-summary-and-back-nav-dod-2026-07-15.md) / [QA](dashboard-summary-and-back-nav-qa-2026-07-15.md) / [03要件](../03_requirements.md) §3.6 / [ui-copy-decisions](ui-copy-decisions.md) / [DESIGN.md](../../DESIGN.md)
- 背景（起点）: 本スライスは `development-and-business-activity-plan-2026-07-14.md`（Git未追跡・非正本ドラフト）§2 #1/#2・§8 手順2/3 に挙がったUI/UX課題（候補編集からダッシュボードへ戻る導線が分かりにくい／ダッシュボードに候補を一覧できるサマリーがない）に対応する。当該planはリンクせず、起点情報は本§1で自己完結させる。

> 本書は、`dac0f11` で確定した候補一覧ダッシュボード・候補編集画面に対する **UI/UX追補** の詳細要件である。候補編集からダッシュボードへの戻り導線を分かりやすく整え（B-1）、ダッシュボード上部へ候補を1行1件で見渡し、その場で評価できるサマリー表を新設する（B-2）。**本スライスはUI専用であり、データモデル・migration・新規Server Action・確定ロジックを変更しない。** 既存の集約読取モデル（`CandidateSummary`）と既存mutation経路だけを再利用する。

> **後続の安全例外（2026-07-19）:** 本書のowner-setup右ナビとCandidate名の「実リンク」契約は、owner tokenを持つ画面ではowner-session success後に限る。pending／failure中は表示・配置・classとfocus可能性を維持しつつ`href`とlink roleを出さず、`aria-disabled="true"`で遷移を防ぐ。failure後は自動retryせず、再読み込みまたはowner URL再オープンで再試行する。Candidate名は既存の対象mutation pending中も無効化し、共有閲覧は従来どおり最初から実リンク、dashboardの右ナビは非表示とする。現行契約は[03要件](../03_requirements.md) AC-1.10を正とする。B-1/B-2・B-3の従来実装に対するProduction受入状態は維持する。本安全例外のProduction受入はPR #5 merge後の別release gateであり、現時点では未実施である。

---

## 1. 目的

きめのすけの役割は、候補に対するみんなの意見を少ない操作で見える化し、グループが決めやすい状態を作ることである。本スライスでは、`dac0f11` までに成立した候補一覧ダッシュボードと候補編集画面の往復と一覧性を、次の2点で改善する。

1. 候補編集画面からダッシュボード（候補一覧）へ戻る導線を、迷わず認識できる形に整える（B-1）。既存ヘッダーの「候補一覧」リンクを改善し、新しいナビゲーション要素は追加しない。
2. ダッシュボード上部へ、候補名・リンク・総合評価（⭕️ / ➖ / ❌）・❤️・🌀を1候補1行で一覧し、その場で評価できるサマリー表を置く（B-2）。候補一覧はサマリーへ一本化し、同内容の候補カードは置かない。

いずれも意見の可視化を助ける表示改善であり、確定・ロック・非表示や新しい判定は導入しない。

---

## 2. 用語

| 用語 | 定義 |
|---|---|
| ダッシュボード（候補一覧） | 共有URLの通常閲覧先。きめること・つたえておきたいことと全Candidateのサマリーを表示する画面（route: `/e/[shareToken]`） |
| 候補編集画面 | 1 Candidateの情報・判断基準・全回答者行を表示・共同編集する既存画面（route: `/e/[shareToken]/c/[candidateId]`） |
| ヘッダー（トップバー） | 全Event画面（読み込み中／ゲスト名前選択／オーナー初期セットアップ／候補編集／ダッシュボード）で `EventApp` の分岐より前に常時描画される既存の `EventTopbar`。現状はブランド名リンク（`/`）と「候補一覧」リンク（`/e/[shareToken]`）を持つ |
| 戻り導線 | ヘッダー内のナビゲーション。candidate-detailでは「一覧に戻る」を表示し、dashboardでは表示しない。owner-setup / guest-selection / loading は現行の「候補一覧」リンク・動作を維持する（view modeごとに定義） |
| サマリー表 | ダッシュボード上部へ新設する、候補を1行1件で比較し、その場で評価できる一覧ビュー |
| 総合評価トリプル | 候補ごとの `⭕️`（positive数）/ `➖`（能動neutral数）/ `❌`（veto数）の3件数表示。`➖` はunratedを含めない |
| 最終候補状態 | 既存の `clear / discussion / fallback / none`。本スライスで判定ロジックは変更しない |

---

## 3. 基本原則

### 3.1 UI専用・既存モデル再利用

- データモデル、migration、DB制約、RLS/policy、Server Action、`event-state.ts` の読取集約ロジック（`CandidateSummary` 生成・`decisionState` 判定・件数算出）を変更しない。
- `DashboardSummaryTable` は表示用の `candidates: CandidateSummary[]` と `shareToken: string` に加え、既存の判断基準・選択回答者・disabled状態・mutation callbackを `Dashboard` から受け取る。表示件数と状態は `CandidateSummary` 以外から再集計せず、新しい集計列・状態を追加しない。`shareToken` は候補編集hrefの生成にのみ使い、URL列は `candidate.url` を使う。
- 最終候補状態の判定は既存境界の結果を受け取るだけとし、component内で再実装しない。

### 3.2 既存導線を壊さず改善する（B-1）

- 戻り導線は新しいナビゲーション要素を追加せず、既存ヘッダーの「候補一覧」リンクを改善する。
- 遷移先は既存挙動と同一の `/e/[shareToken]`（ダッシュボード）に固定する。候補削除後の `router.push('/e/[shareToken]')` と同じ遷移先である。
- ブランド名リンク（`/` へのトップ遷移）と戻り導線を混同させない。両者の役割を文言・配置で区別する。

### 3.3 一覧性を保ったまま評価できる（B-2）

- サマリー行全体の候補編集遷移は行わない。候補名だけを候補編集への実リンクとして維持する。
- ○ / − / ×は表内で直接選択でき、選択中回答者の現在値を輪郭強調と`aria-pressed`で示す。未選択時は既存の回答者選択UIを経由して操作を継続する。
- ❤️ / 🌀の集計ボタンは枠のないカラー表示とし、判断基準選択dialogを開いて基準ごとに付け外す。サマリー上では選択中回答者の❤️ / 🌀選択状態を表現しない。
- コメントと判断基準の追加・名称変更・削除はサマリーへ展開しない。追加時期・提案者を含む詳細情報は候補編集画面で確認する。
- サマリー表をダッシュボード唯一の候補一覧とし、二重の並び基準・操作面を持ち込まない。

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
| `dashboard`（ダッシュボード） | 戻り導線を表示しない | 操作対象なし |
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
| BN-1.5 ダッシュボード上の非表示（DOM契約） | **Given** ダッシュボード（view mode `dashboard`）を表示中 **When** 戻り導線が自己参照になる **Then** 「一覧に戻る」のリンク・非リンク要素をどちらも描画しない。これは実機確認を踏まえた2026-07-16承認済みrefinementである |
| BN-1.6 view mode の明示 | **Given** `EventTopbar` **When** 各Event画面から呼ばれる **Then** 上記状態表の view mode を明示的に受け取り、`candidate-detail` / `dashboard` 以外では現行挙動を変更しない |
| BN-1.7 新規要素の不追加 | **Given** 本スライス **When** 戻り導線を実装 **Then** ヘッダー以外に新しい戻るボタン・パンくず等のナビ要素を追加しない |
| BN-1.8 アクセシブル名 | **Given** 支援技術 **When** candidate-detailの戻り導線を読む **Then** 遷移先が分かるaccessible nameを持つ |

- dashboardでは自己参照となる戻り導線を表示しない。現在地を示す代替コピーも追加しない。

### 4.2 操作可能サマリー表（B-2）

| ID | 受け入れ条件 |
|---|---|
| DS-2.1 挿入位置 | **Given** ダッシュボード（`Dashboard` component） **When** 表示 **Then** `EventHeading` の後の既存 `section.dashboard-section` 内を、`dashboard-identity-bar`、`DashboardSummaryTable`、`CandidateAddForm`の順にする。`ShareLinks`はsection後の既存位置を維持する |
| DS-2.1a 回答者表示 | **Given** ダッシュボード **When** 選択中回答者を表示 **Then** 「〇〇として判断中」または「お名前を選んで判断」をサマリー直前に置き、変更controlは「直す」と同じ控えめなbutton外観で右端へ配置する。375pxでも縦積み・全幅buttonへ変えない |
| DS-2.2 1行1候補 | **Given** サマリー表 **When** 表示 **Then** 1候補を1行として、全Candidateを既存 `state.candidates` の並び順（`created_at ASC, id ASC`）で表示する |
| DS-2.3 semantic table | **Given** サマリー表 **When** desktopで表示 **Then** semantic な `<table>` を用い、候補名 / リンク / ⭕️ ➖ ❌ / ❤️ / 🌀 の5領域を表示する。説明用の見出し行は置かず、`<caption className="sr-only">候補のまとめ</caption>` を付ける（CSS gridの見せかけ表にしない） |
| DS-2.4 候補名列 | **Given** サマリー行 **When** 表示 **Then** Candidate名（未入力時は既存コードと同じ正確な表示文字列「リンク候補」）を、実体のある `<a href="/e/[shareToken]/c/[candidateId]">` として表示する |
| DS-2.5 リンク列 | **Given** サマリー行 **When** 候補にURLがある **Then** URLを外部リンク `target="_blank"` かつ `rel="noopener noreferrer"`（一案に固定）として表示し、URLがなければ「URLなし」を示す。anchorの**DOMテキストは保存URL全文**とし、視覚上のみ `overflow:hidden; text-overflow:ellipsis; white-space:nowrap` で省略する（accessible nameもDOMテキスト＝全文になる）。`title` 属性は付けない（DOMテキストで全文が担保されるため） |
| DS-2.6 総合評価列 | **Given** サマリー行 **When** 表示 **Then** `⭕️`（positiveCount）/ `➖`（neutralCount）/ `❌`（vetoCount）をbuttonとして表示し、選択中回答者名義で直接選択できる。選択中の値は輪郭強調と`aria-pressed=true`で示す。`➖` は能動neutralのみで、unratedを含めない |
| DS-2.7 ❤️列 | **Given** サマリー行 **When** ❤️集計buttonを表示・操作 **Then** 枠のないカラー表示で候補全体の❤️合計を示し、反応入力dialogを開いて項目ごとに付け外せる。dialog末尾の控えめな「反応項目の追加」から候補編集と共通の編集modalへ進める。サマリー上では選択中回答者の選択状態を示さない |
| DS-2.8 🌀列 | **Given** サマリー行 **When** 🌀集計buttonを表示・操作 **Then** 枠のないカラー表示で候補全体の🌀合計を示し、反応入力dialogを開いて項目ごとに付け外せる。dialog末尾の控えめな「反応項目の追加」から候補編集と共通の編集modalへ進める。サマリー上では選択中回答者の選択状態を示さない |
| DS-2.9 行の非遷移（DOM契約） | **Given** サマリー行 **When** 行内の非interactive領域をクリック／タップ **Then** 画面遷移もmutationも発生しない。候補編集への正規導線は候補名の実リンク（DS-2.4）だけとし、行へ`role="link"`・`tabIndex`・click handlerを付けない |
| DS-2.10 操作分離 | **Given** サマリー行 **When** 候補名、外部URL、評価button、❤️ / 🌀buttonを操作 **Then** 各要素の役割だけが発火する。URLは別タブ、候補名は候補編集、評価controlは同一画面内mutationとする |
| DS-2.11 名義とmutation | **Given** 選択回答者あり **When** 表内controlを操作 **Then** 既存の`onVote` / `onReaction` / `onConcern`経路で保存し、成功後の完全状態再取得でサマリー表を同期する。未選択時は既存の名前選択UIを開き、選択・作成後に保留操作を1回だけ続行する |
| DS-2.12 最終候補状態の一貫表示 | **Given** サマリー行 **When** 表示 **Then** 対象候補の `decisionState` に応じて、既存のCSS custom propertiesを用い、`clear / discussion / fallback` はsoft背景を行全体へ、同じ前景色を先頭セルの左境界（5px相当）へ適用する。`none` は通常背景と `--line`。支援技術向け状態名を付け、可視の説明ラベルは追加せず、判定ロジックは再実装しない |
| DS-2.13 空状態 | **Given** Candidateが0件 **When** ダッシュボードを表示 **Then** サマリー表（`<table>`）自体を描画せず、既存の空状態表示「候補はまだありません。」だけを維持する |
| DS-2.14 候補タイル非表示 | **Given** サマリー表 **When** ダッシュボードを表示 **Then** 同じCandidateを繰り返す候補タイル・カードグリッドを描画しない。Candidate詳細は候補名リンクから候補編集画面で確認する |
| DS-2.15 状態同期 | **Given** ダッシュボードでのmutation成功後の完全状態再取得 **When** 状態が更新される **Then** サマリー表へ最新状態を反映する（サマリー表独自のfetch・pollingを追加しない） |
| DS-2.16 入力の限定 | **Given** サマリー表 **When** 実装 **Then** 表示データは既存 `CandidateSummary` と既存`criteria`・選択回答者状態だけを使い、既存callbackを受ける。`event-state.ts` / `event-types.ts` / actions / migration を変更しない |

- サマリー表の列は「候補名 / リンク / ⭕️ ➖ ❌ / ❤️ / 🌀」を最小構成とする。追加時期・提案者・コメントは候補編集画面に委ねる。❤️ / 🌀のdialogはCandidate名だけを見出しとし、「判断基準ごとの❤️・🌀」という説明文を置かない。反応項目追加は候補編集と共通の「❤️／🌀反応項目の編集」modalを使い、同modalでは既存反応項目一覧の下に追加buttonを置く。
- ダッシュボードとオーナー初期セットアップの候補追加は、見出し「候補の追加」、入力ラベル「候補名」、候補名placeholderなしで統一し、1366pxを含む全幅で候補名、リンク、追加buttonを別行に積む。
- オーナー初期セットアップの「さあ、きめよう！」後は初回共有ステップで「みんなに送るリンク」を中央に表示し、「わたしの意見を入力」から同じタブのownerダッシュボードへ進む。

### 4.3 レスポンシブ

| ID | 受け入れ条件 |
|---|---|
| RS-3.1 デスクトップ | **Given** 1366px幅 **When** サマリー表を表示 **Then** semantic `<table>` の各列が読みやすく並び、候補間を上下に比較できる。ページ幅は既存 `.page-shell`（最大1120px）を維持する |
| RS-3.2 モバイル契約（2段grid） | **Given** 375px幅 **When** サマリー表を表示 **Then** 次の契約で実装する。DOMは全幅で同一のsemantic table（`table/colgroup/tbody/tr/th/td`）を維持し、375pxでは**CSS上の見せ方だけを2段化**する（div一覧へ差し替えない）。1候補を2段で見せ、1段目は候補名を全幅・URLをその下の全幅、2段目は `⭕️ ➖ ❌`・❤️・🌀 を3領域で横並びし必要時だけ領域内で折り返す。URLは DS-2.5 の省略規則で表示する。**ページ全体の横スクロールを禁止**し、table wrapperだけの横スクロールへ逃がさない。Visual QAで変更できるのは余白・文字サイズ等の契約を変えない細部だけ |
| RS-3.3 タップ領域 | **Given** 375px幅のサマリー行 **When** 候補名・URL・評価・❤️ / 🌀controlが同居 **Then** それぞれのタップ対象が重ならず、誤タップしにくい大きさ・間隔にする |
| RS-3.4 操作モデル一致 | **Given** モバイルとデスクトップ **When** サマリー行を操作 **Then** 「行余白は非操作・候補名は候補編集・URLは別タブ・評価は表内操作」というモデルを両幅で一致させる |

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
| 整合性 | サマリー表が既存の `CandidateSummary` を参照し、件数・状態・並び順を再計算せず表示する |
| データ非改変 | データモデル・migration・時刻列・確定ロジックを一切変更しない |
| エラー | 既存のエラー表示・空状態表示を退行させない |

---

## 7. 今回の実装範囲

### In Scope

- 既存ヘッダー戻り導線の「一覧に戻る」への文言変更・view mode化・役割分離の改善（B-1）。`candidate-detail` は active link、`dashboard` は戻り導線非表示。他view modeは現行維持
- ダッシュボード上部への操作可能なサマリー表（semantic `<table>`）の新設（B-2）
- サマリー行の候補名（実リンク）・URL（別タブ・省略表示）・総合評価トリプル・❤️・🌀の表示
- 行全体の遷移撤去、総合評価の直接操作、❤️ / 🌀の判断基準選択dialog、候補名とURLの独立導線
- `decisionState` を既存のCSS custom propertiesで反映
- 375px / 1366px 対応とページ横溢れ防止（375pxは2段grid）
- `DESIGN.md` の更新: サマリー表のdesktop/mobile構造と状態色の適用単位（soft背景を行全体・前景色を先頭セル左境界）を `DESIGN.md` へ転記し、実装は `DESIGN.md` を直接参照する（statusの承認済み化と転記は2026-07-15のauthority同期で実施済み。§9参照）
- 既存E2Eのlocatorは変更しない: `tests/slice-2.spec.ts:127` / `tests/slice-5.spec.ts:21` の「候補一覧」クリックは **owner-setup画面**（現行維持）に対するもので、owner-setupの文言は「候補一覧」のまま。candidate-detailの「一覧に戻る」active linkと dashboardで戻り導線がないことは**新規E2E**で検証する
- 検証は既存Playwright（`test:e2e:local`）に追加する。新しいtest frameworkは導入しない
- 候補編集画面・E2Eの回帰確認

### Out of Scope

- データモデル・migration・DB制約・RLS/policy/GRANTの変更
- 新規Server Action、集計・時刻・状態の新規追加
- 確定ロジック（`clear / discussion / fallback / none`）の判定変更
- 候補編集画面の内容・操作・並び順の変更
- サマリー表からのコメント編集（○ / − / ×・❤️・🌀は本スライスの既存mutation経路で操作可能）
- サマリー表への追加時期・提案者・コメント列の追加
- 列の並び替え・ソート・フィルタ・表示切替
- ロゴ刷新（B-3）、ブランドストーリー文（#4）、性能計測（#5）
- Realtime、polling、通知

---

## 8. 決定事項（2026-07-15 解消済み）

要件ドラフト時の未決4点は次のとおり確定した。いずれも各要件IDへ反映済みである。

1. **BN-1.3 戻り導線の文言** → 「**一覧に戻る**」に確定。`ui-copy-decisions.md` へ反映する。
2. **BN-1.5 ダッシュボード上の扱い** → 初回承認では非リンク「一覧に戻る」＋`aria-current="page"`だったが、実機確認で一覧表示中も同文言が残り続ける問題を確認。**2026-07-16・おしげさん承認の仕様refinement**として「**戻り導線を表示しない**」へ変更し、commit `ed84d9b`以降の正本・実装へ反映した。B-3はこの契約を継承する。
3. **RS-3.2 モバイル表示** → 「**375pxは指定の2段grid**（1段目=候補名全幅＋URL全幅、2段目=⭕️➖❌・❤️・🌀を3領域横並び）」に確定。ページ／wrapperの横スクロールは使わない。Visual QAで変更できるのは余白・文字サイズ等、契約を変えない細部だけとする。
4. **DS-2.12 サマリー行への色反映** → 「**既存のCSS custom properties**（soft背景を行全体・前景色を先頭セル左境界、`none`は通常面＋`--line`）」に確定。

上記は各要件IDの本文と一致する。実装時のVisual QAで詰めるのは、契約を変えない見た目の細部（余白・色調・文字サイズ等）だけである。

---

## 9. 正本反映対象

次はいずれも2026-07-15のauthority同期（承認時）で**反映済み**である。

- `docs/03_requirements.md` §3.6（候補一覧ダッシュボードにサマリー表を追記）・§6 画面一覧 — 反映済み
- `docs/reports/ui-copy-decisions.md`（戻り導線文言「一覧に戻る」・サマリー表文言。2026-07-15項目のauthorityは承認済みへ同期済み） — 反映済み
- `DESIGN.md`（2026-07-15承認時点でstatusを「承認済み（実装未着手）」へ更新し、サマリー表のdesktop（semantic table・5列）/mobile（2段grid）構造と状態色の適用単位を転記済み。以後、新規サマリー表の見た目は `DESIGN.md` を支配的正本とし、実装は `DESIGN.md` を直接参照する） — 反映済み
- `docs/reports/README.md`（2026-07-15承認時点で3点セットのstatusを「承認済み・実装未着手」へ同期） — 反映済み
- `AGENTS.md` / `CLAUDE.md` の一行要約・正本ポインタ — 本スライスは大方針を変えないため対象外（両ファイルは引き続きbyte一致）

main統合・Production確認のcloseout結果は、2026-07-16のdocs完了同期で3点セットと現在地レポートへ反映済みである。物理モバイル端末確認とProduction smokeを含む本番アプリデータcleanupも同日完了した。
