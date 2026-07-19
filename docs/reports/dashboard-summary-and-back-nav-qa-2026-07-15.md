# ダッシュボードサマリー表・戻り導線改善 QA実施書

- 作成日: 2026-07-15
- 最終改訂: 2026-07-19（owner-session安全対策による後続例外を追補）
- ステータス: **完了（local E2E・Production browser QA PASS）**
- 対象要件: [要件定義書](dashboard-summary-and-back-nav-requirements-2026-07-15.md)
- 完了条件: [DoD](dashboard-summary-and-back-nav-dod-2026-07-15.md)

> 本書はフェーズB-1（戻り導線改善）＋ B-2（操作可能サマリー表）のQA計画である。**本スライスはUI専用**で、DB schema・migration・remote migration適用は伴わない。ただし受け入れ検証は**local Supabase依存E2E**（`test:e2e:local`）であるため、local profile・target・localhost bind・`[E2E]` cleanup・commit/pushのゲートは適用する（`operate-supabase-live-db` Skill準拠）。QAは表示・操作・遷移・レスポンシブと、データ・確定ロジックの非改変確認に集中する。実装前のドキュメント整合と、実装後のlocal E2E・実画面確認・本番smokeを段階的に行う。

> **後続の安全例外（2026-07-19）:** owner-session pending／failure中のowner-setup右ナビとCandidate名について、`href`・link roleなし、`aria-disabled="true"`、focus可能性、click・Enter・中クリックでの非遷移、success後だけのhref復元・Cookie確立・owner権限維持、failure時のエラー表示・href不在・Cookie不在をlocal／remote E2Eで確認した。Spaceの非activationと標準scroll、自動retryなし、再読み込み／owner URL再オープンによる再試行は、確定契約と実装の静的照合で確認した。共有閲覧とCandidate名の対象mutation pending挙動も実装の静的照合で確認した。現行QAは[06 QA](../06_qa-flow.md) S3b／S3cを正とする。B-1/B-2・B-3の従来実装に対するProduction受入状態は維持する。本安全例外のProduction受入はPR #5 merge後の別release gateであり、現時点では未実施である。

---

## 1. QA方針

1. 承認と実装タスクの明示前にコードを作らない。要件§8の決定4点が全文書で一意になっていることを着手前に確認する。
2. サマリー表が既存の評価mutationだけを呼び、新規Server Action・独自fetch・DB仕様変更を追加しないことを、コードとE2Eの両面で確認する。
3. semantic tokenと状態の意味は既存のまま用い、可視の状態説明ラベルを追加しない。色・レイアウトの最終調整は実画面（375px / 1366px）で行う。
4. 既存のダッシュボードカード・候補編集・回答者行モデルの回帰を必ず確認する。
5. 検証は既存Playwright（`test:e2e:local`）に追加し、新しいtest frameworkを導入しない。Playwrightは既存3000番serverを再利用しない。
6. E2E作成データへ `[E2E]` マーカーを付け、自動削除しない。cleanupはテスト実行承認から推論せず、別承認で行う。
7. 失敗時は追加修正を重ねる前に、原因・影響・修正候補を報告する。
8. commitとpushを別ゲートにし、push後はVercel本番を人間確認する。

---

## 2. テストレイヤー

| レイヤー | 目的 | 主な対象 |
|---|---|---|
| Playwright E2E（UI状態） | UI状態・操作・伝播を検証（専用component test frameworkは導入せず既存Playwrightで行う） | サマリー行の列内容、行余白の非遷移、候補名リンクEnter、URL別タブ、評価control、戻り導線 view mode |
| Playwright E2E（主要フロー） | ユーザー主要フローをlocal Supabaseで検証 | ダッシュボード表示、表内総合評価、判断基準別❤️ / 🌀、候補編集→一覧に戻る |
| 回帰E2E | 既存挙動の非退行を検証 | カード対話操作、回答者選択、Vote、3色、候補編集 |
| 非改変確認 | データ・ロジック不変を確認 | migration差分なし、集約ロジック差分なし、新規mutation経路なし |
| 人間確認 | 使い勝手と本番反映を確認 | 375px、1366px、Vercel、独自ドメイン |

---

## 3. 着手前・文書QA

