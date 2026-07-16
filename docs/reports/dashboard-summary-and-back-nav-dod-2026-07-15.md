# ダッシュボードサマリー表・戻り導線改善 DoD

- 作成日: 2026-07-15
- 最終改訂: 2026-07-16（候補詳細・反応項目編集UIを同期）
- ステータス: **承認済み（実装中・local検証済み、UI調整継続）**
- 対象要件: [ダッシュボードサマリー表・戻り導線改善 要件定義書](dashboard-summary-and-back-nav-requirements-2026-07-15.md)
- QA: [QA実施書](dashboard-summary-and-back-nav-qa-2026-07-15.md)
- 開発・デプロイ運用: `development-and-business-activity-plan-2026-07-14.md`（Git未追跡・非正本）§4/§5 を背景とするが、リンク依存はしない。Gitフロー・デプロイの実行単位は本書§7で自己完結させる

> 本書はフェーズB-1（戻り導線改善）＋ B-2（操作可能サマリー表）を同一リリースで完了と判断するための基準である。チェックが1つでも未達の場合は完了扱いにしない。**本スライスはUI専用であり、DB schema・migration・remote migration適用は発生しない**。ただし受け入れ検証はlocal Supabase依存E2E（`test:e2e:local`）であるため、`operate-supabase-live-db` Skillのlocal profile・target・localhost bind・E2E・cleanup・commit/pushゲートは適用される（§6・§7）。意図せずDB/データモデルへ手が入っていないことを逆に確認する。

---

## 1. 文書DoD

- [x] 本要件、DoD、QAの相互参照と用語（ダッシュボード / 候補編集 / ヘッダー / 戻り導線 / サマリー表 / 総合評価トリプル）が一致している（2026-07-15 authority同期時点で確認。ローカルリンク切れ0）
- [x] 決定4点（一覧に戻る / dashboardでは戻り導線非表示 / 375px2段grid / 既存custom properties）が要件・DoD・QA・準備レポートの全箇所で一意に記述されている
- [x] `ui-copy-decisions.md` の2026-07-15項目が承認済みで、3点セット・`DESIGN.md`・`docs/reports/README.md`・`docs/03_requirements.md` とauthorityが一致している（操作可能サマリーへの変更を同期済み）
- [x] 承認時のdocs同期対象を漏れなく**同一commit**で揃える: 3点セット（要件/DoD/QA）、`ui-copy-decisions.md`（2026-07-15項目authority）、`DESIGN.md`（status＋サマリー表デザイン転記）、`docs/reports/README.md`（status）、`docs/03_requirements.md` §3.6・§6、`AGENTS.md` / `CLAUDE.md`（大方針・正本ポインタに変更がある場合、両者byte一致）、準備レポート（`development-preparation-and-documentation-2026-07-15.md`）、レビューレポート（`development-preparation-and-documentation-review-2026-07-15.md`）の各status（2026-07-15 docs承認commitで同一commitに収録）
- [x] `03_requirements.md` §3.6・§6 画面一覧へ、サマリー表とダッシュボード上部配置が追記されている（2026-07-15 同期で反映）
- [x] `AGENTS.md` / `CLAUDE.md` は大方針に変更がある場合のみ同期し、変更時は両ファイルが完全一致している（本スライスは大方針を変えず、両ファイルは `diff` でbyte一致を確認済み）
- [x] 「サマリー表から評価編集ができる」「サマリー表に追加時期・提案者・コメント列がある」等、要件と矛盾する記述を正本へ残していない（2026-07-15 同期時点で `03_requirements`・`ui-copy`・`DESIGN` を確認）

---

## 2. 非改変DoD（データ・確定ロジック）

- [ ] `supabase/migrations/` に新規・変更migrationがない
- [ ] `event-state.ts` の集約読取ロジック（`CandidateSummary` 生成、`decisionState` 判定、`positive/neutral/veto` 件数・相対時刻算出）を変更していない
- [ ] 新規Server Actionを追加していない。既存 `actions.ts` のmutation群に変更がない
- [ ] `event-types.ts` の `CandidateSummary` / `EventState` に新しいフィールドを追加していない
- [ ] RLS / policy / GRANT / DB制約を変更していない
- [ ] 確定ロジック（`clear / discussion / fallback / none`）の判定条件・入力（○数・×有無）を変更していない
- [ ] 戻り導線はmutationを呼ばず、サマリー表は既存の評価・反応mutationだけを再利用し、新規Server Action・独自fetch・DB仕様変更を追加していない

