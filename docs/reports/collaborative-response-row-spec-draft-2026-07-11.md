# 共同編集型・回答者行モデル 実装仕様書

- 作成日: 2026-07-11
- 最終改訂: 2026-07-12（ADR-0007）
- ステータス: **承認済み・正本反映済み（実装仕様）**
- 対象: 基盤再編＋Slice 3総合評価＋Slice 4候補可視化
- 要件: [要件定義書](collaborative-response-row-requirements-2026-07-11.md)
- 完了条件: [DoD](collaborative-response-row-dod-2026-07-11.md)
- 検証: [QAドキュメント](collaborative-response-row-qa-2026-07-11.md)

> 本書は、データモデル、RLS、画面構造、状態遷移、migration境界を実装可能な粒度で定義する承認済み実装仕様である。U-1〜U-8は解消済み。2026-07-12の[ADR-0007](../adr/0007-event-views-and-criterion-feedback.md)による画面分離と判断基準別🌀を反映する。コード・migrationは、別途明示された実装タスクまで変更しない。

---

## 1. 設計の要約

### 1.1 Before

- ブラウザごとのguest tokenをParticipantと結び付ける。
- Event作成時にowner Participantを必ず作る。
- Candidate追加、❤️、🌀、Comment等がブラウザの現在Participantを暗黙生成する。
- Participantは「ブラウザ上の自分」に近い。
- Commentは複数件作成できる。
- Voteは未実装だが、旧正本はVote行なし＝−を前提とする。

### 1.2 After

- Participantはイベント内の名前付き回答行であり、共有URL保持者が共同編集する。
- owner capabilityとParticipantを完全分離する。
- Event作成時、Candidate追加時、Criterion追加時にはParticipantを自動生成しない。
- 選択中回答者はUI状態であり、localStorageは再選択の便宜だけに使う。
- Candidateカード内へ全回答者行を表示する。
- Vote行なし＝未評価、Vote行ありの`neutral`＝能動−とする。
- ユーザーへ表示する時刻は既存の`Candidate.created_at`だけとし、候補が後から追加されたことを判断材料にする。
- CommentはCandidate×Participantで現在値1件にする。
- ○数と×有無から3種類の候補状態を導出する。
- Event画面をオーナー初期セットアップ、ゲスト名前選択、候補一覧ダッシュボード、候補編集へ分ける。
- 🌀をCandidate単位からCandidate×Participant×Criterion単位へ変更し、同じ基準の❤️と独立して保持する。

---

## 2. アーキテクチャ境界

```text
Browser
  ├─ share URL / owner URL
  ├─ event別 selectedParticipantId (localStorage, 権限ではない)
  └─ event path別 owner token Cookie (HttpOnly, オーナー権限)

Next.js App Router
  ├─ Server page: 初期EventState取得
  ├─ Client UI: 回答者選択、候補カード、ダイアログ、draft
  └─ Server actions: token検証付きmutation + 完全EventState再取得

Supabase Data API (anon key)
  ├─ x-share-token / x-owner-token request header
  ├─ RLS + column grants
  ├─ same-event DB guards
  └─ Postgres constraints / triggers / indexes
```

- Supabase Authは使わない。
- service role keyを使わない。
- local JSON fallbackを追加しない。
- Realtime購読、定期polling、focus復帰fetchを追加しない。
- server action成功後に同じ画面の完全状態を置換する。

---

## 3. TokenとCookie

### 3.1 share token

- 共有URL `/e/<share_token>` に含める推測困難なtoken。
- イベント閲覧と共同編集のアクセス境界。
- 共同編集mutationはshare tokenを必須とする。

### 3.2 owner token

- owner URL `/o/<owner_token>` に含める推測困難なtoken。
- Event title / memoの編集権限だけを表す。
- Participantや回答内容の所有権を表さない。
- owner URLを共有した場合はowner capabilityも共有される。排他的移譲やrotationはMVP外。

### 3.3 owner Cookie

| 項目 | 仕様 |
|---|---|
| name | `kimenosuke_owner_token` |
| value | `owner_token` |
| path | `/e/<share_token>` |
| HttpOnly | true |
| SameSite | Lax |
| Secure | productionでtrue |
| Max-Age | 既存方針と同じ5年 |

- Event作成後またはowner URL検証成功後に設定する。
- 同じcookie名でもpathが異なるため複数Eventの権限を保持できる。
- share pageではpathに一致するowner Cookieを読み、Event title / memo編集可否を判定する。
- owner pageではURL tokenを直接検証し、対応するshare pathへCookieを設定する。
- 現行のglobal guest token Cookieと自動生成proxyは撤去対象とする。

### 3.4 selected participant

- localStorage keyは`kimenosuke:selected-participant:<event_id>`に固定する。
- valueはParticipant IDだけを保持する。
- share URLとowner URLのどちらから開いても、Event取得後に同じevent ID基準のキーを使う。
- サーバー権限・RLS判断には使わない。
- 初期状態取得後、同一eventにIDが存在する場合だけ採用する。
- 削除・不在時はlocalStorageを削除する。
- 共有URLの初期表示で有効なIDを採用できた場合は候補一覧ダッシュボード、採用できない場合はゲスト名前選択を表示する。
- Event作成直後のオーナーはselected participantの有無にかかわらず初期セットアップを表示し、名前確定後も同じ画面に残る。
- 初期セットアップmodeはEvent作成成功からの遷移状態として扱い、DBへ`setup_completed`等の列を追加しない。reload・再訪・owner URL回復では初期セットアップmodeを復元しない。
- owner URL検証成功またはowner Cookieによる後日の再訪は、selected participantがなくても候補一覧ダッシュボードを表示する。3ステップは再表示しない。
- 未選択の再訪オーナーはEvent title / memoを編集できる。個人名義操作だけをpendingにしてゲストと同じ名前選択へ進み、Participant解決後に一度だけ再開する。

