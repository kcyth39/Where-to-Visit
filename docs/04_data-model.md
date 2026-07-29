# 04 データモデル（きめのすけ）

作成日: 2026-07-08 / 最終改訂: 2026-07-29 / フェーズ: Phase 1（要件定義）

関連: [03_requirements.md](03_requirements.md) / [ADR-0003](adr/0003-evaluation-and-decision-logic.md) / [ADR-0004](adr/0004-permission-model.md) / [ADR-0005](adr/0005-drop-attribute-dynamic-criteria.md) / [ADR-0006](adr/0006-collaborative-response-row-model.md) / [ADR-0007](adr/0007-event-views-and-criterion-feedback.md) / [ADR-0008](adr/0008-local-supabase-development-workflow.md) / [ADR-0009](adr/0009-ownerless-collaborative-model.md) / [詳細仕様](reports/collaborative-response-row-spec-draft-2026-07-11.md) / [Local DB開発リファレンス](reports/supabase-cli-docker-development-reference-2026-07-12.md)

> **実装状態（2026-07-13）:** ADR-0006 / ADR-0007のschemaは`20260712032527_collaborative_response_row_model.sql`と`20260712144228_move_rls_helpers_to_private_schema.sql`でlocal／remote dev DBへ移行済み。既存適用済みmigrationは編集せず、後続migrationで切り替え・補正した。
>
> **S1-b remote適用状態（2026-07-25）:** `20260725010551_event_default_criterion_atomic_create.sql`（SHA-256 `0cafffd2d989ede67ab5a8a03f01dcd915d397d41ed6aa8280d3894f84814017`）を、Humanが`where-to-visit-dev`（ref `ehmivhmsnhcrynvuahaq`）へSQL Editorで1回適用した。private `SECURITY DEFINER` function、`AFTER INSERT` trigger profile 13/13、外部roleからのdirect EXECUTE不可を含むschema／security postflightはPASSした。hosted migration historyは適用証拠として使用しておらず、history reconciliationは未実施の別scopeである。
>
> **N2 target model（2026-07-29・Human decision adopted／canonical docs synchronized／lifecycle closed）:** ADR-0009に従い、owner URL／token／Cookie／owner-sessionを廃止してEvent accessをshare tokenへ一本化する。titleは作成後不変、memoは「つたえたいこと」としてshare token保持者の共同編集対象とする。N4では内部識別子`memo`の維持、normalized memo最大1000文字、dedicated least-privilege Postgres role方式（candidate `kimenosuke_event_creator`）を採用した。exact counting rule、actual role／connection／driver等はN5 entry decisionに残る。現行schema／applicationには`owner_token`とowner policyが残っており、ownerlessは未実装である。N3は`CONTRACT ADOPTED / MODE B / NOT IMPLEMENTATION AUTHORIZED`、N4は`ADOPTED / NOT IMPLEMENTATION AUTHORIZED`、N5は`ENTRY DECISIONS PENDING / NOT IMPLEMENTATION AUTHORIZED`、N6〜N13は`PLANNED / NOT IMPLEMENTATION AUTHORIZED`であり、本書の同期は実装許可を生成しない。N5で別Human承認後にownerless schema／permission変更を実装し、N8で既存Event cleanupを別Human gateにより実行する。

---

## 1. 識別・権限

- **share token**: Event共有アクセスと共同編集に使う推測困難なtoken。
- **Participant**: Event内の共同編集可能な名前付き回答行。ブラウザや人物の恒久IDではない。
- **selected participant**: `kimenosuke:selected-participant:<event_id>`へParticipant IDだけを保持するローカルUI状態。RLS・権限判定には使わない。
- **きめごと履歴**: 同一ブラウザで共有Eventへ戻るためのローカルUI状態。権限・ownership・認証・認可には使わず、DB tableへ保存しない。
- **ADR-0009撤去対象**: `events.owner_token`、owner token照合function／policy、owner URL、owner Cookie／owner-session。移行後は認証・認可根拠に使わない。
- **既撤去**: `events.owner_participant_id`、`participants.guest_token`、guest tokenによるcurrent participant判定。
- Supabase Auth、User、service role、端末横断本人認証はMVPで使わない。

---

## 2. テーブル

物理テーブル名は小文字複数形を維持する。ユーザーへ表示する時刻は`candidates.created_at`だけとし、他テーブルの`created_at`は作成順・既存schema互換等の技術メタデータに限定する。新設`votes`にはtimestamp列を設けない。

