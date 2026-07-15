# 開発準備・ドキュメント整備レポート（2026-07-15）

- 作成日: 2026-07-15
- 最終改訂: 2026-07-15（最終レビューPASS・B-1/B-2承認。authority同期）
- ステータス: **承認済み記録（実装未着手）**。B-1/B-2の3点セットは承認済み・実装未着手
- 対象: フェーズB-1（戻り導線改善）／B-2（ダッシュボードサマリー表）の仕様確定、DESIGN.md新設、デザインシステム管理方針のCodex向け整備、B-3（ロゴ刷新）準備
- 起点: `development-and-business-activity-plan-2026-07-14.md`（Git未追跡・非正本ドラフト）§8 次アクション。当該planはリンクせず、必要な事実は本書で自己完結させる

> 本書は、2026-07-15におしげさんと対話しながら行った開発準備・ドキュメント整備の全記録である。コード実装は未着手であり、本書は実装着手前レビューのための棚卸しとして書く。抜け漏れなく作業と決定を記録することを目的とする。別途レビューレポート（`development-preparation-and-documentation-review-2026-07-15.md`）のP1/P2指摘を、本書と3点セット・正本群へ反映済みである（HEAD/baseline分離、Codex/Claude探索、DBゲート表現、DESIGN値訂正ほか）。

---

## 0. サマリー

本スレッドで行ったのは、フェーズB-1／B-2の仕様3点セット（要件定義書・DoD・QA実施書）のドラフト作成、その過程で生じた未決4点の確定と正本反映、デザインシステム正本 `DESIGN.md` の新設と純化、Codex向けの管理方針整備（AGENTS.md／CLAUDE.md）、そしてB-3（ロゴ刷新）の決定記録である。**いずれもドキュメント整備・仕様確定であり、`src/` のコード変更・migrationは一切行っていない。**

---

## 1. 起点の把握（現在地）

`development-and-business-activity-plan-2026-07-14.md` を読み、次を確認した。

- きめのすけ（グループ意思決定支援サービス）は Next.js（App Router）＋ Supabase（Auth不使用）＋ Vercel Pro で本番稼働中（kimenosuke.com）。
- ADR-0006／0007の共同編集型・回答者行モデルはコード・DB・UI・E2Eまで実装＆検証済み。**レビュー時点のrepository HEAD／`origin/main` は `858cec3`**。B-1/B-2が接続するアプリコードの直近実装baselineは `dac0f11`（用語統一・オーナー初期セットアップ2ステップ化・カード対話操作化）であり、その後の3commit（`ee2ebbd` / `2b4711a` / `858cec3`）はdocs整理である。「repository現在地」と「アプリコードbaseline」は区別する。
- フェーズA（在庫の刈り取り）とドキュメント整備（AGENTS/CLAUDE.mdスリム化）は完了済み。
- §8の残タスクは B-1（戻り導線）→ B-2（サマリー表）→ B-3（ロゴ）→ 性能確認 → C（運用整備）→ D（事業化）の順。

既存の `collaborative-response-row-*`（要件／DoD／QA／spec）が3点セットの雛形になることも確認した。

---

## 2. 作成・更新した成果物一覧

| 種別 | ファイル | 状態 |
|---|---|---|
| 新規（要件） | `docs/reports/dashboard-summary-and-back-nav-requirements-2026-07-15.md` | 承認済み（実装未着手） |
| 新規（DoD） | `docs/reports/dashboard-summary-and-back-nav-dod-2026-07-15.md` | 承認済み（実装未着手） |
| 新規（QA） | `docs/reports/dashboard-summary-and-back-nav-qa-2026-07-15.md` | 承認済み（実装未着手） |
| 新規（デザイン正本） | `DESIGN.md`（repo直下） | 承認済み（実装未着手）・サマリー表デザイン転記済み |
| 更新（文言正本） | `docs/reports/ui-copy-decisions.md` | 戻り導線文言を追記、2026-07-15項目を承認済みへ |
| 更新（Codex正本） | `AGENTS.md` / `CLAUDE.md` | デザインシステムの正本行・実装規約・同期対象を追記（両ファイル同一） |
| 更新（正本） | `docs/03_requirements.md` | §3.6・§6 にサマリー表・戻り導線を反映 |
| 更新（索引） | `docs/reports/README.md` | B-1/B-2（承認済み）・DESIGN.md・レビューレポートを索引へ同期 |
| 新規（本書） | `docs/reports/development-preparation-and-documentation-2026-07-15.md` | 承認済み記録（実装未着手） |

---

## 3. スコープの決定（対話ログ）

おしげさんへの確認と回答は次のとおり。

