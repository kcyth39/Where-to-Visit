# 04 データモデル（きめのすけ）

作成日: 2026-07-07 / フェーズ: Phase 1（要件定義）
関連: [03_requirements.md](03_requirements.md) / [ADR-0003](adr/0003-evaluation-and-decision-logic.md)（評価・確定）/ [ADR-0004](adr/0004-permission-model.md)（権限）

---

## 識別方式（ログイン不要）

- **基本**: ブラウザ保持トークン（Cookie/localStorage）で識別。ログイン不要。
- **オーナー判別**: 作成時にオーナー Participant を生成し、`guest_token` をブラウザ保持。トークン一致でオーナーメニューを表示。
- **オーナー編集URL**: 作成時に `owner_token` を含む編集URLを発行。Cookie 消失・別端末でもこの URL でオーナー権限を回復（伝助方式）。
- **参加者判別**: 参加時に `guest_token` をブラウザ保持。
- **マイイベント一覧**: そのブラウザで関わったイベントを Cookie/localStorage にローカル保持して一覧表示（端末横断はしない・ログイン不要）。
- ※ログイン / User / 端末横断は **MVP 外**。

---

## エンティティ

### Event

| 属性 | 型・制約 | 備考 |
|---|---|---|
| id | PK | |
| title | — | **オーナーのみ編集** |
| memo | 任意 | 説明・決めたいこと。**オーナーのみ編集** |
| attribute | enum: 食事 / 宿泊 / アクティビティ / そのた | |
| owner_participant_id | FK → Participant | |
| share_token | 推測困難 | 共有URL用 |
| owner_token | 推測困難 | オーナー編集URL用 |
| created_at | — | |

- 無期限保存・**イベント削除機能なし**。

### Candidate

| 属性 | 型・制約 | 備考 |
|---|---|---|
| id | PK | |
| event_id | FK → Event | |
| title | 必須 | |
| url | 任意 | |
| created_by | FK → Participant | |
| created_at | — | |

- **誰でも編集・削除**（物理削除 + カスケード、2重確認）。

### Participant

| 属性 | 型・制約 | 備考 |
|---|---|---|
| id | PK | |
| event_id | FK → Event | |
| display_name | — | 初回の能動アクション時に入力 |
| guest_token | — | ブラウザ保持トークン |
| created_at | — | |

- **参加＝行生成**。未参加者は行なし。
- ※`user_id` は持たない（ログイン MVP 外）。

### Vote

| 属性 | 型・制約 | 備考 |
|---|---|---|
| id | PK | |
| candidate_id | FK → Candidate | |
| participant_id | FK → Participant | |
| value | enum: ○ / − / × | |

- **一意制約**: `candidate_id × participant_id`（排他。1候補1参加者1票）。
- **行なし ＝ −**。未評価と能動的な − は内部データ・表示とも区別しない。
- **可視性**: ○・−・× いずれも参加者×候補マトリクスで付与者公開。
- **確定判定**: ○カウント / ×拒否 / −ニュートラル（中間スコアなし）。

### Reaction（❤️と🌀を統合・非決定）

| 属性 | 型・制約 | 備考 |
|---|---|---|
| id | PK | |
| candidate_id | FK → Candidate | |
| participant_id | FK → Participant | |
| type | enum（下記） | |

- **type**: `heart_price` / `heart_taste` / `heart_facility` / `heart_place` / `heart_interest` / `concern`
- 付与者公開。属性別の有効 type:

| 属性 | 有効 type |
|---|---|
| 食事 | price / taste / facility / place / concern |
| 宿泊 | price / facility / place / concern |
| アクティビティ | price / interest / concern |
| そのた | interest / concern（**price なし**） |

- `concern` = 🌀（非決定のネガ懸念）。全属性で有効。

### Comment

| 属性 | 型・制約 | 備考 |
|---|---|---|
| id | PK | |
| candidate_id | FK → Candidate | |
| participant_id | FK → Participant | |
| text | — | |
| created_at | — | |

- 任意・促さない。**誰でも編集・削除**。

---

## 関係

- **Event** 1—* **Candidate** / **Participant**
- **Candidate** 1—* **Vote** / **Reaction** / **Comment**

```
Event ──1:*── Candidate ──1:*── Vote
  │                    ├──1:*── Reaction
  │                    └──1:*── Comment
  └──1:*── Participant
       （owner_participant_id で Event → オーナー Participant を参照）
```

---

## 運用ルール

- **同時編集**: last-write-wins（楽観ロックなし）。
- **編集権限**: 名前・○/−/×・❤️・🌀・コメントは **URL を知る全員が編集可**（性善説）。イベント名・memo のみ **オーナー**（トークン判別）。
- **削除**: 候補は誰でも + 2重確認・物理削除 + カスケード。**イベント削除機能なし**。
