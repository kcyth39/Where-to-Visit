# 03 要件定義（きめのすけ）

作成日: 2026-07-08 / 最終改訂: 2026-07-30 / フェーズ: Phase 1（要件定義）

> **N5／N6 current lifecycle sync（2026-08-01）:** N5 H5 accepted Headは`022b85776109bae62ef21380539523bafc3e147b`で、N6 handoffは`HANDOFF READY / NOT IMPLEMENTATION AUTHORIZED`である。下記の2026-07-31 N5記述は同期前snapshotとして保持し、current statusは本注記とN6 handoff正本を優先する。mainのapplication／DBは旧owner modelのままである。

正本:

- 本書
- [ADR-0003](adr/0003-evaluation-and-decision-logic.md)（評価・最終候補表示）
- [ADR-0004](adr/0004-permission-model.md)（権限）
- [ADR-0005](adr/0005-drop-attribute-dynamic-criteria.md)（属性撤廃・判断基準）
- [ADR-0006](adr/0006-collaborative-response-row-model.md)（共同編集型・回答者行モデル）
- [ADR-0007](adr/0007-event-views-and-criterion-feedback.md)（イベント画面分離・判断基準別フィードバック）
- [ADR-0008](adr/0008-local-supabase-development-workflow.md)（ローカルSupabase開発・検証とリモート適用境界）
- [ADR-0009](adr/0009-ownerless-collaborative-model.md)（ownerless collaborative model）
- [共同編集型・回答者行モデル 詳細要件](reports/collaborative-response-row-requirements-2026-07-11.md)（既存実装の詳細。owner固有部分はADR-0009でSUPERSEDED）
- [Supabase CLI / Dockerローカル開発・検証リファレンス](reports/supabase-cli-docker-development-reference-2026-07-12.md)
- [ブランドヘッダー刷新（B-3）要件](reports/brand-header-refresh-requirements-2026-07-16.md)

