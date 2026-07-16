# 開発準備・ドキュメント整備 最終レビューレポート（2026-07-15）

- 対象: B-1（戻り導線改善）／B-2（ダッシュボードサマリー表）の要件・DoD・QA、`DESIGN.md`、`ui-copy-decisions.md`、`AGENTS.md`／`CLAUDE.md`、README、準備レポート
- 基準HEAD: `858cec3`（`main` / ローカル追跡中の`origin/main`、ahead/behind `0 / 0`）
- レビュー方式: 前回指摘全件の再照合、実コード・CSS・テスト・package scriptsとの突き合わせ、承認候補集合のリンク検査、Git・Supabase運用境界確認
- ステータス: **承認時点の記録（当時は実装未着手）**
- 総合判定: **承認。authority同期は完了。次は第1commit（docs承認）の別承認待ち。B-1/B-2の実装開始はdocs承認commit後の別承認とする**

> 第3回レビューで残った3点（`shareToken`用途、QA Q-PRE-06、commit／正本同期順）はすべて解消した。事実性、一貫性、正本境界、権限・DB安全性、レスポンシブ、アクセシビリティ、回帰、publication手順を含め、実装者の判断で仕様が分岐する残課題はない。本レビューはB-1/B-2の要件・DoD・QAを承認する。コード・DB・migrationは未実装であり、承認は実装完了を意味しない。

---

## 1. 最終判定

| 観点 | 判定 | 結論 |
|---|---|---|
| 事実性 | **PASS** | route、既存component、集約値、候補順、neutral、CSS、test影響、ツール運用が実体と一致 |
| 一貫性 | **PASS** | 要件・DoD・QA・準備レポート・ui-copy・DESIGNの役割と用語が一致 |
| 適合性 | **PASS** | MVP境界、既存権限、UI専用、既存read model再利用、DESIGN正本方針に適合 |
| 安全性 | **PASS** | DB非改変、local target gate、cleanup別承認、commit/push別承認、3commit分離が明確 |
| 網羅性 | **PASS** | 全view mode、表示・空状態・操作・幅・アクセシビリティ・回帰・非改変・本番smokeを網羅 |
| 一意実装性 | **PASS** | observable behavior、component props、DOM、responsive、状態色、検証方法が一案に固定 |

---

## 2. 最終3修正の確認

### 2.1 `shareToken`と外部URL列

**PASS**

- `DashboardSummaryTable` propsは`candidates: CandidateSummary[]`と`shareToken: string`。
- `shareToken`は候補編集href `/e/[shareToken]/c/[candidateId]` の生成だけに使う。
- 外部URL列は`candidate.url`から表示し、`shareToken`を使わない。
- 表示値の再集計、型追加、Server Action追加は行わない。

### 2.2 QA Q-PRE-06

**PASS**

決定4点は次へ統一された。

1. 「一覧に戻る」
2. dashboardでは戻り導線を表示しない
3. 375pxはsemantic table DOMを維持した2段grid
4. カードと同じCSS custom properties

「disabled」「コンパクト折り返し」「後で調整」は採用仕様ではなく、残存を禁止するガードレールとしてのみ記載される。

### 2.3 commit／正本同期順

**PASS**

次の3commitへ固定された。

1. **docs承認commit**: 3点セット、ui-copy、DESIGN、README、`03_requirements`、AGENTS/CLAUDE、準備レポート、レビューレポートを「承認済み・未実装」へ同期。
2. **B-1/B-2実装commit**: コード、CSS、新規E2E。既存 `slice-2`/`slice-5` の「候補一覧」locatorは owner-setup 対象のため変更しない。docs正本を混在させない。
3. **docs完了同期commit**: 実装・検証後に実装状態とDoD/QA実績を「実装済み」へ同期。

各commit前の承認と、各push前の別承認を維持する。

---

## 3. 承認した一意の実装契約

### B-1 戻り導線

1. `EventTopbar`へ`candidate-detail / dashboard / guest-selection / owner-setup / loading`のview modeを明示的に渡す。
2. candidate-detailでは「一覧に戻る」の実リンクを表示し、同一Eventの`/e/[shareToken]`へ遷移する。
3. dashboardでは自己参照となる戻り導線を表示しない。
4. `<a disabled>`は使わない。
5. guest-selection / owner-setup / loadingはHEAD=`858cec3`の文言・動作を維持する。
6. ヘッダー外へ戻るボタン・パンくずを追加しない。

### B-2 サマリー表

