# Slice 5 要件定義 ＆ DoD（判断基準・❤️・🌀・コメント）

作成: Cowork / 日付: 2026-07-10 / 更新: Codex（仕様確定反映） / ステータス: **承認済み実装正本（おしげさん承認・2026-07-10）**

正本参照: [03_requirements §2 スライス5](../03_requirements.md) ／ [04_data-model](../04_data-model.md) ／ [ADR-0003](../adr/0003-evaluation-and-decision-logic.md) ／ [ADR-0004](../adr/0004-permission-model.md) ／ [ADR-0005](../adr/0005-drop-attribute-dynamic-criteria.md) ／ [05_dod](../05_dod.md) ／ [06_qa-flow](../06_qa-flow.md)

> 本書はおしげさん承認済みのSlice 5詳細実装正本。実装部隊は派生指示 [slice-5-codex-prompt.md](slice-5-codex-prompt.md) と併せて使用し、矛盾時は本書を優先する。

## 確定事項（2026-07-10）

- コメント（AC-5.5/5.6）も本バッチに含める。
- デフォルト判断基準「興味ある？」も例外なく編集・削除でき、Criterionが0件になってもよい。
- Reaction / Concernの新規付与は現在の自分名義だけ。共有URL保持者は付与者一覧から既存の他人分を解除できるが、他人名義で新規付与しない。
- Criterion追加だけを理由にParticipantを生成しない。既存の現在Participantがあれば `created_by`、いなければNULLとする。
- 4テーブルのSELECTはevent accessible、変更操作は `share_token` 限定。`owner_token` 単独では変更しない。
- Criterionの更新可能な業務列は `label` だけ。順序列と並び替えUIは追加せず、`created_at ASC, id ASC` の作成順で表示する。
- コメント編集の確認ダイアログは使わず、「保存」「キャンセル」で完結する。削除は1段階確認。
- コメント本文は前後空白除去後、Unicodeコードポイント数で1〜500文字。ユーザー向け表示は「500文字まで」とする。
- Slice 5の即時反映は、サーバー成功後に操作画面へページ再読み込みなしで反映すること。別ブラウザ等へのRealtime自動同期は対象外。

---

# A. 要件定義

## A-1. 目的とスコープ

**目的**: お題ごとの判断基準（Criterion）を共有管理し、候補ごとに❤️（Reaction）、🌀（Concern）、コメント（Comment）を付けられるようにする。これらは非決定情報で、○/−/×と確定候補判定には一切影響しない。

**In（Slice 5）**: Criterion追加・編集・削除／Reaction・Concernの付与・解除／付与数・付与者一覧／他人分の既存Reaction・Concern解除／Comment投稿・共同編集・削除／デフォルトCriterion seed／既存イベントbackfill／必要なRLS・制約・トリガー・DB負系テスト。

**Out（作らない）**: 総合評価○/−/×、確定候補ハイライト・イシュー化、広告、マイイベント一覧、認証、履歴、FAQ、Criterion並び替え、Slice 5のRealtime購読。既存の候補管理・お題作成は、Slice 5 UI組み込みとseed追加以外は変更しない。

> Slice 3・4より先にSlice 5を実装する。Criterion / Reaction / Concern / CommentはVoteに依存しない。

## A-2. ユーザー・操作主体・token境界

`event accessible` は、対象eventの有効な `share_token` または `owner_token` を保持している状態を指す。