> **実装状態（2026-07-14）:** ADR-0006 / ADR-0007の共同編集型・回答者行モデルと画面分離、ADR-0008のlocalhost bind限定・接続先分離・local / remote E2E分離はコード・DB・運用wrapperへ反映済み。local / remote E2E、Production smoke、その時点で生成されたremote／Productionの`[E2E]`データcleanupは完了済みで、当該cleanupを再計画・再実行する残作業はない。今後のQAで新たに生成される`[E2E]`データは、通常のcleanup手順で都度後処理する。旧guest_token本人モデル、候補単位の常設🌀、Event詳細1画面構造と競合する場合はADR-0007、次にADR-0006を優先する。
>
> **B-1/B-2実装状態（2026-07-16）:** 戻り導線改善と操作可能サマリー表はPR #1で`main`へ統合し、local E2E、Production browser QA、物理モバイル端末確認、Production smokeを含む本番アプリデータcleanupを完了した。今後のQAで新たに生成されるデータのcleanup運用は継続する。
>
> **B-3／PR #3実装状態（2026-07-17）:** ブランドヘッダー刷新とowner setupのCandidate draft保持修正はPR #2／#3で`main`へ統合済み。merge commit `95996e4`と同一treeで正式local gate（15 total / 14 PASS / 0 FAIL / 1既知SKIP）、Production smoke、200% resize、local／Productionの`[E2E]` cleanupとpostcheckを完了した。既知SKIPはSupabase設定済み環境ではsetup warningを表示しない1件で、PR #3回帰testはPASSしている。今後新たに生成される`[E2E]`データのcleanup運用は継続する。
>
> **S1-a／owner-session安全対策の実装状態（2026-07-19・closeout完了）:** Candidate URL安全契約とowner-session確立前のナビゲーション無効化はPR #5（merge commit `7093babd`）で`main`へ統合済み。local incremental migration、clean-chain replay、pgTAP 24/24、local／remote E2E、各fixture cleanup、Vercel Production deployment `dpl_AE7g2yDhGubjoxWBQqEsGs2MYANN`とのsource commit一致確認、Production focused smoke、固定Production fixture 1件のcleanup／postcheckまでPASSした。Productionではowner-session成功後のowner setup遷移、owner Cookie・owner権限維持、owner側「直す」の有効性、share側にowner編集権限がないことを確認した。raw制御文字境界とowner-session pending／failureのfail-closedはlocal／remote E2Eおよび静的照合の証拠を維持し、Productionで人工再現したとは扱わない。
>
> **S1-b／Eventとdefault Criterionの原子的作成（2026-07-25）:** 採用済み契約`S1-B-ATOMIC-EVENT-CREATION-v1.2`はPR #21（merge `3176269043d85a6ec8ecb8ffd753f3d6478fa9cb`）で実装済みであり、default Criterionの原子的作成はdev remoteで確認済み（`implemented and dev-remote verified`）。Production migration／smoke、remote E2E、migration history reconciliationは未実施の別scopeである。idempotencyは導入せず、通信結果が曖昧な場合の手動再送による完全Event重複は残余riskとして維持する。
>
> **S1-c1a／S1-c1b trusted origin・Host poisoning対策（2026-07-27・closeout完了）:** `S1-C1A-TRUSTED-ORIGIN-CONTRACT-v1.0`に基づく`S1-C1B-HOST-POISONING-PROTECTION-v1.0`は、PR #24（merge `763fcd1eaa7126fc2f97f6abda678cf44e3cfe20`）で実装・main統合済みである。Production application canonical originは`https://www.kimenosuke.com`、trusted sourceはserver-only `APP_ORIGIN`であり、Production scopeへの設定、Production smoke `PASS`、local／Production fixture cleanup `PASS`、branch／worktree closeoutまで完了した。cleanup generatorの安全化はPR #25（merge `666c150ad648c9516fd46283813d9c25afe8d163`）で統合済みで、Legacy 56件・rescoped 64件、計120件のrepository validationをPASSした。公式`quick_validate.py`はPyYAML不足により未実行であり、公式validator PASSとは主張しない。後続状態は下記S1-c2aおよびN1の記録を正とする。
>
> **S1-c2a security header baseline（2026-07-28・Production accepted）:** 採用済みContract（SHA-256 `6d95f17136d904881c19592f6ddfd3de3b66bf5e7740d3d58ae4e1797e0587e1`）に基づく実装をPR #31（merge `9cbc0cf2238703665155b4158d82f243ddd82407`）で統合し、Preview／Production header QA、Vercel標準HSTS、browser QA、fixture cleanupまで完了した。HSTSはHeader存在、整数`max-age >= 63072000`をsemanticに判定し、`includeSubDomains`／`preload`等の追加directiveを許容する。アプリ側HSTS設定は0件のままである。
>
> **N1 ownerless collaborative model（2026-07-28・Design Decision Accepted／adoption時未実装）:** [ADR-0009](adr/0009-ownerless-collaborative-model.md)により、Event作成者固有のowner権限、owner URL／token／Cookie／owner-sessionを廃止し、Eventアクセスを共有URLへ一本化する。作成後の「きめること」は不変、「つたえたいこと」は共有利用者の共同編集対象とする。N1 adoption時のapplication／DBはowner modelであり、本Decision自体はコード変更、migration、既存Event cleanupまたはN2開始を許可しなかった。N2は後続の別Human decisionで採用された。
>
> **N2 Launch Roadmap Rebaseline v4（2026-07-29・Human decision adopted／canonical docs synchronized／lifecycle closed）:** N1の確定入力をN3〜N13へ再編した。N3は`CONTRACT ADOPTED / MODE B / NOT IMPLEMENTATION AUTHORIZED`、N4は`ADOPTED / NOT IMPLEMENTATION AUTHORIZED`、N6〜N13は`PLANNED / NOT IMPLEMENTATION AUTHORIZED`である。N4ではdedicated non-Production QA project方式、dedicated least-privilege Postgres role方式（candidate `kimenosuke_event_creator`）、内部識別子`memo`の維持、normalized memo最大1000文字を採用し、N5では[Entry Decision Contract](contracts/WTV-N5-ENTRY-DECISION-CONTRACT-v0.1-draft.md)のD1〜D7をHuman採用した。N2の正本同期自体は各sliceの実装、Git publication、DB／Vercel／WAF／DNS／Search Console／Production操作を許可しなかった。N5の後続current lifecycleは次のblockを正とする。N9はownerless Productionのinternal acceptance、N12はpublic opening、N13は一般公開後のAdvertising Activationとして分離する。
>
> **N5 task-branch lifecycle（2026-07-31・Layer 2 complete／H5 pending／not main-integrated）:** 有効なmain baseline `87295a19f80192ffbe91c56dded86748d3a51bbd`のapplication／DBは旧owner modelを維持し、ADR-0009のownerless要件はbranch `codex/n5-ownerless-transition`上の実装候補である。QA resource `where-to-visit-qa`（ref `twcbycyyrxbovtgiqaun`）はHuman作成済みで、hosted Event creator credentialは`PRESENT / VERIFIED`、minimum-privilege probeとPreview REST target bindingは`PASS`である。M01〜M11のimmutable migration exact 11件をreplayし、M12は作成していない。対象branchのPreviewでEvent作成、share page表示、回答者登録、候補追加、default Criterion反応、コメント保存、reload後保持をHumanが確認し、basic-function QAを`PASS`とした。Vercel Runtime Logsだけではoutbound REST hostを直接証明できないため、branch-specific override、deployment identity、QA-only Event表示／共同編集、postflightの複合証拠を受容済みのevidence limitationとして記録する。full CRUD coverageは主張せず、coverage limitationはHuman受容済みのnon-blockingである。QA fixture cleanupは完了し、Production operationは0件である。canonical docs synchronizationは本PRでbranch上のcurrent statusを同期し、main統合はHuman merge待ちとする。same-SHA `H5` acceptanceは後続gateであり、N3、N6、N7、N8の実装またはcleanupをN5へ含めない。

---

## 1. サービスの役割

きめのすけは、サービス自身が候補を確定するのではなく、候補に対するみんなの意見を少ない操作で見える化し、グループが決めやすい状態を作る。

- ログイン・会員登録なしで、共有URLから共同編集できる。
- 候補一覧ダッシュボードでCandidate全体を見渡し、候補編集画面で全回答者の○ / − / ×、判断基準別❤️ / 🌀、コメントを並べ、一つずつ吟味する。
- Event作成者は作成後、共有URLを用いる他の共有利用者と同じ権限を持ち、作成者固有の強い権限を持たない。
- 未評価と能動−を区別する。
- 候補作成時刻を示し、早く追加された候補へ評価が集まりやすいバイアスを判断できるようにする。
- ○数と×有無から3種類の最終候補状態を示すが、確定・採択・ロックは行わない。

### 1.1 表示用語とEventデータ

- **きめること**: 候補を出し合い、みんなで決めたい対象を書く。`Event.title`へ保存する。
- **つたえたいこと**: 決めるときに共有したい背景、希望、条件などを書く。任意入力で、`Event.memo`へ保存し、共有利用者が共同編集する。内部識別子`memo`を維持する。明示入力はCRLF／lone CRをLFへ変換してECMAScript `trim()`を適用し、NFC／NFKC等のUnicode normalizationは行わず、unpaired surrogateを拒否する。normalized Unicode scalar value countの共通最大長は1000文字とする。このruleはHuman採用済みで、N5 task branchのLayer 2 candidateへ反映・受入済みである。有効なmainは旧owner modelのままであるため、main実装済みとは扱わない。
- ユーザー向けUIでは「お題」「メモ」を入力ラベルとして使わない。内部識別子は`title` / `memo`を維持する。

