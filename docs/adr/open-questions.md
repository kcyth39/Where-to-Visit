# 未決事項リスト（Open Questions）

最終更新: 2026-07-11 / 決定者: おしげさん
Chat が論点を洗い出し、おしげさんが決定し、Cowork がここと ADR に反映する。
決定済の項目は「決定済（ADR-XXXX参照）」と記載し、詳細は該当 ADR を正本とする。

> 統合決定サマリ（2026-07-08）により Blocker・N1/N2・Should・Could の大半が決着済み。

---

## Blocker（B1〜B8）— 評価モデル・確定ロジック

| ID  | 論点           | 状態                                                                                             |
| --- | ------------ | ---------------------------------------------------------------------------------------------- |
| B1  | 決定に関与する評価の種類 | 決定済（[ADR-0003](0003-evaluation-and-decision-logic.md)）— 総合評価 ○/−/× のみ                          |
| B2  | 「確定」の扱い方     | 決定済（[ADR-0003](0003-evaluation-and-decision-logic.md)）— 確定行為は扱わず、最終候補状態を自動ハイライトのみ                 |
| B3  | ○数が同数の場合の表示  | 決定済（[ADR-0003](0003-evaluation-and-decision-logic.md)）— 並列表示                                   |
| B4  | 最終候補の判定条件    | 決定済（[ADR-0003](0003-evaluation-and-decision-logic.md)・[ADR-0006](0006-collaborative-response-row-model.md)）— ○数と×有無からclear / discussion / fallback / noneを導出し、全候補を可視化     |
| B5  | ×→−変更の権限と履歴  | 決定済（[ADR-0004](0004-permission-model.md)）— 誰でも可・履歴なし（最終）                                       |
| B6  | 確定状態・ロックの有無  | 決定済（[ADR-0003](0003-evaluation-and-decision-logic.md)）— 確定状態なし＝ロックなし                           |
| B7  | 各評価の可視性      | 決定済（[ADR-0003](0003-evaluation-and-decision-logic.md)）— ○・−・× いずれも付与者を全員公開（マトリクス表示）、❤️・🌀も付与者公開              |
| B8  | デフォルトと未評価の扱い | 決定済（[ADR-0003](0003-evaluation-and-decision-logic.md)・[ADR-0006](0006-collaborative-response-row-model.md)）— Vote行なし＝未評価、neutral行＝能動−として区別し、全Participant×Candidateを読取モデルで生成 |

## Negative（N1〜N2）— 否定的・補足意見の表明

| ID | 論点 | 状態 |
|---|---|---|
| N1 | コメントの位置づけ | 決定済（[ADR-0003](0003-evaluation-and-decision-logic.md)）— 任意・入力を促さない |
| N2 | 却下未満の懸念表明手段 | 決定済（[ADR-0003](0003-evaluation-and-decision-logic.md)）— 🌀（単一）＝非決定のネガ懸念 |

## Should（S1〜S7）— 権限モデル

| ID | 論点 | 状態 |
|---|---|---|
| S1 | 候補削除の権限 | 決定済（[ADR-0004](0004-permission-model.md)）— 誰でも可＋2重確認ダイアログ |
| S2 | 表示名の入力タイミング | 決定済（[ADR-0004](0004-permission-model.md)・[ADR-0006](0006-collaborative-response-row-model.md)）— Event詳細の回答者セレクターで非IME Enter / モバイル完了 / 通常blur時に確定。トップ・候補追加フォームには置かない |
| S3 | 重複投票の防止 | 決定済（[ADR-0004](0004-permission-model.md)）— MVPでは割り切り（ログイン不要の帰結） |
| S4 | コメント編集の権限 | 決定済（[ADR-0004](0004-permission-model.md)）— 誰でも可 |
| S5 | ×解消（×→−）の履歴表示 | 決定済（[ADR-0004](0004-permission-model.md)）— **履歴表示なし**（性善説。旧 G-3 は撤回） |
| S6 | 候補編集の権限 | 決定済（[ADR-0004](0004-permission-model.md)）— 誰でも可 |
| S7 | ゲストの候補追加可否 | 決定済（[ADR-0004](0004-permission-model.md)）— オーナー・ゲスト双方が可（固定仕様） |

## Could（C1〜C4）— 非機能・ライフサイクル

| ID | 論点 | 状態 |
|---|---|---|
| C1 | イベントの保存期間 | 決定済（[03_requirements 非機能](../03_requirements.md#4-非機能要件)）— 無期限保存。ADR化しない |
| C2 | 候補数・参加者数の上限 | 決定済（[03_requirements 非機能](../03_requirements.md#4-非機能要件)）— 技術上限のみ（明示上限なし）。ADR化しない |
| C3 | 検索エンジンからの可視性 | 決定済（[03_requirements 非機能](../03_requirements.md#4-非機能要件)）— 非インデックス（URLはランダム長トークンで秘匿）。ADR化しない |
| C4 | イベント削除機能 | 決定済（[03_requirements 非機能](../03_requirements.md#4-非機能要件)）— 削除機能なし。ADR化しない |

---

## 残る要確認・文書化タスク

| # | 項目 | 状態 |
|---|---|---|
| OQ-1 | primary（正）ドメインの選定 | 決定済（[ADR-0001](0001-go-decision.md)）— **`kimenosuke.com` を正規**とし、`.jp` / `.net` はリダイレクト |
| OQ-2 | S5 の論点内容の確認 | 解消済 — S5＝×解消の履歴表示。上表のとおり決定済 |
| OQ-3 | C1〜C4（非機能）の ADR 化 | 決定済 — **ADR化せず** `03_requirements.md` 非機能要件に集約 |

---

> 決定したら該当行を「決定済（ADR-XXXX参照）」に更新し、対応する `docs/adr/000X-<slug>.md` を作成・リンクする。
> 実装（Codex）は未決・要確認項目に依存する部分を勝手に決めず、質問リストとして返すこと。

> **全項目決着済み（2026-07-11・ADR-0006反映）。** 新たな論点が出たら本リストに追記する。
