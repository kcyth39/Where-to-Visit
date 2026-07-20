# ブランドヘッダー刷新（B-3） QA実施書

- 作成日: 2026-07-16
- 最終改訂: 2026-07-19（owner-session安全対策による後続例外を追補）
- ステータス: **PASS（正式local gate・200% resize・Production受入完了）**
- 対象要件: [要件定義書](brand-header-refresh-requirements-2026-07-16.md)
- 完了条件: [DoD](brand-header-refresh-dod-2026-07-16.md)

> 本書はB-3（ブランドヘッダー刷新）のQA計画・実施記録である。ヘッダーはUIのみでDBを変更しないが、Event view modeの検証にはEventが要るため、既存Playwright（`test:e2e:local`・local Supabaseゲート）で検証した。375×812／1366×768の自動検証と画面証跡、200% resize、Production確認はPASSした。

> **後続の安全例外（2026-07-19）:** owner-session pending／failure中の右ナビとCandidate名について、`href`・link roleなし、`aria-disabled="true"`、focus可能性、click・Enter・中クリックでの非遷移、success後だけのhref復元・Cookie確立・owner権限維持、failure時のエラー表示・href不在・Cookie不在をlocal／remote E2Eで確認した。Spaceの非activationと標準scroll、自動retryなし、再読み込み／owner URL再オープンによる再試行は、確定契約と実装の静的照合で確認した。Productionではsuccess後のowner setup遷移、owner Cookie・owner権限、「直す」、share側の非owner境界を確認した。pending／failureはProductionで人工再現していない。現行QAは[06 QA](../06_qa-flow.md) S3b／S3cを正とし、B-1/B-2・B-3の従来実装に対するProduction受入状態も維持する。

---

## 1. QA方針

1. 承認済み要件・DoD・QAを変更せず実装する。
2. ヘッダーが公開API・DB・Server Action・migration・状態管理を変更しないことを非改変確認する（§2の既存migration全8ファイルbaseline不変）。
3. 検証は既存Playwrightに追加し、新しいtest frameworkを導入しない。
4. 中央位置・重なり・overflowは bounding box（`boundingBox()`）で数値検証する。
5. 375pxの標準表示は「375×812・標準zoom・標準文字サイズ」でタグライン上段左・ナビ上段右・ブランド下段中央・全文表示を確認する。
6. ブラウザのページzoom 100% / 125% / 150% / 175% / 200%と320 CSS px相当では複数段化を許容し、内容・機能の欠落、クリップ、重なり、操作不能、2方向scrollがないことを確認する。CSSの`zoom` propertyで代替しない。
7. 失敗時は追加修正を重ねる前に原因・影響・修正候補を報告する。
8. commitとpushを別ゲートにする。

---

## 2. 着手前・非改変QA

| ID | 確認 |
|---|---|
| Q-PRE-01 | `AGENTS.md` と `CLAUDE.md` が byte一致 |
| Q-PRE-02 | 要件・DoD・QAの用語と参照先が一致 |
| Q-PRE-03 | 対象ページが「トップ＋Event 5 view mode」に限定され、404/error/将来ページが対象外と確認 |
| Q-PRE-04 | 下表の既存migration全8ファイルbaselineと実装前後を比較し、追加・欠落・SHA変更がないことを確認 |
| Q-NC-01 | `event-state.ts` / `event-types.ts` / actions / migration に差分がない |
| Q-NC-02 | 公開API・DB・Server Action・状態管理に変更がない |

### 2.1 既存migration baseline（2026-07-16）