---

## 4. データモデル

物理テーブル名は小文字複数形を維持する。既存適用済みmigrationは編集せず、破壊的切替は新規migrationで行う。

機能として時刻を管理・表示する対象は`Candidate.created_at`だけとする。既存各テーブルの`created_at`は、既存schema互換や作成順のための技術メタデータとして必要なものだけ維持するが、ユーザー表示、集約、判定、履歴機能には使わない。新設Voteにはtimestamp列を設けない。

### 4.1 `events`

| 列 | 型・制約 | 更新 | 備考 |
|---|---|---|---|
| id | uuid PK | 不可 | |
| title | text NOT NULL、trim後1〜80 | ownerのみ | お題 |
| memo | text NULL | ownerのみ | |
| share_token | text NOT NULL UNIQUE | 不可 | 共有URL |
| owner_token | text NOT NULL UNIQUE | 不可 | owner URL / Cookie |
| created_at | timestamptz NOT NULL default now() | 不可 | |

撤去:

- `owner_participant_id`
- owner Participantとの循環FK
- guest tokenによるowner判定関数・policy

Event削除機能はMVP UIに追加しない。

### 4.2 `participants`

| 列 | 型・制約 | 更新 | 備考 |
|---|---|---|---|
| id | uuid PK default gen_random_uuid() | 不可 | 回答者行ID |
| event_id | uuid NOT NULL FK events ON DELETE CASCADE | 不可 | |
| display_name | text NOT NULL、trim後1〜60 | 可 | event内表示名 |
| created_at | timestamptz NOT NULL default now() | 不可 | 並び順 |

制約:

- `UNIQUE(event_id, display_name)`。保存前にDB triggerで`btrim`し、trim後完全一致を拒否する。
- 一致は保存文字列の完全一致とする。大文字小文字、全角半角、Unicode正規化を自動変換しない。
- 並び順は`created_at ASC, id ASC`。

撤去:

- `guest_token`
- `UNIQUE(event_id, guest_token)`
- request guest participantを取得・照合する関数

削除影響:

- votes / reactions / concerns / comments: `ON DELETE CASCADE`
- candidates.created_by / criteria.created_by: `ON DELETE SET NULL`

### 4.3 `candidates`

| 列 | 型・制約 | 備考 |
|---|---|---|
| id | uuid PK | |
| event_id | uuid NOT NULL FK events ON DELETE CASCADE | |
| title | text NULL | titleまたはurl必須 |
| url | text NULL | titleまたはurl必須 |
| created_by | uuid NULL FK participants ON DELETE SET NULL | 提案者 |
| created_at | timestamptz NOT NULL | 作成順 |

- `created_by`はNULLまたはCandidateと同一eventのParticipantだけを許可する。
- 名前draftがなければ、作成時はselected participantがあればそのID、未選択ならNULL。
- trim後非空の名前draftがあれば、単一の名前確定処理後に解決したParticipant IDを設定する。
- Candidate追加自体を理由にParticipantを生成しない。
- title / urlは前後空白を除去し、空文字をNULLへ正規化する。
- `created_at`は候補が最初に追加された時刻であり、タイトル・URL・提案者・回答の編集では変更しない。
- 候補カードヘッダに`created_at`由来の「1時間以内に追加 / N時間前に追加 / N日前に追加」を表示する。
- ユーザーへ表示する時刻はこの列だけとし、Vote / Reaction / Concern / Commentの時刻を追加表示しない。

### 4.4 `criteria`

| 列 | 型・制約 | 備考 |
|---|---|---|
| id | uuid PK | |
| event_id | uuid NOT NULL FK events ON DELETE CASCADE | |
| label | text NOT NULL、trim後1〜60 | 唯一の更新可能な業務列 |
| source | text CHECK default / preset / custom | 作成後不変 |
| created_by | uuid NULL FK participants ON DELETE SET NULL | 作成者 |
| created_at | timestamptz NOT NULL | 作成順 |

- `created_by`はNULLまたはCriterionと同一eventのParticipantだけを許可する。
- 名前draftがなければ、作成時はselected participantがあればそのID、未選択ならNULL。
- trim後非空の名前draftがあれば、単一の名前確定処理後に解決したParticipant IDを設定する。
- Criterion追加自体を理由にParticipantを生成しない。
- デフォルト「興味ある？」、preset、重複、作成順、2段階削除の既存仕様は維持する。

### 4.5 `votes`（新設）

| 列 | 型・制約 | 備考 |
|---|---|---|
| id | uuid PK default gen_random_uuid() | |
| candidate_id | uuid NOT NULL FK candidates ON DELETE CASCADE | |
| participant_id | uuid NOT NULL FK participants ON DELETE CASCADE | |
| value | text NOT NULL CHECK (`positive / neutral / veto`) | Vote専用enumは作らない |

制約・挙動:

- `UNIQUE(candidate_id, participant_id)`。
- CandidateとParticipantが同一eventに属することをDB triggerまたは専用関数で保証する。
- id / candidate_id / participant_idのクライアント更新を拒否し、valueだけを更新可能にする。
- Vote行なしを`unrated`として読み、`neutral`行と区別する。
- 評価時刻の保存・表示を目的とする`created_at` / `updated_at`は追加しない。
- UIで選択済みの同じvalueを再度押した場合はno-opとし、server actionやDB mutationを実行しない。

