# ADR-0005 レビュー 回答書（Codex質問20件への回答・2026-07-10）

作成: Cowork（決定者: おしげさん）／ 対象: Codexのレビューレポート（(A)理解＋(B)質問20件）
用途: この回答で**誤解・曖昧点を解消済み**。Codex は本書を前提に**再レビュー**すること。関連docsは本書のとおり修正済み。

## (A) Codexの理解について

**理解は正しい。** 追加の指摘（`EventView.tsx`・`CandidateSection.tsx` も属性依存／eyebrow表示は `EventView` が担う／`AGENTS.md`＝`CLAUDE.md` 一致）も妥当。属性撤去の対象ファイルに `EventView.tsx`・`CandidateSection.tsx` を含める。

## (B) 質問20件への回答

| # | 回答（決定） | docs反映 |
|---|---|---|
| 1 | **A：新規migrationで `DROP COLUMN attribute` ＋ `DROP TYPE event_attribute`**（既存migrationは編集しない・属性撤去と同一バッチ）。本番利用者なし・案2で適用＋push同時。全コードを attribute 非参照にしてからDROP。 | ADR-0005 影響/データモデル、04_data-model 反映済み |
| 2 | **再push版ではseedしない**（Criterionテーブルが無い）。「興味ある？」seedはSlice 5。既存イベントはSlice 5でbackfill。→理解どおり | ADR-0005・04（実装はSlice 5と明記） |
| 3 | **AC-1.5はSlice 1/2の受け入れ条件ではない（Slice 5要件）**に明記。 | 03_requirements AC-1.5 反映済み |
| 4 | **その通り。AC-5.1「価格❤️」は廃止**し、AC-5.2（判断基準❤️／プリセット「価格どう？」含む）に統合。 | 03_requirements 反映済み |
| 5 | ADR-0005本文を**「従来の❤️（価格等）。🌀は含まない」**に限定（RQ-1どおり）。 | ADR-0005 決定2 反映済み |
| 6 | ADR-0005の**決定（RQ-1〜5）はAccepted**、**データモデルの詳細スキーマはSlice 5実装時に確定**、と見出し明確化。 | ADR-0005 見出し反映済み |
| 7 | **参加不要・誰でも**（共有URLを知る全員が追加/編集/削除。お名前入力/Participant生成は不要＝候補編集と同じB案）。削除は2重確認。 | ADR-0005 RQ-4／04／ADR-0004 反映済み |
| 8 | **ADR-0004にCriterion権限を明記**（誰でも追加/編集/削除・参加不要・削除2重確認）。 | ADR-0004 権限表 反映済み |
| 9 | **`source` に `default` を新設**。「興味ある？」＝`source=default`・`created_by=NULL`。preset/custom はユーザー選択・自由記述。 | 04／ADR-0005 反映済み |
| 10 | **Reaction/Concern の candidate_id・participant_id・criterion_id は同一 `event_id` 限定**をRLS/トリガーで保証（Slice 5実装時）。Concernも同一イベント検証あり。 | 04 反映済み（要件として明記） |
| 11 | **一意制約を正式確定**: Reaction=`(candidate_id, participant_id, criterion_id)`、Concern=`(candidate_id, participant_id)`（2値を保証）。 | 04（案→確定の方針。詳細はSlice 5） |
| 12 | **Criterion削除時: 関連 Reaction は `ON DELETE CASCADE`**。**`created_by` の Participant 削除は `ON DELETE SET NULL`**（候補と同じ）。 | 04 反映済み |
| 13 | **汎用placeholder確定**: お題入力欄＝**「例）週末どこ行く？ など」**／候補タイトル入力欄＝**「例）候補の名前 など」**（別文言）。 | ui-copy／03／slice-2 docs 反映済み |
| 14 | **撤去はイベント詳細の属性eyebrowのみ**。トップの静的「どうしようか...」は**維持**。→理解どおり | ui-copy 反映済み |
| 15 | **S6「デフォルト無し」＝❤️/🌀の付与が初期ゼロ**（Criterion「興味ある？」自体は存在）。Criterionの編集/削除/2重確認のQAは**Slice 5**。 | 06_qa-flow（S6は現状維持・解釈確定） |
| 16 | ui-copyの旧実装指示（**未選択placeholder・DB enum不変・未選択文言**）を**明示的に無効化**。 | ui-copy 反映済み |
| 17 | 「表示名はSlice 3以降」は**修正**（Slice 2で提案者名として表示・未設定は「ー」）。 | ui-copy 反映済み |
| 18 | 03の画面一覧/主要UIを整合（**「オーナーメニュー」→控えめな編集導線「直す/保存」・独立パネルなし／表示名→お名前任意**）。 | 03_requirements 反映済み |
| 19 | Slice2要件docのステータスを**「正本反映済み・ローカル実装済み（属性ありで実装→属性撤去予定・未push）」**に更新。 | slice-2-requirements-and-dod 反映済み |
| 20 | 旧 `slice-2-codex-prompt.md` は**DEPRECATED（廃止）**。下部の旧指示は実行しない。次は別途「属性撤去＋再push」新プロンプトを作成し唯一の実装指示とする。 | slice-2-codex-prompt バナー反映済み |

