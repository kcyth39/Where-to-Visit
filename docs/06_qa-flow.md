# 06 QAフロー（きめのすけ）

作成日: 2026-07-08 / 最終改訂: 2026-07-30 / フェーズ: Phase 2（品質定義）

関連: [05_dod.md](05_dod.md) / [03_requirements.md](03_requirements.md) / [ADR-0003](adr/0003-evaluation-and-decision-logic.md) / [ADR-0004](adr/0004-permission-model.md) / [ADR-0006](adr/0006-collaborative-response-row-model.md) / [ADR-0007](adr/0007-event-views-and-criterion-feedback.md) / [ADR-0008](adr/0008-local-supabase-development-workflow.md) / [ADR-0009](adr/0009-ownerless-collaborative-model.md) / [共同編集型・回答者行モデル 詳細QA](reports/collaborative-response-row-qa-2026-07-11.md) / [ブランドヘッダー刷新QA](reports/brand-header-refresh-qa-2026-07-16.md) / [Local DB開発リファレンス](reports/supabase-cli-docker-development-reference-2026-07-12.md)

> ADR-0009が維持する既存共同編集modelの詳細なunit / E2E / DB負系ケースとIDは上記詳細QAを参照する。owner固有ケースはhistorical evidenceであり、ownerless targetのQAは本書とADR-0009を優先する。
>
> **N2 Launch Roadmap Rebaseline v4（2026-07-29・N2 CANONICALIZED / CLOSED）:** Human decisionは採用済みで、N2 canonical docsは同期済みである。有効なmainのapplication／DBは旧owner modelのままで、以下のowner URL／owner token／owner Cookie／owner-sessionを検証する項目はhistorical evidenceであって今後のtarget QAではない。N3は`CONTRACT ADOPTED / MODE B / NOT IMPLEMENTATION AUTHORIZED`、N4は`ADOPTED / NOT IMPLEMENTATION AUTHORIZED`、N6〜N13は`PLANNED / NOT IMPLEMENTATION AUTHORIZED`であり、各QAの実行には個別Execution ContractとHuman gateが必要である。N5の後続current QA lifecycleは次のblockを正とする。
>
> **N5 task-branch QA boundary（2026-07-31・Layer 2 complete／H5 pending／not main-integrated）:** [Entry Decision Contract](contracts/WTV-N5-ENTRY-DECISION-CONTRACT-v0.1-draft.md)のD1〜D7とerror copy、implementation start、N5専用dependency installはHuman gateで採用・承認済みである。有効なmain baseline `87295a19f80192ffbe91c56dded86748d3a51bbd`は旧owner model、branch `codex/n5-ownerless-transition`のownerless変更は実装候補であり、main実装済みまたはProduction受入済みとは扱わない。QA resource `where-to-visit-qa`（ref `twcbycyyrxbovtgiqaun`）は`COMPLETE_BY_HUMAN`、hosted Event creator credentialは`PRESENT / VERIFIED`、minimum-privilege probeとPreview REST target bindingは`PASS`である。M01〜M11のimmutable migration exact 11件をreplayし、M12は作成していない。Preview basic-function QAとfixture cleanupは完了し、Production operationは0件である。Vercel Runtime Logsだけではoutbound REST hostを直接証明できないため、branch-specific override、deployment identity、QA-only Event表示／共同編集、postflightの複合証拠をHuman accepted evidence limitationとして記録する。full CRUD coverageは主張せず、coverage limitationはnon-blockingとして受容する。canonical docs synchronizationは本PRでbranch上のcurrent statusを同期し、main統合はHuman merge待ちとする。same-SHA `H5` acceptanceは後続gateであり、Layer 2完了からcredential、Git、merge、Productionの追加permissionを導出しない。
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
2. **docs gate:** ADR-0006 / ADR-0007 / ADR-0008 / ADR-0009と正本、旧Slice文書のSUPERSEDED境界を横断検索する。
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

### 1.0 Execution Contract生成・plan・実装開始

`draft-execution-contract`はHumanが明示指定するか、agentの利用提案を明示承認した場合だけ発動する。適用候補に見えるだけの場合、agentは第一レイヤーで利用を提案して停止し、Skillを暗黙発動しない。

