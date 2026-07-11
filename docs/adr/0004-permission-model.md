# ADR-0004: 権限モデル（性善説）

- **ステータス:** Accepted
- **日付:** 2026-07-08
- **最終改訂:** 2026-07-12（[ADR-0007](0007-event-views-and-criterion-feedback.md)）
- **関連:** [ADR-0003](0003-evaluation-and-decision-logic.md) / [ADR-0006](0006-collaborative-response-row-model.md) / [ADR-0007](0007-event-views-and-criterion-feedback.md) / [04_data-model](../04_data-model.md)

## コンテキスト

きめのすけはログイン不要で、共有URLを知る人がEvent内の情報を共同編集する。個人を厳密に認証しないため、Participantを本人専用データとせず、調整さん型の名前付き回答行として扱う。誤操作対策は所有者制限ではなく、共有範囲、確認UI、DBのEvent境界で行う。

## 決定

### capabilityの分離

| capability | 用途 | 保持 |
|---|---|---|
| `share_token` | Event閲覧と共有要素の共同編集 | 共有URL・server action context |
| `owner_token` | お題・メモ編集 | owner URLまたはEvent share path限定HttpOnly Cookie |
| selected participant | 個人名義操作の対象 | event ID単位localStorage。権限ではない |

- オーナー権限はParticipantと分離し、`owner_token`だけで判定する。
- Event作成時にowner Participantを生成しない。
- owner token単独ではEvent title / memo以外の共同編集mutationを許可しない。owner画面でも共有要素の変更にはshare tokenを使う。
- `guest_token`によるParticipant本人認証を撤廃する。

### 性善説の共同編集

- 共有URLを知る全員が、同一EventのParticipant、Candidate、Criterion、Vote、Reaction、Concern、Commentを共同編集できる。
- Participantは本人所有ではない。別ブラウザから既存行を選択し、名前と回答を変更できる。
- 操作者、変更履歴、監査履歴はMVPで保存しない。
- 異なるEventのID参照、同名Participant、重複行、不変列更新はDBで拒否する。

### 操作別権限

| 操作 | 権限 | 補足 |
|---|---|---|
| Event閲覧 | share tokenまたはowner token | noindexを維持 |
| お題・メモ編集 | owner token | 「変更します、よろしいですか？」確認 |
| Participant作成・選択・名前変更 | share token | 同名確認。名前変更は1段階確認 |
| Participant削除 | share token | 2段階確認。個人配下データcascade |
| Candidate追加・編集 | share token | 回答者未選択でも可。編集は要素ごとの確認 |
| Candidate削除 | share token | 2段階確認・物理削除・cascade |
| Criterion追加・label編集 | share token | 回答者未選択でも可 |
| Criterion削除 | share token | 2段階確認・Reaction / Concern cascade |
| Vote作成・更新 | share token＋同一Event Participant指定 | 任意回答者行を選択して共同編集 |
| Reaction / Concern INSERT・DELETE | share token＋同一Event Participant・Criterion指定 | selected participant名義。判断基準別・UPDATEなし |
| Comment作成・更新・削除 | share token＋同一Event Participant指定 | Candidate×Participantで現在値1件 |

### 回答者行と名前確定

- 名前は非IME Enter、モバイル完了、回答者セレクター全体外への通常blurで確定する。入力だけでは保存しない。
- 名前だけの確定でもParticipantを作成する。
- 同名の場合は本人か確認し、本人なら既存行を使う。別人なら同名行を作らず異なる名前の再入力を求める。
- 個人名義操作を未選択で始めた場合は保留し、Participant解決成功後に一度だけ再開する。
- Candidate / Criterion追加自体はParticipantを暗黙生成しない。ただしtrim後非空の名前draftがあれば、名前確定を先に完了して`created_by`へ設定する。

### 削除と確認

| 対象 | 確認 |
|---|---|
| Participant | 2段階。Vote / Reaction / Concern / Commentをcascade、Candidate / Criterion `created_by`をNULL |
| Candidate | 2段階。配下データをcascade |
| Criterion | 2段階。Reaction / Concernをcascade |
| Comment | 専用削除確認を追加せず、空保存をDELETEとして扱う |
| Reaction / Concern | 選択中回答者のtoggleとして即時変更 |
| Vote | 同値再押下はno-op。未評価へ戻す削除UIなし |

### RLS境界

- SELECTは対象Eventの有効なshare tokenまたはowner tokenに限定する。
- Participant / Candidate / Criterion / Vote / Reaction / Concern / Commentの変更はshare tokenに限定する。
- DBはReaction / Concernを含め、Candidate / Participant / Criterionの同一Event整合性を強制する。
- anon roleへ必要なtable・column・functionだけをGRANTする。
- security definer関数は固定`search_path`、PUBLICからEXECUTE剥奪、必要roleだけ明示GRANTする。
- Supabase Auth、service role、local JSON fallbackを使わない。

### 同時編集・同期

- 同一要素の同時編集はlast-write-wins。
- ローカルmutation成功後に完全EventStateを再取得し、操作画面へページ再読み込みなしで反映する。
- 別タブ・別ブラウザの変更は、次のローカル成功操作または手動再読み込み・再訪で取り込む。
- Realtime、定期polling、focus復帰時の自動取得はMVP外。

## 影響

- 所有者本人だけを編集可能にするチェックを共有要素へ追加しない。
- 選択中Participant IDは操作対象であって、認証情報ではない。
- なりすまし・重複人物行の完全防止はログインなしの帰結としてMVP外。ただしEvent内のtrim後同名は確認とUNIQUE制約で抑止する。
- 旧仕様の「現在のguest token名義だけが新規Reaction / Concern / Commentを作れる」「Candidate追加でブラウザParticipantを生成する」「専用名前編集UIを持たない」はADR-0006によりSUPERSEDED。
