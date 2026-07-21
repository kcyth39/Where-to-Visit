# 06 QAフロー（きめのすけ）

作成日: 2026-07-08 / 最終改訂: 2026-07-21 / フェーズ: Phase 2（品質定義）

関連: [05_dod.md](05_dod.md) / [03_requirements.md](03_requirements.md) / [ADR-0003](adr/0003-evaluation-and-decision-logic.md) / [ADR-0004](adr/0004-permission-model.md) / [ADR-0006](adr/0006-collaborative-response-row-model.md) / [ADR-0007](adr/0007-event-views-and-criterion-feedback.md) / [ADR-0008](adr/0008-local-supabase-development-workflow.md) / [共同編集型・回答者行モデル 詳細QA](reports/collaborative-response-row-qa-2026-07-11.md) / [ブランドヘッダー刷新QA](reports/brand-header-refresh-qa-2026-07-16.md) / [Local DB開発リファレンス](reports/supabase-cli-docker-development-reference-2026-07-12.md)

> 詳細なunit / E2E / DB負系ケースとIDは上記詳細QAを正とする。
>
> **実施状態（2026-07-14）:** ADR-0006 / ADR-0007 / ADR-0008のlocal migration、clean-chain、DB負系、Advisor、local / remote E2E、Production smoke、その時点で生成されたremote／Productionの`[E2E]`データcleanupは完了済みで、当該cleanupを再計画・再実行する残作業はない。以下のcleanup gateは、今後のQAで新たに生成される`[E2E]`データを都度後処理する標準手順として維持する。
>
> **B-1/B-2実施状態（2026-07-16）:** local E2E 12 total / 11 PASS / 0 FAIL / 1既知SKIP、Production browser QA、物理モバイル端末確認、本番アプリデータcleanupを完了。1366×768・375×812で横overflow・重大な重なりなし、browser error 0件。
>
> **B-3／PR #3実施状態（2026-07-17）:** merge commit `95996e4`と同一treeでlocal E2E 15 total / 14 PASS / 0 FAIL / 1既知SKIP、`check`、`build`、`git diff --check`を完了。PR #3のCandidate draft保持回帰はPASS。B-3の200% resize、最新mainのProduction smoke、local／Productionの`[E2E]` cleanupとpostcheckもPASSした。既知SKIPは`Slice 1 setup state › shows a configuration error instead of using a local fallback`（Supabase設定済み環境ではsetup warningを表示しないため）。
>
> **S1-a／owner-session安全対策の実施状態（2026-07-19・closeout完了）:** local／remoteとも22 total / 21 PASS / 0 FAIL / 1既知SKIPで、Candidate URLのserver／UI負系に加え、owner-session pending／success／failure、`href`・link role・`aria-disabled`・focus、click・Enter・中クリック、Cookie・owner権限、Candidate detailで保留したVoteの1回だけの再開をE2Eで確認した。Spaceの非activationと標準scroll、自動retryなし、再読み込み／owner URL再オープンによる再試行は、確定契約と実装の静的照合で確認した。Candidate URLのDB負系はpgTAP 24/24、既存DB pgTAPは28/28で、Advisor warning 0、local cleanup 19 Events、remote cleanup 17 Eventsと各postcheckもPASSした。PR #5 merge後のProduction focused smokeでは、Candidate URLの3種類の確定エラー、負系の非mutation・draft／保存値保持、HTTP／HTTPS正規化、再読込保持、外部リンク属性、owner／share権限境界、375×812／1366×768を確認した。owner-sessionはsuccess後の安全な遷移・Cookie・owner権限をProductionで確認し、pending／failureは人工再現していない。固定Production fixture 1件はCOMMIT 1回で削除し、固定UUIDと`[E2E]%`の残存0をpostcheck 2件で確認した。

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
15. **publish gate:** local / remote結果と差分を報告する。承認済みExecution ContractがGit publicationを含む場合、標準実装担当はcommit、作業branchへの通常push、Draft PR作成・更新、DoD充足後のReady化まで進める。Vercel Production確認とE2E cleanupは別のHuman gateとする。

失敗時は追加修正を重ねる前に、原因、影響範囲、DB状態を報告する。既存migration編集、逆migration、force pushを行わない。