---

## 3. 戻り導線DoD（B-1）

- [ ] `EventTopbar` が `EventApp` から view mode（`candidate-detail` / `dashboard` / `guest-selection` / `owner-setup` / `loading`）を明示的に受け取る
- [ ] `candidate-detail` では「一覧に戻る」が実体 `<a href="/e/[shareToken]">` の active link で、375px / 1366px でトップバー内に収まり常時可視・スクロールなしに到達できる
- [ ] active linkの遷移先が同一Eventの `/e/[shareToken]` で、トップ（`/`）や別Eventへ遷移しない
- [ ] active linkの遷移先が、候補削除後の `router.push('/e/[shareToken]')` と一致している
- [ ] 文言が「一覧に戻る」である
- [ ] ブランド名リンク（`/`）と戻り導線（ダッシュボード）の役割が、文言・配置・見え方で区別できる
- [ ] `dashboard` では「一覧に戻る」のリンク・非リンク要素をどちらも描画しない
- [ ] `guest-selection` / `owner-setup` / `loading` は現行の文言・動作を変更していない（意図的維持）
- [ ] ヘッダー以外に新しい戻るボタン・パンくず等のナビ要素を追加していない
- [ ] candidate-detailのactive linkは遷移先が分かるaccessible nameを持つ

---

## 4. サマリー表DoD（B-2）

### 配置・構造

- [ ] `section.dashboard-section` 内が `dashboard-identity-bar` / `DashboardSummaryTable` / `CandidateAddForm` の順で、候補タイル・カードグリッドがなく、`ShareLinks`はsection後の既存位置を維持している
- [ ] 「〇〇として判断中」または「お名前を選んで判断」がサマリー直前にあり、変更buttonは「直す」と同じ控えめな外観で、375pxでも右端にある
- [ ] サマリー表が `state.candidates` の並び順（`created_at ASC, id ASC`）を変えずに表示する
- [ ] desktopで semantic `<table>` を用い、候補名 / リンク / ⭕️ ➖ ❌ / ❤️ / 🌀 の5領域と `<caption className="sr-only">候補のまとめ</caption>` がある。説明用の見出し行は表示しない（CSS gridの見せかけ表でない）
- [ ] 1候補が1行として、全Candidateが表示される
- [ ] Candidateが0件のとき、サマリー表（`<table>`）自体を描画せず、既存の「候補はまだありません。」だけを維持する

### 列・内容

- [ ] 候補名列が実体 `<a href="/e/[shareToken]/c/[candidateId]">` で表示され、未入力時は既存コードと同じ正確な文字列「リンク候補」になる
- [ ] リンク列が、URLありは外部リンク（`target="_blank"` かつ `rel="noopener noreferrer"` に固定）、URLなしは「URLなし」表示になる。anchorのDOMテキストは保存URL全文で、視覚上のみellipsis省略（accessible name＝DOMテキスト＝全文）。`title` は付けない
- [ ] 総合評価列に `⭕️`（positiveCount）/ `➖`（neutralCount）/ `❌`（vetoCount）がbuttonとして表示され、選択中回答者名義で直接選択できる
- [ ] 選択中の総合評価buttonが`aria-pressed=true`と輪郭強調で判別できる
- [ ] `➖` が能動neutralのVote行数だけを数え、unratedを含めない
- [ ] ❤️列が `heartCount`、🌀列が `concernCount` を表示し、それぞれのbuttonから判断基準選択dialogを開ける
- [ ] dialog内で判断基準ごとの❤️ / 🌀を付け外しでき、`aria-pressed`・件数・カラー状態が最新値へ同期する
- [ ] dialog末尾の控えめな「反応項目の追加」から、候補編集と共通の「❤️／🌀反応項目の編集」modalへ進み、追加後の項目が反応入力へ反映される
- [ ] 共通の❤️／🌀反応項目編集modalでは、既存反応項目一覧の下に「反応項目の追加」buttonがある
- [ ] ❤️ / 🌀の集計buttonは枠のないカラー表示で、サマリー上では選択中回答者の選択状態を示さない
- [ ] サマリー表に追加時期・提案者・コメント列がない
- [ ] `decisionState` を既存のCSS custom propertiesで反映し、`clear/discussion/fallback` はsoft背景を行全体・前景色を先頭セル左境界（5px相当）へ、`none` は通常背景と `--line` に適用する
- [ ] 可視の状態説明ラベルを追加していない