1. **着手スライス** → 「B-1・B-2 まとめて」（同一リリース単位）。
2. **ドラフトの粒度** → 「既存3点セット準拠（フル）」。
3. **B-1 戻り導線の方向** → 「既存ヘッダーリンクを改善」。
4. **B-2 サマリー行のクリック挙動** → 「行クリックで候補編集へ」。

---

## 4. 実装コードに基づくグラウンディング（重要）

要件を実態に合わせるため、`dac0f11` 時点の実装を確認し、次を確定した。

- **ルーティング**: ダッシュボードは `/e/[shareToken]`、候補編集は `/e/[shareToken]/c/[candidateId]`。候補編集画面は `EventApp` 内の `CandidateDetail` が描画する。
- **既存ヘッダー**: 全Event画面上部に `EventTopbar` が常時表示され、ブランド名リンク（`/`）と「候補一覧」リンク（`/e/[shareToken]`）を持つ。**つまり技術的にはダッシュボードへ戻るリンクが既に存在する**。プランの「戻り導線は未設置」との差異を発見し、おしげさんの判断で「既存リンクを改善」に確定した。
- **戻り遷移先の整合**: 候補削除後の処理は既に `router.push('/e/[shareToken]')` でダッシュボードへ戻る。戻り導線の遷移先はこれと一致させる。
- **集約読取モデル**: `CandidateSummary`（`src/lib/event-state.ts` で生成）が既に `positiveCount` / `neutralCount` / `vetoCount` / `heartCount` / `concernCount` / `decisionState` / `relativeCreatedAt` / `proposerName` / `candidate.title` / `candidate.url` を保持する。**サマリー表はこの既存集約をそのまま再利用でき、データモデル・migration・新規Server Actionは不要**と判断した。
- **`neutralCount` の意味**: `value === "neutral"` のVote行数のみを数え、Vote行のないunratedは含まない。要件の「`➖` は能動neutralのみ・unrated除外」は実装事実と一致することを確認した。
- **候補名の代替表示**: タイトル未入力時は既存コードと同じ正確な文字列「リンク候補」を表示する（`EventApp.tsx` の `summary.candidate.title || "リンク候補"`）。

この結果、**B-1／B-2はUI専用スライス**（DB・データモデル・確定ロジック非改変）として設計した。

---

## 5. B-1／B-2 要件の骨子

### B-1 戻り導線改善（要件ID `BN-1.x`）

- 既存ヘッダーの戻りリンクを改善し、新規ナビ要素は追加しない。
- 遷移先は `/e/[shareToken]`（候補削除後の遷移と一致）。
- 候補編集画面の375px／1366pxで常時可視・スクロール不要で到達。
- ブランド名リンク（`/`）と戻りリンク（ダッシュボード）の役割を文言・配置で区別。
- アクセシブル名を付与。

### B-2 読み取り専用サマリー表（要件ID `DS-2.x`／`RS-3.x`）

- ダッシュボード上部（きめること・つたえておきたいことの下、従来カード群の上）に新設。従来カード（`DashboardCandidateControls` 含む）は非改変。
- 1候補1行で全Candidateを既存 `state.candidates` の並び順で表示。
- 列は「候補名／リンク／⭕️ ➖ ❌／❤️／🌀」の最小構成。追加時期・提案者・コメントは出さない。
- 行余白（非interactive領域）クリックで候補編集へ遷移。候補名は実リンク（キーボード正規ナビ）。URLリンクは別タブで開き、interactive descendantの伝播を分離。
- 読み取り専用（評価・❤️・🌀・コメントの編集controlを持たず、個人名義操作を発生させない）。
- `decisionState` のsemantic colorと状態名をカードと同じ意味で反映。
- mutation成功後の完全状態再取得でカードと同じ最新状態を反映（独自fetch・pollingなし）。

### 非機能・権限

- 375×812／1366×768同格、ページ全体の横スクロールを出さない。
- 権限モデル（ADR-0004）不変。読取専用のため新規RLS/policy/GRANT不要。

---

## 6. 未決4点の確定と反映

要件ドラフト時に4点を未決として立て、おしげさんの判断で全て確定・反映した。

| ID | 項目 | 確定 |
|---|---|---|
| BN-1.3 | 戻り導線の文言 | 「**一覧に戻る**」 |
| BN-1.5 | ダッシュボード上での扱い | **非活性（非リンク要素＋`aria-current="page"`、クリック・Enter・Spaceで遷移なし。`<a disabled>` は使わない）** |
| RS-3.2 | モバイル表示 | **375pxは指定の2段grid**（DOMはsemantic table維持、見せ方だけ2段化）。ページ／wrapper横スクロールなし |
| DS-2.12 | サマリー行への色反映 | **カードと同じCSS custom properties**（soft背景を行全体・前景色を先頭セル左境界、`none`は通常面＋`--line`） |