| ID | 確認 |
|---|---|
| Q-PRE-01 | `git rev-parse --show-toplevel` で検出したリポジトリルートを作業場所としている |
| Q-PRE-02 | branchが `main`（またはスライス用 `feat/<slice>`）、remoteが意図した `origin`、ahead/behindを確認 |
| Q-PRE-03 | 作業開始前の `git status --short` を記録 |
| Q-PRE-04 | `AGENTS.md` と `CLAUDE.md` が同一 |
| Q-PRE-05 | 要件・DoD・QAの用語と参照先が一致 |
| Q-PRE-06 | 要件§8の決定4点（一覧に戻る / dashboardでは戻り導線非表示 / 375px2段grid（semantic table維持） / 既存CSS custom properties）が全文書で一意に反映されている |
| Q-PRE-07 | 既存 `EventTopbar` の現在の文言・リンク先（`/` と `/e/[shareToken]`）と、view mode設計（`candidate-detail` / `dashboard` / `guest-selection` / `owner-setup` / `loading`）を記録し、改善前後の差分を明確化 |
| Q-PRE-08 | 既存migrationのファイル名とSHA-256を記録し、本スライスで差分が出ないことの基準を確保 |
| Q-PRE-09 | phase=`local`、profile=`.env.supabase.local`、tracked target=`config/supabase-targets.json` を明示。`SUPABASE_URL`/`SUPABASE_ANON_KEY` の存在のみ確認し値を出力しない |
| Q-PRE-10 | `npm run supabase:start` / `supabase:status` wrapperでlocalhost bindを確認 |
| Q-PRE-11 | 「候補一覧」locatorを使う既存テスト（`tests/slice-2.spec.ts:127` / `tests/slice-5.spec.ts:21`）が **owner-setup画面**に対するものであることを把握する。owner-setupは現行維持のため、これらのlocatorは変更しない（candidate-detail/dashboardの新文言は新規E2Eで検証） |

---

## 4. 戻り導線シナリオ（B-1）

| ID | 操作 | 期待 |
|---|---|---|
| Q-BN-01 | 候補編集画面（`candidate-detail`）を1366pxで開く | 「一覧に戻る」active link（`<a href="/e/[shareToken]">`）が可視。スクロール不要で到達できる |
| Q-BN-02 | 候補編集画面を375pxで開く | 同上。横溢れなくトップバー内に収まり到達できる |
| Q-BN-03 | 「一覧に戻る」active linkをクリック／Enter | `/e/[shareToken]`（同一Eventのダッシュボード）へ遷移する |
| Q-BN-04 | ブランド名リンクをクリック | `/`（トップ）へ遷移し、ダッシュボード遷移と区別される |
| Q-BN-05 | 候補編集で候補を削除 | 既存の `router.push('/e/[shareToken]')` で戻り、Q-BN-03の遷移先と一致する |
| Q-BN-06 | ダッシュボード（`dashboard`）を表示 | 「一覧に戻る」のリンク・非リンク要素がどちらも表示されない（2026-07-16承認済みB-1仕様refinement） |
| Q-BN-07 | ゲスト名前選択・オーナー初期セットアップを表示 | 各view modeでトップバーが現行の文言・動作を維持している（E2Eで確認。本スライスで変更していない） |
| Q-BN-07b | 読み込み中（`loading`）の維持 | `loading` は一過性表示のためE2E assertionで取り逃しやすい。**コードレビュー**または初期描画を確実に捕捉する方法で現行維持を確認する。test-only待機や本番コードの遅延は追加しない |
| Q-BN-08 | 支援技術で戻り導線を読む | candidate-detailのactive linkは遷移先が分かるaccessible nameを持ち、dashboardには不要な自己参照導線がない |
| Q-BN-09 | ヘッダー以外を確認 | 新しい戻るボタン・パンくず等のナビ要素が追加されていない |

---

## 5. サマリー表シナリオ（B-2）

### 5.1 配置・構造

| ID | 入力 / 操作 | 期待 |
|---|---|---|
| Q-DS-01 | Candidate 3件のダッシュボードを表示 | `dashboard-section` 内が回答者表示、`DashboardSummaryTable`、候補追加フォームの順で、候補タイル・カードグリッドが表示されない |
| Q-DS-01a | 375px / 1366pxで回答者表示を確認 | 「〇〇として判断中」の直後の変更buttonが「直す」と同じ控えめな外観で右端にあり、モバイルでも縦積み・全幅にならない |
| Q-DS-02 | 同上 | サマリー表が既存候補順（`created_at ASC, id ASC`）を変えずに並ぶ |
| Q-DS-03 | 同上 | semantic `<table>` で3候補が3行、説明用の見出し行を持たず、sr-only caption を持つ |
| Q-DS-04 | Candidate 0件で表示 | サマリー表（`<table>`）自体が描画されず、既存「候補はまだありません。」だけが残る |
| Q-DS-05 | 回答者名義control・追加・共有を確認 | `CandidateAddForm`・`ShareLinks` の操作が維持され、見出し「候補の追加」・入力ラベル「候補名」・候補名placeholderなし。追加フォームは1366pxでも候補名・リンク・追加buttonが別行 |
| Q-DS-05a | オーナー初期セットアップで「さあ、きめよう！」 | 同じ画面に「みんなに送るリンク」とコピーbutton、「わたしの意見を入力」を表示。後者で同じタブのownerダッシュボードへ進む |
| Q-DS-05b | owner / guest 双方で表示 | 双方のダッシュボードで同じサマリーが表示される |