### 操作

- [ ] 行内の非interactive領域（余白）クリック／タップでは画面遷移もmutationも発生しない
- [ ] 行コンテナにclick handler・`role="link"`・`tabIndex`を付けず、候補編集へのキーボード正規ナビは候補名の実リンクだけとする
- [ ] URLリンクは別タブ、候補名は候補編集、各評価controlは同一画面内mutationとして互いに干渉しない
- [ ] 未選択回答者で評価controlを操作すると既存の名前選択UIを開き、選択・作成後に保留操作を1回だけ続行する
- [ ] `DashboardSummaryTable` は既存の`CandidateSummary`・criteria・選択回答者状態・mutation callbackだけを使い、独自fetchや新規actionを追加しない
- [ ] `event-state.ts` / `event-types.ts` / actions / migration を変更していない
- [ ] 候補タイルと`DashboardCandidateControls`を描画せず、ダッシュボードの候補一覧・操作をサマリー表へ一本化している
- [ ] ❤️ / 🌀の反応入力dialogに「判断基準ごとの❤️・🌀」を表示せず、Candidate名・反応項目行・共通編集modalへ進む控えめな「反応項目の追加」だけを表示する
- [ ] ダッシュボードとオーナー初期セットアップの候補追加が、見出し「候補の追加」、入力ラベル「候補名」、候補名placeholderなしで統一され、1366pxでも候補名、リンク、追加buttonが別行である
- [ ] オーナー初期セットアップの「さあ、きめよう！」後に共有リンクと「わたしの意見を入力」が表示され、同じタブのownerダッシュボードへ進む

### 同期

- [ ] mutation成功後の完全状態再取得で、サマリー表が最新状態を反映する
- [ ] サマリー表独自のfetch・polling・timerを追加していない

---

## 5. レスポンシブ・アクセシビリティDoD

- [ ] 1366px でサマリー表が semantic `<table>` として読みやすく並び、候補間を上下に比較できる。ページ幅は既存 `.page-shell`（最大1120px）を維持
- [ ] 375px で1候補を2段grid（1段目=候補名全幅＋URL全幅、2段目=⭕️➖❌・❤️・🌀を3領域横並び）にする。DOMは全幅で同一のsemantic table（`table/colgroup/tbody/tr/th/td`）を維持し、CSSの見せ方だけを2段化する（div一覧へ差し替えない）
- [ ] 375px でページ全体の横スクロールが発生せず、table wrapperだけの横スクロールへ逃がしていない。長いURLでも横溢れしない
- [ ] 375px で候補名・URL・総合評価・❤️ / 🌀のタップ対象が重ならず、誤タップしにくい
- [ ] 「行余白は非操作・候補名は候補編集・URLは別タブ・評価は表内操作」のモデルがモバイル・デスクトップで一致する
- [ ] 戻り導線・候補名リンク・URLリンク・評価button・判断基準dialogに適切なaccessible nameと状態がある
- [ ] 375×812 / 1366×768 の実画面を人間確認し、色・総合評価トリプル・レイアウトを調整している
- [ ] 確定した文言・designを `ui-copy-decisions.md` と `DESIGN.md` へ反映している

---

## 6. テストDoD

