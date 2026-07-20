# 開発・事業活動 現在地レポート（2026-07-16）

- 作成日: 2026-07-16
- 最終改訂: 2026-07-20
- ステータス: **PR #1〜3 baseline closeout完了**。
- 位置づけ: B-1/B-2、B-3、PR #3のmain統合・正式local gate・Production受入・cleanupまでの到達状況を記録する、PR #1〜3 baseline closeoutの履歴スナップショット。2026-07-14計画書（Git未追跡・当時のスナップショット）を置き換えた当時の現在地参照先であり、以後の現行トラッカーは[2026-07-17ロードマップ](development-and-business-activity-plan-2026-07-17.md)とする。
- 完了判定の注意: 今回のbaselineで生成済みのlocal／Production `[E2E]`データはcleanup済み。今後新たに生成されるQAデータのcleanup運用は継続する。

> B-1/B-2、B-3、PR #3は**main統合・正式local gate・Production受入・200% resize・local／Production cleanupまで完了済み**。対象baselineはmerge commit `95996e4af484634a786168aa2f67a6959dfed664`である。

---

## 0. サマリー

- B-1（戻り導線改善）／B-2（ダッシュボードサマリー表）は**main統合済み・local検証済み・Production browser QA済み**（PR #1、merge commit `bc53f71`）。
- B-1/B-2の残ゲートはない。今後新たに生成されるQAデータのcleanup運用は継続する。
- **B-3（ブランドヘッダー刷新）／PR #3（Candidate draft保持）**は`main`統合済み。正式local gate、200% resize、Production smoke、local／Production cleanupを完了し、baseline closeoutの残ゲートはない。

---

## 1. Gitの現在地（2026-07-17 closeout対象）

- closeout baseline: `origin/main` `95996e4af484634a786168aa2f67a6959dfed664`（PR #3 merge）。
- PR #1: `bc53f71`、PR #2: `b85c853`、PR #3: `95996e4`。いずれも通常merge済み。
- 正式local gateは`95996e4`とtree OIDが一致するcheckoutで実施した。
- mainへ統合済みの5 commits（順序・SHAを保持）:
  - `6cfbe27` feat: add dashboard summary and back navigation
  - `fff121f` feat: refine setup, summary, and candidate detail UX
  - `ed84d9b` docs: sync canonical UI specifications with local implementation
  - `166fa66` docs: update collaborative UI implementation records
  - `6546deb` feat: refine collaborative candidate editing UX
- 統合結果: 5 commitsを保持した通常merge commit。**squash・rebase・force pushは未使用**。PR merge時のVercel関連checksは2件ともSUCCESS。

### 1.1 PR #3後の正式local gate（2026-07-17）

- `npm run test:e2e:local`: 15 total / 14 PASS / 0 FAIL / 1既知SKIP。
- 既知SKIP: `Slice 1 setup state › shows a configuration error instead of using a local fallback`。Supabase設定済み環境ではsetup warningを表示しないため。
- PR #3のCandidate draft保持回帰test、B-3専用test、Slice 1／2／5、B-1/B-2 testはPASS。
- `npm run check`、`npm run build`、`git diff --check`: PASS。
- local target、localhost bind、migration 8本一致を確認。検証後stackを停止し、persistent volumeを保持した。

---

## 2. B-1/B-2 実装の達成内容

- ダッシュボード上部の操作可能なサマリー表（1候補1行のsemantic table、候補名=候補編集への実リンク、外部URL=別タブ、行余白=非操作、表内で⭕️ ➖ ❌・❤️ / 🌀を操作、`decisionState`状態色、375px 2段表示）。
- 戻り導線の view mode化: candidate-detail=`一覧に戻る`（実リンク）、loading/guest-selection/owner-setup=`候補一覧`（現行維持）、**dashboard=ナビなし**。
- データモデル・migration・Server Action・確定ロジックは非改変（既存 `CandidateSummary` 再利用）。

