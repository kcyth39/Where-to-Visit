# A. 現行サービス仕様・PR #1〜3実装結果レポート

- 生成日時: **2026-07-17 09:04 JST（UTC+09:00）**
- 最終改訂: **2026-07-17（Track A baseline closeout反映）**
- 対象リポジトリ: `kcyth39/Where-to-Visit`
- 実装基準: `origin/main` `95996e4af484634a786168aa2f67a6959dfed664`（PR #3 merge）
- closeout対象: merge commit `95996e4af484634a786168aa2f67a6959dfed664`と同一tree
- 判定根拠: 実コード・正本照合に加え、正式local gate、Production smoke、200% resize、local／Production cleanupの完了証拠を反映
- 関連: [B. 現行技術仕様・実装全体](current-technical-specification-and-pr1-3-implementation-B-2026-07-17.md) / [C. 修正すべき点・残課題](fixes-and-remaining-tasks-C-2026-07-17.md)

> 本書は2026-07-17時点の「利用者から見える現行サービス」を、正本と実コードの照合結果から再構成したスナップショットである。既存の要件・ADRを置き換える文書ではない。完了範囲、未検証範囲、将来スコープを分離し、PR本文に記録された結果と今回独立確認した事実を区別する。

---

## 1. 結論

きめのすけの中核である、登録不要のEvent作成、共有URLによる共同編集、回答者行、Candidate管理、`○ / − / ×`、判断基準別`❤️ / 🌀`、コメント、候補状態の自動可視化は実装済みである。

PR #1〜3はすべて`main`へmerge済みで、現在の主要UIは次の状態にある。

- PR #1: 操作可能な候補サマリー表、候補編集画面、戻り導線、共同編集UIを統合。
- PR #2: 全対象画面の共通ブランドヘッダーとsite-wide metadataを統合。
- PR #3: オーナー初期セットアップで、名前欄からCandidate欄へ移る際にCandidate draftが失われる不具合を修正。

PR #1〜3 baselineは、正式local gate、200% resize、最新mainのProduction smoke、local／Production cleanupまで完了した。これはPR #1〜3の受入完了を示すが、Track BのCandidate URL安全契約とEvent原子作成、Phase 4ローンチ準備まで完了したことは意味しない。

---

## 2. 正本と本レポートの読み方

領域別authorityは[AGENTS.md](../../AGENTS.md) / `CLAUDE.md`の「詳細仕様の正本」表に従う。以下は参照順ではなく、各文書の担当領域である。

- [03_requirements.md](../03_requirements.md): 現行サービス要件、MVP境界、実装状態。
- ADR-0003〜0008: 評価、権限、属性撤廃、回答者行、画面分離、Supabase運用の設計判断。
- [04_data-model.md](../04_data-model.md): DB、RLS、読取モデル。ただし型例の残差はCで指摘する。
- [ui-copy-decisions.md](ui-copy-decisions.md): 確定文言と文言連動挙動。
- [DESIGN.md](../../DESIGN.md): 色、タイポグラフィ、レイアウト、component表現。
- [05_dod.md](../05_dod.md) / [06_qa-flow.md](../06_qa-flow.md): 完了基準とQA。
- 実コード: 現行動作の確認材料。正本と異なる実装を自動的に新仕様とはみなさない。

履歴レポートは該当領域の正本に優先しない。競合時は領域別正本と、明示的なsupersede記録を採用する。本書で見つけた文書・実装残差は仕様へ混ぜずCに分離した。

---

## 3. サービスの役割

きめのすけは、グループの候補をサービス側で確定するのではなく、各候補に対する意見を少ない操作で可視化し、利用者自身が決めやすい状態を作る意思決定支援サービスである。

- ログイン・会員登録なしで利用する。
- Eventを「きめること」と任意の「つたえておきたいこと」で作る。
- URLを知る利用者が、Event内の回答者行・候補・評価・反応・コメントを共同編集する。
- `○`数と`×`有無から候補状態を表示するが、採択、確定、ロック、落選候補の非表示は行わない。
- 全候補を常時表示し、`❤️ / 🌀`とコメントは最終候補判定に使わない。

### 3.1 現在実装済みの中核

- Event作成、共有URL、owner URL、owner権限回復。
- 回答者行の作成・選択・名前変更・削除。
- Candidateの作成・編集・削除・提案者設定。
- Criterionのデフォルト、プリセット、自由入力、編集、削除。
- Candidate×Participantの`unrated / positive / neutral / veto`。
- Candidate×Participant×Criterionの独立した`❤️ / 🌀`。
- Candidate×Participantにつき現在値1件のコメント。
- 操作可能な候補一覧サマリーと1候補を吟味する候補編集画面。
- 共通ブランドヘッダー、レスポンシブUI、site-wide noindex。

### 3.2 MVP内だが現在未実装