---

## 2. ユーザー・状態

| 種別・状態 | 説明 | 識別・権限 |
|---|---|---|
| Event作成者 | Event作成後は他の共有利用者と同じ権限を持つ。作成者固有の権限状態はない | 作成成功後に提示される共有URL。owner固有token／Cookie／sessionは作成しない |
| 共有利用者 | 有効な共有URLを開いている人。ログイン不要 | `share_token`。同一Eventの共有要素と「つたえたいこと」を共同編集 |
| 回答者行（Participant） | Event内で共同編集される名前付き回答単位。人物・ブラウザの恒久IDではない | Event内のDB行 |
| 選択中回答者 | 現在の個人名義操作対象 | `kimenosuke:selected-participant:<event_id>`へParticipant IDをローカル保持。権限には不使用 |
| 未選択 | 個人名義操作の対象がない状態 | Candidate / Criterion等の共有操作は可能。個人名義操作では回答者を選択 |

Event作成者も意見を入力するときは、他の共有利用者と同じ回答者セレクターを使う。Event作成時にParticipantは作成しない。

---

## 3. 機能要件

### 3.1 Event作成・共有

| ID | 受け入れ条件 |
|---|---|
| AC-1.1 作成前確認 | **Given** トップ画面で入力が有効 **When** 利用者が作成を開始 **Then** 「この内容で作成してもよろしいですか？」「作成後に『きめること』は変更できません。」を表示し、確認後だけ作成mutationを実行する |
| AC-1.2 きめること作成 | **Given** 作成前確認済み **When** きめることと任意のつたえたいことを作成 **Then** Event 1件とdefault Criterion「興味ある？」1件を同一transactionで作成し、Participantを作成しない。どちらかの作成に失敗した場合はEvent／Criterion／Participantをいずれも残さない |
| AC-1.3 作成後不変 | **Given** Event作成成功 **When** いずれの利用者がtitle更新を試みる **Then** UI、server、DBの全境界で拒否する。誤作成時は新しいEventを作成する |
| AC-1.4 URL発行 | **Given** Event作成成功 **When** trusted originが有効 **Then** 推測困難な共有URLだけを提示し、owner固有token、Cookie、session、権限状態を作成しない。trusted originが不正・未設定の場合はURLを表示せずcopy buttonを無効化して「URLを生成できませんでした。しばらくしてからもう一度お試しください。」を表示する |
| AC-1.5 未ログイン閲覧 | **Given** 有効な共有URL保持者 **When** Eventを開く **Then** ログイン・登録なしできめること・つたえたいことを確認できる。回答者未選択なら名前選択、選択後は候補一覧ダッシュボードを表示する |
| AC-1.6 つたえたいこと共同編集 | **Given** 有効な共有URL保持者 **When** つたえたいことを編集 **Then** share capabilityで保存できる。作成者固有権限を要求しない |
| AC-1.7 旧owner情報の拒否 | **Given** 移行後 **When** owner token、旧owner URLまたは旧owner CookieだけでEvent閲覧またはmutationを試みる **Then** 認証・認可根拠として使用しない。旧owner URLからshare画面へ互換redirectしない |
| AC-1.8 URLコピー | **Given** trusted originが有効なEvent詳細 **When** コピー操作 **Then** 共有URLを「コピー」buttonでワンクリックコピーでき、成功時は「✓」を表示する。trusted originが不正・未設定の場合はURLを表示せずcopy buttonを無効化する |

Event作成の通信結果が曖昧な場合も自動retryしない。idempotencyは持たないため、利用者が手動再送すると完全なEventが重複する残余riskを受容する。不完全Eventの残存はこのriskと別問題として、原子的作成で防ぐ。

### 3.2 回答者セレクター

| ID | 受け入れ条件 |
|---|---|
| AC-P.1 未選択画面 | 共有URLを開き有効な選択中回答者がないゲストには「あなたのお名前」、既存名の選択肢、その直下の「直接入力」だけを表示する |
| AC-P.2 既存選択 | 既存回答者行を選択してもDB行を増やさず、入力欄へ同じ名前を反映してその行を選択する。ゲストは候補一覧ダッシュボードへ進む |
| AC-P.3 新規作成 | 新名を非IME Enter、モバイル完了、またはセレクター全体外への通常blurで確定し、trim後1〜60文字のParticipantを作成・選択する。ゲストは候補一覧ダッシュボードへ進む |
| AC-P.4 名前だけの参加 | コメント・評価がなくても、名前の確定契機だけでParticipantを作成する |
| AC-P.5 同名 | trim後完全一致名があれば同じ人か確認する。本人なら既存行を使い、別人なら異なる名前の再入力を求める |
| AC-P.6 名前変更 | 選択行の名前だけを1段階確認後に変更する。空・同名・別行との統合を拒否する |
| AC-P.7 削除 | 2段階確認後にParticipantと配下のVote / Reaction / Concern / Commentを削除し、Candidate / Criterionの`created_by`をNULLにする |
| AC-P.8 選択記憶 | event ID固定localStorageキーを共有URLで使用し、行が不在なら選択とキーを解除する |
| AC-P.9 作成後継続 | Event作成者も共有利用者と同じ回答者選択を使う。名前入力からCandidate入力へ移るだけでは回答者確定を開始せず、Candidate入力済みの場合は回答者確定後もdraftを保持し、Candidate追加成功時だけ入力欄をクリアする |
| AC-P.10 再訪 | localStorageのParticipant IDが同一Eventに現存する場合、共有URLから候補一覧ダッシュボードへ直接進む |

