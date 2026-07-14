# 共同編集型・回答者行モデル 文書レビュー

- レビュー日: 2026-07-11
- ステータス: **レビュー完了・正本反映済み・実装開始承認待ち**
- 対象: 共同編集型・回答者行モデルの要件、DoD、QA、仕様ドラフト
- 位置づけ: レビュー所見と未決事項の消し込み記録。正本そのものではない

> U-1〜U-8の判断、4文書への反映、最終横断レビュー、正本反映を完了した。コード実装・migration作成は別途明示された実装タスクまで行わない。
>
> **HISTORICAL（2026-07-12）:** 本レビュー後に[ADR-0007](../../adr/0007-event-views-and-criterion-feedback.md)でEvent画面分離と判断基準別🌀を追加決定した。現行実装判断には更新後の4文書とADR-0007を使う。

---

## 1. レビュー対象

- `docs/reports/collaborative-response-row-requirements-2026-07-11.md`
- `docs/reports/collaborative-response-row-dod-2026-07-11.md`
- `docs/reports/collaborative-response-row-qa-2026-07-11.md`
- `docs/reports/collaborative-response-row-spec-draft-2026-07-11.md`
- `docs/03_requirements.md`
- `docs/04_data-model.md`
- `docs/adr/0003-evaluation-and-decision-logic.md`
- `docs/adr/0004-permission-model.md`
- `docs/adr/0005-drop-attribute-dynamic-criteria.md`
- `supabase/migrations/` の適用済み5ファイル

---

## 1.1 確定した補足決定

### D-1. 時刻管理対象

- 決定日: 2026-07-11
- ユーザーへ保存・表示する時刻の対象は`Candidate.created_at`だけとする。
- 候補が早く追加されたことで評価数を得やすいバイアスを、メンバーが候補追加時刻から判断できるようにする。
- Vote / Reaction / Concern / Commentの時刻は表示せず、この目的のための新規timestamp列を追加しない。
- Candidate編集で`created_at`を変更しない。
- 相対表示は初期取得とローカルmutation成功後の完全状態取得時に算出し、timerやDB pollingを追加しない。

この決定を要件・DoD・QA・仕様ドラフトへ反映済み。

### D-2. 同じVote値の再押下

- 決定日: 2026-07-11
- U-1は案Aで確定。
- 選択済みの同じ○ / − / ×を再度押した場合はno-opとする。
- server actionやDB mutationを実行しない。
- Vote行を削除して未評価へ戻す操作にはしない。

この決定を要件・DoD・QA・仕様ドラフトへ反映済み。

### D-3. 非選択回答者行の操作

- 決定日: 2026-07-11
- U-2は案Cで確定。
- 非選択回答者行はread-onlyとし、現在値だけを表示する。
- 非選択行には○/−/×・❤️・🌀・コメントの編集controlを表示しない。
- 行本体を選択すると、値を変更せずselected participantだけを切り替える。
- 選択後、その回答者行へ編集controlを表示する。
- デスクトップとモバイルで同じ操作モデルを用いる。

この決定を要件・DoD・QA・仕様ドラフトと両ワイヤーフレームへ反映済み。

### D-4. `votes.value`の物理型

- 決定日: 2026-07-11
- U-3は案Aで確定。
- `votes.value`は`text + CHECK`とする。
- CHECK制約で`positive / neutral / veto`だけを許可する。
- Vote専用Postgres enumは作らない。
- TypeScript側も同じ3値のunion型に固定する。

この決定を要件・DoD・QA・仕様ドラフトへ反映済み。

### D-5. 3色visualとUIデザインシステム

- 決定日: 2026-07-11
- U-4は、exact visualを事前固定せず仮案実装後に調整する方針で確定。
- `decision-clear / decision-discussion / decision-fallback / decision-none`のsemantic tokenと状態の意味だけを不変仕様とする。
- exact color、状態ラベル、アイコン、配置、Candidate追加時刻の見せ方はCodexが現行デザインに合わせた仮案を作る。
- コードベースワイヤーフレームとアプリへ仮実装し、375×812 / 1366×768の実画面で後から調整する。
- exact visualはリリース前の人間確認後にUI copy / design仕様へ固定する。

この決定を要件、仕様ドラフト、DoD、QAへ反映済み。

### D-6. モバイル非選択行のコメント表示

- 決定日: 2026-07-11
- U-5は初期案Bで確定。
- 非選択行コメントは初回実装で最大3行にclampする。
- 専用の「見る」ボタンや展開操作は追加しない。
- 回答者行を選択すると、コメント全文と編集textareaを表示する。
- 2行／3行の最終値は375px実画面で後から調整する。

この決定を要件、仕様ドラフト、DoD、QAへ反映済み。

### D-7. 名前確定処理と明示操作の優先順位