反映先:

- 要件定義書 §4 の該当ID本文へ「決定・2026-07-15」を明記し、§8を「未決事項」→「決定事項（解消済み）」へ書き換えた。
- `ui-copy-decisions.md` に改訂履歴（2026-07-15）を追加し、イベント詳細画面の確定コピー表へ「ヘッダー戻りリンク＝一覧に戻る／ダッシュボードでは非活性」を追記した。

---

## 7. 事実修正（集約ロジックの所在）

3点セット初稿で集約ロジックを `events.ts` と記していたが、実際の所在は `src/lib/event-state.ts`（`CandidateSummary` 生成・`decisionState` 判定・件数算出）であることを確認し、要件・DoD・QAの該当箇所を全て `event-state.ts` に修正した。

---

## 8. DESIGN.md の新設と純化

### 経緯

1. おしげさんの依頼で、現状仕様を反映した最低限のDESIGN.mdを初版作成（色トークン・状態色・タイポ・レイアウト・ブランド・課題・管理方針を含む）。
2. その後、「DESIGN.mdは公式Anthropicのガイドラインに従い、開発課題や管理方針を混ぜない」との指示を受け、**デザイン内容だけに純化**した。

### 純化の根拠（製品別の事実とローカル判断）

製品別の事実は§9に一度だけ記す。要約すると、Anthropic公式が直接説明するのは Claude Code の `CLAUDE.md`（簡潔・人間可読に保ち、リポジトリの規約・スタイル方針を置く）であり、`AGENTS.md` は OpenAI Codex 側の仕組みである。DESIGN.mdの純化（デザイン内容のみに絞り、管理方針はコンテキストファイルへ）は、この公式の**趣旨から導いたローカルなrepo設計判断**であって、公式の直接要件ではない。参照は§9末尾に集約する。

### 現在のDESIGN.md（デザイン内容のみ）

- カラートークン（`--ink` / `--muted` / `--line` / `--surface` / `--surface-soft` / `--accent` `#1e7a57` / `--accent-strong` `#13583f` / `--danger` / `--success` / `--shadow`／ページ背景 `#f7faf7`）。
- 最終候補状態の状態色（`clear` `#2d7a55`／`discussion` `#b64b45`／`fallback` `#ad7a13`／各soft、`none` は色なし）。実値を記載。
- タイポグラフィ（現状 `system-ui` 系ゴシック／サンセリフ、Webフォント未読込、ウェイト700〜800、ブランドワードマークのスタイル）。
- レイアウト（`.page-shell` `min(1120px, 100% - 32px)`、`.topbar` flex、角丸8px／ピル999px、対応幅375×812・1366×768）。
- コンポーネント表現（総合評価トリプル、❤️/🌀、コピーボタン、無効状態 `opacity .58`）。
- アクセシビリティ原則、「画像を使わずテキスト＋CSSで表現する」原則。

冒頭に「文言は `ui-copy-decisions.md`、機能・確定ロジックは `docs/`・`docs/adr/` が正本」という棲み分けのみ一行で記載。開発課題・管理方針は含めない。

**レビュー反映（サーフェス幅の訂正）**: 初版DESIGN.mdは「`.event-surface` 系は最大720〜760px目安」としていたが、現行CSSでは `.event-surface` に max-width はなく（`min-width:0` のみ）、外枠は `.page-shell` の最大1120pxである。max-width 760px を持つのは `.setup-message`。DESIGN.mdを「`.event-surface` は `.page-shell` 幅内でmax-widthなし。`.setup-message` は760px」へ訂正した。5列サマリー表のデスクトップ一覧性のため、本スライスでは現行の最大1120pxを維持する。

---

## 9. 管理方針のCodex向け整備（AGENTS.md／CLAUDE.md）

### 判断

Codexが自動探索するのは `AGENTS.md`（およびOpenAI Codex側で設定するfallback filenames）であり、`CLAUDE.md` は標準のCodex探索名ではない。一方 Claude Code は `CLAUDE.md` を自動で取り込む。本repoでは両ツールへ同じ共通方針を渡す**運用上の判断**として、両ファイルをbyte-for-byte同期している（Codexが `CLAUDE.md` も標準で自動読込する、という意味ではない）。独立した管理方針ファイルはどちらのツールも自動では読まないため、**管理方針はこの2ファイルへ集約**した（`cp` で両ファイル完全一致を確認）。