Participant作成は単一の名前確定処理へ集約し、優先順位を次に固定する。

1. 既存回答者の明示選択
2. ○ / − / ×、❤️、🌀、コメント保存、Event / Candidate / Criterionの明示的DB操作
3. 非IME Enter / モバイル完了
4. 通常blur

明示操作起因のblurでは通常blur保存を抑止する。名前draftがある明示操作はParticipant解決後に一度だけ続行し、失敗時はdraftを保持して保留操作を破棄する。reload・tab close・外部遷移でbeforeunload保存は行わない。

### 3.3 候補・判断基準

| ID | 受け入れ条件 |
|---|---|
| AC-2.1 候補追加 | タイトルまたはURLの少なくとも一方でCandidateを追加できる。URLのraw入力にU+0000〜U+001FまたはU+007Fが含まれる場合は、先頭・末尾・内部を問わずtrimおよびWHATWG URL解析前に形式不正として拒否する。その後trimし、`new URL(value).href`で正規化して、正規化後のUTF-8表現が4096 bytes以下で、credential（username / password）を含まない`http:` / `https:`絶対URLだけを保存できる。フォーム見出しは「候補の追加」、入力ラベルは「候補名」とし、候補名inputにplaceholderとお名前欄を置かない |
| AC-2.2 提案者 | 名前draftがなければselected participantを`created_by`へ設定し、未選択ならNULL。非空draftがあればParticipant解決後にその行を設定する |
| AC-2.3 候補編集 | 共有URL保持者がタイトル・URL・提案者を要素ごとの確認後に編集できる。URL更新にもAC-2.1と同じ正規化・scheme allowlist・UTF-8 4096 bytes上限・credential拒否を適用する。提案者は同一EventのParticipantまたはNULLだけ |
| AC-2.4 候補削除 | 共有URL保持者が2段階確認後に物理削除し、配下データをcascade削除する |
| AC-2.5 追加時刻 | `Candidate.created_at`から「1時間以内に追加 / N時間前に追加 / N日前に追加」を表示する。未来時刻は経過0へclampする |
| AC-2.6 判断基準 | デフォルト「興味ある？」、4プリセット、自由記述を作成順に表示し、共有URL保持者が追加・label編集・2段階削除できる |
| AC-2.7 判断基準作成者 | 名前draftなしではselected participantまたはNULL、非空draftありでは解決したParticipantを`created_by`へ設定する |

Candidate / Criterion追加自体は、名前draftもselected participantもない利用者のParticipantを暗黙生成しない。

### 3.4 ○ / − / ×

| ID | 受け入れ条件 |
|---|---|
| AC-3.1 4状態 | Candidate×Participantを`unrated / positive / neutral / veto`のいずれかとして必ず読む |
| AC-3.2 未評価 | Vote行なしを未評価、`neutral`行を能動−として表示でも区別する |
| AC-3.3 保存 | 選択中回答者名義で`positive / neutral / veto`を保存・更新し、Candidate×ParticipantにつきVoteを1件に保つ |
| AC-3.4 共同編集 | 共有URL保持者は任意の回答者行を選択し、その行の現在評価を変更できる |
| AC-3.5 同値再押下 | 選択済みの同じ値を再度押した場合はno-opとし、server actionやDB mutationを実行しない |
| AC-3.6 可視性 | 候補編集画面に全回答者の未評価・○・−・×を表示する |
| AC-3.7 時刻 | Vote時刻は保存・表示目的で追加しない。ユーザーへ表示する時刻はCandidate作成時刻だけ |
| AC-3.8 一覧集約 | 候補一覧の`➖`件数は`neutral` Vote行だけを数え、Vote行なしの`unrated`を含めない。未評価は候補編集の回答者行で別表示する |

### 3.5 ❤️・🌀・コメント

| ID | 受け入れ条件 |
|---|---|
| AC-5.1 ❤️ | 選択中回答者名義でCandidate×Criterionへ付け外しし、判断基準ごとの件数と付与者を表示する |
| AC-5.2 🌀 | 選択中回答者名義でCandidate×Criterionへ付け外しし、判断基準ごとの件数と付与者を表示する。Candidate単位の常設単一🌀は置かない |
| AC-5.3 独立性 | 同じ回答者が同じCandidate×Criterionへ❤️と🌀を両方付けられる |
| AC-5.4 集約 | Candidate全体の❤️はReaction行数、🌀はCriterion別Concern行数を単純合計する。どちらも最終候補判定へ入れない |
| AC-5.5 コメント | Candidate×Participantにつき現在値を最大1件保持し、1〜500コードポイントを明示的な保存だけで確定する |
| AC-5.6 コメント共同編集 | 任意の回答者行を選択して現在コメントを上書きできる。空保存は削除とし、会話・返信・履歴・通知・既読を持たない |

### 3.6 候補一覧ダッシュボード・候補編集

候補一覧ダッシュボード:

- 共有URLの通常閲覧先とし、Eventのきめること・つたえたいことと全Candidateを表示する。
- 1候補1行のサマリー表へCandidate名、URL、総合評価`⭕️ / ➖ / ❌`、❤️ / 🌀合計を表示する。`➖`は能動`neutral`だけを数える。
- `clear / discussion / fallback / none`の説明ラベルは表示せず、控えめなsemantic colorと支援技術向けの名前で状態を表す。
- Candidate名から候補編集画面へ進む。追加時期・提案者、❤️／🌀反応項目の編集、回答者別詳細、コメント入力は候補編集画面へ集約する。
- ダッシュボード上部では、選択中回答者と控えめな変更buttonを最初に示し、その直下へ操作可能なサマリー表を置く。行全体は遷移させず、総合評価は表内で直接選択し、❤️ / 🌀は反応入力UIを開いて項目ごとに付け外す。反応入力UIの「反応項目の追加」は候補編集と共通の編集modalへ進む。同内容の候補タイルは置かない。候補追加はデスクトップでも候補名・リンク・追加buttonを1列に積む。B-2詳細は[サマリー表・戻り導線 要件](reports/dashboard-summary-and-back-nav-requirements-2026-07-15.md)を正とする。