- 決定日: 2026-07-11
- U-6は推奨案で確定。
- Enter、blur、明示操作は別々にParticipant作成を行わず、単一の名前確定処理へ集約する。
- 優先順位は「既存回答者の明示選択 → 明示操作 → 非IME Enter / モバイル完了 → 通常blur」とする。
- 明示操作のintentをblurより先に記録し、その操作起因の通常blur保存を抑止する。
- 失敗時は名前draftを保持するがpendingを破棄し、連打時は最初のintentだけを実行する。
- 同名確認で別人を選んだ場合は異なる名前の再入力までpendingを維持し、キャンセル時だけ破棄する。
- 名前draftがあるEvent / Candidate / CriterionのDB操作はParticipant解決後に一度だけ実行し、非DB操作は妨げない。

この決定を要件、仕様ドラフト、DoD、QAへ反映済み。

### D-8. selected participantのlocalStorageキー

- 決定日: 2026-07-11
- U-7は推奨案で確定。
- キーを`kimenosuke:selected-participant:<event_id>`へ固定する。
- share URLとowner URLで同じevent ID基準のキーを使う。
- valueはParticipant IDだけとし、権限には使わない。
- 行が不在・削除済みならキーを削除する。

この決定を要件、仕様ドラフト、DoD、QAへ反映済み。

### D-9. 重複Voteの経路別期待値

- 決定日: 2026-07-11
- U-8は推奨案で確定。
- アプリの`setVote`はupsert / updateで同一Candidate×ParticipantのVoteを1行に保つ。
- anon clientからのraw duplicate INSERTは2回目をUNIQUE制約で拒否する。
- 2つの経路を別テストに分ける。

この決定を要件、仕様ドラフト、DoD、QAへ反映済み。

---

## 2. 要修正: 文書内の先取り矛盾

### R-1. U-1と仕様書4.5の矛盾（解消済み）

仕様書4.5は、Voteの`updated_at`について「valueが変わるUPDATE時にDBが`updated_at=now()`を設定する」と記載している。この記述は、U-1の案A「同値再押下はno-opで、updated_atを変更しない」を先取りしている。

一方、仕様書14章のU-1では、同値再押下時に`updated_at`だけを更新する案Bも未決候補としている。実装者が両方を読むと分岐する。

対応方針:

- U-1を案Aで確定し、4.5を維持する。
- またはU-1確定まで4.5を中立表現へ戻す。

解消内容:

- D-1によりVoteの`created_at` / `updated_at`仕様を削除した。
- 仕様4.5からtimestamp管理を撤去したため、U-1の同値再押下挙動を確定前に先取りする記述はなくなった。
- timestamp撤去後に残った「同値を押したときno-opか、未評価へ戻すか」は、D-2で案Aのno-opに確定した。

### R-2. U-2とデスクトップ・モバイルWFの矛盾（解消済み）

レビュー時点では、U-2の非選択回答者行controlの挙動が未決だった。

- 仕様書9.2のデスクトップWFは全回答者行へ`[○][-][×]`を表示し、選択中行だけを強調しているため、直接操作可能な案B寄りに読める。
- 仕様書9.3のモバイルWFは選択中行だけcontrolを展開し、非選択行は簡潔表示する案C寄りである。

解消内容:

- D-3で案Cを確定した。
- デスクトップ・モバイルとも、非選択行をread-only、選択行だけ編集可能とする同一モデルへ修正した。
- 非選択行の最初のclickは選択切替だけを行い、回答値を変更しない。

---

## 3. 要明確化: U-6〜U-8（解消済み）

### U-6. pending actionとblur確定の優先順位（解消済み）

レビュー時点では、未選択で名前入力中に候補の○等を押すと、次の二経路が同時に成立していた。

1. セレクター外へのfocus移動によるblur確定とParticipant生成
2. 個人名義操作のpending化、回答者選択後の操作再開

in-flight guardで二重mutationを防げても、Participant生成をどちらの経路が管理するかが未定義だった。

解消内容:

- D-7で、personal action起因のblurでは通常blur保存を抑止し、明示操作側が単一の名前確定処理を通じてParticipant解決と元操作を直列管理すると確定した。
- 既存回答者の明示選択、明示操作、Enter / モバイル完了、通常blurの優先順位を固定した。
- 名前draftの有無、既存選択、同名確認、失敗、unique競合、連打、Event / Candidate / Criterion操作、非DB操作、画面離脱の各ケースを仕様とQAへ追加した。

### U-7. localStorageキー基準（解消済み）

レビュー時点の仕様書3.4は「event IDまたはshare tokenを含むevent単位キー」と二択になっていた。

解消内容:

```text
kimenosuke:selected-participant:<event_id>
```

- D-8で上記キーへ固定した。
- share URL / owner URLの双方でEvent取得後に同じキーを使う。
- 行が不在・削除済みの場合はキーと現在選択を解除する。