`value`の物理表現は`text + CHECK`で確定する。既存schemaの`criteria.source`と同じ方式を用い、Vote専用Postgres enumは作らない。DBのCHECK制約とTypeScriptのunion型の双方を`positive / neutral / veto`へ揃える。

### 4.6 `reactions`

既存列と一意制約を維持する。

```text
UNIQUE(candidate_id, participant_id, criterion_id)
```

変更点:

- INSERTはブラウザguest tokenの「自分」に限定しない。
- share token保持者がselected participant名義でINSERT / DELETEできる。
- Candidate / Participant / Criterionの同一event整合性をDBで保証する。
- UPDATEなし、履歴なし。

候補全体の❤️数は、そのCandidateに属するReaction行の`count(*)`とする。同一Participantが複数Criterionへ付けた分も別々に数える。

### 4.7 `concerns`

| 列 | 型・制約 | 備考 |
|---|---|---|
| id | uuid PK | |
| candidate_id | uuid NOT NULL FK candidates ON DELETE CASCADE | |
| participant_id | uuid NOT NULL FK participants ON DELETE CASCADE | |
| criterion_id | uuid NOT NULL FK criteria ON DELETE CASCADE | 判断基準別🌀 |
| created_at | timestamptz NOT NULL | 技術メタデータ。表示しない |

変更点:

- `UNIQUE(candidate_id, participant_id, criterion_id)`を設定する。
- share token保持者がselected participant名義でINSERT / DELETEできる。
- Candidate / Participant / Criterionの同一event整合性をDBで保証する。
- UPDATEなし、履歴なし。
- 同じCandidate×Participant×CriterionにReactionとConcernの両方を保持できる。
- Candidate単位の常設単一Concernは廃止する。

候補全体の🌀数は、そのCandidateに属するCriterion別Concern行の`count(*)`とする。

### 4.8 `comments`

| 列 | 型・制約 | 備考 |
|---|---|---|
| id | uuid PK | |
| candidate_id | uuid NOT NULL FK candidates ON DELETE CASCADE | 不変 |
| participant_id | uuid NOT NULL FK participants ON DELETE CASCADE | 不変 |
| text | text NOT NULL、trim後1〜500コードポイント | 唯一の更新可能な業務列 |
| created_at | timestamptz NOT NULL | 不変 |

変更点:

- `participant_id`をNULL不可にする。
- Participant FKを`ON DELETE SET NULL`から`ON DELETE CASCADE`へ変更する。
- `UNIQUE(candidate_id, participant_id)`を追加する。
- 同一回答者が再保存した場合は既存行のtextを更新する。
- 空または空白だけを保存した場合、アプリはDELETEを実行する。
- コメント履歴、複数件、返信、updated_at表示は追加しない。

### 4.9 関係図

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

### 4.10 Index

最低限、次を設ける。

- `participants(event_id, created_at, id)`または同等の並び順取得index
- `UNIQUE participants(event_id, display_name)`
- `candidates(event_id, created_at, id)`
- `criteria(event_id, created_at, id)`
- `UNIQUE votes(candidate_id, participant_id)`
- `votes(participant_id)`
- 既存Reaction / Concern / Commentのcandidate / participant / criterion FK index
- `UNIQUE concerns(candidate_id, participant_id, criterion_id)`
- `UNIQUE comments(candidate_id, participant_id)`

PostgresはFK列を自動index化しないため、cascadeとevent状態取得に使うFKを明示的にindex化する。

---

## 5. RLS・DBガード

### 5.1 アクセス定義

- `event accessible`: Eventに対応する有効なshare tokenまたはowner tokenをrequest headerに持つ。
- `event share editable`: Eventに対応する有効なshare tokenをrequest headerに持つ。
- `event owner editable`: Eventに対応する有効なowner tokenをrequest headerまたはevent path Cookieからサーバーが渡す。

### 5.2 CRUD matrix

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| events | event accessible | token生成条件付き | owner tokenでtitle/memo | UIなし |
| participants | event accessible | share token | share tokenでdisplay_name | share token |
| candidates | event accessible | share token | share token | share token |
| criteria | event accessible | share token | share tokenでlabel | share token |
| votes | event accessible | share token | share tokenでvalue | share token |
| reactions | event accessible | share token | なし | share token |
| concerns | event accessible | share token | なし | share token |
| comments | event accessible | share token | share tokenでtext | share token |

owner token単独では、Event title / memo以外の共同編集mutationを許可しない。owner画面が取得したshare tokenを共同編集操作に用いる。

### 5.3 DB強制事項

- Participant: trim、長さ、event内同名禁止。
- Candidate / Criterion created_by: NULLまたは同一event Participant。
- Vote: Candidate / Participantが同一event、一意、value制約、不変列保護。
- Reaction: Candidate / Participant / Criterionが同一event、一意、UPDATE拒否。
- Concern: Candidate / Participant / Criterionが同一event、3列一意、UPDATE拒否。
- Comment: Candidate / Participantが同一event、一意、textだけ更新可。
- exposed tableはRLS有効。anonへ列単位GRANT。
- security definer関数は固定search_path、PUBLIC execute revoke、必要roleだけgrant。

---

## 6. アプリケーション読取モデル

raw table行をそのままUIへ渡さず、event全体の一つの読取モデルへ正規化する。

