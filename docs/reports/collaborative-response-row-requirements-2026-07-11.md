# 共同編集型・回答者行モデル 要件定義書

- 作成日: 2026-07-11
- 最終改訂: 2026-07-12（Supabase CLI / Docker開発手順承認・正本反映）
- ステータス: **承認済み**
- 対象: 既存Slice 1 / 2 / 5の基盤再編、Slice 3（総合評価）、Slice 4（候補可視化）
- 決定者: おしげさん
- 実装状態: **未実装**
- 関連: [ADR-0007](../adr/0007-event-views-and-criterion-feedback.md) / [実装仕様](collaborative-response-row-spec-draft-2026-07-11.md) / [DoD](collaborative-response-row-dod-2026-07-11.md) / [QA](collaborative-response-row-qa-2026-07-11.md) / [Supabase CLI / Docker開発リファレンス](supabase-cli-docker-development-reference-2026-07-12.md)

> 本書は、調整さん型のイベント内共同編集モデルを「きめのすけ」へ適用する詳細要件である。2026-07-12のADR-0007によりEvent画面分離と判断基準別🌀を追補し、ADR-0008によりSupabase CLI / Docker開発手順を正本化した。コード・migrationは未実装であり、別途明示された実装タスクまで変更しない。

---

## 1. 目的

きめのすけの役割は、サービス自身が候補を確定することではなく、候補に対するみんなの意見を少ない操作で見える化し、グループが決めやすい状態を作ることである。

本変更では次を実現する。

1. ログインなし・共有URLだけで共同編集できる体験を維持する。
2. ブラウザを「人」とみなさず、イベント内の名前付き回答行を共同編集する。
3. 候補一覧で全体を見渡し、候補編集で全回答者の意見を確認して一つずつ吟味できるようにする。
4. ○ / − / ×、❤️、🌀、コメントを、決定ロジックと補助情報に分けて表示する。
5. 未評価と能動的な − を区別し、候補が追加された時刻を示して、早く追加された候補へ評価が集まりやすいバイアスをメンバーが判断できるようにする。
6. ○数と×有無から3種類の候補状態を色分けするが、確定・ロック・非表示は行わない。

---

## 2. 用語

| 用語 | 定義 |
|---|---|
| オーナー | お題・メモを編集できる権限。Participantとは独立し、`owner_token` だけで判定する |
| 共有利用者 | 有効な共有URLを開いている人。ログイン・会員登録は不要 |
| 回答者行（Participant） | イベント内で共同編集される名前付きの回答単位。実在人物の恒久IDやブラウザIDではない |
| 選択中の回答者 | 画面上部で現在選ばれている回答者行。候補一覧と候補編集の個人名義操作の対象になる |
| 未選択 | 選択中の回答者がない状態。候補・判断基準の共有操作は可能だが、個人名義操作では回答者選択を求める |
| 未評価 | 回答者×候補にVote行が存在しない状態 |
| 能動− | 回答者が明示的に − を選び、Vote行として保存された状態 |
| 最終候補色 | 現在の意見分布を視覚化する3種類の強調。確定状態・ロック・採択を意味しない |

---

## 3. 基本原則

### 3.1 ユーザー操作を極限まで減らす

- ログイン、会員登録、参加登録画面を設けない。
- 回答者名の入力だけのために「参加する」「登録」ボタンや確認を追加しない。
- 回答者が未選択の状態で個人名義操作を始めた場合、回答者選択後に元の操作を自動再開し、同じボタンを二度押させない。
- 候補一覧ダッシュボードは閲覧、候補編集画面は1候補の吟味と共同編集に役割を分ける。イベント全体の一括回答マトリクスは作らない。

### 3.2 性善説による共同編集

- 共有URLを知る人は、同一イベントの回答者行、候補、判断基準、評価、❤️、🌀、コメントを共同編集できる。
- 回答者行は本人だけの所有物ではない。別ブラウザからも既存行を選択して修正できる。
- 操作者、変更履歴、監査履歴はMVPでは保存しない。
- 誤操作の影響が大きい削除は、対象ごとに定めた確認を挟む。
- 異なるイベントのID参照はDBで拒否する。

### 3.3 オーナーと回答者を分離する