### 1.1 PR Ready・review・merge・closeout

標準実装担当は固定されたroleではなく、Execution Contractで対象成果物の変更実行を許可された担当を指す。Fullstack Engineerだけに限定せず、PKAも文書、process、Knowledge、Skill等の承認成果物では標準実装担当になれる。ただし、PKA／Tech Leadのcode実装禁止、Reviewerの既存file更新禁止、各roleの意味変更・Production操作等の制約を上書きしない。

| 工程 | 担当 | 責任 |
|---|---|---|
| 実装・QA | 標準実装担当 | 承認scope内の実装、必要なQA、自己reviewを完了する |
| commit・push | 標準実装担当 | exact pathをcommitし、作業branchへ通常pushする |
| Draft PR作成・更新 | 標準実装担当 | Draft PRを新規作成し、現在の実装・検証に合わせてtitle／bodyを更新する |
| Ready化 | 標準実装担当 | DoD充足後、現在のHeadを正式review対象として提出する |
| review | Reviewer | 要件・DoD、scope、差分、QA、checks、conflict、mergeability、未解決指摘を確認する |
| 修正 | 標準実装担当 | 指摘へ対応し、再QA、commit、push、必要なPR更新を行う |
| 最終APPROVED | Reviewer | 現在のexact Headを承認し、merge判断可能と報告する |
| merge | User | 最終判断を行い、自らmergeする |
| branch・worktree closeout提案 | 標準実装担当 | merge後に残作業と未保存変更を確認し、今後使用しない場合は削除可能と報告する |
| branch・worktree削除 | Userまたは指定管理担当 | closeout提案と現在状態を確認し、必要に応じて別途削除する |

承認済みExecution ContractがGit publicationを含む場合、標準実装担当は作業branchへの通常push、Draft PR新規作成、既存Draft PRのtitle／body更新、修正pushに伴うPR更新、DoD充足後のReady化を、各操作の追加Human承認なしで行える。Draft PRの更新によってscopeまたは要件の意味を拡張しない。

標準実装担当権限には、最初からReady状態でのPR新規作成、review承認、merge、PR close、local／remote branch削除、worktree削除、worktree内file破棄、force push、`main`への直接pushを含めない。

Ready for reviewは、実装、必要なQA、自己review、commit、pushが完了し、現在のHeadを正式reviewへ提出できるという宣言である。修正不要、review承認済み、merge可能、Production反映承認済みを意味しない。通常のreview修正ではReadyを維持し、要件解釈の見直し、設計変更、大規模再実装、重大な既知問題、長期の修正途中状態ではDraftへ戻す。

Reviewerは最終APPROVED時に現在のHead SHA、最新Headに対するrequired checks、scope、conflict、mergeability、未解決指摘を確認する。required checkが未設定なら「設定なし」と明記し、observed checkと混同しない。APPROVED後にHeadまたは差分が変わった場合は変更部分を再reviewする。ReviewerのAPPROVEDはmerge実行権限を含まず、Userが自ら行うmerge操作が最終承認と実行を兼ねる。

merge前、標準実装担当は、作業branchがreview・merge待ちであること、worktree内の未commit差分、後続修正での継続利用予定を報告する。merge後は、PRの正常merge、必要commitの統合、未commit・未pushの必要変更なし、branch固有の残作業なし、再利用予定なしを確認する。

全条件を満たす場合は次の形式でcloseoutを提案する。

> 当該作業は完了し、このbranchおよびworktreeを今後使用する予定はありません。未commit・未pushの必要な変更はなく、必要なcommitはmerge済みです。branch削除およびworktree削除が可能な状態です。

未完了事項がある場合は削除可能と報告せず、残作業、未commit／未push変更、branchを維持する理由、次に使用する担当または工程を明示する。closeout提案は削除authorizationではなく、標準実装担当は明示依頼なしに削除またはfile破棄を行わない。

---

## 2. 主要QAシナリオ