### 2.1 `events`

| 列 | 型・制約 | 更新 | 備考 |
|---|---|---|---|
| id | uuid PK | 不可 | |
| title | text NOT NULL、trim後1〜80 | 作成後不可 | UI「きめること」。誤作成時は新しいEventを作成する |
| memo | text NULL | share token | UI「つたえたいこと」（任意）。共有利用者が共同編集する。内部識別子`memo`を維持し、normalized memoの共通最大長は1000文字。exact counting ruleと制約の実装方法はN5 Contractで固定する |
| share_token | text NOT NULL UNIQUE | 不可 | 共有URL |
| owner_token | 現行実装に存在 | 撤去対象 | ADR-0009移行後は認証・認可に使わない。N4で撤去順序を契約化し、N5で採用済みschema変更を実装する。既存Event cleanupはN8 |
| created_at | timestamptz NOT NULL default now() | 不可 | 技術メタデータ |

- Event作成時にParticipantを生成しない。
- Event INSERT成功時、private schemaの`AFTER INSERT` triggerが同じtransaction内でdefault Criterionを1件作成する。Criterion作成が失敗した場合はEvent INSERT全体をrollbackし、Event／Criterion／Participantを残さない。
- `owner_participant_id`とParticipantへの循環FKを撤去する。
- Event削除機能はMVP UIへ追加しない。

### 2.1.1 Browser-local `きめごと履歴`

`きめごと履歴`はDB modelではなく、同一ブラウザだけの戻り道として`localStorage`へ保存する。1件は相対share path、表示用title、`lastVisitedAt`、`expiresAt`だけを持ち、Event ID、memo、Participant、Candidate、Vote、Reaction、Concern、Comment、owner情報を保存しない。

- 有効なEvent作成成功または有効な共有URLへの訪問時だけ登録・更新する。
- 180日のsliding expiration、最大30件、`lastVisitedAt`降順とし、トップは最新2件、全件は「きめごと一覧」に表示する。
- 個別削除と全削除は履歴だけを消し、Event本体を削除しない。有効な共有URLを再訪すれば再登録できる。
- 保存不能、破損、期限切れはEvent閲覧・編集を阻害せず、安全に無視または除去する。
- selected participantのEvent ID固定keyとは用途と保存境界を分離する。端末間同期とログイン同期は行わない。

### 2.2 `participants`

| 列 | 型・制約 | 更新 | 備考 |
|---|---|---|---|
| id | uuid PK default gen_random_uuid() | 不可 | 回答者行ID |
| event_id | uuid NOT NULL FK events ON DELETE CASCADE | 不可 | |
| display_name | text NOT NULL、trim後1〜60 | 可 | Event内表示名 |
| created_at | timestamptz NOT NULL default now() | 不可 | 並び順 |

制約・挙動:

- 保存前に`btrim`し、`UNIQUE(event_id, display_name)`相当でtrim後完全一致名を拒否する。
- 大文字小文字、全角半角、Unicode正規化を自動的に同一視しない。
- 表示順は`created_at ASC, id ASC`。
- `guest_token`と`UNIQUE(event_id, guest_token)`を撤去する。
- 削除時、Vote / Reaction / Concern / Commentは`ON DELETE CASCADE`、Candidate / Criterionの`created_by`は`ON DELETE SET NULL`。

### 2.3 `candidates`

| 列 | 型・制約 | 備考 |
|---|---|---|
| id | uuid PK | |
| event_id | uuid NOT NULL FK events ON DELETE CASCADE | |
| title | text NULL | titleまたはurlの少なくとも一方必須 |
| url | text NULL | 同上。正規化済みHTTP(S)絶対URL、UTF-8で4096 bytes以下、credential禁止 |
| created_by | uuid NULL FK participants ON DELETE SET NULL | 提案者 |
| created_at | timestamptz NOT NULL | 候補追加時刻・作成順 |