- イベント作成時にParticipantを生成しない。
- トップのお題作成フォームにお名前欄を置かない。
- オーナーも意見を入力するときは、ほかの人と同じ回答者選択を利用する。
- オーナー権限は `owner_token` のみで判定し、Participantやguest_tokenに依存させない。

---

## 4. 機能要件

### 4.1 お題作成とオーナー権限

| ID | 受け入れ条件 |
|---|---|
| CR-1.1 お題作成 | **Given** トップ画面 **When** お題と任意のメモを入力して作成 **Then** Eventが作成され、Participantは作成されない |
| CR-1.2 URL発行 | **Given** Event作成成功 **When** オーナー初期セットアップを完了 **Then** 初回共有ステップへ推測困難な共有URLを表示し、owner URLは「わたしの意見を入力」の遷移先として保持する |
| CR-1.3 オーナーCookie | **Given** Event作成または有効なowner URLへのアクセス **When** オーナー確認に成功 **Then** 対象イベントの共有パスに限定したHttpOnly Cookieへowner tokenを保存する |
| CR-1.4 権限回復 | **Given** Cookie消失または別ブラウザ **When** owner URLを開く **Then** お題・メモ編集権限をそのブラウザで回復する |
| CR-1.5 権限の独立 | **Given** オーナーが回答者を未選択 **When** イベントを開く **Then** お題・メモは編集できるが、個人名義操作は回答者選択まで実行されない |
| CR-1.6 初期セットアップ | **Given** Event作成成功 **When** オーナー画面を表示 **Then** きめること・つたえておきたいことの下に「お名前を入れる / 候補の追加」と確定説明文を表示する。候補名inputにplaceholderを置かない |
| CR-1.7 オーナー継続 | **Given** オーナー初期セットアップ **When** 名前を選択または新規作成 **Then** 同じ画面に残り、Candidate追加へ続く。「さあ、きめよう！」後は初回共有ステップで共有URLを表示し、「わたしの意見を入力」で同じタブの候補一覧へ進む |
| CR-1.8 トップの将来領域 | **Given** 本スライスのトップ **When** 表示 **Then** Event内の候補一覧リンクとイベント一覧を表示しない。将来トップ下部へイベント一覧を追加できる構造だけを維持する |
| CR-1.9 owner再訪 | **Given** 別ブラウザまたは後日のowner URLアクセス **When** token検証に成功 **Then** 回答者未選択でも初期セットアップを再表示せず候補一覧を表示し、きめること・つたえておきたいことの編集を許可する。個人名義操作を始めた時だけ名前選択へ進む |
| CR-1.10 共有URL入口 | **Given** 共有URL保持者 **When** Eventを開く **Then** ログイン・登録なしでお題・メモを表示し、有効なselected participantがなければ名前選択、あれば候補一覧へ進む |

### 4.2 回答者セレクター

