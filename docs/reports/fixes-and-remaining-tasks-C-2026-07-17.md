# C. 修正すべき点・残課題レポート

- 生成日時: **2026-07-17 09:04 JST（UTC+09:00）**
- 最終改訂: **2026-07-17（Track A baseline closeout反映）**
- 対象baseline: `origin/main` `95996e4af484634a786168aa2f67a6959dfed664`
- 関連: [A. 現行サービス仕様](current-service-specification-A-2026-07-17.md) / [B. 現行技術仕様・実装全体](current-technical-specification-and-pr1-3-implementation-B-2026-07-17.md)
- 本書の目的: A/Bの自己レビュー、QAレビュー、ドキュメントレビューから得た修正項目を、事実・影響・最小対応・完了条件へ落とす

> 現時点で、既存データを直ちに破壊するP0障害や、PR #1〜3のmerge内容が最新mainから欠落している事実は見つからなかった。Track Aで最新mainの正式local gate、Production受入、200% resize、local／Production cleanup、正本同期を完了した。P1として残るのはCandidate URL安全契約とEvent作成原子性の2件である。

> 本書はレビュー結果と改善提案であり、既存の要件、ADR、DoD、QAを置き換える正本ではない。各修正案は、別途承認して該当正本へ反映した後に実装契約として有効になる。

---

## 1. 優先度

| 優先度 | 意味 |
|---|---|
| P0 | 即時停止・緊急修正が必要 |
| P1 | 最新mainの完了宣言または一般公開拡大前に解消・判断が必要 |
| P2 | MVPローンチ前後の品質・安全性・運用性として計画化が必要 |
| P3 | 保守性・将来拡張の技術負債 |

総数:

- P0: 0件
- P1: 2件（C-P1-01／02。C-P1-03〜06はTrack Aで完了）
- P2: 8件
- P3: 3件

---

## 2. P1 — 完了宣言・公開拡大前

### C-P1-01 Candidate URLをHTTP(S)へ制限する

**事実**

- Candidate追加・更新のserver処理はURLをtrimするだけである。
- DBはtitle/urlの少なくとも一方が非NULLであることだけを検査し、scheme・最大長・正規化を検査しない。
- 新規追加欄は`type="url"`だがclient制約にすぎず、編集欄は通常のtext inputである。
- 保存値はアプリ側で再検証せず、anchorの`href` propへ渡される。

**影響**

不正scheme、credential付きURL、異常に長いURL、意図しないrelative URLを保存できる。共有編集サービスとして、外部リンクの安全契約が一意でない。

**最小修正案**

1. 正本で「絶対URLの`http:` / `https:`だけ」を確定する。
2. Server Action境界で`new URL()`、protocol allowlist、最大長、credential拒否を行う。
3. DBにも可能な範囲でCHECKまたは検証functionを置き、client回避を防ぐ。
4. add/update双方へ`javascript:`、`data:`、相対URL、不正URL、credential、上限超過の負系testを追加する。

**完了条件**

- UI、server、DBの契約が一致。
- 正常なHTTP(S)と全負系がlocal E2E/DB testでgreen。

### C-P1-02 EventとデフォルトCriterionを原子的に作成する

**事実**

`createEvent()`はEvent INSERT成功後、デフォルトCriterionを別requestでINSERTする。Criterion作成失敗時はエラーを返すだけで、先に作られたEventをrollbackしない。Event削除UIもなく、tokenを利用者へ返す前なので回収不能なorphan Eventになり得る。

**影響**

部分成功時に、利用者がアクセス手段を持たないEventと不完全な初期状態が残る。

**最小修正案**

- DB transaction内でEventとdefault Criterionを作るRPCへ集約する。
- token生成・RLS・戻り値の最小権限を維持する。
- Criterion INSERT失敗を注入し、Eventも残らないことをDB testで確認する。

**完了条件**

- 成功時は両方、失敗時はどちらも0件。
- token、RLS、owner/share flowの回帰がgreen。

### C-P1-03 PR #3後の正式local gateを永続記録する（完了）

**完了結果（2026-07-17）**

- merge commit `95996e4`と同一tree、tracked local profile、localhost bind、migration 8本一致を確認。
- `npm run test:e2e:local`: 15 total / 14 PASS / 0 FAIL / 1既知SKIP。PR #3回帰testはPASS。
- 既知SKIPは`Slice 1 setup state › shows a configuration error instead of using a local fallback`（Supabase設定済み環境ではsetup warningを表示しないため）。
- `npm run check`、`npm run build`、`git diff --check`: PASS。結果を正本QAへ同期した。

### C-P1-04 最新mainでB-3とPR #3をProduction確認する（完了）

**完了結果（2026-07-17）**

