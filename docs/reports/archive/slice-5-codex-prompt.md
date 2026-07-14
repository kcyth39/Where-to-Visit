# Codex 実装プロンプト: Slice 5（判断基準・❤️・🌀・コメント）

> **HISTORICAL / PARTIALLY SUPERSEDED（2026-07-11〜12・ADR-0006/0007）:** 実装済みSlice 5の指示記録。`guest_token`、現在Participant名義限定、Comment複数件モデルは[ADR-0006](../../adr/0006-collaborative-response-row-model.md)、Candidate単位の常設単一Concernは[ADR-0007](../../adr/0007-event-views-and-criterion-feedback.md)で置換済み。新規実装指示として使用しない。

作成: Cowork / 日付: 2026-07-10 / 更新: Codex（仕様確定反映） / ステータス: **文書承認済み・別部隊の実装指示として使用可**

> おしげさん承認済み（2026-07-10）。別部隊がSlice 5を実装する際の派生実行指示として使用する。詳細正本は [slice-5-requirements-and-dod.md](slice-5-requirements-and-dod.md)。矛盾時は正本を優先し、実装せず報告する。

---

## Codexプロンプト（実装部隊はここから貼り付け）

あなたは実装AI（Codex）。判断はせず正本に従う。決定権はおしげさんにある。作業リポジトリは `/Users/shige/Projects/Where-to-Visit`（branch `main`、remote `origin`）。本番 `kimenosuke.com` には実利用者がいないことを人間が再確認済みであることを前提とする。

### 0. 参照する正本（着手前に必ず読む）

- `/Users/shige/Projects/Where-to-Visit/AGENTS.md` と `CLAUDE.md`（同一）
- `/Users/shige/Projects/Where-to-Visit/docs/reports/slice-5-requirements-and-dod.md`（Slice 5詳細正本）
- `/Users/shige/Projects/Where-to-Visit/docs/03_requirements.md`（AC-5.0〜5.7）
- `/Users/shige/Projects/Where-to-Visit/docs/04_data-model.md`（Criterion / Reaction / Concern / Comment、RLS CRUD）
- `/Users/shige/Projects/Where-to-Visit/docs/05_dod.md`
- `/Users/shige/Projects/Where-to-Visit/docs/06_qa-flow.md`（S6a〜S6d）
- `/Users/shige/Projects/Where-to-Visit/docs/adr/0003-evaluation-and-decision-logic.md`
- `/Users/shige/Projects/Where-to-Visit/docs/adr/0004-permission-model.md`
- `/Users/shige/Projects/Where-to-Visit/docs/adr/0005-drop-attribute-dynamic-criteria.md`
- 既存実装パターン: `supabase/migrations/20260710000000_slice_2_candidates.sql`、`src/lib/events.ts`、`src/components/CandidateSection.tsx`、`tests/slice-2.spec.ts`

### 1. 着手前チェック（必須）

1. `pwd`、`git status --short --branch`、`git rev-list --left-right --count origin/main...HEAD` を確認する。
2. 作業フォルダ相違、Git未初期化、ahead/behindが0/0以外、working treeがcleanでない、または正本が「文書承認済み」でなければ実装せず報告する。
3. 既存migration（`20260708000000_...`／`20260710000000_...`／`20260710010000_...`）は編集しない。

### 2. スコープ

**含む**: Criterion CRUD、Reaction / Concernの付与・解除・人数・付与者一覧・他人分解除、Comment投稿・共同編集・削除、デフォルトCriterion seed / backfill、RLS・DB不変条件・DB負系テスト、375px／デスクトップ対応。

**含まない**: votes・○/−/×・確定ロジック、広告、マイイベント一覧、認証、履歴、FAQ、Criterion並び替え、Supabase Realtime購読。既存候補管理・お題作成はUI組み込みとseed追加以外は変更しない。

### 3. データベース（新規migration 1本）

`supabase/migrations/<新しいタイムスタンプ>_slice_5_criteria_reactions_concerns_comments.sql` を作る。

#### テーブル

1. `criteria`: `id / event_id / label(前後空白除去後1〜60文字) / source(default|preset|custom) / created_by(NULL可・on delete set null) / created_at`
2. `reactions`: `id / candidate_id / participant_id / criterion_id / created_at`、unique `(candidate_id, participant_id, criterion_id)`
3. `concerns`: `id / candidate_id / participant_id / created_at`、unique `(candidate_id, participant_id)`
4. `comments`: `id / candidate_id / participant_id(NULL可・on delete set null) / text / created_at`