```ts
type EvaluationState = "unrated" | "positive" | "neutral" | "veto";

type EvaluationView = {
  state: EvaluationState;
};

type RespondentCandidateView = {
  participantId: string;
  displayName: string;
  evaluation: EvaluationView;
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

### 6.1 完全セル生成

1. Eventの全Participantsを`created_at ASC, id ASC`で並べる。
2. Eventの全Candidatesを作成順で並べる。
3. Candidate×Participantの直積を作る。
4. Voteがあればvalueを設定する。
5. Voteがなければ`unrated`を設定する。
6. Reaction / Concern / Commentを同じセルへ結合する。

Candidateごとに既存の`created_at`を保持し、初期取得時またはローカルmutation成功後の完全状態取得時に`addedAtLabel`を算出する。経過ミリ秒は`max(0, now - created_at)`とし、クライアント時計より`created_at`が未来でも負値を表示せず「1時間以内に追加」へclampする。timerやDB pollingでは更新しない。

UI、○数、×数、色判定はこの読取モデルだけを利用する。raw row absence、`null`、`undefined`を各componentが独自解釈しない。

### 6.2 集約

```text
positiveCount = evaluation.state == positive のセル数
neutralCount  = evaluation.state == neutral のセル数
vetoCount     = evaluation.state == veto のセル数
heartCount    = Candidateに属するReaction行の総数
concernCount  = Candidateに属するCriterion別Concern行の総数
```

neutralCountは能動−だけを数え、unratedを含めない。neutralとunratedはpositiveCount / vetoCountへ加算しない。❤️、🌀、コメントは色判定へ渡さない。

### 6.3 3色判定

```text
M = 全候補のpositiveCount最大値

if M == 0:
  全候補 none
else:
  clear = positiveCount == M and vetoCount == 0
  discussion = positiveCount == M and vetoCount > 0

  if clear が1件以上:
    fallback = なし
  else:
    safePool = 0 < positiveCount < M and vetoCount == 0
    safeMax = safePool内のpositiveCount最大値
    fallback = safePool内でpositiveCount == safeMax
```

- clear / discussion / fallbackは同率全件へ付ける。
- ○最多同率で×有無が異なる場合、clearとdiscussionへ分ける。
- none候補も通常の明るさで表示する。
- `highlight`は保存せず、読取時に毎回導出する。

---

## 7. Mutation仕様

全mutationは次の共通結果を返す。

```ts
type MutationResult =
  | { data: EventState; error: null }
  | { data: null; error: string };
```

- 成功時: mutation後にDBから完全EventStateを再取得して返す。
- 失敗時: 最新状態に見せかけず、dataはnull、ユーザー向けerrorを返す。
- redirect、router.refresh、Realtimeは使わない。
- UIはmutation中の二重送信を防ぐ。

### 7.1 Participant actions

- `createParticipant(eventId, shareToken, displayName)`
- `renameParticipant(eventId, shareToken, participantId, displayName)`
- `deleteParticipant(eventId, shareToken, participantId)`

作成時のunique violationは、同名既存行を取得して「同じ人か」確認へ返す識別可能なエラーとする。

### 7.2 Vote actions

- `setVote(eventId, shareToken, candidateId, participantId, value)`

アプリ経由ではINSERTまたはUPDATEのupsertで現在値を保存し、同一Candidate×ParticipantのVoteを常に1行へ保つ。現在値と同じvalueが選ばれた場合はclient側でno-opとし、`setVote`を呼ばない。未評価へ戻す操作は要件にないため、UIは○ / − / ×の3値から選択する。Vote行の物理削除はParticipant / Candidate削除cascadeまたは管理上の修復に限定する。

DBへanon clientから同一Candidate×ParticipantをINSERTのみで2回送った場合、2回目は`UNIQUE(candidate_id, participant_id)`で拒否する。アプリupsertの成功とraw duplicate INSERTの拒否は別テストで検証する。

### 7.3 Feedback actions

- `setReaction(... participantId, criterionId, enabled)`
- `setConcern(... participantId, criterionId, enabled)`
- `saveComment(... participantId, text)`

コメントはtrim後空ならDELETE、非空ならcandidate×participantでupsertする。

### 7.4 Candidate / Criterion actions

- 名前draftがない作成時の`created_by`はselected participant IDまたはNULL。
- 名前draftがある作成時は単一の名前確定処理を完了してから作成し、解決したParticipant IDを`created_by`へ設定する。
- 名前draftもselected participantもない作成を理由にParticipantを暗黙生成しない。
- 名前draftがある状態の編集・削除等のDB mutationは、Participant解決完了後に一度だけ実行する。
- 同一eventガードをアプリとDBの双方で確認する。

---

## 8. 回答者セレクター状態機械

```text
unselected
  ├─ existing選択 ─────────────> selected(existing)
  ├─ name確定 ─ unique success -> selected(new)
  └─ personal action ──────────> pending-action + selector open

drafting
  ├─ existing明示選択 ─────────> draft破棄 -> selected(existing) -> pending再開
  ├─ explicit DB operation ────> resolving(operation)
  ├─ non-IME Enter / done ─────> resolving(no operation)
  ├─ normal blur ──────────────> resolving(no operation)
  └─ non-DB operation ─────────> operation実行 + normal blurを独立処理

resolving
  ├─ no match ─────────────────> create -> selected
  ├─ exact match ──────────────> duplicate-confirm
  │    ├─ same person ─────────> selected(existing) -> pending再開
  │    └─ different person ────> rename-required
  ├─ unique race ──────────────> duplicate-confirm（pending維持）
  └─ failure ──────────────────> input preserved + pending破棄 + no action

selected
  ├─ another row click ────────> selected(other)
  ├─ new name draft + operation > resolving(draftを優先)
  ├─ rename success ───────────> selected(same id)
  └─ delete success ───────────> unselected + localStorage clear