1. HumanがSkill発動と出力形式を承認する。Markdownの場合はexact path、新規作成／更新、ownership、現在のtracked／untracked状態、将来のGit追跡候補とするかを確認・承認する。追跡候補の指定はstage権限を意味しない。
2. 契約作成agentはExecution Contractを出力して停止する。chatではfileを変更せず、Markdownでは承認済みexact path以外を変更しない。
3. Humanがexact版を採用し、同一または別の実行agentへplan作成を許可する。chatは全文引用、contract ID／digest、または直前の全文を指す明示、Markdownはexact pathとcommit SHA／file hash等で版を一意化する。
4. 実行agentは正本、証拠、前提をread-onlyで確認し、plan draftを提示して停止する。
5. Humanがplanに基づく実装開始を承認する。
6. 実行agentは承認scopeを遂行し、Git publicationが含まれる場合は§1.1に従ってReady化まで進める。

同一agentでも、契約出力、契約採用・plan作成許可、plan提示、実装開始承認のHuman応答をまたいで自動継続しない。採用後にchat本文またはMarkdown内容が変わった場合、従来の採用は失効し、新しいexact版の再採用までplan作成へ進まない。Markdownの作成・更新承認はstage、commit、push、PR追加を含まない。

plan、risk、不足情報について独立助言が有益な場合、別agentの利用をHumanへ任意の選択肢として提示できる。自動起動せず、助言agentを承認者または実装担当へ昇格させず、利用しないことをblockerにしない。

Production DB操作を目的とするExecution ContractはSlice 4の対象外とし、生成せず現行Supabase正本と`operate-supabase-live-db`へ案内する。一般的な契約からProduction permissionを推定しない。

### 1.1 PR Ready・review・merge・closeout

標準実装担当は固定されたroleではなく、Execution Contractで対象成果物の変更実行を許可された担当を指す。Fullstack Engineerだけに限定せず、PKAも文書、process、Knowledge、Skill等の承認成果物では標準実装担当になれる。ただし、PKA／Tech Leadのcode実装禁止、Reviewerの既存file更新禁止、各roleの意味変更・Production操作等の制約を上書きしない。

| 工程 | 担当 | 責任 |
|---|---|---|
| 実装・QA | 標準実装担当 | 承認scope内の実装、必要なQA、自己reviewを完了する |
| commit・push | 標準実装担当 | exact pathをcommitし、作業branchへ通常pushする |
| Draft PR作成・更新 | 標準実装担当 | Draft PRを新規作成し、現在の実装・検証に合わせてtitle／bodyを更新する |
| domain review（Execution Contractで指定された場合） | 指定されたdomain owner | Execution Contractが要求する技術・運用domainについて、権限、安全条件、操作順、意味の非変更を確認する |
| domain指摘修正（該当する場合） | 標準実装担当 | 指摘へ対応して再QA・commit・pushし、影響するdomain reviewを再実施できる状態にする |
| Ready化 | 標準実装担当 | DoD充足後、現在のHeadを正式review対象として提出する |
| 独立review | Reviewer | 要件・DoD、scope、差分、QA、checks、conflict、mergeability、未解決指摘を独立に確認する |
| 修正 | 標準実装担当 | 指摘へ対応し、再QA、commit、push、必要なPR更新を行う |
| 最終APPROVED | Reviewer | 現在のexact Headを承認し、merge判断可能と報告する |
| merge | Human | 最終判断を行い、自らmergeする |
| Worktree removal・local branch通常削除 | 標準実装担当 | Humanの終了意思とlocal安全条件を確認し、自身が当該taskで作成・使用したworktreeとlocal branchだけを通常削除する |
| Remote branch削除 | Human | local closeout後、GitHub上の作業branchの利用終了と削除を判断・実行する |
| 削除停止 | 標準実装担当 | 未commit変更、未push commit、残作業、対象・ownership・統合状態の不明、または安全条件不成立時は削除せず残存事項を報告する |

承認済みExecution ContractがGit publicationを含む場合、標準実装担当は作業branchへの通常push、Draft PR新規作成、既存Draft PRのtitle／body更新、修正pushに伴うPR更新、DoD充足後のReady化を、各操作の追加Human承認なしで行える。Draft PRの更新によってscopeまたは要件の意味を拡張しない。

Execution Contractがdomain reviewをDoDに含める場合、Draft PRのexact Headに対する必要なdomain reviewと指摘対応を完了した後にReady化する。domain review後にHeadまたは対象差分が変わった場合は、影響するdomain ownerが変更部分を再確認する。domain reviewはReviewerの独立reviewを代替せず、domain ownerの確認だけでmerge判断可能とは扱わない。