| ID | 受け入れ条件 |
|---|---|
| CR-2.1 未選択画面 | **Given** 共有URLかつ有効なselected participantなし **When** 表示 **Then** 「あなたのお名前」、既存名の選択肢、その直下の「直接入力」だけを表示する |
| CR-2.2 既存行選択 | **Given** 回答者行が存在 **When** 一覧から選択 **Then** DB行を作らず入力欄へ同名を反映し、その行を操作対象にして候補一覧へ進む |
| CR-2.3 新規行作成 | **Given** 新しい名前を入力 **When** 非IME Enter、モバイルの完了、またはセレクター全体からfocusが外れる **Then** 前後空白を除去してParticipantを1件作成し選択する |
| CR-2.4 入力途中 | **Given** 名前入力中 **When** キー入力だけを行う **Then** キー単位・debounce・タブ終了では保存しない |
| CR-2.5 名前だけの参加 | **Given** 新規名を入力 **When** CR-2.3の確定契機が発生 **Then** コメント・評価等がなくてもParticipantを作成する |
| CR-2.6 同名確認 | **Given** trim後の完全一致名が既に存在 **When** 新規作成を確定 **Then** 自動選択や重複作成をせず、同じ人か確認する |
| CR-2.7 同一人物 | **Given** 同名確認 **When** 同じ人と回答 **Then** 既存行を選択し、保留中の個人名義操作があれば再開する |
| CR-2.8 別人 | **Given** 同名確認 **When** 別人と回答 **Then** 同名行を作らず、「田中2」等の異なる名前の再入力を求める。保留操作は再入力の確定まで維持し、キャンセル時だけ破棄する |
| CR-2.9 同時作成 | **Given** 同名行が同時作成される **When** DB一意制約で片方が競合 **Then** 既存行を再取得して同名確認へ移り、自動マージやリトライループを行わない |
| CR-2.10 名前変更 | **Given** 回答者行を選択 **When** 「名前を直す」で新名を入力し確認 **Then** 空・同名を拒否し、別行との統合をせず、その行の名前だけを更新する |
| CR-2.11 回答者削除 | **Given** 回答者行を選択 **When** 2段階確認を完了 **Then** その行とVote/Reaction/Concern/Commentを削除し、Candidate/Criterionの作成者参照はNULLにする |
| CR-2.12 並び順 | **Given** 複数回答者 **When** 表示 **Then** `created_at ASC, id ASC`で並べ、名前変更でも移動しない |
| CR-2.13 選択記憶 | **Given** 回答者を選択 **When** 同じブラウザで再訪 **Then** `kimenosuke:selected-participant:<event_id>`から行が現存する場合だけ再選択する。share URL / owner URLで同じキーを使う |
| CR-2.14 記憶消去 | **Given** 記憶した回答者行が削除済み **When** 再訪または最新状態取得 **Then** localStorageと現在選択を解除する |
| CR-2.15 新名確定後 | **Given** 未選択ゲスト **When** 新名の確定に成功 **Then** 新Participantを選択して候補一覧へ進む |
| CR-2.16 選択済み再訪 | **Given** localStorageのParticipant IDが同一Eventに現存 **When** 共有URLを開く **Then** 名前選択を省略し候補一覧へ直接進む |

名前の一致は、前後空白除去後の文字列完全一致とする。大文字小文字、全角半角、Unicode正規化による同一視は行わない。

### 4.3 個人名義操作の保留と再開

対象操作は、○ / − / ×、判断基準ごとの❤️ / 🌀、コメント保存である。

| ID | 受け入れ条件 |
|---|---|
| CR-3.1 未選択操作 | **Given** 回答者未選択 **When** 個人名義操作を開始 **Then** 文脈を保持したまま回答者セレクターを開く |
| CR-3.2 再開 | **Given** 個人名義操作が保留中 **When** 既存選択または新規作成に成功 **Then** 保留操作を一度だけ実行する |
| CR-3.3 失敗 | **Given** 個人名義操作が保留中 **When** 選択をキャンセルまたはParticipant作成に失敗 **Then** 元の操作を実行せず、入力内容を保持する |
| CR-3.4 共有操作 | **Given** 回答者未選択かつ名前draftなし **When** 候補または判断基準を追加・編集・削除 **Then** Participantを作らず実行できる |
| CR-3.5 明示操作優先 | **Given** 名前入力中 **When** 個人名義操作によってセレクター外へfocusが移動 **Then** 通常blur保存を抑止し、保留処理だけがParticipant解決と元操作を直列実行する |
| CR-3.6 draft優先 | **Given** 既存回答者を選択中に新しい名前を入力 **When** 個人名義操作を開始 **Then** 旧選択行ではなく名前draftを対象にParticipantを解決し、成功後に元操作を実行する |
| CR-3.7 一度だけ実行 | **Given** Participant解決中 **When** 連打または複数eventが発生 **Then** 最初の処理だけを受け付け、Participant作成と継続操作を各1回にする |
| CR-3.8 失敗後 | **Given** 名前検証またはDB処理に失敗 **When** エラー表示 **Then** 名前draftは保持するが保留操作は破棄し、後から突然実行しない |
| CR-3.9 既存行選択優先 | **Given** 名前draftがある **When** 既存回答者を明示選択 **Then** draftを新規作成せず既存行を選択し、保留操作があればその行で1回実行する |
| CR-3.10 画面離脱 | **Given** 未確定の名前draft **When** reload・tab close・外部遷移 **Then** beforeunload保存を行わず、保存を保証しない |