- title / urlはtrimし、空文字をNULLへ正規化する。
- urlのraw入力にU+0000〜U+001FまたはU+007Fが含まれる場合は、先頭・末尾・内部を問わずtrimおよびWHATWG URL解析前に拒否する。
- 非空urlはserver境界で`new URL(value).href`へ正規化してから保存する。最大長は正規化後のUTF-8表現で4096 bytesとし、JavaScriptではUTF-8 byte length、Postgresでは`octet_length(url)`で同じ保存上限を判定する。
- urlのschemeは`http:` / `https:`だけを許可し、相対URL、protocol-relative URL、不正URL、空host、credential（username / password）を拒否する。serverはWHATWG URL解析と正規化を担当し、DBは直接INSERT / UPDATEによる回避を防ぐため、scheme・authority・credential・保存値中の制御文字・UTF-8 byte lengthを検証する。
- `created_by`はNULLまたはCandidateと同一EventのParticipantだけを許可する。
- 名前draftなしではselected participantまたはNULL。trim後非空draftありではParticipant解決後にそのIDを設定する。
- Candidate追加自体を理由にParticipantを暗黙生成しない。
- `created_at`はタイトル・URL・提案者・回答の編集で変更しない。
- 表示経過は`max(0, now - created_at)`。未来時刻は0へclampして「1時間以内に追加」とする。

### 2.4 `criteria`

| 列 | 型・制約 | 備考 |
|---|---|---|
| id | uuid PK | |
| event_id | uuid NOT NULL FK events ON DELETE CASCADE | |
| label | text NOT NULL、trim後1〜60 | 唯一の更新可能な業務列 |
| source | text CHECK (`default / preset / custom`) | 作成後不変 |
| created_by | uuid NULL FK participants ON DELETE SET NULL | 作成者 |
| created_at | timestamptz NOT NULL | 作成順 |

- `created_by`はNULLまたはCriterionと同一EventのParticipantだけを許可する。
- 名前draftなしではselected participantまたはNULL。trim後非空draftありではParticipant解決後にそのIDを設定する。
- Criterion追加自体を理由にParticipantを暗黙生成しない。
- Event作成に連動するdefault Criterionは、label「興味ある？」、`source='default'`、`created_by=NULL`、作成Eventと同じ`event_id`に固定する。4プリセット、自由記述、label重複許容、`created_at ASC, id ASC`、2段階削除を維持する。

### 2.5 `votes`（新設）

| 列 | 型・制約 | 備考 |
|---|---|---|
| id | uuid PK default gen_random_uuid() | |
| candidate_id | uuid NOT NULL FK candidates ON DELETE CASCADE | |
| participant_id | uuid NOT NULL FK participants ON DELETE CASCADE | |
| value | text NOT NULL CHECK (`positive / neutral / veto`) | Vote専用enumなし |

- `UNIQUE(candidate_id, participant_id)`。
- CandidateとParticipantが同一Eventに属することをDBで保証する。
- `id / candidate_id / participant_id`は更新不可、`value`だけ更新可能。
- Vote行なしは`unrated`、`neutral`行は能動−として読む。
- 評価時刻用の`created_at / updated_at`は追加しない。
- アプリの`setVote`はupsert / updateで1行を維持し、raw duplicate INSERTはUNIQUE制約で拒否する。

### 2.6 `reactions`

既存列を維持する。

```text
UNIQUE(candidate_id, participant_id, criterion_id)
```

- share token保持者がselected participant名義でINSERT / DELETEできる。
- Candidate / Participant / Criterionが同一Eventに属することをDBで保証する。
- UPDATE・履歴なし。
- Candidate全体の❤️はCandidate配下のReaction行を`count(*)`する。同一Participantが複数Criterionへ付けた分も別々に数える。

### 2.7 `concerns`

| 列 | 型・制約 | 備考 |
|---|---|---|
| id | uuid PK | |
| candidate_id | uuid NOT NULL FK candidates ON DELETE CASCADE | |
| participant_id | uuid NOT NULL FK participants ON DELETE CASCADE | |
| criterion_id | uuid NOT NULL FK criteria ON DELETE CASCADE | 判断基準別🌀 |
| created_at | timestamptz NOT NULL | 技術メタデータ。ユーザー表示しない |

- `UNIQUE(candidate_id, participant_id, criterion_id)`。
- share token保持者がselected participant名義でINSERT / DELETEできる。
- Candidate / Participant / Criterionが同一Eventに属することをDBで保証する。
- UPDATE・履歴なし。
- 同じCandidate×Participant×CriterionにReactionとConcernの両方が存在してよい。
- Candidate単位の常設単一Concernは持たない。Candidate全体の🌀はCandidate配下のCriterion別Concern行を`count(*)`する。

### 2.8 `comments`