候補編集画面:

- Candidate情報と同じ候補タイル内で、サマリーと同じ○ / − / ×と判断基準別❤️ / 🌀を操作し、その下で選択中回答者のコメントを明示保存できる。
- ヘッダーの戻り導線「一覧に戻る」でダッシュボード（`/e/[shareToken]`）へ戻る。ダッシュボード表示中は同導線を表示しない。B-1詳細は[サマリー表・戻り導線 要件](reports/dashboard-summary-and-back-nav-requirements-2026-07-15.md)を正とする。
- 候補タイル直前に「〇〇として判断中」と回答者変更buttonを置く。未選択時の個人名義操作は既存の名前選択を経て一度だけ再開する。
- 「みんなの判断」は全回答者行をread-onlyで表示し、行clickによる回答者変更や行内編集controlを置かない。コメントは省略せず全文表示する。
- 「みんなの判断」の下に「候補内容の編集」「❤️／🌀反応項目の編集」「判断者名の変更／削除」を置く。候補内容・候補削除はインラインpanel、反応項目の追加・label編集・2段階削除と、選択中回答者の名前変更・削除はそれぞれmodalから行う。候補内容は＋／−付きの開閉UIとしてmodal導線と視覚的に区別し、modal導線2件はデスクトップで同一行に並べて文言を改行せず、モバイルで横幅不足時だけボタン単位・文言とも折り返せる。反応項目modalは既存項目一覧の下に追加buttonを置く。判断者modalは現在名を入力済みの編集可能inputとし、変更・キャンセル・右端の削除を1画面に置く。削除確認へ進んだ後は編集UIを表示せず、各段階を「消す／キャンセル」の2択に限定する。
- 375pxでは回答者行と編集panelを縦配置し、1366pxでは比較しやすい表形式に近い配置とする。操作モデルは共通にする。
- MVPではイベント全体の一括回答マトリクスとの表示切替を作らない。

### 3.7 最終候補表示

候補ごとの○数を`P`、×数を`X`、全候補の○最多数を`M`とする。

| 状態 | 条件 | 意味 |
|---|---|---|
| `clear` | `M > 0`, `P = M`, `X = 0` | 議論なしで決めやすい最有力候補 |
| `discussion` | `M > 0`, `P = M`, `X > 0` | 人気は最多だが議論が必要な候補 |
| `fallback` | clearが0件で、`0 < P < M`, `X = 0`の候補群における○最多 | 消去法で残る安全な代替候補 |
| `none` | 上記以外、または`M = 0` | 通常表示 |

- 同条件・同数は同じ状態で並列表示する。
- ○最多同数で×なしと×ありが混在する場合は、それぞれ`clear`と`discussion`にする。
- clearが1件以上あれば、○最多未満の×なし候補をfallbackにしない。
- 説明ラベルは表示しない。カードのsemantic colorに加え、支援技術向けの状態名と常時表示する○ / − / ×の実数で状態を確認できるようにする。
- 全候補を常時表示・編集可能にし、確定ボタン、確定状態、ロックを追加しない。

### 3.8 同期・失敗

- 初期表示で完全EventStateを取得する。
- ローカルmutation成功後、ページ再読み込みなしで完全EventStateを再取得して置換する。
- 別タブ・別ブラウザの変更は、次のローカル成功操作または手動再読み込み・再訪で反映する。
- Realtime、定期polling、focus復帰時の自動取得はMVP外とする。
- 同時編集はlast-write-wins。失敗時は直前状態と入力draftを維持し、対象付近へエラーを表示する。

### 3.9 きめごと履歴

「きめごと／きめごと一覧」は、権限・認証・ownershipではないbest-effortな同一browser profile内の戻り道として、次の契約で実装する。

