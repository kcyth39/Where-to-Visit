# Slice 2 実装指示（候補管理）— 新4ファイル基準

> **HISTORICAL / PARTIALLY SUPERSEDED（2026-07-11・ADR-0006）:** 本書は旧実装指示ドラフト。`guest_token`、候補追加時のお名前、Participant暗黙生成・提案者自動設定は[ADR-0006](../../adr/0006-collaborative-response-row-model.md)で置換済み。現行仕様の判断には使用しない。

作成: Cowork / 日付: 2026-07-09 / ステータス: **記録（Slice 2 実装の土台・実装済み）**
> **位置づけ（2026-07-10）**: Slice 2（候補管理）は既にローカル実装済み。本書はその**実装の土台メモ（記録）**であり、**これ自体が能動的な実装指示ではない**。
> - **Slice 2 の仕様正本**＝[slice-2-requirements-and-dod.md](slice-2-requirements-and-dod.md)（v3・ADR-0005反映済み）。
> - **今後の実装指示**＝別途作成する「**属性撤去＋案2でpush**」プロンプト（それが唯一の実装指示）。旧 [slice-2-codex-prompt.md](slice-2-codex-prompt.md) は廃止。
> - 属性連動placeholder等、ADR-0005前の記述が残る箇所は履歴として読むこと。

## 参考正本（仕様の根拠）

- **[slice-2-requirements-and-dod.md](slice-2-requirements-and-dod.md)（v3）** — Slice 2 の要件・DoD・UI文言の正本。
- [04_data-model.md](../../04_data-model.md)（Candidate/Participant・RLS要点）／[03_requirements.md](../../03_requirements.md) §2（AC-2.1〜2.6）／[ADR-0004](../../adr/0004-permission-model.md)（権限）。
- UI文言方針: [ui-copy-decisions.md](../ui-copy-decisions.md)（漢字優先化）。決定経緯: [slice-2-decisions-2026-07-09.md](slice-2-decisions-2026-07-09.md)／本レビュー反映。

## 旧ドラフトからの主な変更（要注意点）

| 項目 | 旧 | 新（正） |
|---|---|---|
| タイトル/URL | タイトル必須＋URL任意 | **どちらか一方でOK**（`CHECK(title or url)`） |
| お名前 | 初回に入力必須 | **任意**（空でも追加可・**再追加時のお名前入力で上書き更新**＝専用編集UIなし） |
| 提案者 | 言及なし | **表示・自動紐づけ・プルダウン編集**（新規スコープ） |
| 編集確認 | なし | 要素ごとに「**変更します、よろしいですか？**」 |
| 削除確認 | 「2重確認」のみ | **1回目「この候補を消しますか？」／2回目「本当によろしいですか？」**（2回目は強い警告色） |
| Slice 1波及 | なし | **`EventView`（イベント名・メモ編集）にも変更確認**を統一適用 |
| UI文言 | ひらがな案 | 漢字優先化後の確定文言 |

## スコープ

- **In**: 候補の追加／一覧／編集（タイトル・URL・提案者）／削除（2段階確認）／提案者の表示・編集、候補追加に伴うゲスト参加（Participant自動生成・お名前任意）。
- **Out**: 評価 ○/−/×（Slice 3・**評価操作UIを一切作らない**）／確定ロジック／❤️/🌀・コメント／広告／マイイベント一覧／ログイン／URLからの名称自動導出。

## 先行タスク（同一実装バッチ・Slice 1へ）

1. **漢字優先化 改訂**（[ui-copy-decisions.md](../ui-copy-decisions.md) §漢字優先化 改訂）＋対応E2E更新。
2. **`EventView` のイベント名・メモ編集に「変更します、よろしいですか？」確認を追加**（全編集で統一）。

## データ／RLS（新規 migration・既存は編集しない）

- **candidates**: `id / event_id(FK→events, on delete cascade) / title(NULL可) / url(NULL可) / created_by(FK→participants, NULL可, ON DELETE SET NULL) / created_at`。制約 `CHECK(title IS NOT NULL OR url IS NOT NULL)`。提案者「ー」＝`created_by NULL`。
- **participants ポリシー**: ①ゲスト参加 insert（`guest_token` 一致・event が `share_token` で解決可能）②**SELECT 追加**（`share_token`/`owner_token` 保持者に開放＝提案者表示・プルダウン用）。display_name は任意。**候補追加時にお名前入力があれば同一 `guest_token` の display_name を upsert（上書き）**（専用の名前編集UIは作らない・再追加が実質の後編集）。
- **candidates ポリシー**: select（`share_token`/`owner_token`）／insert（有効 `guest_token` の Participant 存在・`created_by` 一致）／update・delete（`share_token` を知る全員＝B案。delete 新規作成）。
- **提案者付け替え検証**: `created_by` 更新先は **NULL** または **同一 `event_id` の Participant** のみ（RLS/トリガー）。

## UI（確定文言・漢字優先化）

- 見出し「候補を追加」／タイトル placeholder＝**「例）候補の名前 など」**（汎用・属性撤廃 [ADR-0005](../../adr/0005-drop-attribute-dynamic-criteria.md)）／URL placeholder「リンク」／追加ボタン「追加」／お名前「お名前（任意）」。
- 提案者表示「提案: {お名前}」・未設定「ー」。提案者編集＝プルダウン（既存参加者＋「ー」）。
- 編集確定時「変更します、よろしいですか？」（候補のタイトル/URL/提案者＋イベント名/メモ）。
- 削除2段階：1回目「この候補を消しますか？」／2回目「本当によろしいですか？」（強い警告色）／「消す」「キャンセル」。
- 「タイトルかリンクどちらかでOK・候補はいつでも追加できます（未評価・未参加でも）」を適切な位置に明示。オーナー/ゲスト同一レイアウト。「候補」は漢字。

## テスト／DoD

- [05_dod.md](../../05_dod.md) スライスDoD＋[slice-2-requirements-and-dod.md](slice-2-requirements-and-dod.md) B。**QA S2**: `votes` は Slice 3 のため「vote行なし＝−」は照会しない。代わりに **candidates/participants/提案者(created_by) がDBに作られること** ＋ **評価操作UIが無いこと** を検証（「vote行なし＝−」の照会は Slice 3 へ持ち越し）。E2Eに title-only/url-only/両方・編集の変更確認・削除2段階・提案者自動設定/プルダウン編集を追加。S1回帰 green。`check`/`build`/`test:e2e` pass。

## テストデータ方針（A案）

- 識別マーカー（例: タイトル/お名前に `[E2E]`）を付け、SQLで一括削除。認証導入スライスでB案（別Supabaseプロジェクト）へ移行。

## 制約・リリース

- 仕様を勝手に変えない。曖昧・矛盾は実装せず質問して停止。スコープ外に触れない。local JSON fallback禁止・Auth不使用・依存バージョン固定。
- **push はしない**（Slice 1＋2 まとめて後日デプロイ）。着手前に `git status` 確認。
