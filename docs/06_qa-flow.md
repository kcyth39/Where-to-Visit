# 06 QAフロー（きめのすけ）

作成日: 2026-07-08 / 最終改訂: 2026-07-11 / フェーズ: Phase 2（品質定義）

関連: [05_dod.md](05_dod.md) / [03_requirements.md](03_requirements.md) / [ADR-0003](adr/0003-evaluation-and-decision-logic.md) / [ADR-0004](adr/0004-permission-model.md) / [ADR-0006](adr/0006-collaborative-response-row-model.md) / [共同編集型・回答者行モデル 詳細QA](reports/collaborative-response-row-qa-2026-07-11.md)

> 詳細なunit / E2E / DB負系ケースとIDは上記詳細QAを正とする。

---

## 1. フロー

1. **着手前:** `pwd`、branch、remote、ahead/behind、`git status`、AGENTS.md / CLAUDE.md一致を確認する。
2. **docs gate:** ADR-0006と正本、旧Slice文書のSUPERSEDED境界を横断検索する。
3. **実装前:** 実DBcleanupのpreflight対象を記録し、コード・migration適用前のrollback点を確保する。
4. **local gate:** `npm run check`、`npm run build`、`git diff --check`を通す。
5. **migration gate:** 新規SQLだけを人間がSupabase SQL Editorで適用し、RLS、policy、grant、trigger、FK、indexをpostflight確認する。
6. **実DB E2E:** Slice 1 / 2 / 5回帰と新規シナリオを実行する。
7. **visual QA:** 375×812と1366×768のスクリーンショットを確認する。
8. **publish gate:** テスト結果と差分を報告し、commit、push、Vercel確認を別々に承認する。

失敗時は追加修正を重ねる前に、原因、影響範囲、DB状態を報告する。既存migration編集、逆migration、force pushを行わない。

---

## 2. 主要QAシナリオ

| ID | シナリオ |
|---|---|
| S1 | お題・メモを作成し、Participant 0件のまま共有URL＋owner URLを発行。owner path Cookieとowner URLで編集権限を回復 |
| S2 | 名前入力だけを非IME Enter / モバイル完了 / 通常blurで確定し、評価なしでもParticipantを1件作成 |
| S3 | 同名確認で本人なら既存行、別人なら異なる名前を要求。同時UNIQUE競合でも同名確認へ遷移 |
| S4 | 未選択の個人名義操作を保留し、Participant解決後に一度だけ再開。明示操作起因blurと連打で二重実行なし |
| S5 | Candidate / Criterion追加はdraftなし・未選択なら`created_by=NULL`、selected行があればそのID、非空draftなら解決後のID |
| S6 | Candidateカード内に全回答者行。非選択行はread-only、選択clickは値を変えず、選択行だけ編集controlを表示 |
| S7 | Vote行なしを未評価、`neutral`行を能動−として区別し、○ / − / ×を1行upsert。raw duplicate INSERTはUNIQUE拒否 |
| S8 | Candidate×ParticipantのCommentを最大1件に保ち、明示保存で上書き、空保存で削除 |
| S9 | ❤️はReaction行数、🌀はConcern行数を単純合計し、付与者とともに表示。最終候補判定へ不使用 |
| S10 | clear / discussion / fallback / noneの全分岐、同率、混在タイ、○0、clear存在時のfallback抑止をpure unitで検証 |
| S11 | `Candidate.created_at`の0秒、60分、24時間、未来時計ズレを固定clockで検証。未来は0へclamp |
| S12 | Participant / Candidate / Criterion削除時のcascade / set null、別Event参照、不変列、RLS、GRANTをanon clientで検証 |
| S13 | mutation成功後にページ再読み込みなしで完全状態へ置換し、失敗時は直前状態とdraftを保持 |
| S14 | share URL / owner URLでevent ID固定localStorageキーを共用し、削除済み行を自動解除 |
| S15 | 375×812と1366×768でoverflow・重なりなし。非選択コメント3行clamp、選択後全文を確認 |

---

## 3. Candidate作成相対時刻

全ケースでブラウザ時計を固定する。

| 経過 | 期待 |
|---:|---|
| `created_at`が現在より未来 | `max(0, now - created_at)`で0へclampし「1時間以内に追加」 |
| 0〜59分59秒 | 1時間以内に追加 |
| 60分〜23時間59分 | 切り捨てたN時間前に追加 |
| 24時間〜47時間59分 | 1日前に追加 |
| 48時間以上 | 切り捨てたN日前に追加 |

Candidate編集後も元の`created_at`を維持する。Vote / Reaction / Concern / Commentの時刻は試験・表示対象にしない。

---

## 4. 最終候補判定の代表例

| 候補 | 期待 |
|---|---|
| A ○5×0、B ○3×0 | A clear、B none |
| A ○5×0、B ○5×0 | A/B clear |
| A ○5×1、B ○3×0、C ○1×0 | A discussion、B fallback、C none |
| A ○5×1、B ○3×0、C ○3×0 | A discussion、B/C fallback |
| A ○5×0、B ○5×1、C ○4×0 | A clear、B discussion、C none |
| A ○5×2、B ○3×1 | A discussion、B none、fallbackなし |
| 全候補○0 | 全候補none |

大量の❤️・🌀を追加しても判定結果が変わらないことを確認する。

---

## 5. Migration / 実DBゲート

- cleanup対象Event ID・件数をpreflightで記録する。
- destructive SQL、削除順、対象限定条件、rollback点を実行前に提示する。
- 新規migration適用後、owner参照撤去、Participant制約、Vote、Comment一意性、RLS、policy、grant、trigger、FK delete action、indexを確認する。
- 実DBE2EデータへEvent・Candidate・Participant・Commentの`[E2E]`マーカーを付ける。
- E2E後、作成件数とIDを報告し、人間承認後のcleanup SQLで削除する。

---

## 6. 合格報告

- E2E総数 / PASS / FAIL / SKIP、skip対象名と理由
- Slice 1 / 2 / 5回帰結果と新規シナリオ結果
- `check / build / diff --check`
- migration名と実DBpostflight結果
- 375px / 1366px目視結果
- 変更ファイル、working tree、commit / push未実行または実行済み状態
