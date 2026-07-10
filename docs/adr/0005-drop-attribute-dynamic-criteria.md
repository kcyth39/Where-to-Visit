# ADR-0005: 属性の撤廃と「判断基準」の動的化

- **ステータス:** Accepted
- **日付:** 2026-07-10
- **決定者:** おしげさん
- **関連 / 一部置換:** [ADR-0003 評価モデルと確定ロジック](0003-evaluation-and-decision-logic.md)（属性・❤️の部分を置換／○-−-×と確定ロジックは不変）、[04_data-model](../04_data-model.md)、[03_requirements](../03_requirements.md)、[ui-copy-decisions](../reports/ui-copy-decisions.md)

## コンテキスト（課題）

現行は、お題作成時に**属性（食事/宿泊/アクティビティ/そのた）を最初に選ばせ**、属性ごとに固定の❤️（price/taste/facility/place/interest）が決まる設計。これは「最初に種別で縛る」ため、**ユーザーの自由度を制限する**恐れがある。

## 決定（確定）

1. **属性（attribute）という種別を撤廃する。** お題は**種別に関係なく自由テキスト**（タイトル＋メモ）で設定する。作成時に属性選択はしない。
2. お題作成後に「**どんな判断基準でみんなの意見を募りたいか**」を設定する。**判断基準（＝従来の❤️「価格」等。🌀は含まない・RQ-1）**は、**代表例からの選択**＋**自由記述**の両方で設定できる。
3. **判断基準はイベント単位の共有リスト**。**共有URLを知る全員が後から追加・編集・削除できる（参加＝お名前入力/Participant生成は不要）**（性善説・削除は2重確認）。
4. **確定ロジックは不変**: 総合評価 ○/−/×（デフォルト−・排他）、×は拒否で確定候補から除外、「×ゼロ・○1つ以上・○最多」を自動ハイライト。判断基準は**非決定・意見可視化**のみ（確定判定に影響しない）。
5. 判断基準への付与は従来❤️と同じ「**付ける／付けない**」の2値（点数などの別軸にはしない）。

## 影響

- **今すぐのコード変更（最小）**: `Event.attribute`（enum）と作成フォームの属性選択（Slice 1）、候補タイトルの属性連動placeholder（Slice 2）、イベント詳細の属性eyebrow（`EventView.tsx`）を撤去。属性依存コード（`constants.ts`／`CreateEventForm.tsx`／`events.ts`／`EventView.tsx`／`CandidateSection.tsx`）を整理。**DBは新規migrationで `DROP COLUMN attribute` ＋ `DROP TYPE event_attribute`**（既存migrationは編集せず・属性撤去と同一バッチ）。placeholderは汎用（お題「例）週末どこ行く？ など」／候補「例）候補の名前 など」）。**候補管理（CRUD・提案者・RLS）はそのまま生きる**。
- **将来（Slice 5想定・今は仕様のみ）**: 動的な判断基準（Criterion）と、候補×参加者×基準の❤️付与（Reaction）の実装。属性→固定❤️のマッピング（ADR-0003）は本ADRで置換。
- **push保留中**: 属性を含む現行Slice 2はデプロイせず、本転換を織り込んだクリーンな版をpushする（本番利用者なし・案2）。
- ADR-0003 の「属性と❤️」節・04_data-model の `Event.attribute`／`Reaction.type`（固定enum）は本ADR確定後に改訂する。

## データモデル（方針確定・詳細スキーマは Slice 5 実装時に確定）

- **Event**: `attribute` 列を**新規migrationで DROP COLUMN**、`event_attribute` 型も **DROP TYPE**（お題は title＋memo の自由テキスト）。
- **Criterion（判断基準＝❤️ポジのみ・新規）**: `id / event_id(FK cascade) / label(text) / source(**default|preset|custom**) / created_by(FK participant, NULL可) / created_at`。**🌀（懸念）はCriterionに含めない**（RQ-1）。重複は割り切り（RQ-5）＝厳密なunique制約は必須としない（技術上限のみ）。
  - **デフォルト「興味ある？」は `source = default`・`created_by = NULL`**（Q9）。プリセット選択は `source = preset`、自由記述は `source = custom`。
  - **追加・編集・削除は共有URL（`share_token`）を知る全員（参加＝お名前入力/Participant生成は不要・Q7）**。削除は2重確認。
  - お題作成時に**デフォルトで「興味ある？」を1件seed**（RQ-3）。
  - プリセット選択肢（RQ-2）: 「価格どう？」「雰囲気どう？」「場所はどう？」「色はどう？」＋自由記述。
  - 追加・編集・削除は誰でも可（性善説）。**削除は2重確認フロー**（RQ-4）。
- **Reaction 改**: ❤️は `type`（固定enum）→ `criterion_id`（FK→Criterion）参照に。行の存在＝その基準を「付けた」。**🌀（懸念）はCriterionとは別に、従来どおり候補×参加者の単一フラグ（全お題共通・常設）として保持**。付与者公開は不変。

## 判断基準（Criterion）の確定（RQ-1〜5・2026-07-10）

- **RQ-1 🌀の扱い**: 🌀は**全お題に常設の単一の懸念**のまま（Criterionに統合しない）。判断基準（Criterion）は❤️ポジのみ動的化。
- **RQ-2 プリセット（選択肢・4つ）**: 「**価格どう？**」「**雰囲気どう？**」「**場所はどう？**」「**色はどう？**」。加えて**自由記述**で任意追加できる。
- **RQ-3 デフォルト基準**: お題作成直後に「**興味ある？**」を1つ付与する（初期状態）。
- **RQ-4 追加・編集・削除権限**: 性善説で**誰でも**追加・編集・削除できる。**共有URL（`share_token`）を知る全員**が対象で、**参加（お名前入力/Participant生成）は不要**（Q7・候補編集と同じB案）。**削除は2重確認フロー**を挟む。
- **RQ-5 重複・乱立**: **割り切る（制限なし・技術上限のみ）**。

## 段取り（本ADR確定後）

1. ~~RQ-1〜5 を確定 → 本ADRを Accepted 化。~~ **完了（2026-07-10）。**
2. 正本改訂: `04_data-model`（attribute削除・Criterion/Reaction・🌀常設）、`03_requirements`（作成フロー・判断基準）、`ADR-0003`（属性・❤️節を置換）、`ui-copy-decisions`（属性UI撤去・placeholder汎用）。
3. Codexへ「**属性の最小撤去＋placeholder汎用化**」を指示（動的判断基準〔Criterion/Reaction〕の実装＝Slice 5）。
4. クリーンな版を push（案2・適用＋デプロイ同時）。

> **実装スコープ注意**: 判断基準の**プリセット/デフォルト/追加UI/❤️付与**は Slice 5（❤️実装）で作る。今回の再push baseline では **属性の撤去＋placeholder汎用化のみ**（Criterionテーブル等は作らない）。
