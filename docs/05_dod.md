# 05 DoD（きめのすけ）

作成日: 2026-07-08 / 最終改訂: 2026-07-11 / フェーズ: Phase 2（品質定義）

関連: [03_requirements.md](03_requirements.md) / [04_data-model.md](04_data-model.md) / [06_qa-flow.md](06_qa-flow.md) / [ADR-0006](adr/0006-collaborative-response-row-model.md) / [共同編集型・回答者行モデル 詳細DoD](reports/collaborative-response-row-dod-2026-07-11.md)

> ADR-0006移行の詳細チェック項目は上記詳細DoDを正とする。本書はリリース判断に必要な要約ゲートである。

---

## 1. 文書・スコープ

- [ ] ADR-0006と`03`〜`06`、AGENTS.md / CLAUDE.mdが同期している
- [ ] 旧Slice 2 / 5文書のguest_token本人モデルへ部分SUPERSEDED注記がある
- [ ] 「Vote行なし＝−」「未評価と能動−を区別しない」「owner_participant_idでowner判定」という生きた正本記述がない
- [ ] 既存適用済みmigrationを編集していない
- [ ] Supabase Auth、service role、local JSON fallback、依存更新を追加していない

## 2. Owner・Participant

- [ ] Event作成時にParticipantを生成しない
- [ ] owner権限を`owner_token`だけで判定し、Event path限定HttpOnly Cookieで回復・保持できる
- [ ] `events.owner_participant_id`と`participants.guest_token`を撤去している
- [ ] Participantはtrim後1〜60文字・Event内完全一致名禁止・`created_at ASC, id ASC`である
- [ ] 既存行選択、非IME Enter、モバイル完了、通常blur、同名確認、名前変更、2段階削除が要件どおり動く
- [ ] 単一の名前確定処理と優先順位により、明示操作起因blur・連打・失敗後の保留操作を二重実行しない
- [ ] `kimenosuke:selected-participant:<event_id>`をshare / owner URLで共用し、不在行を自動解除する

## 3. Data・RLS

- [ ] `votes`が`text + CHECK(positive / neutral / veto)`、Candidate×Participant一意、timestamp列なしで作成されている
- [ ] CommentがCandidate×Participant一意、Participant NOT NULL・ON DELETE CASCADEである
- [ ] Participant削除でVote / Reaction / Concern / Commentをcascadeし、Candidate / Criterion `created_by`をNULLにする
- [ ] Candidate / Participant / Criterionの同一Event整合性をDBで保証する
- [ ] exposed tableのRLS、列単位GRANT、security definer関数の固定`search_path`とEXECUTE制限がある
- [ ] tokenなし、不正token、別Event ID、同名、重複、不変列更新をDBで拒否する

## 4. UI・読取モデル

- [ ] Candidateカード内に全回答者行を表示し、非選択行はread-only、選択行だけ編集可能である
- [ ] Candidate×Participantを`unrated / positive / neutral / veto`へ必ず正規化し、raw row absenceをcomponentが解釈しない
- [ ] Vote行なしと能動−を表示でも区別する
- [ ] Commentは1回答者・1Candidateにつき現在値1件で、会話・履歴UIがない
- [ ] Candidate全体の❤️はReaction行数、🌀はConcern行数を単純合計し、最終候補状態へ使わない
- [ ] `Candidate.created_at`だけを相対表示し、未来時刻は経過0へclampして「1時間以内に追加」とする
- [ ] Vote / Reaction / Concern / Commentの時刻をユーザー表示せず、相対表示用timer・pollingを追加していない

## 5. 最終候補状態

- [ ] `clear / discussion / fallback / none`をpure functionまたは読取モデル境界で一意に算出する
- [ ] clearがある場合、○最多未満の×なし候補をfallbackにしない
- [ ] clearがなく、○最多に×があり、○最多未満に×なし候補がある場合だけ安全候補群の○最多をfallbackにする
- [ ] 同率は並列、○最多同率の×なし / ×ありはclear / discussionへ分ける
- [ ] 全候補○0はnone
- [ ] 色だけでなく状態ラベルまたはアイコン等を併用し、全候補を常時表示する
- [ ] 確定ボタン、確定状態、ロックを追加していない

## 6. 同期・失敗

- [ ] 初期表示とローカルmutation成功後に完全EventStateを取得する
- [ ] 成功時はページ再読み込みなしで置換し、失敗時は直前状態・入力draft・エラーを保持する
- [ ] 別タブ・別ブラウザの変更は次のローカル成功操作または手動再読み込み・再訪で取り込む
- [ ] Realtime、定期polling、focus復帰時の自動取得を追加していない

## 7. QA・リリース

- [ ] `npm run check`、`npm run build`、`git diff --check`がPASS
- [ ] 新規pure unit、DB/RLS負系、375×812 / 1366×768 E2Eがgreen
- [ ] Slice 1 / 2 / 5回帰がgreenで、意図しないskipがない
- [ ] 実DBmigrationをpreflight / postflight付きで適用し、実DBE2Eがgreen
- [ ] コードベースワイヤーフレームと実画面を人間確認し、exact color・状態ラベル・アイコン・追加時刻コピーを承認
- [ ] E2Eデータへ`[E2E]`マーカーを付け、承認済みSQLでcleanup済み
- [ ] commit / push / Vercel本番確認をそれぞれ明示承認ゲートで行う

## 8. MVP共通

- [ ] 375pxとデスクトップで表示崩れ・横overflow・重なりなし
- [ ] エラー時にユーザー向けメッセージを表示し、白画面にならない
- [ ] `noindex` metadataと`robots.txt`を維持する
- [ ] オーナー編集URLでCookie消失・別ブラウザから権限回復できる
- [ ] 利用規約・プライバシーポリシー・広告・計測は各対象スライスのリリースDoDで確認する