| Migration | SHA-256 |
|---|---|
| `20260708000000_slice_1_events_participants.sql` | `3095954154ba6f36a756028643b9c10b426b11dc76dd05ae54396c4ca00b4697` |
| `20260710000000_slice_2_candidates.sql` | `296225f686d6c46b729e4b6ff7cd9dc8f9fa38732dddcfe21e98a165f64eecb7` |
| `20260710010000_drop_attribute.sql` | `5663a48d6b6567573127fb58e071b16f637f3ac5993c9a22095c5c14d12b6311` |
| `20260710020000_slice_5_criteria_reactions_concerns_comments.sql` | `d2f08e2c934cd9ecbaf6111541e3434a67c113f60f28227ab035ef17b0832edf` |
| `20260710021000_fix_slice_5_feedback_event_guard.sql` | `7b40335d47c93baaac3f3fff7b7357560590cf71be975f0799ef409c1911adf5` |
| `20260712032345_fix_request_header_search_path.sql` | `de17038e171f652a672c2744d4148e5a6d57531995f1627855181981d8cb91ea` |
| `20260712032527_collaborative_response_row_model.sql` | `d7f97ae68322601e6a3fe146707f1c528768b85083e32c298f4a8cf56cb638a3` |
| `20260712144228_move_rls_helpers_to_private_schema.sql` | `f4b0a745ea7a6d16eb904028732da28b0bec65ff95fcb12231088caa8447f607` |

---

## 3. 構造・文言シナリオ（view mode別）

各view mode（トップ / loading / guest-selection / owner-setup / dashboard / candidate-detail）で確認する。

| ID | 確認 | 期待 |
|---|---|---|
| Q-BH-01 | 左タグライン | `Clarity Before Choice` が非リンク要素で表示。リンク・button・focus対象でない。改行・ellipsisなし |
| Q-BH-02 | タグラインのフォント | 算出 `font-family` が `Georgia, "Times New Roman", serif`、`font-style`がitalic。外部fontを読み込まない |
| Q-BH-03 | serif fallback | 指定fontが利用できない場合も、`font-family` 宣言末尾のgeneric family `serif`へfallbackする |
| Q-BH-04 | 中央ブランド名 | `きめのすけ` がゴシックで表示され、`href="/"` の実リンク |
| Q-BH-05 | focus可能要素 | ヘッダー内でキーボードfocus可能なのは `きめのすけ`（＋右ナビがある場合のみそのリンク）。タグラインはfocus不可 |
| Q-BH-06 | ホームリンクEnter | `きめのすけ` にfocusしてEnterで `/` へ遷移 |
| Q-BH-07 | 右ナビ candidate-detail | `一覧に戻る`（`/e/[shareToken]` 実リンク） |
| Q-BH-08 | 右ナビ loading/guest-selection/owner-setup | `候補一覧`（`/e/[shareToken]` 実リンク・既存維持） |
| Q-BH-09 | 右ナビ dashboard/トップ | 右レイアウトスロットは存在し、内部にlink・button等のinteractive elementがない |
| Q-BH-10 | DOM順 | 「タグライン → ブランドリンク → 右レイアウトスロット」の順。各view modeで同じ3要素を維持 |
| Q-BH-11 | 共通semantics | トップとEventでヘッダーの要素構成・semanticsが同一 |
| Q-BH-12 | `aria-current` | トップでは`きめのすけ`だけが`aria-current="page"`。candidate-detail / loading / guest-selection / owner-setup / dashboardではブランドリンク・右ナビのどちらにも付かない |

---

## 4. 中央・レイアウトシナリオ（bounding box）

| ID | 幅 | 期待 |
|---|---|---|
| Q-CN-01 | 1366px | `きめのすけ` の水平中心と `.page-shell` の水平中心の差が1 CSS px以内 |
| Q-CN-02 | 1366px | dashboard/トップ（右ナビなし）でも中央位置が維持され、左右要素幅の違いで中央がずれない |
| Q-CN-03 | 1366px | タグラインとナビが上段、ブランド名が下段となり、各bounding boxが重ならない。ページ横overflowなし |
| Q-CN-04 | 375px・標準zoom | 中央差1 CSS px以内を維持 |
| Q-CN-05 | 320 CSS px／拡大時 | タグラインは上段左、ナビは上段右、`きめのすけ`は下段中央に配置される |