### U-8. Q-VOTE-12の期待値（解消済み）

解消内容:

- D-9で経路別の期待値を確定した。
- Q-VOTE-12aはアプリの`setVote`を繰り返し、upsert / update後も行数1を確認する。
- Q-VOTE-12bはanon clientから同じCandidate×ParticipantをINSERTのみで2回送り、2回目のUNIQUE拒否を確認する。

テスト名、操作経路、期待結果を分離済みである。

---

## 4. 軽微な明確化

### R-3. 相対時刻コピー（仮案実装後の調整事項）

Candidate作成時刻の「1時間以内に追加」と、60分以上の「1時間前に追加」はどちらも「1時間」を含む。境界仕様自体は決定的であり、語調と分かりやすさはD-5に従って仮案実装後のUI copy確認で調整する。実装開始を止める未決事項にはしない。

### R-4. 相対時刻テストの固定clock（対応済み）

相対時刻は`Candidate.created_at`とクライアント時計の差で算出する。Q-TIME系で時計を固定し、実時間経過で揺れないようにする旨をQAへ追記済み。

### R-5. orphan Vote防御ケース（対応済み）

Q-READ-05の参照先のないVoteは、通常はFKとcascadeにより生成されない。DB破損・不完全fixtureに対する防御的read model試験として残す意図をQAへ注記済み。

### R-6. Candidate作成時刻が未来の場合（対応済み）

クライアント時計のずれで`Candidate.created_at`が現在時刻より未来になる場合は、経過時間を0へclampして「1時間以内に追加」と表示する。要件・DoD・QA・仕様ドラフトへ反映済み。

---

## 5. 未決事項の消し込み台帳

| ID | 論点 | 現在 | 同時修正対象 |
|---|---|---|---|
| U-1 | 同じVote値の再押下 | **解消済み: A（no-op）** | 要件、仕様4.5/7.2/14、DoD、QAへ反映済み |
| U-2 | 非選択回答者行controlの直接操作 | **解消済み: C（read-only→行選択→編集）** | 要件、仕様9.2/9.3/14、DoD、QAへ反映済み |
| U-3 | `votes.value`の物理型 | **解消済み: A（text + CHECK）** | 要件、仕様4.5/14、DoD、DB QAへ反映済み |
| U-4 | 3色・状態ラベル・Candidate追加時刻コピー | **解消済み: semantic token固定・exact visualは仮案実装後に調整** | 要件、仕様9.8/14、DoD、QAへ反映済み |
| U-5 | モバイル非選択行コメント表示量 | **解消済み: 初期案B（3行clamp、選択後全文）** | 要件、仕様9.3/14、DoD、375px QAへ反映済み |
| U-6 | pending actionとblur確定の優先順位 | **解消済み: 明示操作優先・単一の名前確定処理** | 要件、仕様7.4/8/14、DoD、Participant E2Eへ反映済み |
| U-7 | localStorageキー基準 | **解消済み: event ID固定キー** | 要件、仕様3.4/14、DoD、再訪E2Eへ反映済み |
| U-8 | 重複Voteの経路別期待値 | **解消済み: アプリupsertとraw INSERT拒否を分離** | 要件、仕様7.2/14、DoD、QA Q-VOTE-12a/12bへ反映済み |

全項目の決定内容、決定日、反映ファイルを記録し、4文書の最終横断レビューを完了した。

---

## 6. 次の手順

1. ~~おしげさん承認後に4文書を正本へ反映する。~~ **完了（2026-07-11）**
2. 正本と詳細文書の再レビューを完了後、別途明示された実装タスクでコードベースワイヤーフレームへ進む。

---

## 7. 最終横断レビュー結果

- U-1〜U-8に未決事項は残っていない。
- U-6は名前draftの有無、既存選択、同名確認、unique競合、連打、失敗、共有DB操作、非DB操作、画面離脱を一つの優先順位と単一coordinatorで説明できる。
- U-7はevent ID固定キーに統一され、share URL / owner URL間の分岐がない。
- U-8はアプリupsertとraw duplicate INSERT拒否を別テストへ分離した。
- 時刻管理対象は`Candidate.created_at`だけで、Vote時刻を期待する旧QA表現を除去した。
- `Candidate.created_at`がクライアント時計より未来の場合も、経過時間を0へclampするため負の相対表示にならない。
- Candidate / Criterion追加は「名前draftなしではParticipantを生成しない」「名前draftありでは名前確定を先行する」と条件を分け、矛盾を解消した。
- デスクトップとモバイルの非選択回答者行は、どちらもread-onlyから選択後に編集する案Cで一致している。

結論: この5文書と反映後の正本には、一意実装を妨げる矛盾・未決事項はない。旧Slice文書は履歴として残し、ADR-0006の部分SUPERSEDED注記を優先する。実装開始には別途明示指示を必要とする。
