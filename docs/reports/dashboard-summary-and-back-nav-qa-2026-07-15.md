# ダッシュボードサマリー表・戻り導線改善 QA実施書

- 作成日: 2026-07-15
- 最終改訂: 2026-07-15（最終レビューPASS・承認。authority同期）
- ステータス: **承認済み（実装未着手）**
- 対象要件: [要件定義書](dashboard-summary-and-back-nav-requirements-2026-07-15.md)
- 完了条件: [DoD](dashboard-summary-and-back-nav-dod-2026-07-15.md)

> 本書はフェーズB-1（戻り導線改善）＋ B-2（読み取り専用サマリー表）のQA計画である。**本スライスはUI専用**で、DB schema・migration・remote migration適用は伴わない。ただし受け入れ検証は**local Supabase依存E2E**（`test:e2e:local`）であるため、local profile・target・localhost bind・`[E2E]` cleanup・commit/pushのゲートは適用する（`operate-supabase-live-db` Skill準拠）。QAは表示・遷移・レスポンシブと、データ・確定ロジックの非改変確認に集中する。実装前のドキュメント整合と、実装後のlocal E2E・実画面確認・本番smokeを段階的に行う。

---

## 1. QA方針

1. 承認と実装タスクの明示前にコードを作らない。要件§8の決定4点が全文書で一意になっていることを着手前に確認する。
2. サマリー表・戻り導線がServer Action・DB mutationを呼ばないことを、コードと負系の両面で確認する。
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
| Playwright E2E（UI状態） | UI状態・操作・伝播を検証（専用component test frameworkは導入せず既存Playwrightで行う） | サマリー行の列内容、行余白クリック遷移、候補名リンクEnter、URL別タブ、戻り導線 view mode |
| Playwright E2E（主要フロー） | ユーザー主要フローをlocal Supabaseで検証 | ダッシュボード表示、サマリー行余白→候補編集、候補編集→一覧に戻る |
| 回帰E2E | 既存挙動の非退行を検証 | カード対話操作、回答者選択、Vote、3色、候補編集 |
| 非改変確認 | データ・ロジック不変を確認 | migration差分なし、集約ロジック差分なし、mutation未発火 |
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
| Q-PRE-06 | 要件§8の決定4点（一覧に戻る / 非活性=非リンク＋`aria-current="page"` / 375px2段grid（semantic table維持） / カードと同じCSS custom properties）が全文書で一意に反映され、三択・「行または候補名」・「disabled」・「コンパクト折り返し」・「後で調整」等の緩い表現が残っていない |
| Q-PRE-07 | 既存 `EventTopbar` の現在の文言・リンク先（`/` と `/e/[shareToken]`）と、view mode設計（`candidate-detail` / `dashboard` / `guest-selection` / `owner-setup` / `loading`）を記録し、改善前後の差分を明確化 |
| Q-PRE-08 | 既存migrationのファイル名とSHA-256を記録し、本スライスで差分が出ないことの基準を確保 |
| Q-PRE-09 | phase=`local`、profile=`.env.supabase.local`、tracked target=`config/supabase-targets.json` を明示。`SUPABASE_URL`/`SUPABASE_ANON_KEY` の存在のみ確認し値を出力しない |
| Q-PRE-10 | `npm run supabase:start` / `supabase:status` wrapperでlocalhost bindを確認 |
| Q-PRE-11 | 「候補一覧」locatorを使う既存テスト（`tests/slice-2.spec.ts` / `tests/slice-5.spec.ts`）を把握し、locator更新を実装範囲に含める |

---

## 4. 戻り導線シナリオ（B-1）

| ID | 操作 | 期待 |
|---|---|---|
| Q-BN-01 | 候補編集画面（`candidate-detail`）を1366pxで開く | 「一覧に戻る」active link（`<a href="/e/[shareToken]">`）が可視。スクロール不要で到達できる |
| Q-BN-02 | 候補編集画面を375pxで開く | 同上。横溢れなくトップバー内に収まり到達できる |
| Q-BN-03 | 「一覧に戻る」active linkをクリック／Enter | `/e/[shareToken]`（同一Eventのダッシュボード）へ遷移する |
| Q-BN-04 | ブランド名リンクをクリック | `/`（トップ）へ遷移し、ダッシュボード遷移と区別される |
| Q-BN-05 | 候補編集で候補を削除 | 既存の `router.push('/e/[shareToken]')` で戻り、Q-BN-03の遷移先と一致する |
| Q-BN-06 | ダッシュボード（`dashboard`）を表示 | 「一覧に戻る」が**非リンク要素**で表示され、`aria-current="page"` を持ち、クリック・Enter・Spaceで遷移しない。`<a>`（リンク）としては描画されない |
| Q-BN-07 | ゲスト名前選択・オーナー初期セットアップを表示 | 各view modeでトップバーが現行の文言・動作を維持している（E2Eで確認。本スライスで変更していない） |
| Q-BN-07b | 読み込み中（`loading`）の維持 | `loading` は一過性表示のためE2E assertionで取り逃しやすい。**コードレビュー**または初期描画を確実に捕捉する方法で現行維持を確認する。test-only待機や本番コードの遅延は追加しない |
| Q-BN-08 | 支援技術で戻り導線を読む | active時は遷移先が分かるaccessible name、`dashboard` では `aria-current="page"` で現在地が分かる |
| Q-BN-09 | ヘッダー以外を確認 | 新しい戻るボタン・パンくず等のナビ要素が追加されていない |