標準実装担当権限には、最初からReady状態でのPR新規作成、review承認、merge、未merge PRのclose操作、remote branch削除、後述するtask-owned local closeout以外のlocal branch／worktree削除、worktree内file破棄、force push、`main`への直接pushを含めない。mergeに伴うGitHub上の自動closed状態はPR close操作と扱わない。

Ready for reviewは、実装、必要なQA、自己review、commit、pushが完了し、現在のHeadを正式reviewへ提出できるという宣言である。修正不要、review承認済み、merge可能、Production反映承認済みを意味しない。通常のreview修正ではReadyを維持し、要件解釈の見直し、設計変更、大規模再実装、重大な既知問題、長期の修正途中状態ではDraftへ戻す。

#### 共通遂行原則の検証

標準実装担当はReady化前に、変更ごとにGoal、要件、DoDへの対応を示し、承認scope外のpath・行・節、未依頼の機能・記述・抽象化・設定・将来対応・例外規則が含まれないことを確認する。より単純な方法を採用しなかった場合は、その理由を判断材料として示す。scope外の問題は実装へ取り込まず報告し、自身の変更が生じさせた参照切れまたは不要物だけを承認scope内で解消する。外部資料から採用したteam ruleは、local正本だけで意味を確認できることを検証する。

#### Human gateの検証

Humanの操作または承認が必要になった場合、該当する実行を停止する。停止報告には、Human判断が必要な理由、選択肢と各影響、必要な操作、実行後に起きること、停止条件と再開条件を含め、おしげさんが判断・実行できる日本語で説明する。安全上必要な識別子・技術用語には短い意味説明を添える。方針承認、計画承認、実行承認、Git publication、Production操作を別々のgateとして記録し、一つの承認から他の承認を推定しない。

Reviewerは最終APPROVED時に現在のHead SHA、最新Headに対するrequired checks、scope、conflict、mergeability、未解決指摘を確認する。required checkが未設定なら「設定なし」と明記し、observed checkと混同しない。APPROVED後にHeadまたは差分が変わった場合は変更部分を再reviewする。ReviewerのAPPROVEDはmerge実行権限を含まず、Humanが自ら行うmerge操作が最終承認と実行を兼ねる。

Git publicationを含むExecution Contractでは、実行担当はReady化前に、PR URL、Base branch／SHA、exact Head、Goal、要件、DoD、exact scope、実際の差分、変更箇所のtraceability、QA結果、required checks設定、observed checks、conflict、mergeability、未解決指摘、既知問題、残課題、例外承認、必要なdomain reviewと確認HeadをPRから確認できる形で引き渡す。未追跡local fileだけをReviewerの証拠にしない。

merge前、標準実装担当は、作業branchがreview・merge待ちであること、worktree内の未commit差分、後続修正での継続利用予定を報告する。merge後は、PRの正常merge、必要commitの統合、未commit・未pushの必要変更なし、branch固有の残作業なし、再利用予定なしを確認し、共有branchのcloseoutを提案する。

全条件を満たす場合は次の形式でcloseoutを提案する。

> 当該作業は完了し、このbranchおよびworktreeを今後使用する予定はありません。未commit・未pushの必要な変更はなく、必要なcommitはmerge済みです。remote branchの利用終了を判断できます。

#### Local／remote closeout lifecycle

| State | 意味 |
|---|---|
| `LOCAL_OPEN` | task worktree／local branchを使用中、またはHumanのend-of-useが未確認 |
| `LOCAL_CLOSEOUT_READY` | Humanのend-of-useとlocal安全条件が成立し、task-owned local worktree／branchの通常closeoutだけが可能 |
| `LOCAL_CLOSED_REMOTE_PENDING` | local worktree／branchはcloseout済みで、remote branchの削除またはactual remote不在のfresh確認が未完了 |
| `FULLY_CLOSED` | local closeout済みで、Humanによるremote branch削除後にactual remote branch不在をfresh確認済み |
| `RECOVERY_HANDOFF_REQUIRED` | normal local closeoutの対象外または安全条件不成立のため、mutationせずtask-specific recoveryへhandoff |

Humanが追跡可能な方法でtask／shared branchの利用終了を明示した後、標準実装担当は自身が当該taskで作成・使用した専用worktreeについて、次のlocal安全条件をすべて確認する。