#### Criterion順序・更新列

- labelは前後空白を除去して保存し、DBでも空白のみと60文字超を拒否する。
- 順序列を追加しない。`created_at ASC, id ASC` で取得し、編集後も位置を変えない。
- CriterionのUPDATE可能な業務列は `label` だけ。`id / event_id / source / created_by / created_at` は変更不可。
- seed / backfillは `created_by=NULL`。ユーザー追加ではCriterion追加だけを理由にParticipantを生成せず、同一eventの現在Participantが既にいればそのID、いなければNULLを専用DB関数等でDB側が決定する。クライアントが `created_by` を指定するINSERTはエラーとして拒否し、作成後も変更させない。

#### Comment本文・更新列

- アプリで前後空白除去後、Unicodeコードポイント数1〜500を検証する。JavaScriptの `string.length` を使わない。
- DB層でもINSERT / UPDATE前にアプリと同じ前後空白除去を行って正規化後のtextだけを保存し、その `char_length(text)` が1〜500であることを制約で保証する（空白のみは正規化後0文字として拒否）。
- CommentのUPDATE可能な業務列は `text` だけ。投稿者名義・candidate・created_atを変更不可とする。

#### 同一event・操作名義

- Reactionのcandidate / participant / criterion、ConcernとCommentのcandidate / participantが同一eventであることをDBで保証する。
- Reaction / Concern / CommentのINSERTは、呼出元 `guest_token` に対応する現在Participant名義だけを許可する。
- Reaction / ConcernはUPDATEなし。INSERTとDELETEだけで状態を変更する。

#### 最終RLS CRUD

`event accessible` は有効な `share_token` または `owner_token` を持つ状態。変更操作は `share_token` 限定。

| 対象 | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| criteria | event accessible | share_token限定 | share_token限定・`label`のみ | share_token限定 |
| reactions | event accessible | share_token限定・現在Participant名義のみ | 操作なし | share_token限定・対象名義を問わない |
| concerns | event accessible | share_token限定・現在Participant名義のみ | 操作なし | share_token限定・対象名義を問わない |
| comments | event accessible | share_token限定・現在Participant名義のみ | share_token限定・`text`のみ | share_token限定 |

- `owner_token` 単独のINSERT / UPDATE / DELETEを拒否する。owner編集画面の共同編集も `share_token` を使う。
- 列単位GRANTを使う。Reaction / ConcernへUPDATE権限を付与しない。
- 列単位GRANTだけに依存せず、RLS・制約・トリガーまたは専用DB関数で不変列・同一event・現在Participant名義を保証する。
- 新規 `security definer` 関数は `search_path` を固定し、既存と同じrevoke / grant execute規則に従う。

#### seed / backfill

- 新規イベント: event・owner紐付け後に `興味ある？ / default / created_by=NULL` を1件作成する。
- 既存イベント: Criterionが0件のeventだけに同じ行をmigration内DMLで投入する。

### 4. アプリケーション・UI

- `src/lib/events.ts` または責務別の新規libに、4テーブルの取得・変更処理を実装する。
- EventViewModelへCriterion / Reaction / Concern / Commentと現在Participant判定に必要な情報を追加する。
- Criterionは `created_at ASC, id ASC` で取得する。並び替えUIは作らない。
- Criterionのプリセットとtrim後完全一致するlabelが1件以上あれば該当ボタンを隠し、全件削除後に再表示する。自由記述重複は許容し、idで操作する。
- Criterion削除は既存候補削除の2段階・配色差パターンを共通化して使う。編集確認は既存の「変更します、よろしいですか？」を使う。
- ❤️・🌀チップ本体は現在の自分だけを確認なしでトグルする。付与者一覧の開閉操作をチップ本体と分ける。
- 付与者一覧は候補カード内のインライン表示または軽量ポップオーバーとし、他Participant行に「外す」を設ける。個別詳細画面は作らない。
- 他人名義の新規付与UIを作らない。他人分解除履歴も作らない。
- Comment投稿時に現在Participantをensureし、本文をtrimしてコードポイント数を検証する。UIには「500文字まで」とだけ表示する。
- Comment編集は編集モード内の「保存」「キャンセル」で完結し、確認ダイアログを出さない。投稿者名義は変えない。削除は1段階確認。
- 既存schemaに `updated_at` がないため、「編集済み」表示のための列・履歴を追加しない。
- すべての操作はサーバー成功後、ページ再読み込みなしで人数・一覧・入力状態へ反映する。失敗時は成功状態を残さずユーザー向けエラーを表示する。
- Supabase Realtimeのpublication・購読・別タブ同期を実装しない。

