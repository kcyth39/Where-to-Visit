# Slice 2 実装前提 Chatレビューレポート（2026-07-09）

作成: Chat（レビュー実施）／ 決定者: おしげさん／ 反映先: Cowork（反映済み）
対象: `slice-2-requirements-and-dod.md`（v3）／`04_data-model.md`／`03_requirements.md`／`ADR-0004`

---

## 1. 整合性確認

| 確認対象 | 結果 |
|---|---|
| `04_data-model.md`・`03_requirements.md`・`ADR-0004`・`slice-2-requirements-and-dod.md`（v3）の相互整合性 | **整合済み**（提案者機能・タイトル/URL一方必須・要素ごと変更確認・削除2段階配色差、いずれも4ファイルで一致） |

## 2. 旧 `slice-2-instructions-draft.md` との差分＝要更新

| 項目 | 旧ドラフト | 現行（新4ファイル） |
|---|---|---|
| タイトル必須要否 | タイトル必須＋URL任意 | どちらか一方で可（`CHECK`制約） |
| お名前入力 | 初回能動アクション時に1回入力必須 | 任意（空でも候補追加可、後から編集可） |
| 提案者機能 | 言及なし | 新規スコープ：表示・自動紐づけ・プルダウン編集 |
| 編集時の確認 | 言及なし | 要素ごとに「変更します、よろしいですか？」 |
| 削除確認 | 「2重確認ダイアログ」とのみ | 1回目/2回目で文言・配色とも差別化（§4で確定） |
| Slice 1への波及 | なし | `EventView`（イベント名・メモ編集）にも変更確認を統一適用 |
| UI文言 | こうほをたす／ついか／けす／やめる | 漢字優先化後の文言に置換済み（`slice-2-decisions-2026-07-09.md` 参照） |

**依頼**: `slice-2-instructions-draft.md` は本レポートおよび `slice-2-requirements-and-dod.md`（v3）の内容で置き換え、Codexプロンプトはこの新版を基準に作成すること。旧ドラフトは参照させない。→ **反映済み（instructions-draft を新4ファイル基準に全面刷新）。**

## 3. 発見した不整合・技術的欠落と対応

| # | 種別 | 内容 | 対応 |
|---|---|---|---|
| 1 | 矛盾 | `created_by` が「原則NOT NULL」だが、提案者を「ー（未設定）」に変更できる仕様と矛盾 | `created_by` を NULL 許容（`ON DELETE SET NULL`）。表記を「作成時は自動設定・後からNULLに変更可」に修正 |
| 2 | 技術的欠落 | 提案者プルダウン・提案者名表示に必要な `participants` の SELECT RLS が A-4 に無い | `participants` に SELECT RLS を新規追加（`share_token`/`owner_token` 保持者に開放） |
| 3 | 技術的欠落 | 提案者付け替え時、`participant_id` が同一 `event_id` に属するかの検証が無い | RLS/トリガーで、更新先 `participant_id` が対象 `event_id` に属することを検証 |

**依頼**: 上記3点を `04_data-model.md` の Candidate/Participant 定義と A-4（RLS要件）に反映。→ **反映済み。**

## 4. 未決事項の決定（本レビューで確定）

| 項目 | 決定内容 |
|---|---|
| 削除確認1回目 | 「この候補を消しますか？」→「消す」／「キャンセル」 |
| 削除確認2回目 | **「本当によろしいですか？」**→「消す」／「キャンセル」。配色はより強い警告色 |
| 候補タイトルplaceholder（アクティビティ2例目） | **ボードゲーム**で確定。全体：例）バーベキュー、ボードゲーム、体験名 など |

**依頼**: `slice-2-requirements-and-dod.md` A-5（UI要件）・B-2（完了条件）に削除確認2回目の文言を追記。→ **反映済み。**

## 5. Coworkへの依頼事項（まとめ）と反映状況

1. `04_data-model.md`：§3の指摘（created_by の NULL 許容化・participants SELECTポリシー・event_id 検証）を反映 → **反映済み**
2. `03_requirements.md`・`slice-2-requirements-and-dod.md`：削除確認2回目「本当によろしいですか？」を追記 → **反映済み**
3. `slice-2-instructions-draft.md`：新4ファイル基準の内容に置き換え、Codexプロンプト作成の土台とする → **反映済み**（Codexプロンプト＝`slice-2-codex-prompt.md`）