Participant作成は、Enter用、blur用、個人名義操作用に別実装しない。単一の名前確定処理へ集約し、次の優先順位で一意に処理する。

1. 既存回答者の明示選択
2. ○ / − / ×、判断基準別❤️ / 🌀、コメント保存、Event / Candidate / Criterionの追加・編集・削除等の明示的DB操作
3. 非IME Enter / モバイル完了
4. 通常blur

名前draftがある状態でCandidate / Criterionを追加する場合、Participant解決成功後に追加し、新Participantを`created_by`へ設定する。Event / Candidate / Criterionの編集・削除等のDB mutationもParticipant解決完了後に実行する。コピー等の非DB操作は妨げない。名前draftが空またはtrim後空白だけならdraftなしとして扱う。

### 4.4 候補管理

| ID | 受け入れ条件 |
|---|---|
| CR-4.1 候補追加 | **Given** 共有URL保持者かつ名前draftなし **When** タイトルまたはURLの少なくとも一方を入力 **Then** Candidate追加自体を理由にParticipantを新規生成せずCandidateを作成する |
| CR-4.2 提案者 | **Given** 名前draftなしで候補追加 **When** 回答者選択済み **Then** そのParticipantを`created_by`へ設定し、未選択ならNULLにする |
| CR-4.3 候補フォーム | **Given** 候補追加UI **When** 表示 **Then** お名前入力欄を置かない |
| CR-4.4 候補共同編集 | **Given** 共有URL保持者 **When** タイトル・URL・提案者を変更 **Then** 確認後に更新できる |
| CR-4.5 提案者変更 | **Given** 候補編集 **When** 提案者を変更 **Then** 同一イベントの回答者行または「ー（NULL）」だけを指定できる |
| CR-4.6 候補削除 | **Given** 共有URL保持者 **When** 2段階確認を完了 **Then** 候補と配下データを物理削除する |
| CR-4.7 追加時刻 | **Given** 候補 **When** 候補編集を表示 **Then** `Candidate.created_at`を基準に、60分未満は「1時間以内に追加」、24時間未満は切り捨てた「N時間前に追加」、24時間以上は切り捨てた「N日前に追加」と表示する。クライアント時計とのずれで`created_at`が未来になる場合は経過時間を0へclampし、「1時間以内に追加」とする |
| CR-4.8 時刻不変 | **Given** 既存候補 **When** タイトル・URL・提案者・回答を編集 **Then** `Candidate.created_at`を変更しない |
| CR-4.9 名前draft付き追加 | **Given** trim後非空の名前draft **When** Candidate追加 **Then** 単一の名前確定処理を先に完了し、解決したParticipantを`created_by`へ設定してCandidateを1件作成する |

ユーザーへ表示する時刻はCandidateの作成時刻だけとする。Vote / Reaction / Concern / Commentの作成・更新時刻は表示せず、この機能のための新しい時刻列も追加しない。相対表示は初期取得とローカルmutation成功後の完全状態取得時に再計算し、timerやDB pollingを追加しない。

### 4.5 判断基準・❤️・🌀

| ID | 受け入れ条件 |
|---|---|
| CR-5.1 判断基準 | **Given** イベントかつ名前draftなし **When** 判断基準を操作 **Then** 共有URL保持者は回答者未選択でもParticipantを作らず追加・編集・2段階削除できる |
| CR-5.2 判断基準作成者 | **Given** 名前draftなしで判断基準追加 **When** 回答者選択済み **Then** そのParticipantを`created_by`へ設定し、未選択ならNULLにする |
| CR-5.3 ❤️ | **Given** 回答者選択済み **When** 候補の判断基準へ❤️を付け外し **Then** 選択中の回答者名義のReactionだけを変更する |
| CR-5.4 🌀 | **Given** 回答者選択済み **When** 候補の判断基準へ🌀を付け外し **Then** 選択中の回答者名義のCriterion別Concernだけを変更する |
| CR-5.5 共同編集 | **Given** 別の回答者行を選択 **When** ❤️または🌀を変更 **Then** その選択行の状態として更新する |
| CR-5.6 集約表示 | **Given** Reaction/Concernが存在 **When** 候補を表示 **Then** ❤️は全判断基準のReaction行、🌀は全判断基準のConcern行をそれぞれ単純合計して表示する |
| CR-5.7 非決定 | **Given** ❤️・🌀が存在 **When** 最終候補色を算出 **Then** ❤️・🌀の数を判定に使用しない |
| CR-5.8 名前draft付き追加 | **Given** trim後非空の名前draft **When** Criterion追加 **Then** 単一の名前確定処理を先に完了し、解決したParticipantを`created_by`へ設定してCriterionを1件作成する |
| CR-5.9 独立付与 | **Given** 同じCandidate×Participant×Criterion **When** ❤️と🌀を付ける **Then** ReactionとConcernを独立して保持し、両方を同時に表示する |
| CR-5.10 候補単位🌀の廃止 | **Given** Candidate **When** フィードバックを保存・表示 **Then** Criterionに紐付かない常設単一Concernを作成・表示しない |