| 操作 | 操作主体・権限 | Participant |
|---|---|---|
| 4テーブルの閲覧 | event accessible | 不要 |
| Criterion追加 | `share_token` 保持者 | 追加だけでは生成しない。既存の現在Participantがあれば `created_by`、なければNULL |
| Criterion編集・削除 | `share_token` 保持者全員 | 不要 |
| Reaction / Concern新規付与 | `share_token` と `guest_token` を持つ現在の自分 | なければ自動生成。呼出元 `guest_token` と一致するParticipant名義のみ |
| Reaction / Concernの自分分解除 | チップ本体から現在の自分 | 同上 |
| Reaction / Concernの他人分解除 | `share_token` 保持者全員 | 付与者一覧から既存行をDELETE。対象名義を問わない |
| Comment投稿 | `share_token` と `guest_token` を持つ現在の自分 | なければ自動生成。呼出元名義のみ |
| Comment編集・削除 | `share_token` 保持者全員 | 参加不要。投稿者名義は変更しない |

- `owner_token` 単独では4テーブルを変更できない。owner編集画面からの変更も、画面が取得した `share_token` を使う共同編集操作として実行する。
- Reaction / Concernの他人分解除履歴は保存せず、将来課題にも残さない。
- Commentは私的発言ではなく、共有イベントの参加者が共同管理する候補補足情報として扱う。

## A-3. 機能要件（Given / When / Then）

### AC-5.0 判断基準の表示・順序

- Given: イベント詳細
- When: 判断基準を表示
- Then: eventのCriterion一覧を `created_at ASC, id ASC` で表示する。並び替えUI・順序列・先頭固定・source別優先順位は設けず、label編集後も表示位置を変えない。新規イベント作成直後は「興味ある？」が1件存在する。

### AC-5.0b 判断基準の追加・重複

- Given: `share_token` を利用できる人
- When: プリセット（価格どう？／雰囲気どう？／場所はどう？／色はどう？）または自由記述を追加
- Then: 前後空白を除去した1〜60文字のCriterionを追加する。追加だけを理由にParticipantを生成しない。Criterionはlabelではなくidで識別し、自由記述による同一label重複を許容する。

- プリセットと前後空白除去後に完全一致するCriterionが1件以上存在する間、そのプリセット追加ボタンを隠す。
- 該当Criterionがすべて削除されたらボタンを再表示する。`source` がpresetかcustomかは非表示判定に影響しない。

### AC-5.0c 判断基準の編集・削除

- Given: `share_token` を利用できる人
- When: Criterionを編集または削除
- Then: 更新できる業務列は `label` だけ。編集は「変更します、よろしいですか？」確認後に保存する。削除は既存候補削除と同じ2段階・配色差の確認を経て物理削除し、関連Reactionをcascade削除する。デフォルト「興味ある？」も例外なく編集・削除でき、Criterionが0件になってもよい。

### AC-5.2 判断基準❤️（Reaction）

- Given: 候補とCriterion
- When: ❤️チップ本体を操作
- Then: 現在の `guest_token` に対応する自分のParticipant名義だけを、確認ダイアログなしでINSERT / DELETEする。他Participant名義で新規付与しない。1候補×1参加者×1Criterionにつき1行で、非決定・初期行なし。

### AC-5.3 🌀（Concern）

- Given: 候補
- When: 🌀チップ本体を操作
- Then: Reactionと同じ操作主体・即時反映で現在の自分名義だけをINSERT / DELETEする。1候補×1参加者につき1行。Criterionとは無関係な単一常設懸念で、非決定・初期行なし。

### AC-5.4 ❤️・🌀の可視性と他人分解除

- Given: Reaction / Concernが存在
- When: 候補カードを表示
- Then: 各Criterion・🌀の付与数を表示し、チップ本体とは別の操作で付与者名（未設定は「ー」）をインラインまたは軽量ポップオーバーに展開する。現在の自分の付与は塗り等で区別する。

- チップ本体は自分のトグルだけを行い、一覧開閉と役割を混在させない。
- 他人分解除は付与者一覧からのみ提供し、個別詳細画面は作らない。
- 一覧の他Participant行に解除操作を設け、共有URL保持者が確認ダイアログなしで既存行をDELETEできる。

### AC-5.5 コメント投稿

