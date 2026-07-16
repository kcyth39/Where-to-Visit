# 06 QAフロー（きめのすけ）

作成日: 2026-07-08 / 最終改訂: 2026-07-12 / フェーズ: Phase 2（品質定義）

関連: [05_dod.md](05_dod.md) / [03_requirements.md](03_requirements.md) / [ADR-0003](adr/0003-evaluation-and-decision-logic.md) / [ADR-0004](adr/0004-permission-model.md) / [ADR-0006](adr/0006-collaborative-response-row-model.md) / [ADR-0007](adr/0007-event-views-and-criterion-feedback.md) / [ADR-0008](adr/0008-local-supabase-development-workflow.md) / [共同編集型・回答者行モデル 詳細QA](reports/collaborative-response-row-qa-2026-07-11.md) / [Local DB開発リファレンス](reports/supabase-cli-docker-development-reference-2026-07-12.md)

> 詳細なunit / E2E / DB負系ケースとIDは上記詳細QAを正とする。
>
> **実施状態（2026-07-14）:** ADR-0006 / ADR-0007 / ADR-0008のlocal migration、clean-chain、DB負系、Advisor、local / remote E2E、Production smoke、その時点で生成されたremote／Productionの`[E2E]`データcleanupは完了済みで、当該cleanupを再計画・再実行する残作業はない。以下のcleanup gateは、今後のQAで新たに生成される`[E2E]`データを都度後処理する標準手順として維持する。

---

## 1. フロー

1. **着手前:** `pwd`、branch、remote、ahead/behind、`git status`、AGENTS.md / CLAUDE.md一致、local / remote phase、使用profile、次の承認境界を確認する。
2. **docs gate:** ADR-0006 / ADR-0007 / ADR-0008と正本、旧Slice文書のSUPERSEDED境界を横断検索する。
3. **CLI preflight:** 固定CLI 2.109.1の`--help`で、予定する`start --network-id`、`migration new / list / up --local`、`db query / reset / advisors --local`のsubcommand・flagが実在することを確認する。
4. **localhost gate:** project専用networkでstackを起動し、全公開portのHostIpとportを検査する。localhost以外なら即停止する。
5. **target gate:** local / remote profileと`config/supabase-targets.json`を値非表示で照合する。PlaywrightとNext.jsが同じtargetを使うことを確認する。
6. **migration baseline:** 既存migration一覧とSHA-256を記録し、適用済みmigrationに変更があれば停止する。
7. **advisor migration local gate:** `request_header`訂正migrationをlocalへ増分適用し、function定義、security mode、固定`search_path`、advisorを確認する。
8. **本筋migration local gate:** ADR-0006 / ADR-0007 migrationをlocalへ増分適用し、schema・RLS・policy・GRANT・trigger・FK・index・負系をpostflightする。
9. **clean-chain gate:** localデータ破棄を確認して`npm run supabase:db:reset`を実行し、Docker proxyのDB create観測と全HostIp検査を確認したうえで、既存履歴＋新規migrationを空DBから再現してpostflightとadvisorを再実行する。
10. **local E2E:** focused test後に`npm run test:e2e:local`、`npm run check`、`npm run build`、`git diff --check`を通す。
11. **remote cleanup gate:** 必要な既存データを現行schema profileでdiscovery / ROLLBACK / COMMITの別承認によりcleanupする。
12. **remote migration gates:** advisor訂正、本筋migrationをそれぞれ別承認で人間がSQL Editorへ全文適用し、各適用後にremote postflightする。
13. **remote E2E:** 別承認後に`npm run test:e2e:remote`で回帰と新規シナリオを実行する。
14. **visual QA:** 375×812と1366×768のスクリーンショットを確認する。
15. **publish gate:** local / remote結果と差分を報告し、commit、push、Vercel確認、E2E cleanupを別々に承認する。

失敗時は追加修正を重ねる前に、原因、影響範囲、DB状態を報告する。既存migration編集、逆migration、force pushを行わない。

---

## 2. 主要QAシナリオ

