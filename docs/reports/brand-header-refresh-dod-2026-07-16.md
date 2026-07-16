# ブランドヘッダー刷新（B-3） DoD

- 作成日: 2026-07-16
- 最終改訂: 2026-07-16（実装・local自動検証結果を反映）
- ステータス: **実装済み・local自動検証PASS（手動resize・Production確認待ち）**
- 対象要件: [ブランドヘッダー刷新 要件定義書](brand-header-refresh-requirements-2026-07-16.md)
- QA: [QA実施書](brand-header-refresh-qa-2026-07-16.md)

> 本書はB-3（ブランドヘッダー刷新）スライスの完了基準と実施状態である。local自動検証済み項目を完了とし、200% resizeの手動確認・Production確認・publishは後続ゲートとして未完了のまま残す。

---

## 1. 仕様・文書DoD（本スライスで満たす）

- [x] 要件・DoD・QAの相互参照と用語（ブランドヘッダー / タグライン / ブランド名 / 右レイアウトスロット / ナビゲーション / view mode / 真の中央）が一致している
- [x] 確定仕様（上段左=タグライン非リンクserif / 上段右=常設slot内のview mode別ナビ / 下段中央=ブランド名ゴシック`/`リンク）が3点セットで一意に記述されている
- [x] 1366×768・標準375×812・320 CSS pxでタグライン上段左・ナビ上段右・ブランド下段中央を維持し、200% resizeでも内容・機能を失わない契約が要件・QAで一致している
- [x] 真の中央の実装契約（3領域、`grid-template-columns: minmax(0,1fr) auto minmax(0,1fr)`、`.page-shell`中心一致、右ナビなしでも常設slotで中央維持）が明記されている
- [x] ブランドヘッダー対象が「トップ＋Event 5 view mode」、metadata titleだけがサイト全体適用の明示的例外と記載されている
- [x] dashboardナビ非表示は2026-07-16承認済みのB-1 refinementで、B-3はその契約を継承すると要件§5とB-1正本へ明記されている
- [x] mode別`aria-current`契約が一意に定義されている
- [x] 既存migration全8ファイルの名前・SHA-256 baselineがQAへ記録され、DoD・現在地レポートが同baselineを参照する
- [x] リンク切れ0、`AGENTS.md`／`CLAUDE.md` byte一致、`git diff --check` PASS

## 2. 実装DoD（B-3実装スライスで満たす）

### 構造・文言

- [x] 共通ヘッダーが内部componentへ切り出され、トップページとEvent画面で同一のDOM契約（DOM順「タグライン → ブランドリンク → 右レイアウトスロット」）を使う。右slotは常設し、内部anchorだけをview modeで切り替える
- [x] 左に `Clarity Before Choice` を非リンク要素で表示し、リンク・button・focus対象にしていない。改行・ellipsisがない
- [x] タグラインのフォントが `Georgia, "Times New Roman", serif` のitalic。外部fontを読み込まず、利用できない環境ではgeneric family `serif`へfallbackする
- [x] 中央に `きめのすけ` をゴシックで表示し、`/` へのリンクである
- [x] `きめのすけ` だけがキーボードfocus可能なホーム導線で、Enterで `/` へ遷移する
- [x] 右ナビが view mode別: candidate-detail=`一覧に戻る`（`/e/[shareToken]` 実リンク）、loading/guest-selection/owner-setup=`候補一覧`（`/e/[shareToken]` 実リンク）、dashboard/トップ=slot内interactive elementなし
- [x] トップだけブランドリンクへ`aria-current="page"`を付け、Event各modeではブランドリンク・右ナビとも`aria-current`を付けていない

### レイアウト・中央

- [x] 3領域レイアウトが `grid-template-columns: minmax(0,1fr) auto minmax(0,1fr)` 相当で実装されている
- [x] `きめのすけ` の水平中心が `.page-shell` の水平中心と1 CSS px以内で一致する（1366×768・375×812のbounding boxで確認）
- [x] dashboard/トップ（右ナビなし）でも中央位置がずれない
- [x] 1366×768で3領域が読みやすく並び中央一致を維持する

### レスポンシブ

- [x] 375×812・標準zoom/文字サイズでタグラインが上段左、ナビが上段右、ブランドが下段中央となり、全文表示（文言内折返し/ellipsisなし）
- [x] 375×812でページ横overflow・要素の重なり・クリック領域の重複がない
- [x] 375pxで固定font sizeと狭いgapを用い、viewport比例（vw等）の文字サイズを使っていない
- [ ] ブラウザのページzoom 100% / 125% / 150% / 175% / 200%で複数段化を許容しつつ、内容・link・機能の欠落、クリップ、重なり、操作不能がない（CSSの`zoom` propertyで代替しない）
- [x] 320 CSS px相当で2方向scroll・ページ横overflowなしにreflowし、全情報と操作を利用できる

### metadata・非改変

- [x] root layoutのmetadata titleがサイト全体で `きめのすけ | Clarity Before Choice`
- [x] description（`登録なしで使える、みんなで決めるための共有サービス`）と `noindex`/robots を維持
- [x] ブランドストーリー文・画像ロゴ・外部font・新依存を追加していない
- [x] 公開API・DB・Server Action・migration・状態管理を変更していない。QA §2の既存migration全8ファイルbaselineが不変
- [x] `event-state.ts` / `event-types.ts` / actions に差分がない

### テスト・回帰

- [x] [QA実施書](brand-header-refresh-qa-2026-07-16.md)の全必須シナリオが自動化または手動ゲート化されている
- [x] 検証は既存Playwright（`test:e2e:local`）に追加し、新しいtest frameworkを導入しない
- [x] 各view modeの文言・element種別・href・focusability・mode別`aria-current`の新規E2Eがgreen
- [x] dashboard/トップで右レイアウトスロットが存在し、その内部にlink・button等のinteractive elementがないことを検証している
- [x] `page.title()` が `きめのすけ | Clarity Before Choice` であることを検証している
- [x] 既存「一覧に戻る」（candidate-detail）「候補一覧」（owner-setup等）の回帰E2Eがgreen（owner-setup等の既存locatorは変更しない）
- [x] local Supabaseゲート（phase=local・profile・target・localhost bind）確認後に `test:e2e:local` を実行し、total/pass/fail/skip・全skip名を報告する
- [x] `npm run check` / `npm run build` / `npm run test:e2e:local` / `git diff --check` を実装commit前ゲートとする

## 3. 正本同期・Commit DoD

- [x] B-3承認時に `ui-copy-decisions.md`・`03_requirements`（§6）・`05_dod`・`06_qa-flow`・reports READMEのB-3 authorityを同期している
- [x] `DESIGN.md` への確定値（serifスタック・3領域レイアウト・中央契約）反映は**B-3実装スライスと同一作業**で行う
- [x] `AGENTS.md` / `CLAUDE.md` は正本ポインタ表と齟齬がある場合のみ更新し、更新時はbyte一致（本スライスはポインタ変更不要、両ファイルbyte一致を確認）
- [ ] B-1/B-2 closeout docsとB-3仕様docsを**別commit**に分ける
- [ ] 各commit・pushは明示確認後に行う（squash/rebase/force pushを使わない）
