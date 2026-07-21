# きめのすけ — AI共通コンテキスト（AGENTS.md / CLAUDE.md 同期）

> このファイルは`AGENTS.md`と`CLAUDE.md`で**同一内容**を保つ。片方を更新したら必ずもう片方も同期する。
> このファイルは長期安定する原則・安全境界に特化する。文書の正本性、status、内容責任者、参照先は[`docs/README.md`](docs/README.md)から確認する。

## サービス概要

きめのすけ: グループ意思決定支援サービス。候補カードごとに○／−／×・❤️・🌀・コメントを共同編集し、みんなの意見を見える化する。サービス自身は確定せず、最終候補状態を自動ハイライトする。登録不要・URL共有。

## Knowledgeとrole

- repository全体の唯一のKnowledge入口は`docs/README.md`とする。実装・文書更新前に、対象domainの正本、status、内容責任者、更新契機を入口から確認する。
- `main`へmerge済みの文書・設定を有効情報とする。ただし、正本性と優先関係はKnowledge入口に従う。
- `docs/memos/`、chat、agent memory、primary checkoutだけの未追跡fileを正本または実行根拠として扱わない。
- roleは責任を表し、permissionを自動付与しない。使用toolからrole、承認権限、file write、Production操作を導出しない。roleと内容責任はKnowledge入口から現行role正本を参照する。
- 内容の意味は各domain ownerが持つ。PKAは配置、参照、整合性、status、更新経路、lifecycleを管理し、事業・product・技術の意味を独自変更しない。

## 技術・安全原則

- 技術stackはNext.js（App Router）+ Supabase（Postgres／Realtime、Auth不使用）+ Vercel Pro。domainは`kimenosuke.com`。
- 実装toolはCodex。コンテキストfileはAGENTS.md／CLAUDE.mdとし、両方を同期する。
- 仕様を勝手に変えない。矛盾・曖昧さを見つけたら実装せず、該当domain ownerまたはHumanへ戻して停止する。
- 指示書外の実装（例: local JSON fallback）を追加しない。Supabase前提を維持する。
- 本番SupabaseはCodex **read-only**とし、write・migration適用・cleanup COMMITを行わない。本番変更はHumanが確認済みSQLをSupabase SQL Editorで実行する。開発用local Supabaseは、適用する正本・Skillの範囲でCodexが操作できる。
- 依存はversion固定とし、`latest`を使わない。
- scopeを厳守し、承認されたslice以外の機能、文書、設定へ変更を広げない。
- UI・見た目はKnowledge入口からdesign正本を確認して一致させる。designを変える承認済みsliceでは、実装と同じ変更内でdesign正本を更新し、product要件や管理方針を混ぜない。

## 着手前チェック（必須）

- `git status`、repository root、branch、worktree、HEAD、upstreamを確認する。指示されたrepository／worktreeと異なる、Git未初期化、ownershipまたはbaseline不明の場合は実装せず停止する。
- Execution ContractのGoal、scope、参照先、guardrail、DoD、STOP／ESCAPE条件、承認範囲を確認し、未定義のpermissionを推定しない。
- Supabaseを伴う作業ではlocal／remoteのphase、profile、接続先検証結果、次の承認境界を明示する。target不明時はDB操作を行わない。
- 正本またはSkillを追加・変更したら、`docs/README.md`と必要な副索引のstatus・owner・参照・更新契機を同じ変更内で確認する。
- AGENTS.mdまたはCLAUDE.mdを変更したら両fileをbyte-for-byte一致させる。
