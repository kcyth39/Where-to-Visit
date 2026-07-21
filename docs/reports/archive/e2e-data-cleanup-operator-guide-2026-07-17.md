> **Status: SUPERSEDED / DO NOT EXECUTE**
>
> 本文は2026-07-17時点の旧cleanup手順を履歴として保持する。現在のcleanupは[`operate-supabase-live-db`](../../../.agents/skills/operate-supabase-live-db/SKILL.md)と[`cleanup-protocol.md`](../../../.agents/skills/operate-supabase-live-db/references/cleanup-protocol.md)を使用する。本書の手順を再実行しない。

# E2Eデータcleanup 人間操作ガイド（S0-a）

- 作成日: 2026-07-17
- 対象: `Where-to-Visit`で新たに生成された`[E2E]` Eventと関連行
- 位置づけ: おしげさんが承認・実行するための操作案内。技術手順の正本は`.agents/skills/operate-supabase-live-db/`とADR-0008
- 状態: 手順文書化済み。DB discovery / ROLLBACK / COMMIT / postcheckは未実行

## 1. 絶対境界

- 過去のUUID、件数、SQL、manifest、scope digestを再利用しない。毎回fresh discoveryから始める。
- title prefixだけ、またはUUIDだけで削除しない。fresh discoveryで確定したprefixとUUID allowlistの両方を使う。
- remote DBの書込みは、おしげさんが確認済みSupabase SQL Editorで実行する。CodexはSQL下書き、hash確認、結果評価だけを担当する。
- local DBでもraw Docker、raw `psql`、host DB URLを使わない。repoのnpm wrapperだけを使う。
- ROLLBACK成功はCOMMIT承認を意味しない。COMMIT、postcheck、Git操作はそれぞれ別gateとする。
- SQLエラー、件数不一致、schema drift、結果欠落があれば再実行せず停止する。

## 2. 開始時に伝える情報

Codexへ次を明示する。

1. phase: `local`または`remote`
2. 目的: `[E2E]`データのinventoryだけか、削除候補のcleanupまでか
3. 対象を作ったE2E実行または日時
4. 現時点では許可するgateだけ（例: `fresh discoveryのみ。ROLLBACK SQLはまだ生成しない`）

remoteの場合、書込み直前に次を別々に確認する。

- Supabase dashboard project
- Reference ID
- Database hostname
- port
- database
- SQL Editor role

## 3. Gate 1: fresh discovery（読取のみ）

Codexへ次のように依頼する。

> `operate-supabase-live-db` Skillに従い、対象phaseを明示してfresh discoveryを準備してください。過去のUUID・件数・SQLを再利用せず、schema profile、FK、trigger、cross-event invariant、`[E2E]` Event UUIDと8 entity件数を確認してください。今回は読取だけです。ROLLBACK / COMMIT SQLは生成・実行しないでください。不一致時は停止してください。

確認結果:

- 対象phase、profile、非secret target metadataが明示されている
- schema profile、FK、trigger、nullabilityが現行Skillと一致する
- cross-event invariantがすべて0
- 対象候補のEvent UUID、title、作成日時、8 entity件数が一覧化されている
- 対象0件ならcleanupを終了し、ROLLBACK / COMMITへ進まない

対象がある場合、おしげさんが削除候補の正確なEvent UUID allowlistを選ぶ。ここで停止する。

## 4. Gate 2: ROLLBACK検証

fresh discovery結果を確認後、ROLLBACK SQLの生成を別承認する。生成物はrepo外の`/private/tmp`に置き、path、SHA-256、権限、size、対象UUID、期待件数、scope digestを確認する。

- local: `npm run supabase:cleanup:local -- --mode rollback --file <absolute-path> --sha256 <digest>`だけを使う。
- remote: おしげさんが新規SQL Editor queryへ全文を入力する。searchと選択範囲を解除し、全文一致を確認して1回だけ実行する。

合格条件:

- pre-delete件数とmanifestが一致
- operation countsが一致
- transaction内では固定対象のsaved primary key残存が8 tableすべて0
- final guardがtrue
- 終端が`ROLLBACK`
- ROLLBACK後のfresh SELECT-only inventoryで対象UUIDと全件数が完全復元

復元確認とscope digestを記録し、COMMIT承認前に停止する。

## 5. Gate 3: COMMIT

永久削除は、おしげさんが対象UUID、件数、復元確認、scope digestを再確認して別承認する。ROLLBACK SQLを編集してCOMMITへ変えず、同じmanifestから`--mode commit`で別artifactを生成する。

- 対象・件数・profile・scope digestを変更しない。
- manifestの`rollbackVerification`へ確認結果を記録し、`commitAuthorization`は承認後だけ設定する。
- localはhash-pinned artifactを`npm run supabase:cleanup:local -- --mode commit ...`で1回実行する。
- remoteはproject、database、roleを再確認し、おしげさんがSQL Editorで全文を1回実行する。

SQLエラーまたは結果不一致時は再実行せず、新しいSELECT-only queryで永続状態を調査する。

## 6. Gate 4: postcheck（読取）

同じmanifestから`--mode postcheck`を生成し、次を確認する。

- 固定対象Event UUIDの関連行が8 tableすべて0
- 残す予定の`[E2E]` Event件数が`expectedRemainingPrefixEvents`と一致
- COMMIT evidenceのsaved primary key残存が8 tableすべて0
- repoのworking treeがDB操作によって変わっていない

対象件数、8 entity件数、operation counts、postcheck結果を記録してcleanupを完了する。

## 7. 即時停止条件

- target、project、database、roleのいずれかが不明または不一致
- `.env`値やpassword等のsecretが表示された
- localhost以外へ公開されたlocal Docker port
- UUID、prefix、件数、SHA-256、scope digestの不一致
- schema profile、FK、trigger、nullabilityのdrift
- cross-event invariant違反
- SQL Editorの部分選択、全文不一致、結果set欠落
- lock timeout、statement timeout、trigger error、SQL error
- ROLLBACK後にbaselineが完全復元しない
- COMMITの独立承認がない

停止後は同じSQLを再実行せず、状況と完全なエラーをCodexへ返す。