- Given: 候補
- When: 任意でコメントを投稿
- Then: 前後空白を除去して保存し、Unicodeコードポイント数で1〜500文字だけを受理する。投稿名義は呼出元 `guest_token` に対応する現在Participantに限定し、未設定名は「ー」と表示する。空欄を強調せず、入力を催促しない。UI表記は「500文字まで」とし、技術用語を表示しない。

### AC-5.6 コメント共同編集・削除

- Given: `share_token` を利用できる人
- When: Commentを編集または削除
- Then: 誰でも共同編集できる。編集モードに「保存」「キャンセル」を設け、保存前の確認ダイアログは出さない。更新できる業務列は `text` だけで、投稿者名義・所属情報・作成日時を変えず、編集履歴を保存しない。削除は「このコメントを削除しますか？」の1段階確認とする。

- 現行schemaに `updated_at` は存在しないため、「編集済み」表示のためだけに列・履歴機構を追加しない。

### AC-5.7 デフォルト判断基準のseed・backfill

- Given (a): 新規イベント作成
- When: 作成完了
- Then: `label='興味ある？'`, `source='default'`, `created_by=NULL` のCriterionを1件作成する。

- Given (b): Slice 5 migration適用時点の既存イベント
- When: Criterionが0件
- Then: 同じデフォルトCriterionを1件backfillする。既に1件以上あるeventには追加しない。

## A-4. データ・DB不変条件・RLS

既存migrationは編集せず、Slice 5の新規migration 1本にまとめる。

### criteria

| 列 | 型・制約 |
|---|---|
| id | uuid PK, `gen_random_uuid()` |
| event_id | uuid not null references events(id) on delete cascade |
| label | text not null, 前後空白除去後1〜60文字 |
| source | text not null, `default` / `preset` / `custom` のみ |
| created_by | uuid NULL可 references participants(id) on delete set null |
| created_at | timestamptz not null default now() |

- UPDATE可能な業務列は `label` だけ。`id` / `event_id` / `source` / `created_by` / `created_at` は変更不可。
- seed / backfillの `created_by` はNULL。ユーザー追加時は、呼出元 `guest_token` に対応する同一eventの既存Participant ID、存在しなければNULLをDB側で決定する。クライアントが `created_by` を指定するINSERTと、作成後の変更を拒否する。
- アプリはlabelの前後空白を除去して保存し、DBでも空白のみと60文字超を拒否する。
- 順序列は作らず、`created_at ASC, id ASC` で取得する。

### reactions

| 列 | 型・制約 |
|---|---|
| id | uuid PK, `gen_random_uuid()` |
| candidate_id | uuid not null references candidates(id) on delete cascade |
| participant_id | uuid not null references participants(id) on delete cascade |
| criterion_id | uuid not null references criteria(id) on delete cascade |
| created_at | timestamptz not null default now() |
| 一意 | unique (candidate_id, participant_id, criterion_id) |

- 3参照が同一eventであることを保証する。
- INSERT時のparticipantは呼出元本人だけ。UPDATEなし。DELETEは `share_token` 保持者なら対象名義を問わない。

### concerns

| 列 | 型・制約 |
|---|---|
| id | uuid PK, `gen_random_uuid()` |
| candidate_id | uuid not null references candidates(id) on delete cascade |
| participant_id | uuid not null references participants(id) on delete cascade |
| created_at | timestamptz not null default now() |
| 一意 | unique (candidate_id, participant_id) |

- 2参照が同一eventであることを保証する。INSERT / UPDATE / DELETE規則はReactionと同じ。

### comments

| 列 | 型・制約 |
|---|---|
| id | uuid PK, `gen_random_uuid()` |
| candidate_id | uuid not null references candidates(id) on delete cascade |
| participant_id | uuid NULL可 references participants(id) on delete set null |
| text | text not null, 前後空白除去後1〜500 Unicodeコードポイント |
| created_at | timestamptz not null default now() |

