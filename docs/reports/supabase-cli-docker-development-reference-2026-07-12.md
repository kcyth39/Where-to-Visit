# Supabase CLI / Docker ローカル開発・検証リファレンス

- 作成日: 2026-07-12
- ステータス: **承認済み（第二段階で正本・運用Skillへ反映）**
- 対象: ADR-0006 / ADR-0007実装前のローカル開発基盤、migration検証、local / remote E2E分離
- 関連: [共同編集モデル実装仕様](collaborative-response-row-spec-draft-2026-07-11.md) / [DoD](collaborative-response-row-dod-2026-07-11.md) / [QA](collaborative-response-row-qa-2026-07-11.md)

> 本書はSupabase CLI / Docker導入後の開発・検証手順を定義する詳細リファレンスである。レビュー承認後、ADR-0008、正本、AGENTS.md / CLAUDE.md、運用Skillへ反映した。現時点ではlocalhost bind限定、接続先切り替え、advisor訂正、本筋migration・アプリ実装は未実装である。

---

## 1. 現在の基準点

| 項目 | 現在 |
|---|---|
| 基準commit | `894838770bfe0faed5a4547afa13f9ea9a098ec9` |
| Supabase CLI | `2.109.1`（devDependencyで固定） |
| Local PostgreSQL | 17 |
| Local ports | API 54321 / DB 54322 / Studio 54323 / Mailpit 54324 / Analytics 54327 |
| Migration | 有効。既存5 migrationを先頭から適用可能 |
| Seed | 無効 |
| Auth | 無効。Auth containerを起動しない |
| Remote CLI接続 | 未実施 |
| Remote適用方式 | 人間によるSupabase SQL Editor全文実行 |

local stackは通常stop状態とする。CLI導入時点ではNext.js / Playwrightの接続先切り替えとlocalhost bind限定は未実装であり、現行の`npm run test:e2e`をlocal E2E成功の証拠として扱わない。

---

## 2. 開発環境の不変条件

- 適用済みmigrationはbyte-for-byteで変更しない。
- 新規migrationは`npx supabase migration new <descriptive_name>`で生成する。
- すべてのCLI DB操作に`--local`を明示する。
- `supabase login / link / db pull / db push`、`--linked`、remote `--db-url`、migration history repairを使わない。
- Supabase Auth、service role、DB password、local JSON fallbackをアプリ・E2Eへ渡さない。
- remote SQL Editor適用はCLI migration historyを更新しない。将来`db push`へ移行する場合は独立した履歴調停が必要である。
- `supabase status`のraw出力にはkeyやpasswordが含まれるため、ログ・報告書へ貼らない。

---

## 3. localhost bind限定

`supabase start`を直接公開せず、project専用Docker bridge networkと検証wrapperを経由する。

1. networkの既定host bindingを`127.0.0.1`に固定する。
2. `supabase start --network-id <project-network>`で起動する。
3. 起動後、全公開portのDocker `HostIp`を検査する。
4. `0.0.0.0`、`::`、空値、想定外portが1件でもあればstackを停止して失敗とする。
5. stopではDB / Storage / Edge Runtime volumeを保持し、対象container停止後にproject networkだけを除去する。

`db.network_restrictions`はコンテナ内部のDBアクセス制御であり、Docker host portのbind先を限定する本要件の代替にしない。

---

## 4. local / remote接続先分離

Git非追跡profileを次の2つへ分離する。

```text
.env.supabase.local
.env.supabase.remote
```

- 両profileが保持するアプリ用keyは`SUPABASE_URL`と`SUPABASE_ANON_KEY`だけとする。
- local URLは`http://127.0.0.1:54321`完全一致を必須とする。
- remote hostnameはkeyを含まないtracked `config/supabase-targets.json`へ固定し、HTTPSとhostnameの完全一致を起動前に検証する。形式はADR-0008の`local / remote`別`protocol / hostname / port`正表に従う。
- 正式なlocal commandは`dev:local` / `test:e2e:local`、正式なremote commandは`dev:remote` / `test:e2e:remote`とする。
- 互換性のため`dev`は`dev:local`、`test:e2e`は`test:e2e:local`へのaliasとする。検証報告ではalias名でなく正式command名を記録する。
- Playwrightは`reuseExistingServer: false`とし、test runnerと起動するNext.jsへ同じprofileの環境変数を渡す。
- 各specは`.env.local` / `.env`を独自に読まず、起動wrapperから渡されたprocess envだけを使う。
- target不明、必要key不足、URL不一致、stack停止中では子processを起動せず停止する。

既存`.env.local`はkey名だけを確認し、remote profileへの安全な移行後に削除する。値は画面・ログ・差分へ表示しない。

### 4.1 `package.json` scripts正表

第二段階の正本反映後、実装では次の名前と役割へ統一する。表にない別名を追加して同じ処理を重複実装しない。

| Script | 役割 |
|---|---|
| `dev` | `dev:local`への互換alias |
| `dev:local` | local profile検証後にNext.js dev serverを起動 |
| `dev:remote` | remote profileとtracked `config/supabase-targets.json`検証後にNext.js dev serverを起動 |
| `test:e2e` | `test:e2e:local`への互換alias |
| `test:e2e:local` | local profileをtest runnerと新規Next.js serverへ渡してPlaywrightを実行 |
| `test:e2e:remote` | remote profileをtest runnerと新規Next.js serverへ渡してPlaywrightを実行 |
| `supabase:start` | localhost限定networkでstackを起動し、HostIp検査後にlocal profileを値非表示で更新 |
| `supabase:status` | stack状態、service、port、HostIpだけを表示する安全なstatus。keyとpasswordは表示しない |
| `supabase:stop` | 対象stackをvolume保持で停止し、対象containerがないことを確認後に専用networkを除去 |