> **B-1仕様refinement**: B-1初回承認時は「dashboard=非リンク『一覧に戻る』＋`aria-current="page"`」だったが、実機確認を踏まえ、2026-07-16におしげさんが「dashboard=ナビなし」へ変更を承認した。feature branchのB-1要件・DoD・QAと実装はcommit `ed84d9b`以降この契約に一致する。B-3はこの承認済みB-1契約を継承する。

### 2.1 local gate evidence（2026-07-16）

- `npm run test:e2e:local`: 12 total / 11 PASS / 0 FAIL / 1 SKIP。
- SKIP: `Slice 1 setup state › shows a configuration error instead of using a local fallback`。理由はSupabase設定済み環境ではsetup warningを表示しないため。対象B-1/B-2の意図しないSKIPは0。
- `npm run check`: PASS。
- `npm run build`: PASS。
- `git diff --check`: PASS。
- `supabase/migrations/`、`event-state.ts`、`event-types.ts`、Server Actions、依存・lockfileに本スライスの差分なし。

---

## 3. 統合・Production確認（2026-07-16実施）

| 項目 | 状態 | 記入予定 |
|---|---|---|
| merge commit | **完了** | PR #1 / `bc53f711f52c388489a2c0809250350d93d4d978` |
| Vercel Production deployment | **PASS** | `main` / `bc53f711f52c388489a2c0809250350d93d4d978` / `Ready` / `kimenosuke.com`割当を確認。Redeploy・設定変更なし |
| Production smoke 結果 | **PASS** | 固定fixtureのowner／share操作と1366×768・375×812のbrowser viewport QAが全件PASS |
| console/browser error | **PASS** | error 0件 |

### 3.1 Production smoke fixture（固定）

個別承認後、Production UIから次の**1 Eventだけ**を作成した。既存Event・非E2Eデータは変更していない。

開始前に次を非secret情報だけで確認し、1項目でも不一致・確認不能ならfixtureを作らず停止する。

- Vercel deploymentがmerge後の`main` commitで`Ready`。
- Production domainが`https://kimenosuke.com`で、対象deploymentへ割当済み。
- Supabase tracked remote targetが`https://ehmivhmsnhcrynvuahaq.supabase.co:443`と一致し、Project=`where-to-visit-dev`、Reference ID=`ehmivhmsnhcrynvuahaq`である。
- smokeとcleanupは別承認であり、本smoke承認からcleanupを推論しない。

各mutationは1回、失敗時はretryせず停止する。既存Event・非E2Eデータには触れない。

- Event: `[E2E] B1-B2 production smoke 20260716-164432-JST`
- owner側回答者: `[E2E] Owner`
- share側回答者: `[E2E] Guest`
- Candidate: 2件（URL付き1件・URLなし1件）
- custom反応項目（判断基準）: 1件（`価格どう？`）
- ○／−／×、❤️、🌀、コメントを各1回操作し、保存・集計反映を確認

### 3.2 確認操作

- owner setup、候補追加、共有導線
- サマリーの ○／−／×、❤️／🌀、反応項目追加
- 候補名から候補詳細へ遷移し、`一覧に戻る` でダッシュボードへ復帰
- **ダッシュボードでは戻り導線が表示されない**
- コメント、候補内容編集、反応項目編集、判断者名モーダル表示
- 外部URLの別タブ動作、reload後の保持、owner／share権限境界
- 1366×768・375×812 で横overflow・重なり・タップ対象・サマリー・モーダル・候補詳細を新規撮影

実施結果は全項目PASS。外部URLは`target="_blank"`・`rel="noopener noreferrer"`と新規tab生成を確認し、reload後もEvent・回答者・候補・評価・反応・コメントが保持された。owner側ではEvent編集・URL共有UIが表示され、share側では表示されないことを確認した。

### 3.3 別タブの保証定義（軽微）

外部URLの別タブは、`target="_blank"` と `rel="noopener noreferrer"` の付与、および**新規tab生成まで**を保証対象とする。別タブをバックグラウンドで開くか等の挙動はブラウザ設定依存のため対象外。