- INSERT時のparticipantは呼出元本人だけで、candidateと同一eventに限定する。
- UPDATE可能な業務列は `text` だけ。`candidate_id` / `participant_id` / `created_at` 等は変更不可。
- アプリは保存前に前後空白を除去し、JavaScriptの `string.length` ではなくコードポイント数で判定する。DB層でもINSERT / UPDATE前に同じ前後空白除去を行って正規化後のtextだけを保存し、その `char_length(text)` が1〜500であることを制約で保証する（空白のみは正規化後0文字として拒否）。

### 最終RLS CRUD

| 対象 | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| criteria | event accessible | share_token限定 | share_token限定・`label`のみ | share_token限定 |
| reactions | event accessible | share_token限定・現在Participant名義のみ | 操作なし | share_token限定・対象名義を問わない |
| concerns | event accessible | share_token限定・現在Participant名義のみ | 操作なし | share_token限定・対象名義を問わない |
| comments | event accessible | share_token限定・現在Participant名義のみ | share_token限定・`text`のみ | share_token限定 |

- 列単位GRANTを使い、Reaction / ConcernにはUPDATE権限を与えない。
- 列単位GRANTだけに依存せず、RLS・制約・トリガーまたは専用DB関数で、不変列・同一event・現在Participant名義を保証する。
- `request_event_is_accessible` / `request_event_has_share_token` / `request_guest_participant_id` 等の既存方式を再利用し、新規関数は既存命名・`security definer`・`search_path`・権限設定の規則に従う。

### seed / backfill

- 新規イベント: `createEventWithOwner` のevent・owner紐付け後にデフォルトCriterionを作成する。
- 既存イベント: migration内DMLでCriterionが0件のeventだけに投入する。

## A-5. UI要件

### 判断基準セクション

| 項目 | 仕様・文言 |
|---|---|
| 見出し | 判断基準 |
| 説明 | 候補を比べるものさしです。追加・変更は誰でもできます。 |
| プリセット | 価格どう？／雰囲気どう？／場所はどう？／色はどう？。trim後完全一致labelがある間だけ該当ボタンを隠す |
| 自由記述 | placeholder「例）雰囲気どう？ など」＋「追加」。同一label重複可 |
| Criterion表示 | `created_at ASC, id ASC`。ラベル＋「直す」＋「消す」。並び替え操作なし |
| 編集確認 | 変更します、よろしいですか？ |
| 削除1回目 | この判断基準を消しますか？ |
| 削除2回目 | 本当によろしいですか？（より強い警告色） |

### 候補カード

| 項目 | 仕様・文言 |
|---|---|
| ❤️チップ本体 | Criterionラベル＋❤️＋人数。塗り＝自分が付与。押すと自分だけ即時トグル |
| 🌀チップ本体 | 🌀 気になる＋人数。Reactionと同じ挙動 |
| 付与者一覧 | 人数側の別操作でインラインまたは軽量ポップオーバーを開閉。名前（未設定は「ー」）を表示し、他Participant行に「外す」操作 |
| コメント投稿 | placeholder「気になることや感想など（任意）」＋「投稿」＋「500文字まで」 |
| コメント表示 | 投稿者名（未設定は「ー」）＋本文＋「直す」／「消す」 |
| コメント編集 | 編集モード内に「保存」「キャンセル」。確認ダイアログなし |
| コメント削除 | 「このコメントを削除しますか？」の1段階確認 |

## A-6. 非機能要件

- モバイル375px／デスクトップ同格。付与者一覧・コメント編集を含め表示崩れ、横スクロール、重なりなし。
- 同時編集はlast-write-wins。
- サーバー成功後、操作した画面へページ再読み込みなしで反映する。失敗時は成功状態を残さず、ユーザー向けエラーを表示する。
- Slice 5ではSupabase Realtime購読、別タブ・別ブラウザ・別端末の自動同期を実装しない。
- 認証・service role・local JSON fallbackを使わない。依存はバージョン固定。既存migrationを編集しない。