`build`、`start`、`check`は既存の役割を維持する。`start`はVercel等から明示注入されたproduction環境変数を使用し、local / remote開発profile wrapperの対象外とする。

---

## 5. Advisor訂正方針

現在のlocal advisor警告は次の3件である。

1. `public.request_header`: mutable search path
2. `participants` anon SELECT: multiple permissive policies
3. `participants` anon INSERT: multiple permissive policies

採用方針:

- `request_header`だけを独立した先行migrationで固定`search_path`へ訂正する。
- 現行Participant policyだけを直す一時的migrationは作らない。
- Participantの2警告はADR-0006本筋migrationでguest-token policyを撤去し、操作ごとにpolicyを再構成することで解消する。
- 本筋migration後にadvisorを再実行し、3件の解消と新規警告の有無を確認する。

---

## 6. 実装単位と依存順

次の変更単位を混在させない。

1. localhost bind限定
2. local / remote接続先切り替え
3. `request_header` advisor訂正migration
4. ADR-0006 / 0007 schema migration
5. アプリ読取モデル・owner / Participant分離
6. 画面・状態管理・E2E
7. 新schema向けE2E cleanup profile更新

各単位は変更ファイル、検証結果、commit対象を分ける。Git publicationを含む承認済みExecution Contractでは、全工程完了後に標準実装担当がcommit、作業branchへの通常push、Draft PR作成・更新、DoD後Ready化まで行う。

---

## 7. Local migration・検証手順

### 7.1 Preflight

- repo root、branch、HEAD、upstream、ahead / behind、working treeを記録する。
- 既存migration一覧とSHA-256を記録し、既存5本に差分があれば停止する。
- 新SQLを全文監査し、DDL / DML、RLS、policy、GRANT、function、trigger、FK、index、破壊的操作を列挙する。

### 7.2 増分適用

```bash
npm run supabase:start
npm run supabase:migration:list
npm run supabase:migration:up
```

適用後は`npm run supabase:db:query`、`npm run supabase:test:db`、`npm run supabase:db:advisors`でschema、拒否挙動、advisorを検証する。

### 7.3 Clean-chain replay

localデータを破棄してよいことを確認してから実行する。

```bash
npm run supabase:db:reset
npm run supabase:migration:list
```

既存5本と新規migrationを空DBから再現し、増分適用時と同じpostflight、advisor、DB負系を再実行する。

### 7.4 Local E2E

```text
focused DB / E2E
→ full local E2E
→ npm run check
→ npm run build
→ git diff --check
→ npm run supabase:stop
```

E2Eは総数、PASS、FAIL、SKIP、skip名と理由を報告する。対象SliceのDBケースはFAIL 0・原則SKIP 0を必須とする。

---

## 8. Remote適用・リリース境界

1. local clean-chain replayと全local検証を完了する。
2. remote cleanupが必要なら、現行schema用profileでdiscovery、ROLLBACK、COMMITを別承認にする。
3. 人間がproject、database、role、PostgreSQL majorを確認する。
4. advisor訂正と本筋migrationを、それぞれ独立したSQL Editor適用ゲートで全文1回だけ実行する。
5. 各migrationのremote postflight完了後にだけ次へ進む。
6. remote E2Eは別承認後に`test:e2e:remote`で実行する。
7. 全検証後、Git publicationを含む承認済みExecution Contractに従って、標準実装担当がcommit、作業branchへの通常push、Draft PR作成・更新、DoD後Ready化まで行う。Reviewerがexact Headを判定し、Humanだけがmergeする。
8. Vercel Production確認、`[E2E]`cleanup、未merge PR close、remote branch削除を独立gateとする。Humanの共有branch利用終了意思とremote不在を確認した後、安全条件を満たす標準実装担当自身のtask-owned worktreeとlocal branchは、`docs/06_qa-flow.md` §1.1と`close-merged-worktree` Skillに従って通常削除できる。

SQL Editorでerrorが出た場合は再実行せず、新しいSELECT-only queryで永続状態を確認する。

---

## 9. 停止条件と復旧境界

- wrong repo、dirty tree、既存migration改変、localhost以外へのbind、target不一致で停止する。
- local migration、postflight、advisor、E2Eの失敗時はremoteへ進まない。
- local DBは承認済み`npm run supabase:db:reset`で再構築できる。
- remote cleanupはCOMMIT前ならROLLBACKする。COMMIT後の削除データは復元対象外とする。
- remote migration error時は再実行、既存migration編集、force push、即席の逆SQLを行わない。
- migrationが完全適用済みで補正が必要な場合は、ローカル検証済みの後続migrationを別承認で作成する。

---

## 10. 正本反映

レビュー承認後、第二段階で次へ反映した。

- `AGENTS.md` / `CLAUDE.md`
- `docs/03_requirements.md`
- `docs/04_data-model.md`
- `docs/05_dod.md`
- `docs/06_qa-flow.md`
- [ADR-0008](../adr/0008-local-supabase-development-workflow.md)と`.agents/skills/operate-supabase-live-db/`の運用記述

実装時は本書ではなくADR-0008と正本を優先し、運用手順は`operate-supabase-live-db` Skillを正とする。