- Vercel Production `main` / `95996e4` / `Ready`とdomain遷移を確認。
- owner setupのCandidate draft保持、Participant／Candidate作成、dashboard、candidate-detail、owner/share権限境界、B-3ブランドヘッダー、metadata、1366×768／375×812を確認してPASS。browser error 0。
- Production fixtureはEvent 2、participants 2、candidates 1、criteria 2、その他子entity 0として別承認cleanupへ引き渡し、ROLLBACK／COMMIT／postcheckを完了。固定UUIDと`[E2E]%` Event残存0。

### C-P1-05 B-3の200% resizeを完了する（完了）

**完了結果（2026-07-17）**

- 100% / 125% / 150% / 175% / 200%を実ブラウザ機能で確認しPASS。
- top、右ナビあり、右ナビなしで内容・link・機能を保持し、重大なclip、重なり、操作不能、2方向scrollなし。DoD／QAへ反映した。

### C-P1-06 現行正本のpublish・状態残差を同期する（完了）

**完了結果（2026-07-17）**

- `DESIGN.md`、`03_requirements`、`05_dod`、`06_qa-flow`、B-3要件／DoD／QA、現在地レポートを正式local／Production／cleanup証拠へ同期。
- B-3 publish、200% resize、Production、PR #3正式local gateを完了状態へ更新。
- A／B／Cと非正本のレポート作成手順をREADMEへ索引化。
- AGENTS／CLAUDEの正本表ポインタ変更は不要で、byte-for-byte一致を維持。

---

## 3. P2 — ローンチ品質・安全性・運用

### C-P2-01 `04_data-model.md`の読取モデル型を実コードへ合わせる

文書例の`participantId / displayName / evaluation.state / createdAt / addedAtLabel / highlight`を、実装の`participant / evaluation / candidate / relativeCreatedAt / decisionState / respondents`へ同期する。概念説明と実typeを別名で混在させない。

### C-P2-02 UI copyとADRの古い構造を整理する

- `ui-copy-decisions.md`の旧dashboard card構造を操作可能summaryへ更新。
- 「追加時期・提案者はdetailだけ」と一致させる。
- exact color「後日確定」を現行DESIGNへ同期。
- ADR-0007の「Event文脈は戻り導線あり」にdashboard非表示refinementを注記。
- ADR-0002のRealtimeを「将来採用方針」、現行MVPを「自動同期なし」と明確に分ける。

### C-P2-03 入力長・memo契約を統一する

- 新規Event formはtitle 80、memo 1000のclient上限を持つ。
- owner編集欄は同じmaxLengthを持たず、serverでもmemo 1000を強制しない。
- Candidate title/urlの上限も未定義。

正本、UI、server、DBで同じ上限・コードポイント/文字数定義を持たせ、上限超過時に汎用DB errorではなく具体的な利用者向けerrorを返す。

### C-P2-04 originをtrusted production originへ固定する

`getRequestOrigin()`は`x-forwarded-host` / `host` / `x-forwarded-proto`をそのまま共有・owner URLへ使う。Productionではcanonical originまたはallowlistへ固定し、Host headerの誤設定・poisoningで誤URLやowner token付きURLを生成しないようにする。

### C-P2-05 CI・lint・coverageを導入する

現在`.github/workflows`、lint script、coverage thresholdがない。

最低限、PRごとに次を自動化する。

- TypeScript check。
- build。
- wrapper test。
- unit/pure test。
- 安全なephemeral local Supabaseを用いたE2E、またはDB E2Eを必須manual gateとして可視化。
- lintとcoverage可視化。

### C-P2-06 cross-browser・a11y回帰を増やす

- ChromiumだけでなくWebKit/Safari相当とFirefoxを対象化。
- keyboard focus、modal focus trap、Escape、screen reader name、200% resizeを追加。
- axe等の自動検査は人間のvisual/a11y確認を置き換えず補完として使う。

### C-P2-07 公開サービスのabuse・security headerを設計する

登録不要かつshare URL保持者が共同編集できるため、一般公開拡大前に次を決める。

- Event作成・mutationのrate limit。
- 異常作成・大量書込みの観測とalert。
- CSP、Referrer-Policy、frame制御等の明示header。
- tokenやowner URLをlog・analytics・evidenceへ残さない制御。

### C-P2-08 MVPローンチ残作業を正本化する

- マイイベント一覧（Cookie）。
- 広告。
- 利用規約、プライバシーポリシー、アクセス解析。
- `docs/07_launch-checklist.md`。
- noindex継続と集客・広告開始時期の整合判断。

これらが未実装の間は「中核機能実装済み」と「MVPローンチ準備完了」を区別する。

---

## 4. P3 — 保守性・将来拡張

### C-P3-01 Event規模上限と性能budgetを定義する