```

### 8.1 名前確定トリガー

- 非IME Enter
- モバイルキーボードの完了
- セレクターcomponent全体からfocusが外れたとき

セレクター内の入力から既存候補一覧へfocusが移っただけではblur確定しない。IME composition中Enter、1文字ごとの入力、debounce、beforeunloadでは作成しない。

### 8.2 単一の名前確定処理と優先順位

Enter用、blur用、明示操作用にParticipant作成処理を分けない。`resolveParticipantDraft`相当の単一coordinatorが、名前検証、同名確認、Participant作成・選択、selected state更新、継続操作を直列管理する。

同一ユーザー操作から複数eventが発生した場合は、次の優先順位を用いる。

1. 既存回答者の明示選択
2. ○ / − / ×、判断基準別❤️ / 🌀、コメント保存、Event / Candidate / Criterion追加・編集・削除等の明示的DB操作
3. 非IME Enter / モバイル完了
4. 通常blur

- 明示操作のintentはfocus移動より先に記録する。その操作起因のblurでは通常blur保存を抑止し、明示操作側がParticipant解決と継続操作を所有する。
- 既存回答者を選択中でもtrim後非空の新しい名前draftがあれば、明示操作は旧選択行で実行せず、draftを解決してから新しい選択行で実行する。
- 空またはtrim後空白だけのdraftはdraftなしとして扱い、selected participantがあればその行を維持する。
- 既存回答者を明示選択した場合はdraftを新規作成せず破棄し、その行へ切り替えて保留操作を一度だけ実行する。
- Participant解決中は対象controlを無効化し、単一のin-flight promise / refで最初のintentだけを受け付ける。
- 検証・DB失敗時は名前draftとエラーを残すがpendingは破棄する。後のblurやEnterで過去の操作を突然実行しない。
- unique競合で同名既存行が見つかった場合だけはduplicate-confirmへ遷移し、本人・別人の選択が終わるまでpendingを維持する。
- 同名確認で別人を選んだ場合は異なる名前の再入力中もpendingを維持し、新しい名前の確定後に一度だけ実行する。再入力をキャンセルした場合はpendingを破棄する。
- reload、tab close、外部遷移ではbeforeunload保存を行わず、未確定draftの保存を保証しない。
- URLコピー等の非DB操作はpendingへ入れず、その場で実行する。focusがセレクター外へ移った場合の名前確定は、コピー完了を待たせず単一coordinatorへ通常blurとして一度だけ渡す。

### 8.3 pending operation

保持するのは、一度だけ再実行可能な操作記述である。

```ts
type PendingOperation =
  | { kind: "vote"; candidateId: string; value: VoteValue }
  | { kind: "reaction"; candidateId: string; criterionId: string; enabled: boolean }
  | { kind: "concern"; candidateId: string; criterionId: string; enabled: boolean }
  | { kind: "comment"; candidateId: string; draft: string }
  | { kind: "candidate-create"; draft: CandidateDraft }
  | { kind: "criterion-create"; draft: CriterionDraft }
  | { kind: "event-mutation"; command: EventMutationCommand }
  | { kind: "candidate-mutation"; command: CandidateMutationCommand }
  | { kind: "criterion-mutation"; command: CriterionMutationCommand };
```

- `*Draft`と`*MutationCommand`は、明示操作を始めた時点のaction inputを不変snapshotとして保持する型である。継続時にDOMや変更後のフォーム値を読み直さず、server側では通常どおり再検証する。
- Participant選択・作成成功後に一度だけ消費する。
- 同名確認で本人を選んだ場合も消費する。
- Event / Candidate / Criterion追加、編集、削除等も、名前draftがある場合は同じ一度だけのcontinuationとして保持する。
- Candidate / Criterion追加では、解決したParticipantを`created_by`へ設定する。
- キャンセル・検証失敗・DB失敗時は破棄し、DB操作しない。
- 二重clickや再renderで二度実行されないようin-flight guardを持つ。

---

## 9. ワイヤーフレーム設計

この節は2026-07-12の画面レビューで承認された構造仕様である。情報階層、画面分離、表示文言、操作モデルは固定し、exact color、余白、文字サイズだけを実画面で調整する。repo外のコードベースワイヤーフレームを375×812と1366×768で確認済みであり、アプリ実装後も同じ2幅で再確認する。

### 9.1 トップ・お題作成

Event作成フォームはお題→メモ→作成だけとし、お名前を置かない。ヘッダはブランドロゴだけを操作対象とし、Event文脈のないトップへ「候補一覧」を置かない。トップ下部の「イベント一覧」は将来の別スライスであり、今回は表示・保存・導線を実装しない。

```text
┌──────────────────────────────────────────────┐
│ きめのすけ                                   │
│                                              │
│ どうしようか...                              │
│ みんなに聞いてみよう！                       │
│                                              │
│ お題                                         │
│ [ 例）週末どこ行く？ など                  ] │
│                                              │
│ メモ                                         │
│ [ きめたいこと、条件など                   ] │
│                                              │
│                         [ きめよう！ ]       │
└──────────────────────────────────────────────┘
```

### 9.2 オーナー初期セットアップ

デスクトップ・モバイルとも、お題・メモの直後に3ステップのタイトルと説明文を置き、その下の実操作も同じ順序にする。

```text
きめのすけ

週末、どこへ行く？                         [直す]
みんなでゆっくり話せるところがいいな

1  お名前を入れる
   まず、あなたのお名前を入力します。ここで選んだ名前が、
   候補や回答の名義になります。

2  候補を挙げる
   次に、みんなで比べたい候補を挙げます。候補名だけでも、
   リンクだけでも追加できます。

3  URLを送る
   候補がそろったら、みんなにリンクを送って、決めていきましょう。
   メールやLINEなど、なんでもいいよ。あなた専用リンクは保存して
   おいてくださいね。

1. お名前を入れる
[田中] [鈴木] [佐藤]
直接入力 [________________]

