# 04 データモデル（きめのすけ）

作成日: 2026-07-08 / フェーズ: Phase 1（要件定義）
関連: [03_requirements.md](03_requirements.md) / [ADR-0003](adr/0003-evaluation-and-decision-logic.md)（評価・確定）/ [ADR-0004](adr/0004-permission-model.md)（権限）/ [ADR-0005](adr/0005-drop-attribute-dynamic-criteria.md)（属性撤廃・判断基準の動的化）

> **ADR-0005 反映**: `Event.attribute` は撤廃。属性別❤️は**判断基準（Criterion）**へ置換（❤️ポジのみ動的・イベント単位共有）。🌀は全お題常設の単一懸念（Concern）。Criterion/Reaction/Concern/Comment の実装は Slice 5。**詳細スキーマ・RLS方針は [slice-5-requirements-and-dod.md](reports/slice-5-requirements-and-dod.md) に反映し、2026-07-10に文書承認済み**。

---

## 識別方式（ログイン不要）

- **基本**: ブラウザ保持トークン（Cookie/localStorage）で識別。ログイン不要。
- **オーナー判別**: 作成時にオーナー Participant を生成し、`guest_token` をブラウザ保持。トークン一致でオーナー用の編集（お題・メモ）を表示（独立「オーナーメニュー」パネルは廃止・同一画面内の控えめ表示）。
- **オーナー編集URL**: 作成時に `owner_token` を含む編集URLを発行。Cookie 消失・別端末でもこの URL でオーナー権限を回復（伝助方式）。
- **参加者判別**: 参加時に `guest_token` をブラウザ保持。
- **マイイベント一覧**: そのブラウザで関わったイベントを Cookie/localStorage にローカル保持して一覧表示（端末横断はしない・ログイン不要）。
- ※ログイン / User / 端末横断は **MVP 外**。

---

## エンティティ

### Event

| 列 | 型・制約 | 備考 |
|---|---|---|
| id | PK | |
| title | — | **オーナーのみ編集** |
| memo | 任意 | 説明・決めたいこと。**オーナーのみ編集** |
| owner_participant_id | FK → Participant | |
| share_token | 推測困難 | 共有URL用 |
| owner_token | 推測困難 | オーナー編集URL用 |
| created_at | — | |

- 無期限保存・**イベント削除機能なし**。

### Candidate

| 列 | 型・制約 | 備考 |
|---|---|---|
| id | PK | |
| event_id | FK → Event | |
| title | **任意（NULL可）** | タイトル or URL のどちらか一方は必須 |
| url | 任意（NULL可） | 同上 |
| created_by | FK → Participant（**提案者**・**NULL可**、`ON DELETE SET NULL`） | 作成時は追加者を自動設定。**プルダウンで「既存参加者＋ー（未設定＝NULL）」に変更可** |
| created_at | — | |

- **制約**: `CHECK (title IS NOT NULL OR url IS NOT NULL)`（タイトルとURLの**少なくとも一方は必須**）。空文字は NULL 相当に正規化。
- **表示**: タイトルがあればタイトル、無ければURL（URLがあればリンク）。提案者（`created_by` の display_name）を各候補に表示（未設定は「ー」）。将来、URLから名称を自動導出（リリース後）。
- **誰でも編集・削除**（性善説）。**削除は2段階確認（1回目/2回目で配色差）＋物理削除＋カスケード**。**タイトル/URL/提案者の編集は要素ごとに「変更します、よろしいですか？」で確認**。

### Participant

| 列 | 型・制約 | 備考 |
|---|---|---|
| id | PK | |
| event_id | FK → Event | |
| display_name | **任意** | **候補追加フォームの任意欄**で入力（空可）。**同一 `guest_token` の候補追加時にお名前入力があれば upsert（最新入力で更新）**。専用の名前編集UIは作らない。未設定は表示上「ー」 |
| guest_token | — | ブラウザ保持トークン |
| created_at | — | |

- **参加＝行生成**。Participantを必要とする能動操作（候補追加、Reaction / Concern新規付与、Comment投稿）時に、操作ブラウザ（`guest_token`）のParticipantを無ければ自動生成する。Criterion追加だけでは生成しない。**お名前（display_name）の入力は強制しない**。未参加者は行なし。
- **同一イベントの参加者は、提案者名の表示・提案者プルダウンのために参照される**（RLS で `share_token`/`owner_token` 保持者に SELECT 開放）。
- 提案者の付け替え（`created_by` 更新）では、指定する `participant_id` が**同一 `event_id` に属すること**を RLS/制約で検証する（他イベントの参加者IDを指定できないようにする）。
- ※`user_id` は持たない（ログイン MVP 外）。

