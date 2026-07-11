# ADR-0005: 属性の撤廃と「判断基準」の動的化

- **ステータス:** Accepted
- **日付:** 2026-07-10
- **決定者:** おしげさん
- **関連 / 一部置換:** [ADR-0003 評価モデルと最終候補表示](0003-evaluation-and-decision-logic.md)（属性・❤️の部分を置換）、[ADR-0006 共同編集型・回答者行モデル](0006-collaborative-response-row-model.md)、[ADR-0007 イベント画面と判断基準別フィードバック](0007-event-views-and-criterion-feedback.md)、[04_data-model](../04_data-model.md)、[03_requirements](../03_requirements.md)、[ui-copy-decisions](../reports/ui-copy-decisions.md)

> **部分SUPERSEDED（2026-07-11・ADR-0006）:** 本ADRの属性撤廃、Criterion動的化、プリセット、seed、重複、作成順は有効。`guest_token`による現在Participant判定、Criterion追加時の`created_by`決定、Vote行なし＝−、旧ハイライト条件はADR-0006で置換する。
>
> **部分SUPERSEDED（2026-07-12・ADR-0007）:** 本ADRの「🌀はCriterionに含めず、Candidate単位の常設単一懸念とする」決定は置換済み。現行仕様では❤️と🌀をいずれもCandidate×Participant×Criterionごとの独立2値とする。

## コンテキスト（課題）

現行は、お題作成時に**属性（食事/宿泊/アクティビティ/そのた）を最初に選ばせ**、属性ごとに固定の❤️（price/taste/facility/place/interest）が決まる設計。これは「最初に種別で縛る」ため、**ユーザーの自由度を制限する**恐れがある。

## 決定（確定）

1. **属性（attribute）という種別を撤廃する。** お題は**種別に関係なく自由テキスト**（タイトル＋メモ）で設定する。作成時に属性選択はしない。
2. お題作成後に「**どんな判断基準でみんなの意見を募りたいか**」を設定する。判断基準は**代表例からの選択**＋**自由記述**の両方で設定できる。各判断基準にはADR-0007により❤️と🌀を独立して付ける。
3. **判断基準はイベント単位の共有リスト**。**共有URLを知る全員が後から追加・編集・削除でき、Participant選択を操作の前提にしない**（性善説・削除は2重確認）。ただし非空の名前draftがある操作は、ADR-0006の名前確定を先行する。
4. 判断基準は**非決定・意見可視化**のみで、○数・×有無による候補状態判定に影響しない。未評価を含む4状態と3種類の最終候補表示はADR-0003 / ADR-0006を正とする。
5. 判断基準への付与は従来❤️と同じ「**付ける／付けない**」の2値（点数などの別軸にはしない）。

## 影響

- **今すぐのコード変更（最小）**: `Event.attribute`（enum）と作成フォームの属性選択（Slice 1）、候補タイトルの属性連動placeholder（Slice 2）、イベント詳細の属性eyebrow（`EventView.tsx`）を撤去。属性依存コード（`constants.ts`／`CreateEventForm.tsx`／`events.ts`／`EventView.tsx`／`CandidateSection.tsx`）を整理。**DBは新規migrationで `DROP COLUMN attribute` ＋ `DROP TYPE event_attribute`**（既存migrationは編集せず・属性撤去と同一バッチ）。placeholderは汎用（お題「例）週末どこ行く？ など」／候補「例）候補の名前 など」）。**候補管理（CRUD・提案者・RLS）はそのまま生きる**。
- **Slice 5実装済み**: 動的な判断基準（Criterion）と、候補×参加者×基準の❤️付与（Reaction）。属性→固定❤️のマッピング（ADR-0003旧版）は本ADRで置換。
- ~~**push保留中**: 属性を含むSlice 2はデプロイせず、本転換を織り込んだクリーンな版をpushする（本番利用者なし・案2）。~~ **属性撤去ベースラインのpush完了。**
- ~~ADR-0003 の「属性と❤️」節・04_data-model の `Event.attribute`／`Reaction.type`（固定enum）を改訂する。~~ **正本反映済み。**

## データモデル（Slice 5詳細確定・2026-07-10）