| 列 | 型・制約 | 備考 |
|---|---|---|
| id | uuid PK | |
| candidate_id | uuid NOT NULL FK candidates ON DELETE CASCADE | 不変 |
| participant_id | uuid NOT NULL FK participants ON DELETE CASCADE | 不変 |
| text | text NOT NULL、trim後1〜500コードポイント | 唯一の更新可能な業務列 |
| created_at | timestamptz NOT NULL | 技術メタデータ・不変 |

- `UNIQUE(candidate_id, participant_id)`。
- 同じ回答者が再保存した場合は既存行のtextを更新する。
- 空または空白だけの保存はアプリでDELETEする。
- Comment履歴、複数件、返信、`updated_at`表示を追加しない。

---

## 3. 関係

```text
Event
  ├──< Participant (名前付き回答行)
  ├──< Candidate
  └──< Criterion

Candidate
  ├──< Vote >── Participant
  ├──< Reaction >── Participant
  │       └──────── Criterion
  ├──< Concern >── Participant
  │       └──────── Criterion
  └──< Comment >── Participant

Candidate.created_by ──> Participant (NULL可 / SET NULL)
Criterion.created_by ──> Participant (NULL可 / SET NULL)
```

---

## 4. Index

最低限、次を設ける。

- `participants(event_id, created_at, id)`または同等の並び順取得index
- `UNIQUE participants(event_id, display_name)`
- `candidates(event_id, created_at, id)`
- `criteria(event_id, created_at, id)`
- `UNIQUE votes(candidate_id, participant_id)`
- `votes(participant_id)`
- Reaction / Concern / CommentのCandidate / Participant / Criterion FK index
- `UNIQUE concerns(candidate_id, participant_id, criterion_id)`
- `UNIQUE comments(candidate_id, participant_id)`

PostgresはFK列を自動index化しないため、cascadeとEvent状態取得に使うFKを明示的にindex化する。

---

## 5. RLS・DBガード

### 5.1 アクセス定義

- `event accessible`: 有効なshare tokenを持つ。
- `event share editable`: 有効なshare tokenを持つ。
- `event title immutable`: INSERT後のtitle更新を、share tokenを含む全経路で拒否する。
- `event memo editable`: 有効なshare tokenを持つ。

### 5.2 CRUD

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| events | event accessible | share token生成条件付き | share tokenでmemoだけ。title不可 | UIなし |
| participants | event accessible | share token | share tokenでdisplay_name | share token |
| candidates | event accessible | share token | share token | share token |
| criteria | event accessible | share token | share tokenでlabel | share token |
| votes | event accessible | share token | share tokenでvalue | share token |
| reactions | event accessible | share token | なし | share token |
| concerns | event accessible | share token | なし | share token |
| comments | event accessible | share token | share tokenでtext | share token |

移行後はowner token、旧owner URL、旧owner CookieをSELECTまたはmutationの認証・認可根拠にしない。

### 5.3 DB強制事項

- Participant: trim、長さ、Event内同名禁止。
- Candidate URL: 非NULL時はHTTP(S)絶対URL、UTF-8で4096 bytes以下、credentialなし。INSERT / UPDATEの双方で検証する。
- Candidate / Criterion `created_by`: NULLまたは同一Event Participant。
- Vote: Candidate / Participantの同一Event、一意、value制約、不変列保護。
- Reaction: Candidate / Participant / Criterionの同一Event、一意、UPDATE拒否。
- Concern: Candidate / Participant / Criterionの同一Event、Candidate×Participant×Criterion一意、UPDATE拒否。
- Comment: Candidate / Participantの同一Event、一意、textだけ更新可能。
- Event: INSERT後のtitle更新を拒否し、share tokenによるmemo更新だけを許可する。
- exposed tableはRLS有効。anon roleへ必要な列だけGRANTする。
- security definer関数は固定`search_path`、PUBLICからEXECUTE剥奪、必要roleへ明示GRANTする。
- Event作成用trigger functionはprivate schemaの限定的`SECURITY DEFINER`とし、固定`search_path`、静的SQL、Event INSERTに連動するdefault Criterion 1件だけを許可する。dynamic SQL、任意table操作、任意label入力を持たず、PUBLIC／anonへ直接EXECUTEを付与しない。ADR-0009移行後はshare token生成とEvent INSERTを維持し、owner token、owner URL／Cookie／owner-sessionを生成しない。
- ADR-0009移行ではanonymous clientからのdirect Event INSERTを禁止し、Vercel経由の専用server routeからN4で採用したdedicated least-privilege Postgres role方式だけを使用する。candidate role名は`kimenosuke_event_creator`とし、actual role／function／GRANT／connection／driverはN5 entry decisionで確定する。broadな`service_role`を既定にしない。