### 5.2 列・内容

| ID | 入力 | 期待 |
|---|---|---|
| Q-DS-06 | 候補名あり | 候補名が候補名列に実リンク `<a href="/e/[shareToken]/c/[candidateId]">` として表示される |
| Q-DS-07 | 候補名なし（URLのみ） | 正確に「リンク候補」と表示される（既存コードと同じ文字列） |
| Q-DS-08 | URLあり | リンク列が外部リンク `target="_blank"` かつ `rel="noopener noreferrer"`（一案固定）として表示される |
| Q-DS-08b | 長いURL | anchorのDOMテキストが保存URL全文で、視覚上のみellipsis省略。accessible name（＝DOMテキスト）が全文になり、`title` は付いていない。ページ横溢れを起こさない |
| Q-DS-09 | URLなし | リンク列が「URLなし」表示になる |
| Q-DS-10 | positive 2 / neutral 1 / veto 1 の候補 | 総合評価列に `⭕️ 2 ➖ 1 ❌ 1` が表示される |
| Q-DS-11 | unratedを含む候補 | `➖` にunratedが混入せず、能動neutralだけが数えられる |
| Q-DS-12 | ❤️ 3 / 🌀 2 の候補 | ❤️列に3、🌀列に2が表示される |
| Q-DS-13 | サマリー表の列を確認 | 追加時期・提案者・コメント列が存在しない |
| Q-DS-14 | `decisionState=clear` の候補 | サマリー行に既存のCSS custom properties（soft背景を行全体・前景色を先頭セル左境界）と支援技術向け状態名が反映される |
| Q-DS-14b | `decisionState=none` の候補 | 通常背景と `--line`。状態色を付けない |
| Q-DS-15 | 各行の件数・状態 | `CandidateSummary`の件数・状態と一致する |

### 5.3 操作・伝播

| ID | 操作 | 期待 |
|---|---|---|
| Q-DS-16 | サマリー行の**余白**（非interactive領域）をクリック／タップ | 遷移もmutationも発生せず、ダッシュボードに留まる |
| Q-DS-16b | 候補名リンクにフォーカスして**Enter** | 同じ候補編集画面へ遷移する（キーボード正規ナビ） |
| Q-DS-16c | 行コンテナのフォーカス挙動 | click handler・`role="link"`・`tabIndex`がなく、候補編集へのフォーカス対象は候補名リンクだけ |
| Q-DS-17 | サマリー行内のURLリンクをクリック | 外部URLが別タブで開き、候補編集や評価mutationが発火しない |
| Q-DS-18 | ⭕️ / ➖ / ❌を操作 | 選択中回答者名義で保存され、`aria-pressed`と輪郭強調が切り替わる。unratedは➖へ混入しない |
| Q-DS-18b | ❤️ / 🌀集計buttonを表示・操作 | 枠のないカラー表示で合計件数を示し、サマリー上では個人の選択状態を示さない。操作すると判断基準選択dialogが開き、基準ごとのbutton・件数・`aria-pressed`を表示する |
| Q-DS-18c | ❤️ / 🌀buttonを操作 | Candidate名だけを見出しとする反応入力dialogで、選択中回答者名義の反応項目別付け外しができ、集計buttonへ最新値が同期する。「判断基準ごとの❤️・🌀」は表示されない |
| Q-DS-18d | 反応入力dialogで「反応項目の追加」 | 反応入力を閉じて共通の「❤️／🌀反応項目の編集」modalへ進み、追加後の項目が反応入力へ反映される |
| Q-DS-18c-ADD | 反応入力dialogの「反応項目の追加」を操作 | 候補編集と共通の「❤️／🌀反応項目の編集」modalへ移り、項目追加後に反応入力dialogから新項目を選べる |
| Q-DS-18c-LAYOUT | 共通の❤️／🌀反応項目編集modalを表示 | 既存反応項目一覧が先、反応項目の追加buttonがその下に並ぶ |
| Q-DS-18d | 回答者未選択で評価controlを操作 | 既存の名前選択UIが開き、選択・作成後に保留操作を1回だけ続行する |
| Q-DS-19 | サマリー表でmutation | 成功後の完全状態再取得で、サマリー表が最新状態を反映する |
| Q-DS-20 | ネットワーク/DB監視 | サマリー表描画が独自fetch・pollingを発火せず、既存mutation経路だけを使う |