---

## 5. サマリー表シナリオ（B-2）

### 5.1 配置・構造

| ID | 入力 / 操作 | 期待 |
|---|---|---|
| Q-DS-01 | Candidate 3件のダッシュボードを表示 | `DashboardSummaryTable` が `EventHeading` の直後、既存 `dashboard-section` の前に表示される |
| Q-DS-02 | 同上 | サマリー表とカード群が同じ候補順（`created_at ASC, id ASC`）で並ぶ |
| Q-DS-03 | 同上 | semantic `<table>` で3候補が3行、列見出しと sr-only caption を持つ |
| Q-DS-04 | Candidate 0件で表示 | サマリー表（`<table>`）自体が描画されず、既存「候補はまだありません。」だけが残る |
| Q-DS-05 | カード群・回答者名義controlを確認 | 従来カード（`DashboardCandidateControls` 含む）と `dashboard-identity-bar`・`CandidateAddForm`・`ShareLinks` の内容・操作・順序が不変 |
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
| Q-DS-14 | `decisionState=clear` の候補 | サマリー行にカードと同じCSS custom properties（soft背景を行全体・前景色を先頭セル左境界）と支援技術向け状態名が反映される |
| Q-DS-14b | `decisionState=none` の候補 | 通常背景と `--line`。状態色を付けない |
| Q-DS-15 | 各行の件数・状態 | 同一候補のカード表示と件数・状態が一致する |

### 5.3 操作・伝播

| ID | 操作 | 期待 |
|---|---|---|
| Q-DS-16 | サマリー行の**余白**（非interactive領域）をクリック／タップ | 対象Candidateの候補編集画面（`/e/[shareToken]/c/[candidateId]`）へ遷移する |
| Q-DS-16b | 候補名リンクにフォーカスして**Enter** | 同じ候補編集画面へ遷移する（キーボード正規ナビ） |
| Q-DS-16c | 行コンテナのフォーカス挙動 | `role="link"`＋`tabIndex=0` の二重フォーカスがなく、フォーカス対象が候補名リンクに限定される |
| Q-DS-17 | サマリー行内のURLリンクをクリック | 外部URLが別タブで開き、候補編集への遷移が発火しない（interactive descendant伝播分離） |
| Q-DS-18 | サマリー表を操作 | ○ / − / ×・❤️・🌀・コメントの編集controlがなく、個人名義操作が発生しない |
| Q-DS-19 | ダッシュボードでVote等をmutation | 成功後の完全状態再取得で、サマリー表とカードが同じ最新状態を反映する |
| Q-DS-20 | ネットワーク/DB監視 | サマリー表描画が独自fetch・pollingを発火せず、mutationも呼ばない |

---

## 6. レスポンシブシナリオ

| ID | 幅 | 期待 |
|---|---|---|
| Q-RS-01 | 1366px | semantic `<table>` が読みやすく並び、候補間を上下に比較できる。ページ幅は `.page-shell`（最大1120px）を維持 |
| Q-RS-02 | 375px | 1候補が2段grid（1段目=候補名全幅＋URL全幅、2段目=⭕️➖❌・❤️・🌀を3領域横並び）で表示される |
| Q-RS-03 | 375px | ページ全体の横スクロールが発生せず、table wrapperだけの横スクロールにも逃がしていない。長いURLでも横溢れしない |
| Q-RS-04 | 375px | 行余白クリック・候補名リンク・URLリンクのタップ対象が重ならず、誤タップしにくい |
| Q-RS-05 | 両幅 | 「行余白クリックで候補編集・候補名リンクはキーボード正規ナビ・URLは別タブ」の操作モデルが一致する |
| Q-RS-06 | 375px | DOMが全幅で同一のsemantic table（`table/thead/tbody/tr/th/td`）のまま維持され、375pxではCSS上の見せ方だけを2段化している（div一覧へ差し替えていない） |

---

## 7. 回帰・非改変シナリオ

| ID | 確認 |
|---|---|
| Q-REG-01 | Slice 1 / 2 / 5 の既存E2Eがgreen |
| Q-REG-01b | `tests/slice-2.spec.ts` / `tests/slice-5.spec.ts` の「候補一覧」locatorを「一覧に戻る」へ更新し、両specがgreen |
| Q-REG-02 | 候補編集画面の回答者行モデル（選択行編集 / 非選択行read-only / 名前変更 / 2段階削除）が退行していない |
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
- Vercel本番（kimenosuke.com）での最小smoke（ダッシュボード表示 / サマリー行余白→候補編集 / 候補編集→一覧に戻る / URL別タブ）の結果
- `[E2E]` データの残存有無と、**別承認**のcleanup手順での後処理予定

いずれかが未達・不明の場合は完了報告としない。