## A-7. テストデータ

- 既存方針どおりイベント名・候補名・お名前等に `[E2E]` を付ける。
- backfill確認用の既存 `[E2E]` eventをmigration適用前に特定し、適用後に検証する。
- Slice 5実DBテストがskipされていないことをテスト結果件数で確認する。

---

# B. Definition of Done（Slice 5）

## B-1. 共通DoD

- [ ] AC-5.0〜5.7を満たす。
- [ ] 375px／デスクトップで表示崩れなし。
- [ ] 主要操作E2Eとanon権限で実行できるDB負系が `tests/slice-5.spec.ts` に自動化されgreen。特権が必要なFK設定はSQL Editorでschema確認済み。
- [ ] エラー時にユーザー向けメッセージを表示し、成功状態を残さない。
- [ ] ○/−/×、確定ロジック、認証、広告、マイイベント一覧へ触れていない。

## B-2. 機能・DB固有DoD

- [ ] 新規migration 1本で4テーブル、RLS、列単位GRANT、同一event保証、一意制約、cascade、backfillを実装。既存migration不変。
- [ ] Criterion追加だけではParticipantを生成せず、既存の現在ParticipantまたはNULLだけを `created_by` に設定する。
- [ ] Criterionは `label` だけ更新でき、`created_at ASC, id ASC` で表示。並び替え機能なし。編集後も位置不変。
- [ ] プリセット非表示／再表示、自由記述重複、id単位の編集・削除が動作。
- [ ] デフォルトCriterionも編集・2段階削除でき、0件を許容。
- [ ] Reaction / Concern新規付与は現在の自分名義だけ。他人名義INSERTはDBで拒否。
- [ ] チップ本体で自分をトグルし、付与者一覧から既存の他人分を解除。履歴・詳細画面なし。
- [ ] 付与数、付与者名、自分の視覚区別を表示。
- [ ] Commentはtrim後1〜500コードポイント。投稿者名義は現在の自分だけ。
- [ ] Commentの `text` 共同編集は保存／キャンセル・確認なし。投稿者名義不変・履歴なし。削除は1段階。
- [ ] owner_token単独の変更を拒否し、owner画面の共同編集はshare_tokenで成功。
- [ ] 操作成功は再読み込みなしで反映し、失敗時は表示を戻す。Realtime購読なし。

## B-3. E2E・DBテスト

新規 `tests/slice-5.spec.ts` にUI E2Eと、既存 `tests/slice-2.spec.ts` のanon client直接検証パターンを使ったDB負系を実装する。service roleは使わない。

anonでは実行できないParticipant DELETEの実データ操作は自動テスト対象にせず、migration適用後にSQL EditorでFKのdelete actionを確認する。

### E2E

- [ ] seedとbackfill、Criterion CRUD、2段階削除、0件許容。
- [ ] `created_by` の既存Participant／NULL分岐と、Criterion追加時にParticipantが増えないこと。
- [ ] labelの前後空白除去、空白のみ／61文字拒否、preset trim完全一致時の非表示、全件削除後の再表示、自由記述重複、id単位操作。
- [ ] `created_at ASC, id ASC` の表示、再読込後の維持、label編集後の位置不変、並び替えUIなし。
- [ ] Reaction / Concernの自分トグル、他人名義の新規付与UIなし、付与者一覧から他人分解除。
- [ ] 付与数・付与者名（未設定「ー」）・自分の視覚区別。
- [ ] fresh guestの最初のReaction / Concern / Comment操作でParticipantを1件生成し、後続操作で重複生成しない。
- [ ] Commentの1／500コードポイント受理、空白のみ／501拒否、サロゲートペアを含む500コードポイント受理。
- [ ] Comment UIには「500文字まで」だけを表示し、「Unicodeコードポイント」等の技術用語を表示しない。
- [ ] Comment編集の保存／キャンセル、確認ダイアログなし、投稿者名義不変、1段階削除。
- [ ] owner編集画面から、画面が取得したshare_tokenを使うCriterion / Reaction / Concern / Comment変更が成功する。
- [ ] サーバー成功後の再読込なし反映と、失敗時の表示復元・エラー表示。
- [ ] 375×812、1366×768で主要UIに崩れなし。
- [ ] Slice 1・2回帰green。votes・Realtime・FAQ・履歴機構を追加していない。