- 同じブラウザで作成したEventへ戻る「マイイベント一覧（Cookie）」。
- 広告実装。

### 3.3 Phase 4ローンチ準備として未完了

- 利用規約、プライバシーポリシー、アクセス解析・計測のリリース整備。
- `docs/07_launch-checklist.md`によるPhase 4ローンチ判定。

### 3.4 現行MVP外

- ログイン、会員登録、Participantの端末横断本人認証。
- プレミアム、AI解説、通知、既読、複数Eventグルーピング。
- Realtime、定期polling、focus復帰時の自動同期。
- Event削除、評価変更履歴、コメント履歴・返信。

---

## 4. 利用者・識別・権限

| 種別 | 現行仕様 |
|---|---|
| オーナー | `owner_token`を持つcapability。Eventの「きめること」「つたえておきたいこと」だけを編集できる |
| 共有利用者 | 有効な`share_token`を含むURLを持つ人。Participant、Candidate、Criterion、Vote、Reaction、Concern、Commentを共同編集できる |
| Participant | Event内の名前付き回答行。本人認証済みユーザーではなく、共有利用者が共同編集できる行 |
| 選択中Participant | Event ID単位のlocalStorageにParticipant IDだけを保存するUI状態。RLSや権限判定には使わない |

オーナー権限と回答者行は分離されている。オーナー自身が意見を入力する場合も、一般利用者と同じParticipantを選択する。

共有URLを知る人は共有データを変更できる性善説モデルである。owner URLを共有した場合はEvent編集権限も共有される。排他的な本人確認、token rotation、監査履歴は現行MVPにない。

---

## 5. 画面とroute

| route / 状態 | 表示・役割 |
|---|---|
| `/` | Event作成。ブランドヘッダー、「きめること」、任意の「つたえておきたいこと」 |
| `/o/[ownerToken]?created=1` | Event作成直後のオーナー初期セットアップ |
| `/o/[ownerToken]` | serverでowner tokenを検証してEventを表示し、client POSTでshare path限定Cookieを確立 |
| `/e/[shareToken]` | 未選択ゲストは名前選択、有効な選択があれば候補一覧ダッシュボード |
| `/e/[shareToken]/c/[candidateId]` | 1候補の評価・反応・コメント・詳細編集 |
| `POST /api/owner-session/[ownerToken]` | owner tokenを検証し、share path限定HttpOnly Cookieを設定 |
| `/robots.txt` | 全crawlerへ`Disallow: /` |

Event UIは`loading / guest-selection / owner-setup / dashboard / candidate-detail`の5 view modeを持つ。

---

## 6. 主要利用フロー

### 6.1 Event作成

1. トップで「きめること」と任意の「つたえておきたいこと」を入力する。
2. EventとデフォルトCriterion「興味ある？」を作成する。
3. 推測困難な`share_token`と`owner_token`を発行する。
4. `/o/[ownerToken]?created=1`へ遷移する。

Event作成時にParticipantは作らない。属性選択と作成者名入力もない。

### 6.2 オーナー初期セットアップ

1. Event情報の下でお名前を選択または入力する。
2. Candidate名またはリンクの少なくとも一方を入力する。
3. 名前とCandidateがそろうと「さあ、きめよう！」を利用できる。
4. 初回共有ステップで「みんなに送るリンク」を先に表示する。
5. 「わたしの意見を入力」で同じタブのownerダッシュボードへ進む。

PR #3により、名前入力からCandidate入力へfocusを移すだけでは回答者確定を始めない。Candidate入力済みで明示的に追加した場合は、必要ならParticipantを先に解決してからCandidate追加を一度だけ再開し、Candidate draftは追加成功時だけ消す。

後日または別ブラウザでowner URLを開いた場合、初期セットアップを再表示せずダッシュボードへ進む。個人名義操作を始めた時だけParticipant選択を求める。

### 6.3 ゲスト名前選択

- 有効な選択中Participantがない場合、「あなたのお名前」、既存名、その直下の「直接入力」を表示する。
- 既存名を選ぶと行を増やさず、そのParticipantを選択する。
- 新名は非IME Enterまたはセレクター全体外への通常blurで確定する。
- trim後完全一致名がある場合は同じ人か確認する。
- Event単位localStorageに現存Participant IDがあれば、再訪時に名前選択を省略する。

### 6.4 候補一覧ダッシュボード

- Event情報、選択中回答者、操作可能なサマリー表、Candidate追加欄を表示する。
- 1候補1行でCandidate名、URL、`⭕️ / ➖ / ❌`、`❤️ / 🌀`合計を表示する。
- Candidate名だけが候補編集への実リンクで、行全体はリンクにしない。
- URLは全文をDOMテキストとして保持し、視覚上だけ省略して別タブで開く。
- `○ / − / ×`は表内で直接選択する。
- `❤️ / 🌀`はCriterion別dialogから付け外しする。
- 追加時期、提案者、回答者別詳細、コメントは候補編集へ集約する。
- 同じ情報を繰り返す候補タイルは置かない。
- dashboard自身には「一覧に戻る」等の右ナビを表示しない。