| ID | シナリオ |
|---|---|
| S1 | きめること・任意のつたえておきたいことを作成し、Participant 0件のまま共有URL＋owner URLを発行。owner path Cookieとowner URLで編集権限を回復 |
| S2 | オーナー初期セットアップでお名前と「候補の追加」を表示。名前確定後も同じ画面でCandidate追加へ進み、「さあ、きめよう！」後はみんなに送るリンクを中央に表示。「わたしの意見を入力」で同じタブのowner候補一覧ダッシュボードへ進む |
| S3 | 未選択ゲストに既存名と直下の直接入力だけを表示し、既存選択または新名確定後は候補一覧へ進む。現存localStorage選択で再訪した場合は候補一覧を直接表示 |
| S3a | 別ブラウザでowner URLを開き回答者未選択でも候補一覧を表示し、きめること・つたえておきたいことを編集可能。個人名義操作時だけ名前選択を要求 |
| S4 | 同名確認で本人なら既存行、別人なら異なる名前を要求。同時UNIQUE競合でも同名確認へ遷移 |
| S5 | 未選択の個人名義操作を保留し、Participant解決後に一度だけ再開。明示操作起因blurと連打で二重実行なし |
| S6 | Candidate / Criterion追加はdraftなし・未選択なら`created_by=NULL`、selected行があればそのID、非空draftなら解決後のID |
| S7 | 候補一覧にきめること・つたえておきたいことと操作可能なCandidateサマリーを表示し、Candidate名から候補編集へ進む。重複する候補タイルと回答者別編集controlを出さない |
| S8 | 候補編集の候補タイル内で選択中回答者の○ / − / ×、判断基準別❤️ / 🌀、その下のコメントを操作。未選択時は名前選択後に一度だけ再開 |
| S8a | 「みんなの判断」は全回答者をread-only表示し、コメント全文を表示。行click・行内編集control・名義変更を発生させない |
| S8b | 候補内容の編集・❤️／🌀反応項目の編集・判断者名の変更／削除を一覧下へ配置。候補内容だけを＋／−付き開閉UIからインライン表示し、残る2つをmodalで表示する。modal導線2件はデスクトップで同一行・文言改行なし、モバイルで横幅不足時だけボタン単位・文言とも折り返せる。反応項目追加は既存一覧の下、判断者名はmodal表示時点で編集可能で、変更・キャンセル・右端の削除を同一画面に置く。削除確認中は「消す／キャンセル」だけを表示 |
| S8c | サマリーの反応入力で「反応項目の追加」を選ぶと、候補編集と共通の❤️／🌀反応項目編集modalへ進み、追加後の項目が反応入力へ反映される |
| S9 | Vote行なしを未評価、`neutral`行を能動−として区別し、○ / − / ×を1行upsert。候補一覧の`➖`はneutralだけを集計し、raw duplicate INSERTはUNIQUE拒否 |
| S10 | Candidate×ParticipantのCommentを最大1件に保ち、明示保存で上書き、空保存で削除 |
| S11 | ❤️ / 🌀を同じCandidate×Participant×Criterionへ独立付与でき、各行数を単純合計して付与者とともに表示。最終候補判定へ不使用 |
| S12 | clear / discussion / fallback / noneの全分岐、同率、混在タイ、○0、clear存在時のfallback抑止をpure unitで検証 |
| S13 | `Candidate.created_at`の0秒、60分、24時間、未来時計ズレを固定clockで検証。未来は0へclamp |
| S14 | Participant / Candidate / Criterion削除時のcascade / set null、別Event参照、不変列、RLS、GRANTをanon clientで検証 |
| S15 | mutation成功後にページ再読み込みなしで完全状態へ置換し、失敗時は直前状態とdraftを保持 |
| S16 | share URL / owner URLでevent ID固定localStorageキーを共用し、削除済み行を自動解除 |
| S17 | 375×812と1366×768でoverflow・重なりなし。候補一覧と候補編集の情報階層、非選択コメントclamp、確認画面1件表示を確認 |

---

## 3. Candidate作成相対時刻

全ケースでブラウザ時計を固定する。

| 経過 | 期待 |
|---:|---|
| `created_at`が現在より未来 | `max(0, now - created_at)`で0へclampし「1時間以内に追加」 |
| 0〜59分59秒 | 1時間以内に追加 |
| 60分〜23時間59分 | 切り捨てたN時間前に追加 |
| 24時間〜47時間59分 | 1日前に追加 |
| 48時間以上 | 切り捨てたN日前に追加 |

Candidate編集後も元の`created_at`を維持する。Vote / Reaction / Criterion別Concern / Commentの時刻は試験・表示対象にしない。

---

## 4. 最終候補判定の代表例

| 候補 | 期待 |
|---|---|
| A ○5×0、B ○3×0 | A clear、B none |
| A ○5×0、B ○5×0 | A/B clear |
| A ○5×1、B ○3×0、C ○1×0 | A discussion、B fallback、C none |
| A ○5×1、B ○3×0、C ○3×0 | A discussion、B/C fallback |
| A ○5×0、B ○5×1、C ○4×0 | A clear、B discussion、C none |
| A ○5×2、B ○3×1 | A discussion、B none、fallbackなし |
| 全候補○0 | 全候補none |

大量の判断基準別❤️・🌀を追加しても判定結果が変わらないことを確認する。

---

## 5. Migration / DBゲート

### 5.1 Local

- `npm run supabase:start`後、stack state、service、port、HostIpだけを確認し、raw statusのkey・passwordを報告へ貼らない。
- `npm run supabase:migration:list`と既存migration hashを増分適用前後で記録する。
- `npm run supabase:migration:up`後、owner参照撤去、Participant制約、Vote、Criterion別Concern、Comment一意性、RLS、policy、GRANT、trigger、FK delete action、indexを確認する。
- tokenなし、不正token、別Event参照、重複、不変列、cascade / set nullをlocal anon clientまたはDB testで検証する。
- `npm run supabase:db:advisors`を実行し、既知警告の解消と新規警告なしを確認する。
- clean-chain replay後も同じ結果であることを確認し、`npm run test:e2e:local`の証跡をremote結果と混同しない。

### 5.2 Remote

- cleanup対象Event ID・件数をpreflightで記録し、destructive SQL、削除順、対象限定条件、rollback点を実行前に提示する。
- 人間がproject、database、role、PostgreSQL majorを確認し、新規SQL Editor queryでmigration全文を一度だけ実行する。
- SQL Editor適用はCLI migration historyを更新しないため、filenameだけで適用済みと判定せず、実object・dataのpostflight証跡を残す。
- remote E2EデータへEvent・Candidate・Participant・Commentの`[E2E]`マーカーを付ける。
- E2E後、作成件数とIDを報告し、人間承認後のcleanup SQLで削除する。

---

## 6. 合格報告

- E2E総数 / PASS / FAIL / SKIP、skip対象名と理由
- local / remoteのtarget、正式command、E2E総数と結果を別々に記録
- Slice 1 / 2 / 5回帰結果と新規シナリオ結果
- `check / build / diff --check`
- migration名、local増分・clean-chain・advisor結果、remote適用・postflight結果
- 375px / 1366px目視結果
- 変更ファイル、working tree、commit / push未実行または実行済み状態