同じ回答者が同じ候補の3つの判断基準へ❤️または🌀を付けた場合、それぞれ候補全体の合計を3とする。判断基準ごとの❤️ / 🌀数と付与者も個別表示する。

### 4.6 コメント

| ID | 受け入れ条件 |
|---|---|
| CR-6.1 1人1件 | **Given** 候補と回答者 **When** コメントを保存 **Then** `candidate_id × participant_id`につき現在コメントを最大1件だけ保持する |
| CR-6.2 保存 | **Given** 回答者選択済み **When** 1〜500コードポイントの本文を明示的に保存 **Then** 新規作成または上書きする |
| CR-6.3 空保存 | **Given** 既存コメント **When** 空文字または空白だけを保存 **Then** コメント行を削除する |
| CR-6.4 編集 | **Given** 別の回答者行を選択 **When** コメントを編集 **Then** その回答者行の現在コメントを共同編集する |
| CR-6.5 入力挙動 | **Given** コメント入力 **When** Enterまたはblur **Then** Enterは改行、blurは未保存のままとし、明示的な「保存」だけで確定する |
| CR-6.6 失敗 | **Given** コメント保存 **When** DB更新に失敗 **Then** DB上の旧本文を維持し、入力中ドラフトとエラーを画面に残す |

コメントは会話スレッドではなく、各回答者の現在の意見を示すダッシュボード情報とする。返信、複数件、履歴、通知、既読はMVP外。

### 4.7 総合評価

| ID | 受け入れ条件 |
|---|---|
| CR-7.1 4状態 | **Given** 回答者×候補 **When** 読取モデルを生成 **Then** `unrated / positive / neutral / veto` のいずれかを必ず返す |
| CR-7.2 未評価 | **Given** Vote行なし **When** 候補編集の回答者行を表示 **Then** 未評価として表示し、能動−と区別する |
| CR-7.3 評価保存 | **Given** 回答者選択済み **When** ○ / − / × を選択 **Then** `positive / neutral / veto` をVote行へ保存または更新する |
| CR-7.4 一意性 | **Given** 同一回答者と候補 **When** 複数回評価 **Then** Vote行は常に1件で、現在値だけを持つ |
| CR-7.5 共有編集 | **Given** 任意の回答者行を選択 **When** ○ / − / × を変更 **Then** 共有URL保持者はその行の現在評価を更新できる |
| CR-7.6 判定入力 | **Given** 評価状態 **When** 集計 **Then** ○数と×有無だけを判定へ使用し、未評価と−は0として扱う |
| CR-7.7 時刻非管理 | **Given** Voteを作成または変更 **When** 保存 **Then** 評価時刻をユーザー向けに保存・表示するための列やUIを追加しない |
| CR-7.8 同値再押下 | **Given** ○ / − / × のいずれかを選択済み **When** 同じ値を再度押す **Then** no-opとし、server actionやDB mutationを実行しない |
| CR-7.9 DB値制約 | **Given** Voteを保存 **When** DBへvalueを渡す **Then** `text + CHECK`で`positive / neutral / veto`だけを許可し、それ以外を拒否する |
| CR-7.10 重複経路 | **Given** 同じCandidate×Participantを繰り返し保存 **When** アプリの`setVote`を使う **Then** upsert / updateで1行を維持する。anon clientから重複INSERTした場合は2回目をDB UNIQUE制約で拒否する |