- PRまたはtask Headがcurrent mainへ包含されている
- local-only／unpublished commitがない
- 対象がtask-owned worktree／branchであり、ownershipが確定している
- tracked／staged／通常untracked entryがない
- ignored pathが分類済みで、削除により失われるHuman所有・user-created contentがない
- active Git mutationとindex lockがない
- active runtime resourceの終了または保持方針が確定している
- 削除対象外に、同一repositoryの有効なGit contextであり、clean、ownership既知、利用可能と確認済みのcontrol locationがある

ignored fileは存在だけで一律停止せず、`node_modules/`、`.next/`、`coverage/`、`playwright-report/`、`test-results/`、既知のtool cacheを再生成可能物として扱える。一方、`.env*`、credential、local profile、DB volume／state、upload、手動成果物、未追跡証跡、分類不能なignored fileがある場合は停止する。secretの内容を読み取ったり表示したりしない。

remote branchの存在、actual remote不在の確認、network成功、remote削除は`LOCAL_CLOSEOUT_READY`の条件にしない。local安全条件を満たす場合、標準実装担当は確認済みcontrol locationから、exact pathへの`git worktree remove`、成功確認、exact branchへの`git branch -d`、local postcheckの順で通常削除し、`LOCAL_CLOSED_REMOTE_PENDING`を報告する。worktree removal失敗時はbranch削除へ進まず、worktreeだけ削除成功後にbranch通常削除が失敗した場合はlocal branchを保持したpartial stateを報告する。

Humanだけがremote branchの利用終了と削除を判断・実行する。Human操作後、GitHub APIまたは`git ls-remote --heads`等でactual remote branch不在をfresh確認した場合だけ`FULLY_CLOSED`へ移行する。Agentはremote branchを削除せず、force pushまたはremote pruneを行わない。stale remote-tracking refをactual remote evidenceとして扱わず、network／DNS障害をremote absenceと解釈しない。remote lifecycleが未完了でも、完了済みのlocal closeoutを取り消さない。

unregistered／orphaned directory、prunable metadata、locked worktree、ownership不明、未分類のuser content、active container／mount等のruntime reference、worktree pathとGit metadataの不一致は`RECOVERY_HANDOFF_REQUIRED`とし、normal local closeoutへ流さない。通常closeoutではfilesystem直接削除、automatic `git worktree prune`、force worktree removal、`git branch -D`、Docker／Compose stop・remove、recovery automationを行わない。read-only evidenceと保持理由を報告し、task-specific recoveryへhandoffする。

baseline確認に必要な場合は、対象remoteのbaseline refとcommit objectだけを限定fetchしてよい。これはcheckout、merge、reset、rebase、pull、pruneを伴わず、worktree内容を変更するbaseline syncとは区別する。squash／rebase merge等でancestryを証明できない場合は`RECOVERY_HANDOFF_REQUIRED`としてworktreeとlocal branchを保持する。Skillがcontrol worktreeを自動新設してはならない。

---

## 2. 主要QAシナリオ