- [ ] [QA実施書](dashboard-summary-and-back-nav-qa-2026-07-15.md)の全必須シナリオが自動化または手動ゲート化されている
- [ ] 検証は既存Playwright（`test:e2e:local`）に追加し、新しいtest frameworkを導入していない
- [ ] サマリー表の描画・列内容・行余白の非遷移・候補名リンクEnter・URL別タブ・総合評価操作・判断基準別❤️ / 🌀操作を検証する新規E2Eがgreenである
- [ ] 戻り導線（`candidate-detail` の active link → ダッシュボード遷移、`dashboard` では非表示）の新規E2Eがgreenである
- [ ] 既存 `tests/slice-2.spec.ts:127` / `tests/slice-5.spec.ts:21` の「候補一覧」locatorは **owner-setup画面**に対するもので**変更せず**、両specが回帰E2Eでgreenである（owner-setupは現行文言・動作を維持するため「候補一覧」のまま）
- [ ] 既存Slice 1 / 2 / 5 とダッシュボード・候補編集の回帰E2Eがgreenである
- [ ] owner / guest 双方のダッシュボードで同じサマリーが表示されることを確認している
- [ ] サマリー表の件数・状態がmutation後の完全状態再取得と一致することを確認している
- [ ] 375×812 と 1366×768 のスクリーンショットを目視確認している
- [ ] local E2E実行前に phase=`local`・profile=`.env.supabase.local`・tracked target=`config/supabase-targets.json` を明示し、`SUPABASE_URL`/`SUPABASE_ANON_KEY` の存在のみ確認（値を出力しない）、localhost bind を確認している
- [ ] 正式evidenceは `npm run test:e2e:local`（aliasを使わない）で、total/pass/fail/skip・全skip名と理由・対象スライスの意図しないskip 0 を報告する
- [ ] E2E作成データへ `[E2E]` マーカーが付き、自動削除せず**別承認**のcleanup手順で後処理する（テスト実行承認からcleanupを推論しない）
- [ ] `npm run check`（tsc）がPASS
- [ ] `npm run build` がPASS
- [ ] `npm run test:e2e:local` がFAIL 0で、対象スライスのケースに意図しないSKIPがない
- [ ] `git diff --check` がPASS

---

## 7. Commit・Push・本番DoD

- [ ] commit単位を**3commit**の実行計画として固定する（docs正本反映と実装を混在commitにしない）:
  1. **docs承認commit（`docs:`）**: 3点セット・`ui-copy-decisions.md`・`DESIGN.md`（status＋サマリー表デザイン転記）・`docs/reports/README.md`・`docs/03_requirements.md` §3.6/§6・`AGENTS.md`/`CLAUDE.md`（変更時・byte一致）・準備レポート・レビューレポートのstatusを「承認済み・未実装」へ同期
  2. **B-1/B-2実装commit（`feat:`）**: コード・CSS・新規E2E追加（既存 `slice-2`/`slice-5` のlocatorは owner-setup 対象のため変更しない）
  3. **docs完了同期commit（`docs:`）**: 実装後に3点セット・準備レポート等の実装状態を「実装済み」へ更新（実装状態の更新はこの3件目で行う）
- [ ] `feat:` / `fix:` / `docs:` プレフィックス運用に従う
- [ ] スライス単位ブランチ（`feat/<slice>`）で作業し、`main` へは4点チェック（check / build / test:e2e:local / git diff --check）グリーン後に戻す
- [ ] commit前に全検証結果と変更ファイルを報告し、承認を得る
- [ ] push前にbranch、upstream、ahead/behind、clean statusを確認する
- [ ] 明示承認なしにpushしない。force push・amend・rebase・既存migration改変を行わない
- [ ] commitとpushを別承認にする現行方針を維持する（check/build/local E2E/diff-check後にcommit承認、commit後に別途push承認）
- [ ] Vercel反映後に独自ドメイン（kimenosuke.com）で主要導線（ダッシュボード表示 / 表内評価 / 判断基準別❤️・🌀 / 候補編集→一覧に戻る / URL別タブ）と 375×812・1366×768 のVisual QAを最小smokeとして実施する
- [ ] 本スライスは DB schema・migration・remote migration適用を伴わないため、コード側は `main` 反映＝自動デプロイで完了とする（remote DB適用の承認ゲートは発生しない）。ただしlocal Supabase依存E2Eのprofile/target/bind・`[E2E]` cleanup・commit/push承認は上記のとおり適用される