全mutation後に完全EventStateを再取得し、clientでCandidate×Participantをmaterializeする。paginationや件数上限はない。

- Participant、Candidate、CriterionのMVP上限を決める。
- 上限付近のresponse time、payload、render timeを測る。
- 必要ならserver aggregate、query削減、paginationを別スライス化する。

### C-P3-02 `EventApp.tsx`を責務分割する

約1,324行のclient componentへview mode、mutation、modal、dashboard、detailが集中している。挙動を変えずに、mutation coordinator、dashboard、candidate detail、dialogへ分割する候補を作る。PR #3のfocus/pending契約をcomponent境界で失わない回帰testを先に置く。

### C-P3-03 local Git・GitHub運用状態を整理する

- 2026-07-17 09:04 JST時点で、local `main`は`cf1f002`で`origin/main`より12 commits遅れている。
- 同時点のcheckoutはPR #3 headで、treeは最新mainと同じだがmerge commitを含まない。
- GitHub CLIの保存tokenは無効との確認がある。

次の開発前に、既存のユーザー所有未追跡ファイルへ触れずにlocal mainを安全にfast-forwardし、merged branchの扱いを決め、GitHub書込みが必要なら再認証する。今回Git操作は行わない。

---

## 5. 既知の依存警告

2026-07-17の`npm audit`はcritical 0、high 0、moderate 2 package表示で、実体はNext経由PostCSSの`GHSA-qx2v-qp2m-jg93`である。

- `npm audit fix --force`は破壊的なNext downgradeを提示するため実行しない。
- stable Nextが修正版PostCSSを取り込むか、承認済みoverride検証を行える時点で再評価する。
- 再評価時はinstall後にcheck/build/full E2E/Production確認を必須にする。

これは既存の保留判断を継続したもので、今回依存を変更していない。

---

## 6. 推奨実行順

PR #1〜3の受入完了と、新しい安全性修正を別trackに分ける。baseline確認は一般公開拡大の承認を意味しない。

**Track A — PR #1〜3 baseline `95996e4`のcloseout: 完了**

- C-P1-03〜06、local／Production E2E cleanup、正本同期を2026-07-17に完了した。
- 今後新たに生成する`[E2E]`データの通常cleanup運用は継続する。

**Track B — 公開拡大前の安全性修正**

1. C-P1-01 / 02の仕様を別途承認し、該当正本へ反映する。
2. URL検証と原子的Event作成を、migration・server・負系testを含めて実装する。
3. 新しい実装commitを対象にlocal migration、DB test、full E2E、check、buildを完了する。
4. 別承認で新しいdeploymentのProduction回帰とcleanupを行う。
5. 実装状態と検証結果をdocs-only authority syncで閉じる。

その後、C-P2-01 / 02を含むP2ローンチ項目をPhase 4 checklistへ落とし、P3を独立した性能・保守スライスとして扱う。

---

## 7. QA観点の最終判定

- PR #1〜3の実装tree: **最新mainに存在**。
- static/type/wrapper level: **PASS**。
- PR #1時点のB-1/B-2 Production: **PASS記録あり**。
- PR #2 B-3最終受入: **PASS**。
- PR #3後の最新main Production: **PASS**。
- 正式local gate、200% resize、local／Production cleanup: **PASS**。
- データ安全性: **Candidate URL契約とEvent作成原子性に修正候補あり**。

よって、PR #1〜3 baselineのQA・Production closeoutは完了した。公開拡大前のP1は**C-P1-01／02の安全性修正2件**である。

---

## 8. ドキュメント観点の最終判定

- リンク、AGENTS/CLAUDE、主要正本ポインタ: **正常**。
- PR #3の挙動契約: **実装と一致**。
- publish status、DESIGN status、PR #3 QA総数: **Track Aで同期済み**。
- 本A/B/Cとレポート作成手順のREADME索引化: **完了**。
- 読取model type、dashboard copy、ADR refinement: **P2文書整備として継続**。

---

## 9. 自己レビュー記録

本書は次の誤りを避けるよう修正済みである。

- PR #1のProduction結果をPR #2/#3後へ拡大しない。
- 「PR本文に記録」と「今回再実行」を分ける。
- 未実装MVPとMVP外を分ける。
- 確定バグ、構造上のリスク、将来改善を優先度別に分ける。
- A/B/C初回作成の承認からDB／Production／cleanupを推論せず、Track Aでは各工程を個別承認で実施した。
- A/B/C初回作成時は指定3ファイルに限定し、後続のdocs-only authority sync承認後に正本・索引を更新した。

自己レビュー後の未完了P1はC-P1-01／02の2件。C-P1-03〜06はTrack Aの証拠と正本同期により完了した。