### 4.8 候補一覧ダッシュボード・候補編集

| ID | 受け入れ条件 |
|---|---|
| CR-8.1 候補一覧 | **Given** 選択済み回答者または有効なowner capability **When** 候補一覧を表示 **Then** お題・メモと全Candidateの集約を表示し、回答者別編集controlを展開しない |
| CR-8.2 Candidate情報階層 | **Given** Candidate **When** 候補一覧または候補編集に表示 **Then** 候補一覧はCandidate名・URL・`⭕️ / ➖ / ❌`件数・❤️ / 🌀合計を1行のサマリーとして表示し、追加時期・提案者・回答者別詳細は候補編集に表示する。`➖`はneutral Vote行だけを数え、unratedを含めない |
| CR-8.3 候補編集導線 | **Given** 候補一覧 **When** Candidate名を選択 **Then** 対象Candidateの候補編集画面を表示する |
| CR-8.4 編集内容 | **Given** 候補編集 **When** 表示 **Then** Candidate情報と同じ候補タイル内で選択中回答者の○/−/×・判断基準別❤️/🌀を操作し、その下でコメントを保存できる |
| CR-8.5 回答者一覧 | **Given** 全回答者行 **When** 「みんなの判断」へ表示 **Then** 現在値とコメント全文だけを閲覧でき、行click・名義変更・編集controlを持たない |
| CR-8.6 選択切替 | **Given** 回答者を変更 **When** 専用の変更controlを選択 **Then** 既存の回答者選択UIを開き、回答者行clickでは切り替えない |
| CR-8.7 上部操作 | **Given** 回答者を選択済み **When** 候補編集を表示 **Then** サマリーと同じ○/−/×・判断基準dialogを使い、コメントは明示保存する |
| CR-8.8 モバイル | **Given** 375px幅 **When** 候補編集を表示 **Then** 上部操作、コメント、回答者一覧、詳細編集を縦配置し、ページ全体の横スクロールを発生させない |
| CR-8.9 デスクトップ | **Given** 1366px幅 **When** 候補編集を表示 **Then** 回答者行を比較しやすい表形式に近い配置で表示する |
| CR-8.10 全候補可視 | **Given** 通常候補または×あり候補 **When** 一覧を表示 **Then** ブラックアウト・非表示にせず、すべて閲覧・編集できる |
| CR-8.11 コメント一覧 | **Given** 回答者行 **When** 長いコメントを表示 **Then** デスクトップ・モバイルとも省略せず全文を表示する |
| CR-8.12 詳細編集 | **Given** 候補編集 **When** 詳細を変更 **Then** 候補内容の編集・❤️／🌀反応項目の編集・判断者名の変更／削除の3menuを一覧下に置く。候補内容だけを＋／−付き開閉UIからインライン、残る2つをmodalで表示する。modal導線2件はデスクトップで同一行・文言改行なし、モバイルで横幅不足時だけボタン単位・文言とも折り返せる。反応項目追加は既存一覧の下に置き、判断者modalは選択中回答者の現在名を直接編集でき、変更・キャンセル・右端の削除を1画面に置く。削除確認中は「消す／キャンセル」だけを表示する |
| CR-8.13 確認UI | **Given** 同名・変更・削除確認 **When** 表示 **Then** 現在の対象に必要な1画面だけを表示し、複数確認をタイル状に並べない |

回答者一覧は読むための領域に限定し、個人名義操作はCandidate情報上部、管理操作は一覧下の3menuへ分離する。デスクトップとモバイルで同じ操作モデルを用いる。

MVPではイベント全体の「回答者×候補」一括マトリクスや、候補一覧との表示切替機能を作らない。

### 4.9 最終候補色

候補ごとに次を算出する。

- `P`: ○数
- `X`: ×数
- `M`: 全候補の○最多数

