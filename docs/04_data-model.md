# 04 データモデル（きめのすけ）

作成日: 2026-07-08 / 最終改訂: 2026-07-12 / フェーズ: Phase 1（要件定義）

関連: [03_requirements.md](03_requirements.md) / [ADR-0003](adr/0003-evaluation-and-decision-logic.md) / [ADR-0004](adr/0004-permission-model.md) / [ADR-0005](adr/0005-drop-attribute-dynamic-criteria.md) / [ADR-0006](adr/0006-collaborative-response-row-model.md) / [ADR-0007](adr/0007-event-views-and-criterion-feedback.md) / [詳細仕様](reports/collaborative-response-row-spec-draft-2026-07-11.md)

> **実装状態:** 本書はADR-0006 / ADR-0007移行後の承認済み目標schemaを示す。コード・実DBは未移行。既存適用済みmigrationは編集せず、新規migrationで切り替える。

---

## 1. 識別・権限

- **share token**: Event共有アクセスと共同編集に使う推測困難なtoken。
- **owner token**: お題・メモ編集に使う推測困難なcapability。Event作成またはowner URL検証成功時、対象Eventのshare path限定HttpOnly Cookieへ保存する。
- **Participant**: Event内の共同編集可能な名前付き回答行。ブラウザや人物の恒久IDではない。
- **selected participant**: `kimenosuke:selected-participant:<event_id>`へParticipant IDだけを保持するローカルUI状態。RLS・権限判定には使わない。
- **撤去対象**: `events.owner_participant_id`、`participants.guest_token`、guest tokenによるowner / current participant判定。
- Supabase Auth、User、service role、端末横断本人認証はMVPで使わない。

---

## 2. テーブル

物理テーブル名は小文字複数形を維持する。ユーザーへ表示する時刻は`candidates.created_at`だけとし、他テーブルの`created_at`は作成順・既存schema互換等の技術メタデータに限定する。新設`votes`にはtimestamp列を設けない。

### 2.1 `events`

| 列 | 型・制約 | 更新 | 備考 |
|---|---|---|---|
| id | uuid PK | 不可 | |
| title | text NOT NULL、trim後1〜80 | ownerのみ | お題 |
| memo | text NULL | ownerのみ | |
| share_token | text NOT NULL UNIQUE | 不可 | 共有URL |
| owner_token | text NOT NULL UNIQUE | 不可 | owner URL / Cookie |
| created_at | timestamptz NOT NULL default now() | 不可 | 技術メタデータ |

- Event作成時にParticipantを生成しない。
- `owner_participant_id`とParticipantへの循環FKを撤去する。
- Event削除機能はMVP UIへ追加しない。

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
| url | text NULL | 同上 |
| created_by | uuid NULL FK participants ON DELETE SET NULL | 提案者 |
| created_at | timestamptz NOT NULL | 候補追加時刻・作成順 |

- title / urlはtrimし、空文字をNULLへ正規化する。
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
- デフォルト「興味ある？」、4プリセット、自由記述、label重複許容、`created_at ASC, id ASC`、2段階削除を維持する。

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

- `event accessible`: 有効なshare tokenまたはowner tokenを持つ。
- `event share editable`: 有効なshare tokenを持つ。
- `event owner editable`: 有効なowner tokenをowner URLまたはEvent path Cookie経由で持つ。

### 5.2 CRUD

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

owner token単独ではEvent title / memo以外の共同編集mutationを許可しない。owner画面でも共同編集操作にはshare tokenを使う。

### 5.3 DB強制事項

- Participant: trim、長さ、Event内同名禁止。
- Candidate / Criterion `created_by`: NULLまたは同一Event Participant。
- Vote: Candidate / Participantの同一Event、一意、value制約、不変列保護。
- Reaction: Candidate / Participant / Criterionの同一Event、一意、UPDATE拒否。
- Concern: Candidate / Participant / Criterionの同一Event、Candidate×Participant×Criterion一意、UPDATE拒否。
- Comment: Candidate / Participantの同一Event、一意、textだけ更新可能。
- exposed tableはRLS有効。anon roleへ必要な列だけGRANTする。
- security definer関数は固定`search_path`、PUBLICからEXECUTE剥奪、必要roleへ明示GRANTする。

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
- ADR-0006移行前にEventデータを0件へcleanupする承認済みゲートを維持し、`concerns.criterion_id`を既存行へ推測backfillしない。
- 実DB操作はpreflight、SQL提示、人間による適用、postflight、実DB E2Eの順で行う。
- 失敗時に既存migration編集、逆migration、force pushを行わない。