### 5. 検証

- 新規 `tests/slice-5.spec.ts` にUI E2EとDB負系を追加する。DB負系は既存 `tests/slice-2.spec.ts` のSupabase anon client直接検証パターンを使い、service roleは使わない。
- Participant DELETEのようにanonでは実行できない特権操作は自動テストに含めず、migration適用後にSQL EditorでFKのdelete actionを確認する。

#### E2E

- Criterion: seed、backfill、追加時Participant非生成、既存Participant / NULLの `created_by`、プリセット＋自由記述、編集、2段階削除、0件許容。
- Criterion重複・順序: trim一致時のプリセット非表示／全件削除後再表示、自由記述重複、id単位操作、`created_at ASC, id ASC`、再読込後維持、label編集後位置不変、並び替えUIなし。
- Reaction / Concern: 自分の新規付与・解除、他人名義付与UIなし、人数・付与者名・自分の視覚区別、一覧から他人分解除、確認なし。
- fresh guest: 最初のReaction / Concern / Comment操作でParticipantを1件生成し、後続操作で重複生成しない。
- Comment: 任意投稿、投稿者名、1／500コードポイント受理、空白のみ／501拒否、サロゲートペアを含む500文字、UIは「500文字まで」のみ、保存／キャンセル、確認なし、名義不変、1段階削除。
- owner編集画面: 画面が取得したshare_tokenを使い、4テーブルの共同編集操作が成功する。
- 成功後のページ再読み込みなし反映、失敗時の表示復元・エラー。
- 375×812、1366×768、Slice 1・2回帰、`[E2E]` マーカー、Slice 5実DBケースのskip 0件。

#### DB負系

- share / owner SELECT成功、tokenなし・不正・別eventでは非公開。
- 全変更はshareだけ成功し、owner単独・tokenなし・不正・別event tokenを拒否。
- Criterionのクライアント指定 `created_by` INSERT、空白のみ／61文字label、許可外source、不変列UPDATEを拒否し、Commentの `text` 以外UPDATEも拒否する。
- Reaction / Concern / Commentの他人名義INSERT、別event参照を拒否し、新規Commentの `participant_id=NULL` も拒否する。
- Reaction / Concernの重複・UPDATEを拒否し、share保持者による他人行DELETEは成功。
- DB直接操作でもCommentの空白のみ／501文字を拒否し、500文字を受理。
- Criterion / Candidate削除時のcascadeを確認し、Participant参照のcascade / set null設定はmigration適用後のschemaをSQL Editorで確認する。
- RLS拒否が0件操作になる場合も、正規shareクライアントで再読込して不変を確認する。

#### コマンド

- `npm run check`
- `npm run build`
- migration適用後に `npm run test:e2e`（Slice 5実DBケースのskip 0件）
- `git diff --check`

矛盾・曖昧があれば実装せず停止する。Auth・service role・local JSON fallbackを使わない。依存はバージョン固定。

### 6. 実装・本番反映順序（人間承認ゲートあり）

1. 文書承認済み・clean・0/0を確認する。
2. backfill確認対象の既存 `[E2E]` eventを記録する。
3. migration・アプリ・E2E・DB負系テストを作成する。
4. `npm run check` / `npm run build` を通す。
5. **【人間操作】** おしげさんがSupabase SQL Editorでmigrationを適用する。
6. DB構造・権限・不変条件・backfillを検証する。
7. `npm run test:e2e` と回帰を実行し、skip 0件・greenを確認する。
8. `git diff --check` と変更範囲を確認し、実DB検証後に最終commitする。まだpushしない。
9. 結果と変更ファイルを報告し、おしげさんのpush承認を待つ。
10. 承認後にpushし、本番で主要動線をsmoke確認する。

### 7. 完了報告

1. コミットハッシュ
2. migration名
3. 変更ファイル一覧
4. `check` / `build` / `test:e2e` / DB負系 / `diff --check` の結果とskip件数
5. Criterion順序・不変列・token境界の確認結果
6. 本番smoke結果
7. 未解決事項（あれば）

（プロンプトここまで）