---

## 5. レスポンシブシナリオ（375×812・標準条件）

| ID | 確認 | 期待 |
|---|---|---|
| Q-RS-01 | 上下関係 | タグラインは上段左、ナビは上段右、ブランド名は下段中央にある |
| Q-RS-02 | 全文表示 | 3要素とも全文表示（折返し・ellipsisなし） |
| Q-RS-03 | 重なり・overflow | 各要素bounding boxが重ならず、ページ横overflowなし、クリック領域の重複なし |
| Q-RS-04 | font指定 | 固定font sizeで、viewport比例（vw等）を使っていない |
| Q-RS-05 | 撮影 | 1366×768 と 375×812 のスクリーンショットを目視確認 |

---

## 6. metadata・残存リスク

| ID | 確認 | 期待 |
|---|---|---|
| Q-MD-01 | title | トップ、Event、404で`page.title()`が`きめのすけ | Clarity Before Choice`。root layoutによるサイト全体適用を確認 |
| Q-MD-02 | description/robots | description と `noindex`/robots が維持 |
| Q-A11Y-01 | 200% resize | ブラウザのページzoomを100% / 125% / 150% / 175% / 200%へ順に変更し、必要な複数段化後も全文・全linkが利用可能で、クリップ・重なり・操作不能がない。CSSの`zoom` propertyでは代替しない |
| Q-A11Y-02 | 320 CSS px reflow | 320 CSS px相当で2方向scroll・ページ横overflowなし。タグライン、ブランド、右ナビの情報と機能を失わない |

---

## 7. 回帰シナリオ

| ID | 確認 |
|---|---|
| Q-REG-01 | 既存「一覧に戻る」（candidate-detail）の遷移がgreen |
| Q-REG-02 | 既存「候補一覧」（owner-setup等）の遷移がgreen。既存locator（`slice-2`/`slice-5`）は変更しない |
| Q-REG-03 | B-1/B-2のサマリー表・戻り導線・ダッシュボード操作が退行していない |
| Q-REG-04 | Slice 1/2/5 の既存E2Eがgreen |

---

## 8. 合格報告

- Q-PRE / Q-NC（非改変・SHA不変）の結果
- 各view modeのQ-BH結果、Q-CN（中央bounding box数値）、Q-RS（375px）
- `page.title()` の実測
- `npm run check` / `npm run build` / `npm run test:e2e:local`（total/pass/fail/skip・全skip理由）/ `git diff --check`
- 1366×768・375×812 のスクリーンショット目視結果
- 200% resize・320 CSS px reflowの実測結果

いずれかが未達・不明の場合は完了報告としない。

### 8.1 local実施結果（2026-07-16／正式再確認2026-07-17）

- phase=`local`、tracked local profile、全公開portの`127.0.0.1` bind、migration 8本一致を確認。
- B-3専用E2E: 2 PASS / 0 FAIL / 0 SKIP。
- 全local E2E（正式再確認）: 15 total / 14 PASS / 0 FAIL / 1既知SKIP。SKIPは`Slice 1 setup state › shows a configuration error instead of using a local fallback`（Supabase設定済み環境ではsetup warningを表示しないため）。PR #3のCandidate draft保持testはPASS。
- `npm run check` / `npm run build` / `git diff --check`: PASS。
- 1366×768・375×812のトップ／candidate-detail画像を確認し、中央ずれ・重なり・横overflowなし。320 CSS pxでも情報・機能を失わずreflow。
- 100% / 125% / 150% / 175% / 200%の実ブラウザ確認はPASS。Productionは`main` merge commit `95996e4`のdeploymentでブランドヘッダー、metadata、375×812／1366×768、PR #3回帰、owner/share境界を確認してPASS。local／Productionで生成した`[E2E]`データは別承認のcleanupとpostcheckを完了した。