| ID | 条件 | 表示 |
|---|---|---|
| CR-9.1 第1色 | `M > 0` かつ `P = M` かつ `X = 0` | 議論なしで決めやすい最有力候補として第1色 |
| CR-9.2 第2色 | `M > 0` かつ `P = M` かつ `X > 0` | 人気は最多だが議論が必要な候補として第2色 |
| CR-9.3 第3色 | CR-9.1該当候補が0件で、`0 < P < M` かつ `X = 0` の候補群における○最多 | 消去法で残る安全な代替候補として第3色 |
| CR-9.4 通常 | 上記以外 | 色付けなし。×や集計値自体は表示する |
| CR-9.5 タイ | 同じ条件・同じ○数の候補が複数 | すべて同じ色で並列表示 |
| CR-9.6 混在タイ | ○最多が同数で一方は×なし、他方は×あり | ×なしを第1色、×ありを第2色 |
| CR-9.7 ○0 | `M = 0` | 全候補を通常表示 |
| CR-9.8 semantic state | **Given** 判定結果 **When** UIへ渡す **Then** `clear / discussion / fallback / none`の状態として渡し、component内で判定を再実装しない |
| CR-9.9 visual | **Given** 3色状態 **When** 仮案を実装 **Then** 可視の説明ラベルを置かず、控えめなsemantic color、支援技術向け状態名、常時表示する`⭕️ / ➖ / ❌`の実数を用いる。exact colorは実画面確認後に調整する |

第1色が1件以上ある場合、○最多未満の×なし候補を第3色にしない。例として、Aが○10・×0、Bが○8・×0ならAだけを第1色とし、Bは通常表示とする。

第1色がなく、Aが○10・×1、Bが○5・×0、Cが○1・×0なら、Aを第2色、Bを第3色、Cを通常表示とする。

最終候補色は自動確定ではない。確定ボタン、確定済み状態、ロック、落選候補の非表示を追加しない。

### 4.10 同期と失敗時

| ID | 受け入れ条件 |
|---|---|
| CR-10.1 初期取得 | ページを開いたときにイベント全状態を取得する |
| CR-10.2 操作後取得 | ローカルのmutation成功後にイベント全状態を再取得し、ページ再読み込みなしで置換する |
| CR-10.3 外部変更 | 別タブ・別ブラウザの変更は、次のローカル成功操作または手動再読み込み・再訪時に反映する |
| CR-10.4 競合 | 同一要素の同時編集はlast-write-winsとし、楽観ロックや履歴を追加しない |
| CR-10.5 失敗 | mutation失敗時は成功後表示へ進めず、直前の取得済み状態と入力ドラフトを保持してエラーを表示する |

Supabase Realtime、定期polling、focus復帰時の自動取得はMVP外とする。

---

## 5. 権限要件

| 操作 | 必要条件 |
|---|---|
| イベント閲覧 | 有効なshare tokenまたはowner token |
| お題・メモ編集 | 有効なowner tokenをCookieまたはowner URLで保持 |
| Participant CRUD | 有効なshare token。イベント内で共同編集 |
| Candidate / Criterion CRUD | 有効なshare token。Participant選択不要 |
| Vote / Comment CRUD | 有効なshare tokenと、対象とする同一eventのParticipant |
| Reaction / Concern CRUD | 有効なshare tokenと、対象とする同一eventのParticipant / Candidate / Criterion |
| proposer / created_by変更 | NULLまたは同一eventのParticipantのみ |

- Supabase Authとservice role keyは使わない。
- anon keyを用いる全publicテーブルでRLSを有効化し、必要なpolicyと列単位GRANTを定義する。
- tokenなし、無効token、別event IDの混入をDBで拒否する。
- `owner_token` は共同編集の名義ではない。owner画面でも子要素の変更にはshare tokenを使う。

---

## 6. 非機能要件

| 区分 | 要件 |
|---|---|
| 対応幅 | 375×812と1366×768を基準に、モバイル・デスクトップ同格で成立する |
| アクセシビリティ | 可視の状態説明を増やさず、支援技術向け状態名と○ / − / ×の実数でsemantic colorを補完する |
| セキュリティ | tokenは推測困難。RLS、列権限、同一eventガードをアプリ外でも強制する |
| 整合性 | FK、UNIQUE、CHECK、triggerでイベント境界と1人1件を保証する |
| 性能 | event単位取得・FK・並び順・集計に必要なindexを設け、CandidateごとのN+1照会を避ける |
| 時刻 | ユーザーへ表示する時刻は既存の`Candidate.created_at`だけを正とし、評価・❤️・🌀・コメント時刻を追加管理しない |
| エラー | 白画面にせず、操作対象の近くへユーザー向けメッセージを表示する |