### Vote

| 列 | 型・制約 | 備考 |
|---|---|---|
| id | PK | |
| candidate_id | FK → Candidate | |
| participant_id | FK → Participant | |
| value | enum: ○ / − / × | |

- **一意制約**: `candidate_id × participant_id`（排他。1候補1参加者1票）。
- **行なし ＝ −**。未評価と能動的な − は内部データ・表示とも区別しない。
- **可視性**: ○・−・× いずれも参加者×候補マトリクスで付与者公開。
- **確定判定**: ○カウント / ×拒否 / −ニュートラル（中間スコアなし）。

### Criterion（判断基準・❤️ポジのみ）※[ADR-0005](adr/0005-drop-attribute-dynamic-criteria.md)・実装は Slice 5

| 列 | 型・制約 | 備考 |
|---|---|---|
| id | uuid PK | 作成後変更不可 |
| event_id | uuid FK → Event, on delete cascade | 作成後変更不可 |
| label | text, 前後空白除去後1〜60文字 | **唯一の更新可能な業務列** |
| source | text: **default / preset / custom** | 「興味ある？」＝default、プリセット選択＝preset、自由記述＝custom。作成後変更不可 |
| created_by | FK → Participant（NULL可、on delete set null） | 作成後変更不可。default は NULL |
| created_at | timestamptz | 作成後変更不可 |

- 判断基準は**イベント単位の共有リスト**。お題作成時に「**興味ある？**」を1件 seed（`source=default`・`created_by=NULL`）し、判断基準が0件の既存イベントへSlice 5 migrationでbackfillする。
- **created_by**: seed / backfill（`source=default`）はNULL。ユーザーによるpreset / custom追加では、Criterion追加だけを理由にParticipantを生成せず、呼出元 `guest_token` に対応する同一eventのParticipantが既に存在すればそのID、存在しなければNULLとする。クライアントから `created_by` を指定するINSERTは拒否し、専用DB関数等でDB側が決定する。
- **重複**: Criterionは `id` で識別し、自由記述の同一label重複を許容する。プリセットと前後空白除去後に完全一致するlabelが1件以上ある間だけ当該プリセット追加ボタンを隠し、全件削除後に再表示する。
- **表示順**: Criterion用の順序列・並び替え操作は持たない。`created_at ASC, id ASC` の作成順で表示し、label編集後も位置を変えない。Slice 5で並び替え機能を追加しない。
- **同一イベント整合性**: **Reaction**（`candidate_id` / `participant_id` / `criterion_id`）、**Concern**（`candidate_id` / `participant_id`）、**Comment**（`candidate_id` / `participant_id`）は、各参照先が同一 `event_id` に属することをRLS・制約・トリガーまたは専用DB関数で保証する。Criterion削除時は関連Reactionを `ON DELETE CASCADE` する。

### Reaction（❤️＝判断基準への付与・非決定）※実装は Slice 5

| 列 | 型・制約 | 備考 |
|---|---|---|
| id | PK | |
| candidate_id | FK → Candidate | |
| participant_id | FK → Participant | |
| criterion_id | FK → Criterion | どの判断基準に❤️を付けたか |
| created_at | timestamptz | |

- 行の存在＝その基準を「付けた」（付ける/付けないの2値）。付与者公開。**一意制約（確定・必須）**: `candidate_id × participant_id × criterion_id`。
- INSERTは呼出元 `guest_token` に対応する現在のParticipant名義だけを許可する。他Participant名義の新規付与は禁止する。共有URLを利用できる人は既存行を誰の名義でもDELETEできる。UPDATEは許可せず、履歴も保存しない。

### Concern（🌀＝非決定のネガ懸念・全お題常設）※実装は Slice 5

| 列 | 型・制約 | 備考 |
|---|---|---|
| id | PK | |
| candidate_id | FK → Candidate | |
| participant_id | FK → Participant | |
| created_at | timestamptz | |

