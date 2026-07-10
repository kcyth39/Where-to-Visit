# Slice 2 実装差分書（正本反映待ち）

作成: Codex / 日付: 2026-07-10

## 位置づけ

この文書は Slice 2 の実装に先立ち、既存の正本ドキュメントと、おしげさんが 2026-07-10 に確定した実装判断との差異を記録する暫定の実装根拠である。

- 既存正本はこの時点では編集しない。
- Slice 2 の実装中は、本書に記載する差分を既存正本より優先する。
- Slice 2 の動作・E2E結果を確定した後、本書を基に各正本へ反映し、項目ごとに消し込む。
- 本書は仕様の追加提案ではなく、今回の会話で確定した判断と既存記述の差異の記録である。

## 差分一覧

| 項目 | 既存正本の記述 | Slice 2 で採用する実装 | 後で反映する正本 |
|---|---|---|---|
| トップの入力順 | `ui-copy-decisions.md` は属性選択を先に置く | **お題 → どんなこと？（属性）→ メモ → お名前** の順に表示する | `ui-copy-decisions.md` |
| トップの属性 | 属性選択は先頭で、お題placeholderを属性で切り替える | 属性は**お題の次**に置く。作成時に必須とし、選択後にお題placeholderを切り替える | `ui-copy-decisions.md` |
| トップのお名前 | Slice 1実装では必須。正本で任意性の明記が弱い | **空欄可**。作成時に表示名を必須にしない | `03_requirements.md`、`04_data-model.md`、`ui-copy-decisions.md` |
| 属性の保存値と表示 | 属性の論理値と表示ラベルが定義済み | 保存値は `アクティビティ / 食事 / 宿泊 / そのた` のまま。表示は `みんなでやること / たべたりのんだり / とまるところ / ほかのこと` のまま | 変更不要（実装と照合） |
| 提案者名の表示時期 | `ui-copy-decisions.md` は表示名が実際に出るのは Slice 3以降とする | Slice 2で候補ごとに提案者名を表示する。未設定は `ー` とする | `ui-copy-decisions.md` |
| 漢字優先UI文言 | 漢字優先化の改訂が未反映の初版実装が残る | `みんなに聞いてみよう！`、`作ってます`、`直せます`、`直す`、`保存`、`みんなに送るリンク`、`保存しました！` など、`ui-copy-decisions.md` の漢字優先化改訂を反映する | 実装後に正本と照合 |
| イベント編集の確認 | Slice 1実装に確認ステップがない | お題・メモの保存前に `変更します、よろしいですか？` を表示し、確認後に更新する | `03_requirements.md`、`ui-copy-decisions.md` |
| 候補追加 | Slice 2正本に定義済み | タイトルまたはURLの少なくとも一方を必須とする。お名前は任意で、追加時の確認は行わない | 実装と照合 |
| 候補の提案者 | Slice 2正本に定義済み | Participantを必要に応じて生成して `created_by` に自動設定する。再追加時にお名前があれば同一 `guest_token` の表示名を更新する | 実装と照合 |
| 候補編集と削除 | Slice 2正本に定義済み | タイトル・URL・提案者は要素ごとに `変更します、よろしいですか？` を確認する。削除は `この候補を消しますか？` → `本当によろしいですか？` の2段階とし、2回目を強い警告色にする | 実装と照合 |
| `created_by` の整合性 | Slice 2正本に定義済み | `participants(id)` へのFKは `ON DELETE SET NULL`。`created_by` の更新先は `NULL` または同一 `event_id` のParticipantだけにDBガードで制限する | 実装と照合 |
| RLS | Slice 2正本に定義済み | Auth・service roleを使わず、share/owner tokenとguest tokenの既存方式に沿って `participants` と `candidates` の必要最小限のselect/insert/update/deleteを許可する | 実装と照合 |
| テストデータ | Slice 2準備決定に定義済み | E2Eが作るイベント名・候補タイトル・お名前に `[E2E]` を付け、後でSQLで識別して削除可能にする | 実装と照合 |

## 実装上の境界

- 既存の Slice 1 migration `20260708000000_slice_1_events_participants.sql` は変更しない。
- Slice 2は新規migrationで `participants.display_name` の任意化、`candidates`、RLSポリシー、`created_by` 整合性ガードを追加する。
- `votes` テーブル、○/−/×の評価操作、確定ロジック、❤️、🌀、コメント、広告、マイイベント一覧は本差分書の対象外であり、Slice 2では実装しない。
- local JSON fallbackは追加しない。Supabase Authおよびservice role keyは使わない。

## 正本反映時の確認

1. `ui-copy-decisions.md` のトップ入力順と表示名のSlice 3以降という記述を更新する。
2. `03_requirements.md` と `04_data-model.md` にトップのお名前任意を明記する。
3. 実装済みの画面文言・候補権限・RLS・migration・E2E結果が正本と一致することを確認する。
4. 本書の各行を消し込み、正本反映の記録として残す。