### 6.5 候補編集

- ヘッダーの「一覧に戻る」から`/e/[shareToken]`へ戻る。
- Candidate名、URL、追加時期、提案者を表示する。
- 選択中Participant名義で`○ / − / ×`、Criterion別`❤️ / 🌀`、コメントを編集する。
- 「みんなの判断」は全Participantの状態とコメント全文をread-only表示する。
- Candidate情報はインラインpanel、Criterion編集とParticipant名変更・削除はmodalで扱う。
- Candidate、Criterion、Participantの削除には確認手順を設ける。

### 6.6 URL共有・コピー

- 初回セットアップ完了後は、まず強調表示した「みんなに送るリンク」を表示する。
- 候補一覧ではCandidate追加欄の下に共有URLを表示し、オーナーには「あなた専用リンク」も表示する。
- 共有URLの「コピー」は全幅の強調button、あなた専用リンクは控えめなbuttonとする。
- コピー成功時はbutton表示を「✓」へ変え、約1.8秒後に「コピー」へ戻す。
- owner URLはEvent編集capabilityを含むため、共有URLと区別して保存・共有する。

---

## 7. データ別サービス仕様

### 7.1 Event

- `title`: UIでは「きめること」。trim後1〜80文字。
- `memo`: UIでは「つたえておきたいこと」。任意。
- title/memo編集はowner tokenだけに許可する。
- Event削除UIはない。データは無期限保存方針。

### 7.2 Participant

- trim後1〜60文字。
- Event内でtrim後完全一致名を重複させない。
- 大文字小文字、全角半角、Unicode正規化は自動同一視しない。
- 削除時はVote、Reaction、Concern、Commentをcascade削除する。
- CandidateとCriterionの`created_by`は`NULL`にする。

### 7.3 Candidate

- titleまたはURLの少なくとも一方が必要。
- 提案者は同一EventのParticipantまたは`NULL`。
- `created_at`は追加時刻で、編集後も変更しない。
- 「1時間以内に追加 / N時間前に追加 / N日前に追加」を表示する。
- 未来時刻は経過0へclampする。

### 7.4 Criterion・反応

- Event作成時にデフォルト「興味ある？」を作成する。
- 4プリセットと自由入力を追加できる。
- `❤️`と`🌀`はCandidate×Participant×Criterionごとの独立2値で、同じ組合せへ両方付けられる。
- Candidate全体の`❤️ / 🌀`は対応する行数の単純合計。
- どちらも最終候補判定に使わない。

### 7.5 Vote・コメント

| UI | 読取状態 | 保存 |
|---|---|---|
| 未評価 | `unrated` | Vote行なし |
| ○ | `positive` | Vote行あり |
| − | `neutral` | Vote行あり。能動的な中立 |
| × | `veto` | Vote行あり |

- Candidate×ParticipantにつきVoteは最大1行。
- 一覧の`➖`件数には`neutral`だけを数え、`unrated`を含めない。
- コメントはCandidate×Participantにつき現在値1件、最大500コードポイント。
- 空保存はコメント削除。履歴、返信、通知、既読はない。

---

## 8. 最終候補状態

| 状態 | 条件 |
|---|---|
| `clear` | `○`最多かつ`×`なし |
| `discussion` | `○`最多かつ`×`あり |
| `fallback` | `clear`が存在しない場合に限り、最多未満の`×`なし候補群の中で`○`最多 |
| `none` | その他、または全候補の`○`が0 |

同率候補は並列に扱う。状態はDBへ保存せず、完全EventStateの読取境界で導出する。可視ラベルで結論を断定せず、semantic color、支援技術向け状態名、`⭕️ / ➖ / ❌`実数で補完する。

---

## 9. ブランド・表示・検索

- 共通ブランドヘッダーのDOM順は「タグライン → ブランドリンク → 右レイアウトスロット」。
- 上段左: `Clarity Before Choice`（非リンク、system serif italic）。
- 上段右: candidate-detailは「一覧に戻る」、loading/guest-selection/owner-setupは「候補一覧」、dashboard/topはinteractive elementなし。
- 下段中央: `きめのすけ`（`/`へのリンク）。トップだけ`aria-current="page"`。
- title: `きめのすけ | Clarity Before Choice`。
- description: `登録なしで使える、みんなで決めるための共有サービス`。
- metadataは`noindex / nofollow`、`robots.txt`も全pathを拒否する。
- 375×812、320 CSS px、1366×768向けレイアウトを実装済み。