- Top pageの見出しは「きめごと」、全件画面は「きめごと一覧」とする。
- valid share URLからEventを正常取得しtitleを得た後、またはEvent作成成功後に正常なshare画面へ到達した後だけ登録する。
- 同一originのcanonical relative pathname `^/e/[A-Za-z0-9_-]{43}$`、表示用title、`lastVisitedAt`、`expiresAt`だけを`localStorage`へ保存し、pathnameで重複排除する。pathnameはEvent access capabilityを含むlocatorとして扱い、raw share token単体を別fieldへ保存する意味ではない。titleもEvent由来情報だが、再訪UIに必要な限定例外として保存を許可する。
- trusted application routeからpathnameを構築し、tokenの抽出・複製・hash／digest／prefix等の派生識別子化、arbitrary inputの直接保存を行わない。full URL、origin、protocol、host、query、fragment、owner URL／token、Event／Participant等のIDは保存しない。title以外のEvent business dataは保存せず、query／fragment付き入力はcanonical pathnameへ正規化するか保存を拒否する。
- capability-bearing pathnameはcredential同等に扱い、console／server log／analytics／telemetry／error report／evidence／screenshot／artifact／Git／test snapshot／fixture名へ転記しない。
- 最終閲覧から180日のsliding expiry、最大30件、`lastVisitedAt`降順とstable tie-break、新規登録・再訪時は先頭へ移動し、31件目では最古1件を削除する。同一pathnameの再訪はupsertし、title、`lastVisitedAt`、`expiresAt`を更新する。
- Top pageは最新2件と「すべて見る」、全件画面は最大30件を新しい順に表示する。
- 個別削除と全削除を提供する。履歴削除はEvent本体またはshare capabilityを無効化せず、valid URLを再訪すれば再登録される。
- invalid token、404、network failureは登録しない。期限切れは読み出し時に削除する。
- memo、Participant、Candidate、Vote、Reaction、Concern、Comment、Event response全体、Event ID、owner情報その他のtitle以外のEvent business dataを保存しない。titleは再訪UIに必要な限定例外として扱う。
- 読み出しまたは更新時にexpired／malformed／invalid pathname／invalid date／duplicate／overflow entryをpurgeする。future clock-skewの許容上限はN6 Execution Contractで固定し、未確定のまま実装を開始しない。
- localStorageはclient component／client-side effect内だけで読み書きし、server component、route handler、server action、SSR render中に参照しない。初期server HTMLはstorage内容に依存せず、read前は固定neutral stateを表示してhydration mismatchを起こさない。
- `undefined`、SecurityError、quota、JSON parse／schema／date／read・write・remove failure、private browsing差異でもEventの作成・閲覧・共同編集を阻害しない。localStorage全体を無条件clearせず、履歴UIだけを安全に無効化または空表示する。端末間同期とlogin同期は行わない。
- 同一browser profileの共有利用者にtitleと再訪locatorが見える可能性があり、login／logoutによる分離はない。履歴削除UIはlocalStorage entryだけを削除し、Event本体や他利用者のデータを削除しない。

selected participant用の`kimenosuke:selected-participant:<event_id>`は回答名義を復元する別UI状態であり、きめごと履歴と統合しない。

### 3.10 広告・検索公開

- Event画面を主要広告面とし、トップページとEvent作成フォームは作成完了率を優先して原則広告を表示しない。
- 一般公開時は、Event主要操作後に将来1 providerを接続できるin-page広告slot境界を用意する。ただしprovider SDK／script、publisher ID、slot ID、provider固有通信はN13まで導入しない。
- 広告機能はfeature flagで完全無効化でき、flag OFF／provider未設定時は広告container、空白、third-party requestを残さない。広告障害はEvent閲覧・編集を阻害しない。
- Event title、memo、Candidate、Participant、Vote、Reaction、Concern、Commentその他のbusiness dataを広告targeting parameterとして明示的に渡さない。
- `/e/[shareToken]`はaccess capabilityとして維持する。application log、analytics event、error report、test artifactへraw share pathname／tokenを記録せず、copy／shareの明示操作を除いて第三者へraw share URLを送らない。
- 標準広告scriptをEvent親ページで動かす場合、広告providerがpathnameを技術的に取得し得ることは残余riskとしてPrivacy判断へ渡す。
- public pageは一般公開時にindex可能とする。Event pageは一般公開後も`noindex`を維持する。
- Search Console所有権確認、sitemap送信、index requestはHuman操作とし、一般公開前後のgateで記録する。Google側障害やDNS反映遅延だけで公開を止める場合はHuman判断とする。
- 実広告の配信開始はN13の独立Human gateであり、一般公開のblockerではない。Privacy公開内容と実際の広告有効状態を一致させる。

### 3.11 ローンチ規約・Event作成abuse境界

- 利用により規約へ同意したものとみなし、作成画面にもURLを知る人が閲覧・共同編集できることと、個人情報・秘密情報を入力しない注意を短く表示する。
- 商用／affiliate利用を許容し、経済的利益の明示を求める。spam、欺瞞、権利侵害、malware等を禁止する。
- Event削除依頼は原則受け付けず、個人情報、権利侵害、security等を例外判断へ送る。ローンチ前に受信可能な問い合わせ窓口を用意するが、support返信保証は設けない。
- Event作成だけを初期rate-limit対象とし、anonymous clientからのdirect Event INSERTを禁止する。Vercel経由の専用server routeとleast-privilege DB経路を使用し、broadな`service_role`を既定にしない。
- N7はexact `POST /api/events`だけを対象とする、ログイン不要の公開write API向けoperational abuse mitigationとする。launch時のprovisional parameterはIP単位、fixed window 600秒、60 requests、超過時HTTP 429とする。Vercelのregion-scoped counterに沿う運用値であり、global exact quota、個人単位の利用権または永久不変のproduct invariantとして扱わない。学校、会社、イベント会場、公共Wi-Fi、家庭、NAT gateway等のshared IPからの正規一斉利用を考慮し、実利用、429、false positive、abuse、costをprivacy-safeに観測して、bounded Human-approved operationで調整する。429はbody parse前に分類し、bodyを信頼・表示せず、draftを保持し、navigation、automatic retry、N6 history mutationを0とする。
- rate-limit拒否時のEvent／default Criterion row deltaを0とし、accepted Event＋default Criterionのatomicityを守る。pre-route／pre-DB拒否、Preview isolationおよびProduction非干渉は、後続のtechnical evidence前に`PROVEN`と扱わない。

### 3.12 N8 Production maintenance transition