| ID | シナリオ |
|---|---|
| S1 | きめること・任意のつたえておきたいことを作成し、Participant 0件のまま共有URL＋owner URLを発行。owner path Cookieとowner URLで編集権限を回復 |
| S2 | オーナー初期セットアップでお名前と「候補の追加」を表示。お名前からCandidate入力へ移っても入力を妨げず、名前確定後も入力済みCandidate draftを保持して同じ画面で追加できる。追加成功時だけCandidate入力をクリアする。「さあ、きめよう！」後はみんなに送るリンクを中央に表示。「わたしの意見を入力」で同じタブのowner候補一覧ダッシュボードへ進む |
| S3 | 未選択ゲストに既存名と直下の直接入力だけを表示し、既存選択または新名確定後は候補一覧へ進む。現存localStorage選択で再訪した場合は候補一覧を直接表示 |
| S3a | 別ブラウザでowner URLを開き回答者未選択でも候補一覧を表示し、きめること・つたえておきたいことを編集可能。個人名義操作時だけ名前選択を要求 |
| S3b | owner-session APIを保留したowner画面で「候補一覧」とCandidate名の表示・focus可能性を保ちつつ、`href`・link roleがなく`aria-disabled=true`であること、click・Enter・中クリックで遷移しないこと、API成功後だけ正しい`href`を復元してowner Cookieと「直す」によるowner権限を維持することをE2Eで確認する。Spaceが遷移せず標準scrollを許容することと、別タブ操作で遷移できないことは、確定契約と実装の静的照合で確認する |
| S3c | owner-session APIを失敗させ、エラー表示、owner Cookie未作成、`href`・link roleなし、click・Enter・中クリックで非遷移であることをE2Eで確認する。別タブ操作で遷移できないこと、自動retryなし、再読み込みまたはowner URL再オープンでだけ再試行し、新しいretry UIを表示しないこと、共有URLは最初から通常リンクでCandidate名は対象mutation pending中も無効であることは、確定契約と実装の静的照合で確認する |
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
| S18（B-3・正式受入済み） | トップとEventの5 view modeで共通ブランドヘッダーを確認。1366×768・375×812・320 CSS pxでタグラインは上段左、ナビは上段右、ブランドは下段中央。site-wide metadata title、mode別navigation・`aria-current`を自動検証し、200% resizeとProduction表示も確認済み |
| S19（S1-a） | Candidate追加・URL更新で、raw入力のU+0000〜U+001FおよびU+007Fを位置を問わずtrim前に拒否し、その後`new URL(value).href`へ正規化したHTTP(S)絶対URLだけを保存する。正規化後UTF-8 4096 bytes以下、credentialなしをserver / DBで強制し、拒否時は入力draftと直前状態を保持する |

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

### 5.0 S1-a Candidate URL安全契約

- server正常系は空URL＋title、HTTP、HTTPS、URL-only、query / fragmentを含むURLを検証し、保存値が`new URL(value).href`と一致することを確認する。
- server負系は`javascript:`、`data:`、`ftp:`、`mailto:`、相対URL、protocol-relative URL、不正URL、空host、不正port、usernameまたはpasswordを含むURL、raw入力の先頭・末尾・内部にある制御文字、正規化後UTF-8 4097 bytes以上をCandidate追加・URL更新の双方で確認する。
- UTF-8境界は正規化後の保存値について4096 bytesちょうどを許可し、4097 bytes以上を拒否する。JavaScriptとPostgresのbyte length判定が一致するfixtureを含める。
- client制約を回避したserver requestと、serverを介さないDB INSERT / UPDATEの双方で同じ安全境界を確認する。DBは直接書込みでもscheme・authority・credential・保存値中の制御文字・`octet_length(url) <= 4096`を強制する。
- 拒否時にDB rowを変更せず、入力draft、直前EventState、利用者向けエラーを保持することをE2Eで確認する。
- dashboard / candidate detailの外部リンクが正規化済み保存値を使用し、既存の新規タブ表示、title-only Candidate、owner/share権限、PR #3 Candidate draft保持を回帰させない。

### 5.1 Local

- `npm run supabase:start`後、stack state、service、port、HostIpだけを確認し、raw statusのkey・passwordを報告へ貼らない。
- `npm run supabase:migration:list`と既存migration hashを増分適用前後で記録する。
- `npm run supabase:migration:up`後、owner参照撤去、Participant制約、Candidate URL検証、Vote、Criterion別Concern、Comment一意性、RLS、policy、GRANT、trigger、FK delete action、indexを確認する。
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
