> **Status: SNAPSHOT / HISTORICAL**
>
> 2026-07-14時点のPC移行・local Supabase復旧結果snapshotである。現在の運用は[ADR-0008](../../adr/0008-local-supabase-development-workflow.md)と[`operate-supabase-live-db`](../../../.agents/skills/operate-supabase-live-db/SKILL.md)を確認する。本書は現行手順ではない。

# PC移行後のローカルSupabase復旧・E2E cleanup実施報告

- 実施日: 2026-07-14
- ステータス: **完了（Gate 4 COMMIT・postcheck PASS）**
- 対象: PC更新後のWhere-to-Visitローカル開発環境、local Supabase、Playwright Chromium、`[E2E]`データcleanup
- 正本: ローカル／remote運用は[ADR-0008](../../adr/0008-local-supabase-development-workflow.md)と`.agents/skills/operate-supabase-live-db/`を正とする。本書は今回の実施結果と再利用する教訓の記録であり、手順の正本を置き換えない。

---

## 1. 結論

PC更新後のローカル開発環境を、既存コード・migration・依存関係・Git履歴を変更せずに復旧確認した。Playwright Chromium、Docker Desktop、local Supabase、8 migration、local E2E、および`[E2E]` cleanupの全gateをlocalだけで完了した。

cleanupは、fresh discovery、ROLLBACK検証、ROLLBACK後復元確認、COMMIT準備、COMMIT、postcheckを明確に分離した。最終的に、今回のE2Eで追加された固定4 Eventと関連行は永続削除され、既存の`[E2E]` Event 41件は残った。

remote Supabase、GitHub、Vercel、migration適用、schema／RLS／アプリコード／依存関係、Git履歴には触れていない。

---

## 2. 開始・終了時のGit基準

| 項目 | 結果 |
|---|---|
| branch | `main` |
| HEAD | `858cec32bee34019cf4f225c25de83964fd7903a` |
| `origin/main...HEAD` | `0 / 0`（local tracking ref基準） |
| tracked差分 | なし |
| staged差分 | なし |
| 保護対象の未追跡文書 | 2件。内容確認・編集・stage・移動なし |
| commit / push / fetch / reset / stash | 未実施 |

この基準は、復旧確認、E2E、cleanupの各gate前後で維持した。

---

## 3. PC移行後の復旧確認

### 3.1 Playwright

- 既存lockfileに固定されたPlaywrightを使用した。
- `npx --no-install playwright install chromium`でChromiumだけを導入した。
- 既存PlaywrightからChromium executableを解決できることを確認した。
- `package.json`と`package-lock.json`に差分は生じなかった。
- この段階ではE2Eを実行していない。

### 3.2 Docker Desktopとlocal Supabase

repository wrapperだけを使い、通常停止、起動、status、再停止を確認した。

- `npm run supabase:start`はproject専用networkを作成または再利用し、localhost bindを検証する。
- 公開ポートはAPI `54321`、DB `54322`、Studio `54323`、Mailpit `54324`、Analytics `54327`で、すべて`127.0.0.1`に限定された。
- `npm run supabase:stop`はcontainerを停止し、persistent volumeを保持した。
- stop後の`npm run supabase:status`はstack停止を返した。
- raw Docker、raw `psql`、host DB URLは使用していない。

### 3.3 Migration

local wrapper経由のmigration listで、次の8件がlocal historyと一致した。

```text
20260708000000
20260710000000
20260710010000
20260710020000
20260710021000
20260712032345
20260712032527
20260712144228
```

migration apply、reset、repair、replayは実施していない。

---

## 4. local E2Eとcleanup前の基準

local E2Eは1回だけ実行した。

| 項目 | 結果 |
|---|---|
| 実行 | `npm run test:e2e:local` |
| PASS | 6 |
| FAIL | 0 |
| SKIP | 1 |
| skip理由 | Supabase設定時の既知のsetup configuration test |

E2E後、`[E2E]` Eventをfresh discoveryで再棚卸しした。対象はGate 2で追加された次の4 Eventである。

```text
bf477f5c-e618-4e26-b176-93dc62640140
caeeb6e0-0181-4aec-88da-9304113834dd
eb79445e-889b-4a13-bc1e-7a76c9dd409c
edc97f45-03bb-4dac-8b54-b4bc93b8e17b
```

fresh discoveryの結果:

| 項目 | 結果 |
|---|---:|
| `[E2E]` Event | 45 |
| Gate 1既存prefix Event | 41 |
| Gate 2追加対象 Event | 4 |
| participants | 46 |
| candidates | 50 |
| criteria | 45 |
| votes | 22 |
| reactions | 14 |
| concerns | 22 |
| comments | 0 |

nullability profile、cleanup graphを横切るboundary FK、12 trigger profile、6 cross-event invariantも確認し、driftは検出されなかった。

---

## 5. cleanup gateの経過と結果

### 5.1 Gate 3: ROLLBACK検証

固定ROLLBACK SQLはhash-pinned artifactとして専用wrapperから1回実行した。