### DB負系

- [ ] 全4テーブルでshare／owner SELECT成功、tokenなし・不正・別eventでは対象行非公開。
- [ ] 全変更はshare_tokenでのみ成功し、owner_token単独・tokenなし・不正・別event tokenは拒否。
- [ ] Criterionのクライアント指定 `created_by` INSERTをエラーとして拒否し、指定なしINSERTでは既存の現在Participant／NULLをDB側で決定する。`id/event_id/source/created_by/created_at` UPDATEを拒否し、`label` UPDATEだけ成功。
- [ ] Criterionの空白のみlabel、61文字label、許可外sourceをDB直接INSERTで拒否する。
- [ ] Reactionの3参照、Concern / Commentの2参照の別event混入を拒否。
- [ ] Reaction / Concern / Commentの他人名義INSERTを拒否し、新規Commentの `participant_id=NULL` も拒否する。
- [ ] Reaction / Concern重複とUPDATEを拒否。他人行DELETEはshare_tokenで成功。
- [ ] Commentの `text` 以外のUPDATE、trim後空文字、501コードポイントを拒否し、500を受理。
- [ ] Criterion削除→Reaction、Candidate削除→Reaction / Concern / Commentのcascadeを確認。
- [ ] migration適用後のschemaで、Participant FKがReaction / Concernはcascade、Comment.participant_idとCriterion.created_byはset nullになっていることをSQL Editorで確認。
- [ ] RLS拒否がerrorではなく0件操作として返る場合も、正規shareクライアントで再読込して不変を確認。

### コマンド

- [ ] `npm run check`
- [ ] `npm run build`
- [ ] `npm run test:e2e`（Slice 5実DBケースのskip 0件を確認）
- [ ] `git diff --check`

## B-4. 実装・検証・リリース順序（承認済み正本）

1. 本書が承認済み正本であることを確認する（2026-07-10承認済み）。
2. 別タスクで文書変更だけをcommitし、おしげさんの承認後にpushして、working tree clean・ahead/behind 0/0にする。
3. backfill確認対象の既存 `[E2E]` eventを特定する。
4. migration・アプリ・E2E・DB負系テストを作成する。
5. `npm run check` / `npm run build` を通す。
6. **【人間操作】** おしげさんがSupabase SQL Editorでmigrationを適用する。
7. schema / GRANT / RLS / 制約 / backfillのDB検証を行う。
8. Slice 5 E2EとSlice 1・2回帰を実行し、skip 0件・greenを確認する。
9. `git diff --check` と変更範囲を確認し、実DB検証後に実装を最終commitする。
10. 結果を報告し、おしげさんの実装push承認を待つ。
11. 承認後にpushし、本番主要動線をsmoke確認する。

---

## 文書反映状況

- [x] `03_requirements.md`: 操作主体、Comment、即時反映、順序を反映。
- [x] `04_data-model.md`: 詳細スキーマ、RLS CRUD、不変条件、順序を反映。
- [x] `ADR-0004`: 操作主体とtoken境界を反映。
- [x] `ADR-0005`: Criterion created_by・重複・順序を反映。
- [x] `06_qa-flow.md`: S6a〜S6dを更新。
- [x] おしげさんによる文書承認（2026-07-10）。

未確定の実装仕様はない。実装は承認済み正本を用いる別部隊が担当する。本承認反映タスクではコード・migration・テスト実装、commit、pushを行わない。