---

## 4. 完了判定と残課題

- **Production確認済みの必須条件**: 対象deploymentのReady・commit/domain一致、§3固定fixtureのowner/guest/mutation、1366×768・375×812、console/browser error 0、外部URL新規tab、reload保持、owner/share権限境界をすべて確認し、**B-1/B-2 Production browser QAをPASS**とした。
- **物理モバイル端末確認**: PASS。
- **本番cleanup**: Production smokeを含む本番アプリデータを承認済み手順で削除し、全8 application tableが0件、`all_zero = true`をSELECT-only postcheckで確認した。通常のQA後cleanup手順は今後も維持する。
- **Production evidence**: `/private/tmp/where-to-visit-b1-b2-production-evidence-20260716/`へJSON 4件・画面証跡6件を通常ファイル・非symlink・`0600`で保存済み。token、Cookie、Authorization、owner/share URL全文、raw storage、secretは保存していない。
- **B-3／PR #3 Production受入**: `main` / `95996e4` / Vercel `Ready`で、候補draft保持、Participant／Candidate作成、dashboard／candidate-detail、owner/share境界、ブランドヘッダー、metadata、1366×768／375×812、browser error 0を確認した。
- **200% resize**: 100% / 125% / 150% / 175% / 200%を人間確認しPASS。
- **Production cleanup**: 対象2 Event（participants 2、candidates 1、criteria 2、その他子entity 0）を承認済みROLLBACK／COMMIT／postcheck手順で削除し、固定UUID残存0、`[E2E]%` Event残存0を確認した。
- **Local cleanup**: 正式local gate由来の294 Eventを承認済みROLLBACK／COMMIT／postcheck手順で削除し、固定scope全8 entity残存0、`[E2E]%` Event残存0、schema／RLS／policy／migration baseline不変を確認した。

---

## 5. 正本同期の状態

- B-1/B-2、B-3、PR #3の要件／DoD／QA・`03_requirements`・`05_dod`・`06_qa-flow`・`DESIGN.md`・reports READMEを、正式local／Production／cleanup証拠へ合わせて「完了」へ同期した。
- 2026-07-17のbaseline closeout時点では、既存の未追跡レポート3件（`development-and-business-activity-plan-2026-07-14` / `documentation-maintenance-plan-2026-07-14` / `pc-migration-...-2026-07-14`）を変更・stage・追跡化しなかった。2026-07-14計画書は当時のスナップショットとして保持し、本書を当時の現在地参照先とした。以後の現行トラッカーは[2026-07-17ロードマップ](development-and-business-activity-plan-2026-07-17.md)を参照する。
- docs変更後はリンク検査・`AGENTS.md`／`CLAUDE.md` byte一致・[B-3 QA §2.1](brand-header-refresh-qa-2026-07-16.md)の既存migration全8ファイルbaseline不変・`git diff --check`を確認する。

---

## 6. 当時の次アクション（2026-07-17時点）

> 以下はPR #1〜3 baseline closeout時点の記録である。以後の完了状態と次アクションは[2026-07-17ロードマップ](development-and-business-activity-plan-2026-07-17.md)を参照する。

1. Track BとしてCandidate URL validation（C-P1-01）とEvent＋default Criterionの原子的作成（C-P1-02）を別途仕様承認する。
2. 今後のQAで新たに生成する`[E2E]`データは、通常の別承認cleanup手順で都度後処理する。
3. 対象外（Track A）: Track B実装、性能改善、Vercel設定変更、DB／migration変更。

---

## 7. 参照

- B-1/B-2: `docs/reports/dashboard-summary-and-back-nav-{requirements,dod,qa}-2026-07-15.md`
- B-3: `docs/reports/brand-header-refresh-{requirements,dod,qa}-2026-07-16.md`
- 正本: `docs/03_requirements.md` / `docs/05_dod.md` / `docs/06_qa-flow.md` / `DESIGN.md`
- 索引: `docs/reports/README.md`