**Current lifecycle（2026-08-05）:** `N8_PRODUCTION_CLEANUP_CLOSEOUT_ACCEPTED / N8 CLOSED / N9 NOT STARTED・NOT AUTHORIZED`。Production Data APIはOFF、REST／GraphQLはblocked、mutation surfaceは`BLOCKED 3 / HUMAN_ONLY 1 / VERIFIED_N/A 8 / UNKNOWN 0`である。Human承認済みcleanupとpostcheckを完了し、exact 8 business tablesとdangling／orphan rowは0である。Productionはpre-ownerless／old-owner familyでrequired old-owner markersがpresent、ownerless target artifactはabsentだが、expected old-owner structure digestは一致せず`OLD_OWNER_MISMATCH`である。Human decision `N8_OLD_OWNER_MISMATCH_REBASELINE_ACCEPTED`は、この未解明factを消去・PASS変換せず、N8 execution delta 0とともにN9 entry baselineとして受容した。disposition evidenceは`/Users/shige/Projects/Where-to-Visit-Evidence/N8-production-maintenance/20260805T130247Z-n8-old-owner-mismatch-disposition/`（`COMPLETE` SHA-256 `4ab63a3ed41a6df7080c43cb90545e9dde23498f9c604dbf6c1d51d8364c00f7`）へno-replaceで固定した。migration、deployment、role／grant変更、Data API再開は行っていない。prior final evidence generationは`/Users/shige/Projects/Where-to-Visit-Evidence/N8-production-maintenance/20260805T124529Z-n8-final-closeout/`、`COMPLETE` SHA-256 `61835b3b13237e1fc1d32f4e11d4b1568fc55fa86166b24805cda17aac179965`のまま変更していない。この完了状態からN9 execution permissionを導出しない。

- N8は、N9のownerless migration／application deploymentに先立ち、old-owner Productionのbusiness mutationを停止し、business dataを0件にしてN9へhandoffする。
- Production Webのpublic origin reachabilityを維持する。N8ではVercel Authenticationを要件とせず、導入、解除または設定変更を行わない。Data API OFF後にEvent作成・閲覧・共同編集が利用不能になることを許容し、maintenance UIを追加しない。N9以降のAuthentication lifecycleは別Human decisionであり、N8のentry条件、PASS evidenceまたはpermissionに使用しない。
- N8のprimary maintenance lockは、HumanがSupabase DashboardでProduction Data APIをOFFにし、current REST／GraphQL business accessを停止することだけとする。Production cleanup COMMITもHumanだけが実行し、Agent-readable Production write credentialは作成しない。
- Data API OFFをRealtime、Storage、Auth、Edge Functions、direct Postgres／poolerまたはSQL Editorの停止証拠へ読み替えず、8 business tablesへのmutation capabilityをsurfaceごとに個別分類する。
- cleanup targetは`events`、`participants`、`candidates`、`criteria`、`votes`、`reactions`、`concerns`、`comments`のexact 8 tablesとし、全rowを削除対象にする。preservation、conversionおよびmigrationは行わない。これは利用者向けEvent削除機能を追加する要件ではない。
- Data API OFF read-back後の最初のfresh countだけをauthoritative baselineとする。1 tableでもnonzeroならHuman承認済みcleanup branchを用いる。8 tablesがすべてzeroなら`ALREADY_IN_DESIRED_STATE / CLEANUP MUTATION 0`とし、zero証明のためのcleanup、ROLLBACKまたはCOMMITを行わない。in-flight Data API request、quiet period、drain、waitまたはrace-specific lockはN8の設計対象にせず、OFF read-back後のbusiness row増加はunexpected mutationとしてSTOPする。
- N9へ、pre-ownerless／old-owner family、required old-owner markers present、`OLD_OWNER_MISMATCH`、ownerless target absent、8 business tables row 0、Data API OFFおよびmutation-surface `UNKNOWN 0`のmaintenance stateをhandoffする。N9 handoffはN9 executionを許可しない。
- N8ではcreator role mutation、`NOLOGIN`、creator active-session verification、ownerless migration、application deployment、Data API再開、Firewall mutation、positive Production smoke、merge、main integrationまたはN9 executionを行わない。creator route activationはN9の別Human gateで設計・実行する。

本要件同期は、Production read／mutation、SQL artifact生成、branch／Git publicationまたはN9 executionのpermissionを生成しない。

---

## 4. 非機能要件