- **Event**: `attribute` 列を**新規migrationで DROP COLUMN**、`event_attribute` 型も **DROP TYPE**（お題は title＋memo の自由テキスト）。
- **Criterion（判断基準）**: `id / event_id(FK cascade) / label(text) / source(**default|preset|custom**) / created_by(FK participant, NULL可) / created_at`。❤️と🌀はいずれも別テーブルからCriterionを参照する（ADR-0007）。Criterionは `id` で識別し、labelのunique制約は設けない。
  - **デフォルト「興味ある？」は `source = default`・`created_by = NULL`**（Q9）。プリセット選択は `source = preset`、自由記述は `source = custom`。
  - **追加・編集・削除は共有URL（`share_token`）を知る全員**。Participant選択を前提にしない。seed / backfillは `created_by=NULL`。名前draftなしではselected participantがあれば`created_by`、未選択ならNULL。非空draftがあれば名前確定後のParticipantを設定する。作成後の`created_by`は変更できない。削除は2重確認。
  - お題作成時に**デフォルトで「興味ある？」を1件seed**（RQ-3）。
  - プリセット選択肢（RQ-2）: 「価格どう？」「雰囲気どう？」「場所はどう？」「色はどう？」＋自由記述。
  - 更新可能な業務列は `label` だけ。順序列・並び替えUIは設けず、`created_at ASC, id ASC` の作成順で表示し、編集後も位置を変えない。
- **Reaction / Concern 改**: ❤️と🌀はいずれも`criterion_id`（FK→Criterion）を参照する別テーブルとし、行の存在＝その基準へ付けた現在値とする。同じ回答者が同じCandidate×Criterionへ両方付けられる。共有URL保持者がselected participant名義で付け外しでき、付与者公開・履歴なしは維持する。

## 判断基準（Criterion）の確定（RQ-1〜5・2026-07-10）

- **RQ-1 🌀の扱い（SUPERSEDED）**: 2026-07-10時点では全お題常設の単一懸念としていたが、2026-07-12のADR-0007で廃止。現行仕様は判断基準ごとの独立した🌀である。
- **RQ-2 プリセット（選択肢・4つ）**: 「**価格どう？**」「**雰囲気どう？**」「**場所はどう？**」「**色はどう？**」。加えて**自由記述**で任意追加できる。
- **RQ-3 デフォルト基準**: お題作成直後に「**興味ある？**」を1つ付与する（初期状態）。
- **RQ-4 追加・編集・削除権限**: 性善説で**誰でも**追加・編集・削除できる。**共有URL（`share_token`）を知る全員**が対象で、Participant選択を操作の前提にしない。非空の名前draftがある場合だけADR-0006の名前確定を先行する。**削除は2重確認フロー**を挟む。
- **RQ-5 重複・乱立**: 自由記述による同一labelの重複は許容する。プリセットと前後空白除去後に完全一致するCriterionが1件以上存在する間だけ当該プリセット追加ボタンを隠し、該当Criterionが全件削除されたら再表示する。DBではlabelの重複を禁止しない。

### Criterion表示順の調査結果（2026-07-10）

- 既存schema / migrationにCriterionテーブルや `order` / `sort_order` / `position` 等の順序列は存在しない。
- 既存UI・E2EにCriterionのドラッグ＆ドロップ、上下移動、順序変更、順序保持テストは存在しない。
- 承認済み正本にCriterion並び替え要件は存在せず、seed / backfillもイベントごとに1件の「興味ある？」を作るだけで順序指定を持たない。
- よってSlice 5では並び替えモデルを追加せず、Criterionの更新可能な業務列を `label` だけに確定し、`created_at ASC, id ASC` の作成順で表示する。

## 段取り（属性撤去ベースライン時の履歴）

1. ~~RQ-1〜5 を確定 → 本ADRを Accepted 化。~~ **完了（2026-07-10）。**
2. 正本改訂: `04_data-model`（attribute削除・Criterion/Reaction・🌀常設）、`03_requirements`（作成フロー・判断基準）、`ADR-0003`（属性・❤️節を置換）、`ui-copy-decisions`（属性UI撤去・placeholder汎用）。
3. ~~Codexへ「属性の最小撤去＋placeholder汎用化」を指示。~~ **完了。**
4. ~~クリーンな版をpush（案2・適用＋デプロイ同時）。~~ **完了。**

> **現在地**: 属性撤去とSlice 5実装は完了済み。Participant、Vote、共同編集、最終候補表示は2026-07-11 AcceptedのADR-0006を正として次の実装で移行する。