| ID | シナリオ |
|---|---|
| S1（N1 target・main未実装／N5 task-branch candidate） | 「きめること」と任意の「つたえたいこと」を確認文付きで作成する。成功時はParticipant 0件のまま共有URLだけを提示し、owner固有のtoken、Cookie、session、権限状態を作らない。作成後の「きめること」は変更不可、「つたえたいこと」は共有利用者が共同編集できる |
| S2（ADR-0009でSUPERSEDEDされた実装証跡） | オーナー初期セットアップでお名前と「候補の追加」を表示。お名前からCandidate入力へ移っても入力を妨げず、名前確定後も入力済みCandidate draftを保持して同じ画面で追加できる。追加成功時だけCandidate入力をクリアする。「さあ、きめよう！」後はみんなに送るリンクを中央に表示。「わたしの意見を入力」で同じタブのowner候補一覧ダッシュボードへ進む |
| S3 | 未選択ゲストに既存名と直下の直接入力だけを表示し、既存選択または新名確定後は候補一覧へ進む。現存localStorage選択で再訪した場合は候補一覧を直接表示 |
| S3a（ADR-0009でSUPERSEDEDされた実装証跡） | 別ブラウザでowner URLを開き回答者未選択でも候補一覧を表示し、きめること・つたえておきたいことを編集可能。個人名義操作時だけ名前選択を要求 |
| S3b（ADR-0009でSUPERSEDEDされた実装証跡） | owner-session APIを保留したowner画面で「候補一覧」とCandidate名の表示・focus可能性を保ちつつ、`href`・link roleがなく`aria-disabled=true`であること、click・Enter・中クリックで遷移しないこと、API成功後だけ正しい`href`を復元してowner Cookieと「直す」によるowner権限を維持することをE2Eで確認する。Spaceが遷移せず標準scrollを許容することと、別タブ操作で遷移できないことは、確定契約と実装の静的照合で確認する |
| S3c（ADR-0009でSUPERSEDEDされた実装証跡） | owner-session APIを失敗させ、エラー表示、owner Cookie未作成、`href`・link roleなし、click・Enter・中クリックで非遷移であることをE2Eで確認する。別タブ操作で遷移できないこと、自動retryなし、再読み込みまたはowner URL再オープンでだけ再試行し、新しいretry UIを表示しないこと、共有URLは最初から通常リンクでCandidate名は対象mutation pending中も無効であることは、確定契約と実装の静的照合で確認する |
| S4 | 同名確認で本人なら既存行、別人なら異なる名前を要求。同時UNIQUE競合でも同名確認へ遷移 |
| S5 | 未選択の個人名義操作を保留し、Participant解決後に一度だけ再開。明示操作起因blurと連打で二重実行なし |
| S6 | Candidate / Criterion追加はdraftなし・未選択なら`created_by=NULL`、selected行があればそのID、非空draftなら解決後のID |
| S7 | 候補一覧にきめること・つたえたいことと操作可能なCandidateサマリーを表示し、Candidate名から候補編集へ進む。重複する候補タイルと回答者別編集controlを出さない |
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
| S16 | 共有URLでEvent ID固定のselected participant localStorageキーを使用し、同一Eventの現存行なら再訪時に復元し、不在・削除済み行なら選択とキーを解除する |
| S17 | 375×812と1366×768でoverflow・重なりなし。候補一覧と候補編集の情報階層、非選択コメントclamp、確認画面1件表示を確認 |
| S18（B-3・正式受入済み） | トップとEventの5 view modeで共通ブランドヘッダーを確認。1366×768・375×812・320 CSS pxでタグラインは上段左、ナビは上段右、ブランドは下段中央。site-wide metadata title、mode別navigation・`aria-current`を自動検証し、200% resizeとProduction表示も確認済み |
| S19（S1-a） | Candidate追加・URL更新で、raw入力のU+0000〜U+001FおよびU+007Fを位置を問わずtrim前に拒否し、その後`new URL(value).href`へ正規化したHTTP(S)絶対URLだけを保存する。正規化後UTF-8 4096 bytes以下、credentialなしをserver / DBで強制し、拒否時は入力draftと直前状態を保持する |
| S20（S1-b・既存owner modelの実装証跡） | Event作成成功時にEvent 1件、同一transaction内のdefault Criterion「興味ある？」1件、Participant 0件を確認する。pgTAPのtest transaction内でtest専用failure triggerによりCriterion INSERTを失敗させ、失敗した作成試行に対応するEvent／Criterion／Participantがすべて0件であることとtransaction rollback後にtest資産が残らないことを確認する。tokenなし・不正token・既存owner/share境界、owner-session、Cookie、redirect、Criterion CRUDを回帰させず、失敗時は「イベントを作成できませんでした。」、draft保持、redirect／Cookieなしを確認する。通信曖昧成功後の手動再送による完全Event重複はidempotency非保証の残余riskとして記録し、自動retryしない |
| S21（S1-c1b・既存owner modelの実装証跡） | `S1-C1B-HOST-POISONING-PROTECTION-v1.0`をPR #24（merge `763fcd1eaa7126fc2f97f6abda678cf44e3cfe20`）で実装し、trusted origin resolverのunit／static確認で、`APP_ORIGIN`がserver-onlyであり、`NEXT_PUBLIC_APP_ORIGIN`その他の`NEXT_PUBLIC_`付き同義origin変数を追加せず、client component／client bundleへorigin設定値を露出しないことを確認した。UIへ渡すのはserverで生成済みの必要なURL文字列またはfail-closed表示に必要な失敗状態だけとし、`APP_ORIGIN`の設定値、env値、validation詳細、malformed理由、Vercel platform内部値、Host系header値、token、内部診断情報を渡さない。`APP_ORIGIN`のabsolute URL、credential／path／query／fragment／token／secretなし、末尾slashなし、正規化後`URL.origin`一致と環境別許可値を確認した。requestの`Host`、`X-Forwarded-Host`、`Forwarded`、`X-Forwarded-Proto`が悪意ある値でもabsolute URL生成に使われない。Productionは`https://www.kimenosuke.com`だけ、localは`http://localhost:<port>`または`http://127.0.0.1:<port>`だけ、Previewは検証済み`APP_ORIGIN`を優先し未設定時だけ検証済みVercel Preview deployment URLを使う。trusted originが不正・未設定の場合はowner／share URLを表示せずcopy buttonを無効化し、「URLを生成できませんでした。しばらくしてからもう一度お試しください。」を表示する。focused E2E、full local E2E、Production scopeの`APP_ORIGIN=https://www.kimenosuke.com`設定、Production deployment／smoke `PASS`、local fixture cleanup `PASS`、Production smoke fixture cleanup `PASS`を別Human gateで完了した。Production cleanupはexact Event 1件と承認scopeの関連rowだけをCOMMIT 1回・retry 0で削除し、postcheckはtarget／`[E2E]%`とも残存0、final cleanup summary SHA-256は`4510e7560ab294312870c56ffa2ae1f76c609769e17a9b93050267d979a8a1a7`である。cleanup generatorの安全化はPR #25（merge `666c150ad648c9516fd46283813d9c25afe8d163`）で統合し、Legacy 56件・rescoped 64件、計120件のrepository validationをPASSした。公式`quick_validate.py`はPyYAML不足により未実行であり、公式validator PASSとは主張しない |
| S22（S1-c2a・Production accepted） | PR #31（merge `9cbc0cf2238703665155b4158d82f243ddd82407`）のexact deploymentについて、Development／Preview／Production別CSPと共通header、ProductionへのToolbar source混入0、Previewの承認済みToolbar source、browser機能回帰、CSP violation 0を確認した。HSTSはheaderが存在し、`max-age`を整数として取得でき、`max-age >= 63072000`かつ無効化・短縮値でないことをsemanticに判定し、`includeSubDomains`／`preload`等の追加directiveを許容する。QA fixture cleanupとpostcheckも完了している |
| S23（N5 task-branch candidate／Layer 2 complete・H5 pending） | ownerless Event作成、共有URL一本化、title不変、memo共同編集、owner route／token／Cookie／session／認可fallback不在、Participant等の既存共同編集回帰をUI／server／DBで確認した。memoはLF normalization、ECMAScript trim、Unicode scalar value count最大1000、unpaired surrogate拒否、DB `char_length` parityとexact error copyを同一verdictにする。M01〜M11 immutable migration exact 11件、M12 absent、hosted credential／minimum-privilege probe、Preview REST target binding、Event作成・share page表示・回答者登録・候補追加・default Criterion反応・コメント保存・reload保持、fixture cleanupをPASS／COMPLETEとして受入した。Vercel Runtime Logs単独ではoutbound REST hostを直接証明できないため複合evidence limitationを記録し、full CRUD coverageは主張しない。coverage limitationはHuman受容済みnon-blockingであり、same-SHA H5 acceptanceは後続gateとする |
| S24（N6 target・未実装） | 「きめごと」最新2件と「きめごと一覧」最大30件を同一ブラウザのlocalStorage履歴として確認する。180日sliding expiration、有効Eventだけの登録、相対share path、個別／全削除、再訪時再登録、storage failure時の非阻害、Event本体と権限への非影響を確認し、S16のselected participant保存と混同しない |
| S25（N7 target・未実装） | ローンチ前のcontrolled requestでEvent作成ruleの5件成功、6件目拒否、window expiry後の復帰、他route非干渉、Event／Criterion atomicityを確認し、公開時のblock条件と公開後観測のhandoffを固定する |
| S26（N8 target・未実装） | N5〜N7のstacked release lineとfinal Headを固定し、Vercel Authenticationを維持してData APIを停止する。fresh discovery、Human承認済み既存Event cleanup、postcheckを完了し、migration／deploy／Data API再開／WAF／smokeを実行せずN9へhandoffする |
| S27（N9 target・未実装） | N8 handoff後にmigration、application deployment、ownerless Data API再開、WAF controlled verification、Production smoke、fixture cleanupを各Human gateで実行・受入する。一般アクセスを再開せずVercel Authenticationを維持してinternal Production acceptanceを完了する |
| S28（N10 target・未実装） | 利用規約、Privacy、商用／affiliate、support、provider候補、CMP／Cookie／personalization、pathname residual risk、広告障害運用、kill switchのHuman decisionとrunbookが確定し、provider codeまたはProduction広告配信を開始していないことを確認する |
| S29（N11-a target・未実装） | Vercel Authentication下で利用規約、実際の広告無効状態と一致するPrivacy、affiliate／PR guideline、問い合わせ導線、support受信可能性を確認し、一般アクセスを開始しない |
| S30（N11-b target・未実装） | repository管理の静的・非商用fixtureだけで単一広告slotのresponsive layout、flag OFF時のDOM／空白／third-party request 0、placeholder／collapse、Event操作への非干渉、failure isolation、performance budgetを確認する。外部request、tracking、Cookie、provider codeを含めず、実providerの受入とは扱わない |
| S31（N11-c target・未実装） | public pagesのrobots／canonical／sitemap、Event pagesの`noindex`とtest、Search Console ownership準備のrunbook／対象値、domain／SSL、backup／recovery、browser／mobile／accessibility、launch checklistをVercel Authentication下で確認する。sitemap送信とindex requestは行わない |
| S32（N12 target・未実装） | Vercel Authentication下の最終受入、ownerless Data API、Event作成WAF blockのcurrentness、public pagesのindex設定、Event pagesの`noindex`を順に確認する。HumanがAuthenticationを解除した後に外部相当browserで閲覧／作成／rate limitを確認し、公開後の実traffic観測へhandoffする。sitemap送信、index requestはHuman操作またはwaiverを記録してlaunchを宣言する |
| S33（N13 target・未実装／一般公開non-blocker） | provider要件をfresh確認し、審査用verification artifactと広告activationを別Human gateにする。承認後に実provider script／通信、CMP、CSP、Privacy、ads.txt、flag ON、mobile／desktop、ad blocker／failure、Event回帰、実performanceを確認し、失敗時はflag OFFと実状態に一致するPrivacyを維持する |