B-3の200% browser resizeとProduction確認は2026-07-17までにPASSし、実装済みから正式受入済みへ移行した。

---

## 10. 同期・失敗時挙動

- SSRで初期EventStateを取得する。
- ローカルmutation成功後、Event全体を再取得してclient stateを置換する。
- 失敗時は直前stateと入力draftを保持し、エラーメッセージを表示する。
- 別タブ・別ブラウザの変更は、次の成功操作または手動reload・再訪で取り込む。
- Realtime、polling、focus復帰自動refreshはない。
- 同時編集はlast-write-wins。

---

## 11. PR #1〜3の利用者影響

| PR | merge | 利用者から見える結果 | 検証状態 |
|---|---|---|---|
| [#1](https://github.com/kcyth39/Where-to-Visit/pull/1) | `bc53f71` / 2026-07-16 16:30 JST | 操作可能サマリー、候補編集、戻り導線、共同編集UIを刷新 | local E2E 12/11 PASS/1既知SKIP、check/build、Production browser QA・物理mobile・cleanupの記録あり |
| [#2](https://github.com/kcyth39/Where-to-Visit/pull/2) | `b85c853` / 2026-07-16 23:45 JST | 共通ブランドヘッダー、metadata、responsive UI | Track Aで正式local gate、200% resize、Production表示回帰をPASS |
| [#3](https://github.com/kcyth39/Where-to-Visit/pull/3) | `95996e4` / 2026-07-17 00:39 JST | owner setupのCandidate draft消失を修正 | local E2E 15/14 PASS/1既知SKIP、Productionでdraft保持・Participant／Candidate作成・owner/share境界をPASS |

PR作成時の数値とTrack Aの正式再確認を区別して記録した。Track Aでは`95996e4`と同一treeでDB依存local E2Eを再実行し、Production smokeとcleanupを別承認で実施した。

---

## 12. QA観点レビュー

### 12.1 確認できたこと

- 現行Playwright suiteは6 spec / 15 test。
- Event作成、owner cookie、noindex、回答者選択、Candidate CRUD、評価、反応、コメント、削除cascade、候補状態、サマリー、外部tab、responsive、ブランドヘッダー、PR #3回帰を含む。
- 今回の非DB確認ではTypeScript、Supabase wrapper test 26/26、test収集、`git diff --check`がPASS。
- migration 8件のSHAはB-3 QA baselineと一致。
- Track A正式local gateは15 total / 14 PASS / 0 FAIL / 1既知SKIP。PR #3回帰testはPASSし、`check` / `build` / `git diff --check`もPASS。
- 最新mainのProduction smoke、B-3 200% resize、local／Production cleanupとpostcheckはPASS。

### 12.2 Track A後も残る確認範囲

- Safari/WebKit・Firefoxを含むcross-browser。
- Track BのCandidate URL validationとEvent＋default Criterionの原子的作成。
- Phase 4の利用規約、プライバシーポリシー、広告・計測、ローンチチェック。

したがって、PR #1〜3 baselineは最新mainで正式受入済みだが、公開拡大前の安全性修正とPhase 4ローンチ準備は別trackとして残る。

---

## 13. ドキュメント観点レビュー

### 13.1 正常

- `AGENTS.md`と`CLAUDE.md`はbyte-for-byte一致。
- 正本ポインタはすべて実在。
- A/B/Cを含む確認対象Markdownの相対ファイルリンクは、リンク先欠落0。
- PR #3のowner setup契約は`03_requirements`、DoD、QAと実コードで一致。

### 13.2 Track Aで解消した残差と継続課題

- 2026-07-16現在地レポート、B-3 DoD、`DESIGN.md`、`03/05/06`のpublish・検証状態はTrack A証拠へ同期した。
- A/B/Cとレポート作成手順をreports READMEへ索引化した。
- `04_data-model.md`のTypeScript読取モデル例は実コードのfield shapeと一致しない。
- `ui-copy-decisions.md`に旧ダッシュボード構造と古い「後日確定」表現が残る。

後者2件はTrack Aの受入状態とは別のP2文書整備としてCへ維持する。

---

## 14. 自己レビュー記録

本書作成後、次を再照合した。

- PR番号、merge commit、merge日時、changed filesをGitHub metadataとローカル履歴で照合。
- 「実装済み」「PRに記録された検証」「今回独立確認」「未実施」を分離。
- B-1/B-2のProduction証拠をPR #2/#3後へ拡大適用していない。
- current route、view mode、権限、評価状態、候補状態を実コードと照合。
- 未実装MVPとMVP外を分離。
- 技術上の修正候補は現行仕様へ混ぜずCへ分離。

自己レビュー後の判定は、**PR #1〜3 baselineは最新mainで正式受入済み。Track Bの安全性修正とPhase 4ローンチ準備は未完了**である。