- 🌀 は Criterion とは別の**単一の懸念**（全お題共通・常設・`criterion_id`は持たない）。行の存在＝🌀を付けた。付与者公開。**一意制約（確定・必須）**: `candidate_id × participant_id`。
- INSERT・DELETE・UPDATEの規則はReactionと同じ（新規付与は現在のParticipant名義のみ、共有URL保持者は既存行を対象Participant名義を問わず解除可、UPDATEなし、履歴なし）。

### Comment

| 列 | 型・制約 | 備考 |
|---|---|---|
| id | uuid PK | 作成後変更不可 |
| candidate_id | uuid FK → Candidate, on delete cascade | 作成後変更不可 |
| participant_id | uuid FK → Participant, NULL可・on delete set null | INSERT時は呼出元の現在Participantに限定。作成後変更不可 |
| text | text | 前後空白除去後、Unicodeコードポイント数で1〜500文字。**唯一の更新可能な業務列** |
| created_at | timestamptz | 作成後変更不可 |

- アプリとDB層の双方でINSERT / UPDATE前に同じ前後空白除去を行い、正規化後のtextだけを保存する。DBは正規化後の `char_length(text)` が1〜500であることを保証し、空白のみは0文字として拒否する。
- 任意・入力を促さない。共有URLを利用できる人は誰でも `text` を共同編集し、1段階確認を経て削除できる。編集時に投稿者名義を変更せず、編集履歴は保存しない。
- 現行schemaに `updated_at` は存在せず、「編集済み」表示のためだけには追加しない。

### Slice 5 RLS CRUD

`event accessible` は、対象eventの有効な `share_token` または `owner_token` を保持している状態を指す。変更操作はすべて `share_token` 限定で、owner編集画面でも共同編集操作には `share_token` を使う。

| 対象 | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| criteria | event accessible | share_token限定 | share_token限定（`label`のみ） | share_token限定 |
| reactions | event accessible | share_token限定・現在Participant名義のみ | 操作なし | share_token限定・対象名義を問わない |
| concerns | event accessible | share_token限定・現在Participant名義のみ | 操作なし | share_token限定・対象名義を問わない |
| comments | event accessible | share_token限定・現在Participant名義のみ | share_token限定（`text`のみ） | share_token限定 |

- 列単位GRANTに加え、RLS・制約・トリガーまたは専用DB関数で不変列・同一event・呼出元Participantを保証する。
- `owner_token` 単独のINSERT / UPDATE / DELETEは拒否する。

---

## 関係

- **Event** 1—* **Candidate** / **Participant** / **Criterion**
- **Candidate** 1—* **Vote** / **Reaction** / **Concern(🌀)** / **Comment**
- **Criterion** 1—* **Reaction**（Reaction は Candidate×Participant×Criterion）

```
Event ──1:*── Candidate ──1:*── Vote
  │                    ├──1:*── Reaction ──*:1── Criterion
  │                    ├──1:*── Concern (🌀)
  │                    └──1:*── Comment
  ├──1:*── Participant
  └──1:*── Criterion（判断基準・❤️ポジ）
       （owner_participant_id で Event → オーナー Participant を参照）
```

---

## 運用ルール

- **同時編集**: last-write-wins（楽観ロックなし）。
- **編集権限**: 名前・○/−/×・❤️・🌀・コメント・**候補（タイトル/URL/提案者）**は性善説で共同編集する。ただし❤️・🌀・コメントの新規行は呼出元の現在Participant名義に限定し、子要素の変更操作には `share_token` を要求する。イベント名・memo のみ **オーナー**（トークン判別）。
- **変更確認**: 既存要素の変更（候補のタイトル/URL/提案者、および**イベント名/memo**）は「**変更します、よろしいですか？**」の確認を挟んでから確定（誤操作・混乱防止）。
- **判断基準（Criterion）**: 共有URLを知る全員が追加・編集・削除可（性善説・**参加不要**・Q7）。追加だけを理由にParticipantを生成しない。更新可能な業務列は `label` だけ。**削除は2重確認**。自由記述の重複は許容し、並び替え機能は持たない。
- **コメント**: 編集は編集モード内の「保存」「キャンセル」で完結し、確認ダイアログなし。削除は1段階確認。投稿者名義と所属情報は変更しない。
- **Slice 5即時反映**: サーバー成功後に操作した画面をページ再読み込みなしで更新し、失敗時は成功状態を残さない。別ブラウザ等へのRealtime自動同期はSlice 5対象外。
- **削除**: 候補は誰でも + **2段階確認（配色差）**・物理削除 + カスケード。**イベント削除機能なし**。