なお、Anthropic資料は `CLAUDE.md` を簡潔・人間可読に保つことを推奨するが、「DESIGN.mdに管理方針を置いてはいけない」と直接定めているわけではない。DESIGN.mdの純化は、公式ガイドラインの趣旨（規約はコンテキストファイルへ）から導いた**ローカルなrepo設計判断**であり、公式要件そのものではない。参考: [OpenAI: AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md.md) / [Anthropic: Claude Code Best Practices](https://code.claude.com/docs/en/best-practices)。

### 追記内容

1. 「詳細仕様の正本」表に行を追加: `デザインシステム｜色トークン・semantic状態色・タイポ・レイアウト・コンポーネント表現の正本。UI/見た目の実装は本書に一致させる｜DESIGN.md（repo直下）`。
2. 「実装の規約と制約」に追加: UI・見た目は `DESIGN.md` を正本とし一致させる／デザインを変えるスライスは同じ作業内で `DESIGN.md` を更新する／`DESIGN.md` にはデザイン内容だけを書き、開発課題（要件定義・仕様書が持つ）や管理方針（本ファイルが持つ）を混ぜない。
3. 「着手前チェック（必須）」の正本同期対象に `DESIGN.md` を追加。

---

## 10. B-3（ロゴ刷新）の決定記録（未仕様化・次段階）

おしげさんの決定:

- **Clarity Before Choice** … 現在「きめのすけ」ロゴがある位置（ヘッダー先頭）へ配置。フォントは**Serif系**。
- **きめのすけ** … **中央**へ移動。フォントは**ゴシック維持**。
- この2要素は**全ページ固定**。
- **画像は使わない**（テキスト＋CSSで表現）。

方針として「開発課題は要件定義・仕様書に置く」に従い、この決定は**DESIGN.mdには入れず、B-3の3点セット（要件／DoD／QA）で仕様化**し、実装時にDESIGN.mdのタイポ／ブランド節へ反映する、という段取りに合意済み。B-3の3点セットは本スレッドでは未作成（次段階）。

---

## 11. 実装着手前レビューのポイント

レビュー時に次を確認いただきたい。

- B-1／B-2 要件の受け入れ条件（`BN-1.x` / `DS-2.x` / `RS-3.x`）が意図と一致しているか。
- 「UI専用・データ/確定ロジック非改変」というスコープ境界（DoD §2、QA Q-NC-01〜04）で問題ないか。
- 戻りリンク文言「一覧に戻る」・ダッシュボードでの非活性・サマリー行の色統一が意図どおりか。
- サマリー表の列（候補名／リンク／⭕️➖❌／❤️／🌀）とクリック挙動（行→候補編集、URL→別タブ）で過不足がないか。
- DESIGN.mdの記載値が現状と一致しているか（実値は実装から抽出済み）。
- AGENTS.md／CLAUDE.mdの追記でCodexへの伝達として十分か。

---

## 12. 未確定・次アクション

- **B-3 ロゴ刷新の3点セット作成**（Serif系フォントの具体指定は実装時に確定）。
- B-1／B-2 要件・DoD・QAは**承認済み（実装未着手）**。正本反映（`03_requirements` §3.6・§6、`ui-copy`・`DESIGN.md`・README）はauthority同期で実施済み。
- 次の第1commit（docs承認、`docs:`）→ 実装commit（`feat:`）→ docs完了同期commit（`docs:`）の3commit計画に沿う（commit・pushは各別承認）。
- 実装は個人開発向けGitフロー（`feat/<slice>` ＋ 4点チェック `check`/`build`/`test:e2e:local`/`git diff --check` ＋ main反映で自動デプロイ）に沿う。B-1／B-2は **DB schema・migration・remote migration適用を伴わない**ためremote DB承認ゲートは発生しないが、受け入れ検証はlocal Supabase依存E2Eであり、local profile・target・localhost bind・`[E2E]` cleanup・commit/push承認のゲートは適用される。
- 実装時のVisual QA（375px／1366px）で調整できるのは、契約を変えない見た目の細部（余白・色調・文字サイズ等）だけ。非活性のDOM契約・2段gridの構造・状態色の適用単位は要件で固定済み。

---

## 13. 参照

- 起点: `docs/reports/development-and-business-activity-plan-2026-07-14.md`
- 本スライス3点セット: `docs/reports/dashboard-summary-and-back-nav-requirements-2026-07-15.md` / `-dod-2026-07-15.md` / `-qa-2026-07-15.md`
- 文言正本: `docs/reports/ui-copy-decisions.md`
- デザイン正本: `DESIGN.md`
- Codex正本: `AGENTS.md` / `CLAUDE.md`
- 雛形: `docs/reports/collaborative-response-row-{requirements,dod,qa}-2026-07-11.md`
- 公式ガイドライン: [Claude Code memory](https://docs.anthropic.com/en/docs/claude-code/memory) / [Claude Code Best Practices](https://code.claude.com/docs/en/best-practices)