| 項目 | 値 |
|---|---|
| runtime manifest SHA-256（更新前） | `b110b1cb3d0f0ea5510f770d8a7b67baaac8c13a3450d5d89b91a757e945852a` |
| fixed ROLLBACK SQL SHA-256 | `d6e4d5e0c1d93d8c8940358df2d8bf3fd56eb586b423834d4e0690e2a0126a34` |
| scope digest | `2f9665e9cdd01df8a7cf6f0ae31e493ca326d76b890f42b5f9f482088f4d4fc7` |
| `all_guards_passed` | `true` |
| saved PK remaining | 8 entityすべて0 |
| transaction終端 | `ROLLBACK` |

削除予定件数とoperation countsは全件一致した。ROLLBACK後は、45 Event、対象4 UUIDの存在、8 entityのprefix集計がfresh discovery基準へ完全復元していることをSELECT-onlyで確認した。

### 5.2 Gate 4準備

ROLLBACK復元確認をruntime manifestへ記録し、manifest scopeを不変に保ったままCOMMIT SQLを生成・静的検証した。

| 項目 | 値 |
|---|---|
| runtime manifest SHA-256（更新後） | `c7a83905a330109329feeffdd6c38bf22189d2a49e7b2ad94a84168ebdb5df27` |
| `rollbackVerification.verifiedAt` | `2026-07-14T13:16:51.758Z` |
| fixed COMMIT SQL SHA-256 | `7fb0314ed622465a1e6e7763a6d697f1dcde5b082620b6fe4acb8e02a7f77007` |
| COMMIT SQL | 28,597 bytes、847 lines、owner-only |

更新を許可したのは`rollbackVerification`の4項目と`commitAuthorization`だけである。COMMIT SQLはrepoの構文認識で、top-level `BEGIN`、中間transaction controlなし、top-level `ROLLBACK`なし、終端`COMMIT`、単一`cleanup_evidence`を確認した。

### 5.3 Gate 4: COMMITとpostcheck

明示的な永久削除承認後、fixed COMMIT SQLをlocal wrapperから1回だけ実行した。

| Evidence | 結果 |
|---|---|
| mode | `commit` |
| target Event | 4 / expected 4 |
| prefix Event（削除前） | 45 / expected 45 |
| pre-delete counts | events 4 / participants 4 / candidates 4 / criteria 4 / votes 2 / reactions 1 / concerns 2 / comments 0 |
| operation counts | votes 2 / comments 0 / reactions 1 / concerns 2 / events 4 |
| saved PK remaining | 8 entityすべて0 |
| `all_guards_passed` | `true` |
| transaction終端 | `COMMIT` |

同一manifestからSELECT-only postcheckを生成し、local wrapperの単一prepared-statement制約に合わせて2ファイルへ機械分割した。

| Postcheck | 結果 |
|---|---|
| 固定4 Eventの残存 | 0件 |
| 残存`[E2E]` Event | 41 / expected 41 / 一致 |

COMMIT後にlocal stackを通常停止し、persistent volumeの保持を確認した。

---

## 6. 今後に活かす運用原則

1. **PC移行直後は依存関係を更新しない。** 固定済みPlaywrightから必要なbrowserだけを導入し、lockfileとpackage manifestに差分を出さない。
2. **Supabaseはwrapperを唯一の入口にする。** start / status / stop、migration list、DB query、cleanup transactionのすべてをrepository npm wrapper経由で行う。raw Docker、raw `psql`、host DB URLは使わない。
3. **targetと承認境界を毎回明示する。** local / remote、profile、localhost bind、次に許可される操作を混同しない。
4. **cleanupは4段階を混ぜない。** discovery → ROLLBACK → 復元確認 → COMMIT → postcheckを別gateにし、ROLLBACKはCOMMIT承認を意味しない。
5. **write artifactはhashで固定する。** runtime manifest、ROLLBACK SQL、COMMIT SQLについて、path、SHA-256、scope digest、権限、サイズを実行前に再確認する。
6. **local query wrapperの単一文制約を守る。** generatorが複数SELECTを出す場合は、SQL文字列・quote・commentを扱う機械分割を行い、1ファイルずつhash確認して実行する。
7. **成功表示だけで判断しない。** COMMITでは`cleanup_evidence`のcounts、saved PK remaining、guard verdict、終端transactionを確認し、さらに新規SELECT-only postcheckで永続状態を確認する。
8. **停止を完了条件に含める。** 最終`supabase:stop`、status、volume保持、Git不変を確認してからgateを閉じる。

---

## 7. 次回PC移行の最小チェックリスト

```text
1. repo root / branch / HEAD / tracked・staged差分 / 保護untrackedを確認
2. Docker Desktopとdocker composeの接続を確認
3. npx --no-install playwright install chromium
4. Chromium executableを既存Playwrightから解決
5. npm run supabase:status（停止基準を確認）
6. npm run supabase:start → npm run supabase:status
7. localhost bindとmigration listを確認
8. 必要なlocal E2Eを明示profileで1回実行
9. E2Eデータcleanupが必要なら、Skillのdiscoveryから別承認gateで開始
10. npm run supabase:stop → npm run supabase:status
11. Git状態とvolume保持を確認
```

cleanupを伴わない通常のPC移行では、手順9を実施しない。remote操作、migration apply、DB reset、依存更新は別目的・別承認で扱う。