### 2.1 S1-c2a security header受入記録

1. `npx playwright test tests/security-headers.spec.ts`で環境別CSP exact値、共通header、local response、CSP violationを確認する。
2. Supabase local profileを使う別承認済みQAでは、既存のowner-session、URL copy、外部Candidate linkのfocused scenarioを確認する。本sliceはDB変更を行わず、profileやfixtureを新規生成しない。
3. `npm run check`、`npm run build`、`git diff --check`、`cmp -s AGENTS.md CLAUDE.md`を実行する。
4. Git publication後のPreviewでCSP、Toolbar、主要機能、CSP violation、Vercel標準HSTSを確認する。
5. Humanによるmerge後のProductionでProduction CSP、Toolbar source不在、主要機能、CSP violation、Vercel標準HSTSを確認する。

上記をPR #31のmerge commit `9cbc0cf2238703665155b4158d82f243ddd82407`で完了し、S1-c2aは`Production accepted`とする。observed headerとアプリ設定値を区別し、アプリ側HSTS設定0を維持する。

### 2.2 N2 v4のQA境界

N2 v4の採用または正本同期は実装許可ではない。後続実装では、共有URLへの一本化、owner固有状態と旧owner認可fallbackの不在、「きめること」の作成後不変、「つたえたいこと」の共有共同編集、既存Eventとの非互換とcleanupの別Human gateを検証する。上記historical evidenceをownerless targetの合格根拠へ読み替えない。