2. 候補を挙げる
候補 [________________]  リンク [________________] [追加]

3. URLを送る
[みんなに送るリンク  コピー]  [あなた専用リンク  保存]
```

- 名前確定後も同じ画面に残り、ステップ2・3へ続く。
- 「直す」はお題・メモとの結び付きを示しつつ小さくする。
- 2種類のURL操作は角丸とし、色を分けて目立たせる。
- モバイルでは3ステップと実操作を1列に積み、説明文を省略しない。

### 9.3 ゲスト名前選択

```text
きめのすけ

週末、どこへ行く？
みんなでゆっくり話せるところがいいな

あなたのお名前
[田中] [鈴木] [佐藤]
直接入力 [________________]
```

- 「まだ選んでいません」「回答者」「回答する人」「または新しいお名前」は表示しない。
- 既存名の選択肢と直接入力を離さない。既存名を押すと入力欄へ同じ名前を反映し、そのParticipantを選択する。
- ゲストは既存名の選択または新名確定後に候補一覧ダッシュボードへ進む。
- localStorageに現存Participant IDがあれば名前選択を省略する。削除済みなら解除してこの画面へ戻す。

### 9.4 候補一覧ダッシュボード

デスクトップではEventのお題・メモと複数Candidateを十分な幅で表示する。モバイルも同じ情報順序を1列で維持する。

```text
きめのすけ                                      候補一覧

週末、どこへ行く？
みんなでゆっくり話せるところがいいな

候補
┌──────────────────────────────────────────────────────┐
│ 川沿いのカフェ       [⭕️ 5] [➖ 1] [❌ 0]            │
│ https://example.com/cafe                             │
│ 3時間前に追加 ・ 提案者 田中                         │
│ ❤️ 8   🌀 2                                          │
└──────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────┐
│ 公園でピクニック     [⭕️ 3] [➖ 2] [❌ 1]            │
│ URLなし                                               │
│ 1日前に追加 ・ 提案者 ー                              │
│ ❤️ 4   🌀 3                                          │
└──────────────────────────────────────────────────────┘
```

- Candidate名を候補編集への導線とする。
- `⭕️ / ➖ / ❌`は別々のchipとし、`➖`が背景へ埋もれないcontrastを確認する。数値を式のように連結しない。`➖`はneutralだけを数え、unratedを含めない。
- ○ / − / ×を主要情報、❤️ / 🌀を小さな補助情報として視覚階層を分ける。
- Eventのお題とメモはスクロールで消えてよい。
- `clear / discussion / fallback / none`の可視説明ラベルは置かない。カードの控えめなsemantic colorと支援技術向け状態名を使う。
- 判断基準編集、回答者別control、コメント入力を候補一覧へ展開しない。

### 9.5 候補編集

```text
きめのすけ                                      候補一覧

川沿いのカフェ          [⭕️ 5] [➖ 1] [❌ 0]
https://example.com/cafe
3時間前に追加 ・ 提案者 田中
❤️ 8   🌀 2

判断基準                                  [＋ 判断基準]
興味ある？   [❤️ 5] [🌀 1]  田中、鈴木...             […]
価格どう？   [❤️ 2] [🌀 3]  佐藤...                   […]

田中として判断中

お名前  総合評価   判断基準への反応              コメント
田中    [○][−][×]  興味[❤️][🌀] 価格[❤️][🌀]      [________][保存]
鈴木    ○           興味❤️                          よさそう
佐藤    ×           価格🌀                          場所が気になる

[候補情報を編集] [候補を削除]
```

- Candidate情報は候補一覧と同じ順序・階層を保つ。
- 判断基準はこの画面に置き、「＋ 判断基準」でプリセットと自由入力を開く。各基準の「…」からlabel変更または2段階削除を行う。
- ❤️ / 🌀は判断基準ごとに独立して付けられ、同じ回答者が同じ基準へ両方付けられる。Candidate単位の常設🌀は置かない。
- 非選択行はread-only。行を選ぶ最初の操作では値を変更せず、selected participantだけを切り替える。
- 選択行だけに○ / − / ×、判断基準別❤️ / 🌀、コメントtextareaを表示する。
- モバイルでは回答者行を縦に積み、非選択行の評価とコメントを簡潔にして多くの回答状況を見せる。長いコメントは初期案3行clampとする。
- 長いCriterion labelと名前が折り返してもcontrolを押し出さない。

### 9.6 同名確認

```text
┌────────────────────────────────────┐
│ 「田中」はすでにあります          │
│ 同じ人ですか？                    │
│                                    │
│ [同じ人です]  [別の人です]        │
└────────────────────────────────────┘
```

- 「同じ人です」: 既存田中を選択し、pending actionを再開。
- 「別の人です」: ダイアログを閉じ、異なる名前の再入力を求める。
- 完全一致した既存行へ無言で切り替えない。

### 9.7 名前変更

```text
┌────────────────────────────────────┐
│ 名前を変更しますか？              │
│ 田中 → 田中2                      │
│                                    │
│ [変更]  [キャンセル]              │
└────────────────────────────────────┘
```

- 1段階確認。
- ID、回答、順番は維持する。
- 空・同名では確認完了前にエラー表示する。

### 9.8 回答者削除

```text
1段階目
┌────────────────────────────────────┐
│ 田中の回答を削除しますか？        │
│ [次へ] [キャンセル]               │
└────────────────────────────────────┘