---

## 6. レスポンシブシナリオ

| ID | 幅 | 期待 |
|---|---|---|
| Q-RS-01 | 1366px | semantic `<table>` が読みやすく並び、候補間を上下に比較できる。ページ幅は `.page-shell`（最大1120px）を維持 |
| Q-RS-02 | 375px | 1候補が2段grid（1段目=候補名全幅＋URL全幅、2段目=⭕️➖❌・❤️・🌀を3領域横並び）で表示される |
| Q-RS-03 | 375px | ページ全体の横スクロールが発生せず、table wrapperだけの横スクロールにも逃がしていない。長いURLでも横溢れしない |
| Q-RS-04 | 375px | 候補名・URL・総合評価・❤️ / 🌀のタップ対象が重ならず、誤タップしにくい |
| Q-RS-05 | 両幅 | 「行余白は非操作・候補名は候補編集・URLは別タブ・評価は表内操作」のモデルが一致する |
| Q-RS-06 | 375px | DOMが全幅で同一のsemantic table（`table/colgroup/tbody/tr/th/td`）のまま維持され、375pxではCSS上の見せ方だけを2段化している（div一覧へ差し替えていない） |

---

## 7. 回帰・非改変シナリオ

| ID | 確認 |
|---|---|
| Q-REG-01 | Slice 1 / 2 / 5 の既存E2Eがgreen |
| Q-REG-01b | `tests/slice-2.spec.ts` / `tests/slice-5.spec.ts` の「候補一覧」locator（owner-setup画面）を**変更せず**、両specがgreen（owner-setupの文言・動作を維持） |
| Q-REG-02 | 候補編集画面の回答者行モデル（全回答者行read-only / 選択中回答者の別modalでの名前変更 / 2段階削除）が退行していない |
| Q-REG-03 | ダッシュボードカードの対話操作（総合評価 / ❤️ / 🌀）が退行していない |
| Q-REG-04 | 3色ロジック（`clear / discussion / fallback / none`）の判定結果が変わっていない |
| Q-NC-01 | `supabase/migrations/` に新規・変更差分がない |
| Q-NC-02 | `event-state.ts` の集約読取ロジックと `event-types.ts` の型に差分がない |
| Q-NC-03 | `actions.ts` に新規Server Actionや既存mutationの変更がない |
| Q-NC-04 | 既存migrationのSHA-256がQ-PRE-08の記録と一致する |

---

## 8. 合格報告

実装完了時に次を値・結果とともに報告する。

- phase=`local`・profile・target・localhost bind の確認結果（値は出さない）
- `npm run check` / `npm run build` の結果
- `npm run test:e2e:local`（alias不使用）の total / PASS / FAIL / SKIP、全skip名と理由、対象スライスの意図しないskip 0
- `git diff --check` の結果
- migration差分なし・集約ロジック差分なしの確認（Q-NC-01〜04）
- 375×812 / 1366×768 のスクリーンショット目視確認結果
- Vercel本番（kimenosuke.com）での最小smoke（ダッシュボード表示 / 表内評価 / 判断基準別❤️・🌀 / 候補編集→一覧に戻る / URL別タブ）の結果
- `[E2E]` データの残存有無と、**別承認**のcleanup手順での後処理予定

いずれかが未達・不明の場合は完了報告としない。

### 8.1 実施結果（2026-07-16）

- local: `npm run test:e2e:local` 12 total / 11 PASS / 0 FAIL / 1既知SKIP、`npm run check` / `npm run build` / `git diff --check` PASS。
- Production: `main` merge commit `bc53f711f52c388489a2c0809250350d93d4d978`のVercel deploymentが`Ready`、`kimenosuke.com`割当を確認。
- 固定smoke fixture 1 Eventでowner／share、○／−／×、❤️／🌀、反応項目追加、コメント、候補詳細、`一覧に戻る`、dashboardの戻り導線非表示、外部URL新規tab、reload保持、権限境界を確認し、全件PASS。
- 1366×768・375×812のbrowser viewportでサマリー、候補詳細、反応項目modalを確認。横overflow・重大な重なりなし、browser error 0件。
- 物理モバイル端末確認はPASS。Production smokeを含む本番アプリデータcleanupも完了し、全8 application tableが0件であることをSELECT-only postcheckで確認した。今後新たに生成されるQAデータのcleanup運用は継続する。