## 2回目レビュー（残6件）への対応（2026-07-10・すべて正本反映済み）

Codexの(A)理解は正しい。指摘6件は「決定は済だが正本文言への反映漏れ」で、以下のとおり修正した。

| # | 対応 | 反映先 |
|---|---|---|
| 1 | **seedはSlice 5から**（再push版ではseedしない・既存イベントはbackfill）と明記 | 03 AC-1.1／04／ADR-0003 |
| 2 | **AC-1.5 を スライス1 から削除し、スライス5 に AC-5.0 として移設** | 03_requirements |
| 3 | 判断基準権限を**「共有URLを知る全員（参加不要）」に統一**（「オーナー・参加者」表現を修正） | ADR-0005 決定3／ADR-0003／CLAUDE・AGENTS |
| 4 | Reaction・Concern の一意制約を**「確定・必須」**に（"案"を外す） | 04（Reaction=candidate×participant×criterion、Concern=candidate×participant） |
| 5 | **QA S6 を S6a（判断基準ごとの❤️）と S6b（🌀＝別の単一常設懸念）に分割**＋Criterion CRUD（追加/編集/削除・2重確認）を検証対象に | 06_qa-flow |
| 6 | 同一イベント整合性を**Reaction（3参照）と Concern（2参照・criterion_id無し）に分けて明記** | 04_data-model |

CLAUDE.md＝AGENTS.md は再同期して一致を確認済み。

## 3回目レビュー（横断3件）への対応（2026-07-10・すべて正本反映済み）

Codexの(A)理解は全面的に正しい（型削除を妨げるDB関数/ビューが無い確認も含め妥当）。横断3件を修正した。

| # | 対応 | 反映先 |
|---|---|---|
| 1 | **AC-1.3 を「未ログイン閲覧＋guest_token保持」までに縮小**。評価（○/−/×）と回答の確認/修正は **Slice 3** へ明記 | 03_requirements AC-1.3 |
| 2 | 残存していた **「オーナーメニュー」表現を「お題・メモの編集導線（独立パネル廃止）」に統一** | 03 ユーザー種別/AC-1.8／06 S7（横断確認で生きた残存ゼロ） |
| 3 | **`slice-2-instructions-draft.md` を「記録（実装済みの土台）」に格下げ**。能動的な実装指示ではなく、仕様正本＝`slice-2-requirements-and-dod.md`(v3)、今後の実装指示＝別途の属性撤去プロンプト、と明記 | slice-2-instructions-draft |

## 再レビューの依頼

- 上記を前提に、もう一度 §レビュー観点で整合を確認してほしい。
- 特に **Q1（attribute DROP）／Q7（基準権限の参加不要）／Q9（source=default）／Q13（placeholder確定文言）** が全docに矛盾なく反映されているか。
- 新たな曖昧・矛盾があれば、また (A)理解＋(B)質問 の形で挙げてほしい（実装・コード変更はしない）。