### 6.1 開発・検証環境要件

| ID | 受け入れ条件 |
|---|---|
| CR-DEV.1 localhost限定 | Supabase local stackの全公開portを`127.0.0.1`だけへbindし、起動後検査で想定外HostIpがあれば停止する |
| CR-DEV.2 接続先分離 | Next.jsとPlaywrightが同じ明示profileを使い、localとremoteのURL・hostnameをtracked `config/supabase-targets.json`に対して起動前に検証する |
| CR-DEV.3 E2E分離 | 正式commandを`test:e2e:local` / `test:e2e:remote`へ分けて別報告にし、既存serverを再利用しない。`test:e2e`はlocalへの互換aliasだけとする |
| CR-DEV.4 migration生成 | 新規migrationは固定版Supabase CLIの`migration new`で生成し、既存migrationを変更しない |
| CR-DEV.5 local先行 | 増分適用と空DBからの`npm run supabase:db:reset`再現を通過するまでremoteへ適用しない |
| CR-DEV.6 remote境界 | CLIをremoteへlinkせず、remote migrationは別承認後に人間がSQL Editorで適用する |
| CR-DEV.7 秘密情報 | status raw出力、service role key、DB password、環境変数値をログ・報告・子processへ出さない |
| CR-DEV.8 advisor | `request_header`を独立migrationで訂正し、旧Participant policy警告は本筋migrationのpolicy置換で解消する |

詳細なprofile、command、停止条件は[Supabase CLI / Docker開発リファレンス](supabase-cli-docker-development-reference-2026-07-12.md)を正とする。

---

## 7. 今回の実装範囲

### In Scope

- オーナーとParticipantの分離
- guest_tokenによるParticipant識別の撤廃
- 回答者セレクター、同名確認、名前変更、2段階削除
- オーナー初期セットアップ、ゲスト名前選択、候補一覧ダッシュボード、候補編集
- Candidate / Criterionの作成者ルール変更
- Reaction / Criterion別Concern / Commentの共同編集モデルへの変更
- 1回答者・1候補・1コメント
- Vote 4状態とCandidate作成時刻の表示
- ○ / − / × 集計
- 3種類の最終候補色
- ❤️ / 🌀の単純合計表示
- 375px / 1366px対応
- 既存Slice 1 / 2 / 5の回帰調整
- localhost bind限定、local / remote接続先分離、local migration再現・E2E基盤
- `request_header` advisor訂正と本筋policy置換後のadvisor再確認

### Out of Scope

- 確定ボタン、確定状態、ロック
- イベント全体の一括評価マトリクスと表示切替
- Supabase Auth、ログイン、会員登録
- Participantの端末横断本人認証
- 操作履歴、変更者履歴、コメント履歴
- Realtime、polling、通知、既読
- 回答行の並び替え
- owner tokenのローテーション、排他的な権限移譲
- マイイベント一覧、広告、AI機能
- トップ下部のイベント一覧とブラウザへのEvent保存・再訪導線

---

## 8. 正本反映対象

2026-07-11〜12の製品仕様は次へ同期済み。Supabase CLI / Docker開発手順の追補は本リファレンス群のレビュー後、第二段階で正本と運用Skillへ反映する。

- `AGENTS.md` / `CLAUDE.md`
- `docs/03_requirements.md`
- `docs/04_data-model.md`
- `docs/05_dod.md`
- `docs/06_qa-flow.md`
- `docs/adr/0003-evaluation-and-decision-logic.md`
- `docs/adr/0004-permission-model.md`
- `docs/adr/0005-drop-attribute-dynamic-criteria.md` の旧current participant記述
- ADR-0006（共同編集型・回答者行モデル）
- 新規ADR-0007（イベント画面分離・判断基準別フィードバック）
- `docs/reports/ui-copy-decisions.md`
- 旧Slice 2 / 5詳細文書への部分SUPERSEDED注記