2段階目（強い警告表現）
┌────────────────────────────────────┐
│ 本当に削除しますか？              │
│ ○/−/×、❤️、🌀、コメントも消えます │
│ [削除] [キャンセル]               │
└────────────────────────────────────┘
```

- Candidate / Criterionは削除しない。
- proposer / criterion creatorは「ー」へ変わる。
- 削除成功後にselected participantを解除する。

### 9.9 3色状態

ワイヤーフレームでは次の4状態を同一画面に並べて比較する。

| semantic token | 意味 | 画面表現 |
|---|---|---|
| `decision-clear` | ○最多・×なし | 控えめな第1色＋評価実数＋支援技術向け状態名 |
| `decision-discussion` | ○最多・×あり | 控えめな第2色＋評価実数＋支援技術向け状態名 |
| `decision-fallback` | 第1色不在時の安全な代替 | 控えめな第3色＋評価実数＋支援技術向け状態名 |
| `decision-none` | 通常 | 通常表示＋評価実数 |

「○最多・×なし」等の可視説明ラベルは置かない。semantic token名と状態の意味、`⭕️ / ➖ / ❌`の各実数、支援技術向け状態名を不変仕様とする。exact color、chipの背景・境界、Candidate追加時刻の見せ方は現行デザインシステムに合わせた仮案を実装し、375×812 / 1366×768の実画面で調整してリリース前に固定する。

---

## 10. 状態同期

```text
initial page load
  -> load complete EventState
  -> hydrate client state

local mutation
  -> disable conflicting controls
  -> server action
  -> DB mutation
  -> DBからcomplete EventState再取得
  -> success: replace client state
  -> failure: keep previous state + keep draft + show error