1. `dashboard-section`内を、選択中回答者と控えめな変更button、`DashboardSummaryTable`、候補追加フォームの順にし、重複する候補カードは置かない。
2. propsは`candidates: CandidateSummary[]`と`shareToken: string`。
3. 表示値は既存`CandidateSummary`だけを使い、独自fetch・polling・再集計を行わない。
4. 全幅で`table/colgroup/tbody/tr/th/td`のsemantic DOMを維持し、説明用の見出し行は置かない。
5. desktopは5列table、375pxはCSS上だけ2段化する。ページ／wrapper横スクロールは使わない。
6. Candidate 0件ではtableを描画せず、既存空状態だけを表示する。
7. 候補名なしは正確に「リンク候補」。候補名は候補編集への実リンク。
8. 外部URLはanchorのDOMテキストを保存URL全文とし、視覚上のみellipsis。`target="_blank"`、`rel="noopener noreferrer"`、`title`なし。
9. 行の非interactive余白クリック／タップは遷移もmutationも発生させない。候補名リンク・外部URLリンク・評価controlの役割を分離する。
10. 行自体へclick handler・`role="link"`・`tabIndex=0`を付けず、候補名リンクをkeyboard正規ナビにする。
11. `clear/discussion/fallback`は既存custom propertiesのsoft背景を行全体、前景色を先頭セルの5px左境界へ適用する。`none`は通常面＋`--line`。
12. 候補編集画面、回答者名義の意味と操作、`event-state.ts`、`event-types.ts`、actions、migration、権限モデルを変更しない。

---

## 4. 検証・安全契約

- 検証は既存Playwrightへ追加し、新test frameworkを導入しない。
- `tests/slice-2.spec.ts:127` / `tests/slice-5.spec.ts:21`の「候補一覧」locatorは **owner-setup画面**に対するもので、owner-setupは現行維持のため変更しない。candidate-detailの「一覧に戻る」active linkとdashboardで戻り導線がないことは新規E2Eで検証する。
- 行余白の非遷移、候補名Enter、外部URL、表内評価、判断基準dialog、dashboardでの戻り導線非表示を別ケースで確認する。
- loadingは一過性のため、コードレビューまたは初期描画を確実に捕捉する方法で確認し、本番コードへ遅延を加えない。
- phase=`local`、`.env.supabase.local`、tracked target、localhost bindを確認後、formal evidenceとして`npm run test:e2e:local`を実行する。
- total / pass / fail / skip、全skip名と理由、対象スライスの意図しないskip 0を報告する。
- `[E2E]` cleanupはテスト実行から推論せず、別承認で行う。
- `npm run check` / `npm run build` / `npm run test:e2e:local` / `git diff --check`を実装commit前のgateとする。
- commitとpushを別承認にし、remote DB適用は行わない。

---

## 5. 文書・リンク・Git確認

| 検査 | 結果 |
|---|---|
| 承認候補集合のローカルMarkdownリンク | 57件 |
| 存在しないリンク | 0件 |
| 除外3レポートへのMarkdown依存 | 0件 |
| 除外維持 | development plan / documentation maintenance plan / PC migration reportは未追跡 |
| `AGENTS.md` / `CLAUDE.md` byte一致 | PASS |
| 正本ポインタ | PASS |
| `git diff --check` | PASS |
| staging | 空 |
| HEAD / local tracking ref | `858cec3` / ahead 0・behind 0 |
| src / tests / supabase / config変更 | なし |
| DB操作 / commit / push | 未実施 |

---

## 6. 承認と次の境界

### 承認結果

**B-1/B-2の要件・DoD・QAを承認する。**

3commit計画の第1段階である**docs authority同期作業は2026-07-15に完了**した。3点セット・`ui-copy-decisions.md`・`DESIGN.md`（status＋サマリー表デザイン転記）・`docs/03_requirements.md` §3.6/§6・README・準備レポート・本レビューレポートを「承認済み・実装未着手」へ揃え、旧状態の残差とDoD文書ゲートのチェック状態も同期済み。作業ツリー上でリンク切れ0・`AGENTS.md`／`CLAUDE.md` byte一致・`git diff --check` cleanを確認した。

次に行ってよいのは、**第1commit（docs承認、`docs:`）** である。commit前に対象ファイルと検証結果を提示し、別途承認を得ること。この承認はstaging・commit・pushの承認を兼ねない。以後は実装commit（`feat:`）→ docs完了同期commit（`docs:`）へ進み、実装開始・local E2E・cleanup・各pushもそれぞれ定められた境界（別承認）に従う。