「きめごと／きめごと一覧」は権限ではない同一ブラウザ向けの戻り道としてN6で実装・検証し、S16のselected participant回帰QAと混同しない。N9はVercel Authentication下のinternal Production acceptance、N12は唯一のpublic-opening gate、N13は一般公開後の広告activationとして分離する。

N12の順序は、(1) Authentication下の最終Production受入、(2) ownerless Data API確認、(3) Event作成WAF block確認、(4) public pagesの`noindex`解除、(5) Event pagesの`noindex`再確認、(6) HumanによるVercel Authentication解除、(7) 外部相当browserでの閲覧・作成・rate limit確認、(8) sitemap送信またはwaiver、(9) index requestまたはwaiver、(10) launch declarationとする。N13はこの順序のblockerにしない。

### 2.3 N5 candidateのQA・lifecycle境界

- QA project resourceとcreation record、hosted credential、minimum-privilege probe、Preview binding、Layer 2 replay、basic-function QA、fixture cleanupの完了を別々に証拠化し、raw secretやshare tokenを記録しない。project refまたはapproved record SHAがdriftした場合は停止してHuman reviewへ戻る。
- task-branch candidateのDB-independent QA、local DB QA、Preview QA、Layer 2 proofを別判定にし、`SKIP`／`NOT RUN`を`PASS`へ読み替えない。今回のbasic-function QAはfull CRUD coverageを主張せず、Human受容済みcoverage limitationをnon-blockingとして記録する。
- exact `C5`はGit／immutable evidenceで固定済みのcandidateを対象とし、M01〜M11 exact 11件・M12 absent・C5 drift 0を確認する。Vercel Runtime Logs単独ではoutbound REST hostを直接証明できないため、branch-specific override、deployment identity、QA-only Event表示／共同編集、postflightを複合証拠として扱う。
- Layer 2 replay、least-privilege role／GRANT／RLS、Preview binding、exact one smoke、cleanup、business row 0は完了し、same-SHA `H5` acceptanceとN6 handoffだけを後続Human gateへ残す。`H5`はC5から変更0のsame SHAとする。
- N3のdependency security QA、N6のbrowser history QA、N7のWAF／rate limit QA、N8の既存Event cleanupをS23の合格根拠へ混入させない。N5は8 business tableのrow 0をfail-closed preconditionとして観測するだけで、既存dataを変換・削除しない。
- N5単独をmainへmergeせず、N6／N7を積んだfinal release Headだけを後続のHuman merge判断へ渡す。canonical docs synchronizationはそのmain統合まで完了としない。

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

