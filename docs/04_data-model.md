# 04 データモデル（きめのすけ）

作成日: 2026-07-08 / フェーズ: Phase 1（要件定義）
関連: [03_requirements.md](03_requirements.md) / [ADR-0003](adr/0003-evaluation-and-decision-logic.md)（評価・確定）/ [ADR-0004](adr/0004-permission-model.md)（権限）/ [ADR-0005](adr/0005-drop-attribute-dynamic-criteria.md)（属性撤廃・判断基準の動的化）

> **ADR-0005 反映**: `Event.attribute` は撤廃。属性別❤️は**判断基準（Criterion）**へ置換（❤️ポジのみ動的・イベント単位共有）。🌀は全お題常設の単一懸念（Concern）。Criterion/Reaction/Concern の実装は Slice 5。

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

- **参加＝行生成**。候補追加などの能動アクション時に、追加者のブラウザ（`guest_token`）の Participant を（無ければ）自動生成する。**お名前（display_name）の入力は強制しない**。未参加者は行なし。
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
| id | PK | |
| event_id | FK → Event, on delete cascade | |
| label | text | 例「興味ある？」（デフォルト）／プリセット／自由記述 |
| source | enum: **default / preset / custom** | 「興味ある？」＝default、プリセット選択＝preset、自由記述＝custom |
| created_by | FK → Participant（NULL可） | default は NULL。**追加・編集・削除は共有URLを知る全員（参加不要・Q7）**・削除は2重確認 |
| created_at | — | |

- **属性（enum）は新規migrationで DROP**（ADR-0005）。判断基準は**イベント単位の共有リスト**。お題作成時に「**興味ある？**」を1件 seed（`source=default`・`created_by=NULL`）＝**Slice 5 から**（再push版ではseedせず、既存イベントは Slice 5 で backfill）。プリセット: 「価格どう？」「雰囲気どう？」「場所はどう？」「色はどう？」＋自由記述。重複は割り切り（技術上限のみ）。
- **同一イベント整合性**: **Reaction**（`candidate_id` / `participant_id` / `criterion_id` の3参照）と **Concern**（`candidate_id` / `participant_id` の2参照。criterion_idは持たない）は、参照先が全て同一 `event_id` に属することを RLS/トリガーで保証する（Slice 5）。Criterion 削除時は関連 Reaction を `ON DELETE CASCADE`、`created_by` の Participant 削除は `ON DELETE SET NULL`。

### Reaction（❤️＝判断基準への付与・非決定）※実装は Slice 5

| 列 | 型・制約 | 備考 |
|---|---|---|
| id | PK | |
| candidate_id | FK → Candidate | |
| participant_id | FK → Participant | |
| criterion_id | FK → Criterion | どの判断基準に❤️を付けたか |

- 行の存在＝その基準を「付けた」（付ける/付けないの2値）。付与者公開。**一意制約（確定・必須）**: `candidate_id × participant_id × criterion_id`。

### Concern（🌀＝非決定のネガ懸念・全お題常設）※実装は Slice 5

| 列 | 型・制約 | 備考 |
|---|---|---|
| id | PK | |
| candidate_id | FK → Candidate | |
| participant_id | FK → Participant | |

- 🌀 は Criterion とは別の**単一の懸念**（全お題共通・常設・`criterion_id`は持たない）。行の存在＝🌀を付けた。付与者公開。**一意制約（確定・必須）**: `candidate_id × participant_id`。

### Comment

| 列 | 型・制約 | 備考 |
|---|---|---|
| id | PK | |
| candidate_id | FK → Candidate | |
| participant_id | FK → Participant | |
| text | — | |
| created_at | — | |

- 任意・促さない。**誰でも編集・削除**。

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
- **編集権限**: 名前・○/−/×・❤️・🌀・コメント・**候補（タイトル/URL/提案者）**は **URL を知る全員が編集可**（性善説）。イベント名・memo のみ **オーナー**（トークン判別）。
- **変更確認**: 既存要素の変更（候補のタイトル/URL/提案者、および**イベント名/memo**）は「**変更します、よろしいですか？**」の確認を挟んでから確定（誤操作・混乱防止）。
- **判断基準（Criterion）**: 共有URLを知る全員が追加・編集・削除可（性善説・**参加不要**・Q7）。**削除は2重確認**。重複は割り切り（技術上限のみ）。
- **削除**: 候補は誰でも + **2段階確認（配色差）**・物理削除 + カスケード。**イベント削除機能なし**。
