# ADR-0008: ローカルSupabase開発・検証とリモート適用境界

- **ステータス:** Accepted
- **日付:** 2026-07-12
- **決定者:** おしげさん
- **関連:** [ADR-0002](0002-tech-stack.md) / [ADR-0006](0006-collaborative-response-row-model.md) / [ADR-0007](0007-event-views-and-criterion-feedback.md) / [04_data-model](../04_data-model.md) / [06_qa-flow](../06_qa-flow.md) / [Supabase CLI / Dockerリファレンス](../reports/supabase-cli-docker-development-reference-2026-07-12.md) / [Supabase Local Development](https://supabase.com/docs/guides/local-development) / [Supabase Database Migrations](https://supabase.com/docs/guides/deployment/database-migrations)
- **実装状態（2026-07-13）:** Supabase CLI 2.109.1、localhost bind限定、safe reset、接続先切り替え、local / remote E2E分離、advisor訂正、cleanup wrapperを実装・検証済み

## コンテキスト

従来は、新規migrationを人間がremote SupabaseのSQL Editorへ適用してから実DB E2Eを行っていた。この方法だけでは、migrationの増分適用、空DBからの全履歴再現、RLS・policy・GRANT・trigger・FK・advisorの検証をremote変更前に完了できない。

Supabase CLIとDockerを導入すれば、同じmigration列をlocal PostgreSQLへ適用して検証できる。一方、CLI導入時点の`supabase start`は公開portをlocalhost以外へbindする可能性があり、Next.jsとPlaywrightも接続先を明示的に分離していない。また、このprojectは過去のmigrationをSQL Editorで手動適用しており、remoteのCLI migration historyを正本としていない。

そのため、local-first検証を追加しつつ、remote適用方式や承認ゲートを暗黙に変更しない運用境界が必要である。

## 決定

### 1. CLI / Dockerはlocal検証専用とする

- Supabase CLIはdevDependencyの`2.109.1`へ固定する。
- local PostgreSQLは17、Authは無効、seedは無効とする。
- CLIのDB操作は`--local`を明示し、実行前に固定版の`--help`で使用するsubcommandとflagの実在を確認する。
- local stackは通常停止し、必要な検証中だけ起動する。

### 2. local stackをlocalhostへ限定する

- project専用Docker bridge networkへ`com.docker.network.bridge.host_binding_ipv4=127.0.0.1`を設定する。
- `supabase start --network-id <project-network>`で起動する。
- 起動後に全公開portの`HostIp`とportを検査し、`0.0.0.0`、`::`、空値、想定外portが1件でもあればstackを停止して失敗とする。
- `db.network_restrictions`をhost bind限定の代替にしない。

### 3. local / remote接続先を起動前に固定する

Git非追跡profileを次へ分ける。

```text
.env.supabase.local
.env.supabase.remote
```

両profileがアプリへ渡すkeyは`SUPABASE_URL`と`SUPABASE_ANON_KEY`だけとする。値はログ、画面、差分、報告へ表示しない。

接続先の正表はtracked file `config/supabase-targets.json`とし、次の形式へ固定する。

```json
{
  "local": {
    "protocol": "http:",
    "hostname": "127.0.0.1",
    "port": "54321"
  },
  "remote": {
    "protocol": "https:",
    "hostname": "<human-confirmed-dev-project-hostname>",
    "port": "443"
  }
}
```

- localは`http://127.0.0.1:54321`完全一致を必須とする。
- remote hostnameは人間確認済みdev projectのhostnameと完全一致させる。
- target不明、key不足、protocol・hostname・port不一致、local stack停止中では子processを起動しない。
- service role keyとDB passwordをprofile、Next.js、Playwrightへ渡さない。

### 4. 開発・E2E commandを分離する

正式commandは次とする。

| 用途 | Local | Remote |
|---|---|---|
| Next.js開発 | `npm run dev:local` | `npm run dev:remote` |
| Playwright E2E | `npm run test:e2e:local` | `npm run test:e2e:remote` |

`npm run dev`は`dev:local`、`npm run test:e2e`は`test:e2e:local`への互換aliasとする。公式な検証報告ではaliasではなく明示的な`:local` / `:remote` commandを記録する。

Playwrightは`reuseExistingServer: false`とし、test runnerと新規Next.js serverへ同じprofileを渡す。各specは`.env`や`.env.local`を独自に読み込まない。

local DBの正式commandは次のnpm wrapperに限定する。wrapperが固定`--local`とproject専用`--network-id`を付与し、利用者からのnetwork上書きを拒否する。

| 用途 | 正式command |
|---|---|
| migration一覧 | `npm run supabase:migration:list` |
| migration増分適用 | `npm run supabase:migration:up` |
| SELECT/postflight | `npm run supabase:db:query -- <query arguments>` |
| advisor | `npm run supabase:db:advisors` |
| pgTAP | `npm run supabase:test:db -- <test paths>` |
| clean-chain reset | `npm run supabase:db:reset` |

reset wrapperはDocker createをdaemon転送前に検査し、全PortBindingsを`127.0.0.1`へ固定する。DB container createを観測できない場合、path/JSON/HostIpが不正な場合、project containerが専用network外へ逸脱した場合はCLIを終了し、stack・profileをfail-closedで破棄する。

### 5. migrationはlocal-firstで検証する

- 適用済みmigrationをbyte-for-byteで維持する。
- 新規migrationは`npx supabase migration new <descriptive_name>`で生成する。
- 増分適用は`npm run supabase:migration:list`と`npm run supabase:migration:up`で確認する。
- local postflightでschema、RLS、policy、GRANT、function、trigger、FK、index、負系、不変条件、advisorを確認する。
- remote適用前の最終ゲートで、localデータ破棄を確認してから`npm run supabase:db:reset`を実行し、空DBから全migrationを再現する。生のCLI resetは禁止する。
- clean-chain replay後に`npm run test:e2e:local`、`npm run check`、`npm run build`、`git diff --check`を通す。

### 6. remote適用方式はSQL Editorのまま維持する

remote migrationは、別承認後に人間が確認済みproject / database / roleのSupabase SQL Editorでmigration全文を一度だけ実行する。CLI導入を、remote適用方式変更の承認とみなさない。

次を禁止する。

- `supabase login`
- `supabase link`
- `supabase db pull`
- `supabase db push`
- `supabase migration up --linked`
- `supabase db reset --linked`
- remote databaseを指定する`--db-url`
- `supabase migration repair`

Supabase公式手順ではtracked migrationのremote適用に`db push`を用い、SQL Editorでの直接適用はCLI migration historyを更新しない。本projectは既存の手動適用履歴を持つため、将来`db push`へ移行する場合は履歴照合・調停を独立タスクとして承認する。現在の手順へ暗黙に混在させない。

### 7. advisor訂正と本筋migrationを分離する

- `public.request_header`のmutable search pathだけを独立した先行migrationで訂正する。
- 現行`participants`の重複permissive policyだけを直す一時migrationは作らない。
- Participant警告はADR-0006本筋migrationで旧policyを撤去・再構成して解消する。
- 本筋migration後にlocal advisorを再実行し、既知3件の解消と新規警告なしを確認する。

## 承認ゲート

1. localhost bind限定と接続先切り替えを実装・検証する。
2. advisor訂正migrationをlocalで増分適用・postflightする。
3. ADR-0006 / ADR-0007本筋migrationをlocalで増分適用・postflightする。
4. local clean-chain replayとlocal E2Eを完了する。
5. 必要なremote cleanupをdiscovery / ROLLBACK / COMMITの別承認で行う。
6. advisor訂正migrationをremote SQL Editorへ適用し、postflightする。
7. 本筋migrationを別のremote適用承認で適用し、postflightする。
8. 別承認後にremote E2Eを実行する。
9. 全DB／E2E gate通過後、承認済みExecution ContractがGit publicationを含む場合は、標準実装担当がcommit、作業branchへの通常push、Draft PR作成・更新、DoD後Ready化まで行う。Reviewerがexact Headを判定し、Humanだけがmergeする。
10. Vercel Production確認、E2E cleanup、未merge PR close、remote branch削除はGit publicationと分離したHuman gateとする。Humanが共有branchの利用終了を明示しremote branchを削除した後、安全条件を満たす標準実装担当自身のtask-owned worktreeとlocal branchは、`docs/06_qa-flow.md` §1.1と`close-merged-worktree` Skillに従って通常削除できる。

## 失敗時

- localhost以外へのbind、target不一致、既存migration改変、local migration・postflight・advisor・E2E失敗ではremoteへ進まない。
- local DBは保持不要を確認したうえで`npm run supabase:db:reset`により再構築できる。
- remote SQL Editorでerrorが出た場合は再実行せず、新しいSELECT-only queryで永続状態を調べる。
- remoteで補正が必要な場合は、適用済みmigrationを編集せず、local検証済みの後続migrationを別承認で追加する。
- 即席の逆SQL、force push、migration history repairを復旧手段にしない。

## 影響

- `package.json`、起動wrapper、Playwright設定、tracked target allowlist、非追跡profileを実装済みである。
- 正本QAと`operate-supabase-live-db` Skillは、local / remoteの同等のゲートを整合した順序で扱う。
- remote SQL Editor適用を維持する間、migration fileとremote CLI historyは自動同期しない。postflight証跡を必須とする。
- localhost bind限定とtarget検証は完成済み。検証報告では互換aliasの`npm run test:e2e`ではなく、`npm run test:e2e:local` / `npm run test:e2e:remote`を明示して証跡を分離する。