---

## 6. 完全読取モデル

raw rowを各componentで解釈せず、Event全体の読取境界で正規化する。

```ts
type EvaluationState = "unrated" | "positive" | "neutral" | "veto";

type RespondentCandidateView = {
  participantId: string;
  displayName: string;
  evaluation: { state: EvaluationState };
  reactionCriterionIds: string[];
  concernCriterionIds: string[];
  comment: { id: string; text: string } | null;
};

type CandidateSummary = {
  createdAt: string;
  addedAtLabel: string;
  positiveCount: number;
  neutralCount: number;
  vetoCount: number;
  heartCount: number;
  concernCount: number;
  highlight: "clear" | "discussion" | "fallback" | "none";
};
```

生成手順:

1. Eventの全Participantsを`created_at ASC, id ASC`で並べる。
2. Eventの全Candidatesを作成順で並べる。
3. Candidate×Participantの直積を作る。
4. Voteがあればvalue、なければ`unrated`を設定する。
5. Reaction / Concern / Commentを同じセルへ結合する。
6. Candidateごとの集約と`highlight`を導出する。

```text
positiveCount = positiveセル数
neutralCount  = neutralセル数
vetoCount     = vetoセル数
heartCount    = Candidate配下Reaction行数
concernCount  = Candidate配下のCriterion別Concern行数
```

`neutralCount`は能動−のVote行だけを数え、`unrated`を含めない。`neutral`と`unrated`はpositive / veto集計へ加算しない。❤️、🌀、コメントはhighlight判定へ渡さない。

---

## 7. Migration原則

- 既存適用済みmigrationを編集しない。
- cleanup SQLと新規migrationを分離し、データ削除をmigrationへ埋め込まない。
- ADR-0009の既存Event全削除は別Human gateとし、ownerless schema migrationの承認から推定して実行しない。
- ADR-0006移行は通常Eventを削除せず、保持対象IDとデータを維持する。`concerns.criterion_id`はEvent内Criterionが一意に決まる場合だけ決定的にbackfillし、0件または複数候補ならDDL前guardで停止する。
- 新規migrationは固定版CLIの`npx supabase migration new <descriptive_name>`で生成し、すべてのlocal DB操作へ`--local`を明示する。
- 実装着手前にCLI 2.109.1の`--help`で、使用するsubcommandとflagの実在を確認する。

### 7.1 Local検証

1. repo、branch、HEAD、upstream、working tree、既存migration一覧とSHA-256を記録する。
2. localhost限定stackとlocal profileを検証する。
3. `npm run supabase:migration:list`、`npm run supabase:migration:up`で増分適用する。
4. table / column / type / constraint / index / RLS / policy / GRANT / function / trigger / FKと負系・不変条件をpostflightする。
5. advisorと必要なDB testを実行する。
6. localデータ破棄を確認後、`npm run supabase:db:reset`で空DBから全migrationを再現し、同じpostflightを繰り返す。生のCLI resetは使用しない。
7. `npm run test:e2e:local`、`npm run check`、`npm run build`、`git diff --check`を通す。

### 7.2 Remote適用

- local clean-chain replayとlocal E2E完了前にremoteへ進まない。
- remote cleanup、advisor訂正migration、本筋migration、remote E2Eを別々の承認ゲートにする。
- migrationは人間が確認済みproject / database / roleの新規SQL Editor queryで全文を一度だけ実行し、各適用後にpostflightする。
- SQL Editor適用はCLI migration historyを自動更新しない。`supabase login / link / db pull / db push`、`--linked`、remote `--db-url`、migration history repairを現在の運用へ混在させない。

### 7.3 Advisor訂正

- `public.request_header`のmutable search pathは独立した先行migrationで訂正する。
- 現行Participant policyの重複permissive警告だけを直す一時migrationは作らず、ADR-0006本筋migrationのpolicy置換で解消する。
- 本筋migration後にadvisorを再実行し、既知警告と新規警告を確認する。

失敗時にremoteへ進まず、既存migration編集、即席の逆SQL、再実行、force pushを行わない。完全適用後の補正はlocal検証済みの後続migrationとして別承認を得る。