| 区分 | 要件 |
|---|---|
| 対応幅 | 375×812と1366×768でモバイル・デスクトップを同格に扱う |
| セキュリティ | tokenは推測困難。RLS、列権限、同一EventガードをDBでも強制する。Candidate URLはserverでWHATWG URLへ正規化し、server / DBの双方でHTTP(S)絶対URL・UTF-8 4096 bytes以下・credentialなしを強制する。Supabase Authは使わない。ownerless Event作成にはN4で採用したdedicated least-privilege Postgres role方式を用い、role名は`kimenosuke_event_creator`とする。N5では`pg@8.22.0`／`@types/pg@8.20.0`、server-only `KIMENOSUKE_EVENT_CREATOR_DATABASE_URL`／`KIMENOSUKE_EVENT_CREATOR_DATABASE_CA_PEM`、short-lived Client、verify-full相当、exact timeout、prepared statement 0、retry 0を採用した。exact設定は[Entry Decision Contract](contracts/WTV-N5-ENTRY-DECISION-CONTRACT-v0.1-draft.md) §7〜§10を正とする。QA projectはHuman作成済みで、hosted Event creator credentialは`PRESENT / VERIFIED`、minimum-privilege probeとPreview REST target bindingは`PASS`、Layer 2 replayはM01〜M11 exact 11件・M12 absentで完了した。basic-function QAとfixture cleanupも`PASS`／`COMPLETE`である。raw credential、Production value、share tokenは記録しない。有効なmainは旧owner modelのままで、task-branch candidateをmain実装済みまたはProduction受入済みと扱わない。anonymous direct Event INSERTを禁止し、broadな`service_role`利用を既定にしない。browser responseへ環境別CSP、`nosniff`、`no-referrer`、camera／microphone／geolocation／browsing-topicsを無効化するPermissions Policy、`X-Frame-Options: DENY`を付与し、frame embeddingの正本をCSP `frame-ancestors 'none'`とする |
| Security header環境差 | Production CSPへVercel Toolbar sourceを含めない。Previewだけに`vercel.live`等の承認済みToolbar sourceを許可する。DevelopmentはProduction baselineへ`'unsafe-eval'`とlocalhost／127.0.0.1のWebSocketだけを追加する。HSTSはアプリ側で設定せず、Preview／ProductionのVercel配信headerを別gateで確認する |
| データ | 通常利用では無期限保存とし、利用者向けイベント削除機能は設けない。ローンチ前のN8では、別Human gateによるexact 8-table全件cleanupを限定的なmaintenance transitionとして扱う。FK、UNIQUE、CHECK、triggerで整合性を保証する |
| 性能 | Event単位で完全状態を取得し、CandidateごとのN+1照会を避ける |
| アクセシビリティ | 可視の説明ラベルを増やさず、支援技術向けの状態名と○ / − / ×の実数でsemantic colorを補完する |
| 検索 | 一般公開前はsite全体の`noindex`を維持する。N12でpublic pageだけindex可能に切り替え、Event pageは`noindex`を維持する。robots、canonical、sitemapを公開前に準備する |
| Local DB公開範囲 | Docker local stackの全公開portを`127.0.0.1`へ限定し、起動後のHostIp検査に失敗したら停止する |
| 接続先分離 | Git非追跡のlocal / remote profileとtracked `config/supabase-targets.json`を照合し、target不明・URL不一致ではNext.js / Playwrightを起動しない |
| Migration再現性 | 固定CLIで新規migrationを生成し、remote適用前にlocal増分適用、postflight、advisor、空DBからのclean-chain replayを完了する |
| E2E分離 | `test:e2e:local`と`test:e2e:remote`を別証跡として実行し、test runnerと新規Next.js serverへ同じprofileを渡す |
| 秘密情報 | `SUPABASE_URL` / `SUPABASE_ANON_KEY`の値、CLI statusのkey・password、service role・DB passwordをログ・画面・報告へ出さない |
| Remote DB適用 | 別承認後に人間がSQL Editorでmigration全文を実行する。CLI remote接続やmigration history repairへ暗黙に切り替えない |

---

## 5. MVP境界

### In Scope

きめること作成・作成前確認・作成後不変 / つたえたいこと共同編集 / 共有URL / 回答者セレクター / 候補一覧ダッシュボード / 候補編集 / ○・−・× / 最終候補3状態 / Criterion別❤️・🌀 / 1回答者1コメント / URLコピー / きめごと履歴 / public pageの検索公開とEvent page noindex / provider非依存の広告slot境界 / モバイル・デスクトップ対応 / 通常利用での無期限保存。N8のローンチ前maintenance cleanupは利用者向けEvent削除機能とは分離する。

### Out of Scope

- ログイン、会員登録、Participantの端末横断本人認証
- 確定ボタン、確定状態、ロック
- Event終了、共有URL再発行、ban
- イベント全体の一括評価マトリクスと表示切替
- 操作履歴、変更者履歴、コメント履歴
- Realtime、polling、通知、既読
- 回答者行の並び替え
- イベント削除
- 旧owner URL／tokenとの互換性、owner URLからshare画面への互換redirect

トップ下部の「きめごと」は、同一browser profileの`localStorage`に保存した最大30件のEventへの再訪導線であり、権限・認証・ownershipではない。端末間同期とログイン同期はMVP外で、履歴からの削除はEvent削除ではない。

---

## 6. 画面一覧

> **B-3実装状態（正式受入済み）:** トップとEventの5 view modeは、上段左=`Clarity Before Choice`（非リンク・System serif）、上段右=常設レイアウトスロット内のview mode別ナビ、下段中央=`きめのすけ`（`/`リンク）から成る共通ブランドヘッダーを用いる。375×812・320 CSS pxでも同じ上下関係と全文表示を維持する。正式local gate、200% resize、Production確認は2026-07-17までにPASSした。詳細は[ブランドヘッダー刷新要件](reports/brand-header-refresh-requirements-2026-07-16.md)を正とする。

| 画面 | 内容 |
|---|---|
| Event作成 | きめること・任意のつたえたいこと → 作成前確認 → 作成。成功後は共有URLだけを提示する |
| きめごと／きめごと一覧 | 同一browser profileからEventへ戻るための履歴導線。Topは最新2件、全件画面は最大30件。権限・ownershipではない |
| ゲスト名前選択 | あなたのお名前 / 既存名選択 / 直下の直接入力。確定後は候補一覧へ |
| 候補一覧ダッシュボード | 不変のきめること・共同編集可能なつたえたいこと / 操作可能なサマリー表（候補名・リンク・⭕️ ➖ ❌・❤️ / 🌀を1候補1行）/ 候補追加。追加時期・提案者・回答者別詳細は候補編集画面で確認する。共有URLの通常閲覧先 |
| 候補編集 | 1 Candidateの情報 / 選択中回答者の○・−・×・判断基準別❤️ / 🌀・コメント入力 / 全回答者のread-only一覧 / 候補・判断基準・選択中回答者の詳細編集。ヘッダーの「一覧に戻る」でダッシュボードへ戻る |
| ダイアログ | 同名確認 / 名前変更 / Participant・Candidate・Criterionの2段階削除 / 既存要素変更確認 |

詳細な受け入れ条件、名前確定状態機械、UI構造は[共同編集型・回答者行モデル 詳細要件](reports/collaborative-response-row-requirements-2026-07-11.md)と[実装仕様](reports/collaborative-response-row-spec-draft-2026-07-11.md)を参照する。