```

- Browser Bの変更をBrowser Aへ自動pushしない。
- Browser Aが次のmutationに成功したとき、完全再取得でBの変更も取り込む。
- ページ再読み込みや再訪でも最新状態を取得する。
- Candidate作成相対時刻は初期取得とローカルmutation成功後の完全状態取得時に算出する。timerやDB pollingは追加しない。

---

## 11. Migration設計

### 11.1 前提

- 適用済みmigrationは編集しない。
- 新規migrationは`supabase migration new <name>`で作成する。
- 現在の実DBデータは全削除可能と決定済みだが、削除操作はmigrationに埋め込まない。
- cleanupは人間確認・rollback検証・commit承認を伴う別SQLとする。
- migration冒頭で`public.events`が0件であることを検査し、1件でもあれば停止する。

### 11.2 cleanup順序

現行schemaはEventとowner Participantが循環参照するため、cleanupは次の順で行う。

1. 対象Event IDと依存件数をpreflight記録。
2. 対象Eventの`owner_participant_id`をNULLへ更新。
3. 記録済みEvent IDだけをDELETE。
4. cascade後の全table件数を確認。
5. まずROLLBACKで手順を検証。
6. 再実行し、明示承認後だけCOMMIT。

### 11.3 新規migrationの変更候補

1. owner Participant FK / columnをdrop。
2. guest-token依存policy・function・grantをdrop / replace。
3. participantsからguest_tokenをdrop。
4. participants.display_nameをtrim・NOT NULL化。
5. event内display_name uniqueを追加。
6. commentsを1回答者1件・participant cascadeへ変更。
7. votesを新設。
8. Candidate / Criterion created_byの新ルールへpolicy / triggerを変更。
9. Concernへ`criterion_id NOT NULL`を追加し、旧2列uniqueを3列uniqueへ置換する。
10. Reaction / Criterion別Concern / Commentをselected participant共同編集へ変更。
11. Voteと全feedbackのsame-event guardを定義。
12. RLS、column grants、function executeを再構成。
13. FK indexと読取indexを追加・確認。

### 11.4 destructive operation

想定される破壊的操作:

- `ALTER TABLE ... DROP CONSTRAINT`
- `ALTER TABLE events DROP COLUMN owner_participant_id`
- `ALTER TABLE participants DROP COLUMN guest_token`
- 既存policy / function / triggerのDROPと置換
- comments FKのDROPと再作成
- concerns unique制約のDROPと再作成、criterion_id列・FKの追加

`DROP TABLE`、`TRUNCATE`、`DROP SCHEMA`、`CASCADE`付き型削除は想定しない。実際のmigration作成後に改めてSQL全文を監査する。

---

## 12. 実装ファイル影響（予測）

### 削除または大幅置換候補

- `src/proxy.ts` のglobal guest token生成
- `src/lib/cookies.ts` のguest token API
- `src/lib/constants.ts` のguest cookie定数
- `src/lib/events.ts` のowner Participant / guest token依存処理
- `src/components/CandidateFeedback.tsx` のcurrent browser participant前提

### 新規候補

- 回答者セレクターcomponent
- オーナー初期セットアップ / ゲスト名前選択 / 候補一覧 / 候補編集のview coordinator
- 回答者rename / delete dialog
- Candidate×Participant完全読取モデルbuilder
- Vote server actions / domain logic
- 3色判定pure function
- 相対時刻formatter
- 新規Slice 3 / 4 E2E

### 既存変更候補

- `CreateEventForm`: お名前撤去
- `EventView`: owner cookie判定、画面入口、完全EventState
- `CandidateSection`: proposer自動設定、お名前欄撤去、候補一覧 / 候補編集
- `CriteriaSection`: selected participant created_by
- `CandidateFeedback`: participant行単位の判断基準別❤️ / 🌀 / コメント
- `src/app/actions.ts`: mutation結果統一
- `/e/[shareToken]` / `/o/[ownerToken]` / owner-session route
- Slice 1 / 2 / 5 E2E回帰

依存追加・version変更は行わない。

---

## 13. 実装順序

1. ~~U-1〜U-8を解消し、4文書を横断レビューしてADR-0006と正本へ反映する。~~ **完了（2026-07-11）**
2. 正本化差分をdocs-only commitとして確定する。
3. ~~別途明示された実装タスク開始後、semantic tokenに基づくコードベースワイヤーフレームの仮案をrepo外で作成・確認する。~~ **ADR-0007の画面レビューまで完了（2026-07-12）。**
4. cleanup SQLと新規migrationを作成するが適用しない。
5. read model、owner分離、画面入口、selector、候補一覧、候補編集、Criterion別Concern、Vote、3色を実装する。
6. `check / build / diff --check`を実行して停止する。
7. 実DBcleanupをpreflight、rollback、commitゲートで実施する。
8. migrationをSQL Editorで適用しpostflight確認する。
9. 実DB E2Eと目視QAを行い、exact color・評価chip・Candidate追加時刻表示を調整・承認する。
10. commit承認後にcommitする。
11. push承認後にpushする。
12. Vercel本番確認と`[E2E]`cleanupを行う。

---

## 14. 決定記録（U-1〜U-8解消済み）

### U-1. Voteの同じ値を再度押した場合（Aで確定）

- 決定日: 2026-07-11
- 選択済みの同じvalueを再度押した場合はno-opとする。
- server actionやDB mutationを実行しない。
- Vote行を削除して未評価へ戻す操作にはしない。

### U-2. 非選択回答者のcontrolを直接押した場合（Cで確定）

- 決定日: 2026-07-11
- 非選択回答者行はread-onlyとし、現在値だけを表示する。
- 非選択行には○/−/×・❤️・🌀・コメントの編集controlを表示しない。
- 行本体を選択すると、回答値を変えずにselected participantだけを切り替える。
- 選択後、その回答者行へ編集controlを表示する。
- デスクトップとモバイルで同じ操作モデルを用いる。

### U-3. `votes.value`の物理型（Aで確定）

- 決定日: 2026-07-11
- `text + CHECK`を採用する。
- CHECK制約で`positive / neutral / veto`だけを許可する。
- Vote専用Postgres enumは作らない。
- TypeScript側も同じ3値のunion型に固定する。

### U-4. 3色の実色・状態情報（ADR-0007で追補）

- 決定日: 2026-07-11
- 判定条件は確定済み。
- 可視の説明ラベルは置かず、支援技術向け状態名と評価実数でsemantic colorを補完する。
- `decision-clear / decision-discussion / decision-fallback / decision-none`をsemantic tokenとして固定する。
- exact color、評価chip、配置、Candidate追加時刻の見せ方はCodexが現行デザインに合わせて仮案を作る。
- 仮案をコードベースワイヤーフレームとアプリへ実装し、375×812 / 1366×768の実画面で後から調整する。
- exact visualは初回実装の不変仕様にせず、リリース前の人間確認後にUI copy / design仕様へ固定する。

### U-5. モバイルの非選択行コメント表示量（初期案Bで確定）

- 決定日: 2026-07-11
- 案Bを採用し、非選択行は2〜3行で省略する。
- 初回実装値は3行clampとする。
- 専用の「見る」ボタンや展開操作は追加しない。
- 回答者行を選択すると、コメント全文と編集textareaを表示する。
- 2行／3行はコードベースワイヤーフレームと375px実画面を見て後から調整する。

### U-6. pending actionとblur確定の優先順位（推奨案で確定）

- 決定日: 2026-07-11
- Participant作成・選択は、Enter、blur、明示操作で別々に実装せず、単一の名前確定処理へ集約する。
- 明示操作のintentをblurより先に記録し、その操作起因の通常blur保存を抑止する。
- 優先順位は「既存回答者の明示選択 → 明示操作 → 非IME Enter / モバイル完了 → 通常blur」とする。
- 名前draftがある明示的DB操作は、Participant解決後に一度だけ続行する。
- 連打は最初のintentだけを受け付ける。
- 失敗時は名前draftを保持するがpendingを破棄し、後から突然実行しない。

### U-7. localStorageキー基準（推奨案で確定）

- 決定日: 2026-07-11
- キーを`kimenosuke:selected-participant:<event_id>`へ固定する。
- share URLとowner URLで同じevent ID基準のキーを使う。
- valueはParticipant IDだけとし、権限判定には使わない。
- 行が削除済み・不在ならキーと現在選択を解除する。

### U-8. 重複Voteの経路別期待値（推奨案で確定）

- 決定日: 2026-07-11
- アプリの`setVote`はupsert / updateにより同一Candidate×ParticipantのVoteを1行へ保つ。
- anon clientから同じ一意キーをINSERTのみで2回送ると、2回目をUNIQUE制約で拒否する。
- アプリ経路とraw DB負系を別テストに分ける。

---

## 15. ADR-0007 追補決定

- 決定日: 2026-07-12
- トップ下部のイベント一覧は将来スライスとし、今回実装しない。トップにEvent内の候補一覧リンクも置かない。
- オーナー初期セットアップ、ゲスト名前選択、候補一覧ダッシュボード、候補編集を論理画面として分ける。
- オーナーは名前確定後も3ステップ画面に残り、ゲストは名前確定後に候補一覧へ進む。有効なlocalStorage選択で再訪したゲストは候補一覧を直接表示する。
- owner URLでの再訪は回答者未選択でも候補一覧を表示し、個人名義操作時だけ名前選択へ進む。
- 候補一覧は閲覧中心、候補編集は判断基準と回答者行の共同編集中心とする。
- Candidate単位の常設単一Concernを廃止し、ConcernをCandidate×Participant×Criterionへ変更する。同じ基準へのReactionとConcernは両立できる。
- 可視の状態説明ラベルは表示せず、semantic color、支援技術向け状態名、`⭕️ / ➖ / ❌`の各実数で表す。