### 5.1 S1-b Eventとdefault Criterionの原子的作成（実装・dev remote検証完了）

- Event INSERTを既存経路で実行し、private schemaの限定的`SECURITY DEFINER`な`AFTER INSERT` trigger functionが同一transaction内で固定default Criterionだけを作成することをlocal postflightで確認する。functionの固定`search_path`、PUBLIC／anonへの直接EXECUTE非付与、dynamic SQL・任意table操作・任意label入力なしを確認する。
- pgTAPはtest transaction内にtest専用failure triggerを作成し、Criterion INSERT失敗時に失敗した作成試行に対応するEvent／Criterion／Participantが0件であること、rollback後のtest triggerその他test資産が残らないことを確認する。production migrationへtest hookを残さない。
- tokenなし・不正token・RLS／GRANT負系、owner/share境界、default Criterion属性、失敗時の「イベントを作成できませんでした。」・draft保持・redirect／Cookieなし、既存Criterion CRUDとParticipant非生成をlocal focused／full E2Eで確認する。
- 自動retryを追加せず、idempotencyなしのため通信曖昧成功後の手動再送では完全Eventが重複し得ることを残余riskとして報告する。不完全Event残存は原子性負系で別途拒否する。
- local clean-chain、pgTAP 71/71、advisor warning 0、focused local E2E 2 PASS / 1 expected SKIP、full local E2E 22 PASS / 1 expected SKIP、check／build／diff check、local cleanupは完了した。dev remoteではHuman SQL Editorによるmigration 1回適用、schema／security postflight、focused Event creation smoke、fixture cleanupを完了した。temporary server、secret env file、temporary smoke worktreeはcloseout済みである。
- scope外データ全体の完全なbefore／after比較は未実施である。固定UUID predicate、scope外参照guard、およびschema／FK／trigger／cross-event invariant guardの範囲では、scope外変更経路または不整合は検出されていない。
- remote E2E、Production migration／smoke、migration history reconciliationは未実施の別scopeである。完全なraw terminal logは保存されておらず、実行時の構造化報告とhash固定artifactに基づく。hosted migration historyはremote適用証拠として使用していない。

### 5.2 Local

- `npm run supabase:start`後、stack state、service、port、HostIpだけを確認し、raw statusのkey・passwordを報告へ貼らない。
- `npm run supabase:migration:list`と既存migration hashを増分適用前後で記録する。
- `npm run supabase:migration:up`後、owner参照撤去、Participant制約、Candidate URL検証、Vote、Criterion別Concern、Comment一意性、RLS、policy、GRANT、trigger、FK delete action、indexを確認する。
- tokenなし、不正token、別Event参照、重複、不変列、cascade / set nullをlocal anon clientまたはDB testで検証する。
- `npm run supabase:db:advisors`を実行し、既知警告の解消と新規警告なしを確認する。
- clean-chain replay後も同じ結果であることを確認し、`npm run test:e2e:local`の証跡をremote結果と混同しない。

### 5.3 Remote

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
