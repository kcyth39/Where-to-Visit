# Migration and correction gates

## Establish the phase

Classify the request as one of:

- prepare a new migration;
- apply or replay migrations on the local stack;
- verify a locally applied migration;
- hand off an unapplied migration to the remote SQL Editor;
- verify a remotely applied migration;
- diagnose a local or remote application error;
- prepare or apply a correction migration.

Do not cross into the next phase without its evidence and approval.

## Run migration preflight

1. Confirm repository, branch, HEAD, upstream, ahead/behind, worktree, and working-tree state.
2. Read the current Slice source of truth, `AGENTS.md`, ADR-0008, `docs/04_data-model.md`, `docs/05_dod.md`, `docs/06_qa-flow.md`, and applicable ADR/report files.
3. State whether the active phase is local or remote, name its environment profile, show non-secret target metadata, and identify the next approval boundary.
4. Confirm the exact CLI version is `2.109.1`. Use the fixed CLI's `--help` to verify every planned command and flag rather than relying on this reference. The current contract uses:
   - `start --network-id`;
   - `migration new`;
   - `npm run supabase:migration:list`;
   - `npm run supabase:migration:up`;
   - `npm run supabase:db:query`;
   - `npm run supabase:db:reset`;
   - `npm run supabase:db:advisors`;
   - `npm run supabase:test:db`.
5. Confirm the localhost wrapper, untracked profile, and `config/supabase-targets.json` contract exist. Stop before starting a child process if any is missing or mismatched.
6. Identify all existing migrations and their SHA-256 values. Determine local application state from `migration list --local`; determine remote application state from prior human evidence plus live object inspection. Stop if either required state is unknown.
7. Identify the deployment-history mode. The current remote procedure is human-run SQL Editor application, which does not automatically add a Supabase migration-history record. Treat it as manual application evidence and verify live objects and data; never infer application from a filename alone. If the project has adopted `supabase migration list` / `supabase db push` as its source of truth, stop and reconcile that history instead of mixing both modes.
8. Confirm no applied migration changed in the worktree. Generate every new migration with `npx supabase migration new <descriptive_name>`.
9. Inspect the new SQL in full. Report:
   - created, replaced, altered, or dropped objects;
   - DML and backfill scope;
   - RLS, policy, GRANT, REVOKE, function, trigger, and FK effects;
   - actual `DROP`, `TRUNCATE`, `DELETE`, broad `UPDATE`, or other destructive statements.
10. Do not treat a keyword search as the audit. Distinguish executable statements from comments and strings.
11. For backfill, record a stable pre-application row by UUID plus identifying fields and state the exact expected postflight result.
12. Run safe gates that do not require the new schema, normally `npm run check`, `npm run build`, and `git diff --check`.

## Run local incremental application

Do not use a raw `supabase start` command. The repository wrapper must create or reuse the project-specific network, bind every published port to `127.0.0.1`, start with `--network-id`, and fail closed after inspecting each `HostIp`.

1. Run `npm run supabase:start` and use only the safe status summary. Never paste raw CLI status output because it can contain keys and passwords.
2. Confirm expected services and ports and that every published HostIp is `127.0.0.1`.
3. Confirm the local profile resolves exactly to `http://127.0.0.1:54321` without displaying its key.
4. Record `npm run supabase:migration:list` before application.
5. Run `npm run supabase:migration:up`.
6. Record the migration list again and confirm only the expected pending migrations became local.

Stop on any bind, target, history, or application mismatch. Local failure never authorizes remote application.

## Run local postflight

Generate checks from the actual migration. Use `npm run supabase:db:query`, `npm run supabase:test:db`, anon-client tests, or other local-only tools as appropriate, and verify at least:

- expected tables, columns, constraints, indexes, and types;
- backfill UUID, row count, and values;
- RLS enabled on every affected table;
- policy names, commands, USING expressions, and WITH CHECK expressions;
- table and column GRANT/REVOKE state independently from RLS;
- function definitions, security mode, fixed `search_path`, and EXECUTE state;
- trigger table, event, timing, column scope, and called function;
- every affected FK and `delete_rule`;
- negative and invariant behavior required by the Slice.

Run `npm run supabase:db:advisors`. Stop on a new warning or an unexplained known warning. For ADR-0006 / ADR-0007, apply the approved ordering: correct `request_header` in its own migration, then require the main policy replacement to clear the two current Participant warnings.

## Run clean-chain replay

After incremental postflight passes, confirm local data is disposable. If that disposal was not already approved for the phase, stop for approval.

1. Run `npm run supabase:db:reset`; never use a raw CLI reset. Require the proxy's DB-create observation and localhost-only binding evidence.
2. Run `npm run supabase:migration:list` and confirm the full expected history was reapplied from an empty local database.
3. Repeat the same local postflight, negative tests, advisor checks, and Slice invariants.
4. Continue to the local E2E gate in `e2e-git-gates.md`.

Do not enter a remote cleanup or migration gate until incremental application, clean-chain replay, and required local E2E all pass.

## Hand off SQL Editor application

This is the repository's current manual remote deployment procedure. Supabase recommends deploying tracked remote migrations with `supabase db push`; direct remote SQL Editor changes bypass CLI migration history. Do not silently switch deployment modes, claim that SQL Editor updated migration history, or repair history as part of this gate. See [Database Migrations](https://supabase.com/docs/guides/deployment/database-migrations).

Require evidence that local incremental application, local postflight, clean-chain replay, advisor checks, and required local E2E passed. Treat remote cleanup, each remote migration, remote E2E, commit, and push as separate approvals.

Require the human to:

1. Confirm project, database, and role from `project-profile.md`.
2. Open a new SQL Editor query.
3. Paste the migration from first statement through last statement.
4. Clear search and selection so only the intended full query runs.
5. Run it once.
6. Return the success result or the full error, line, DETAIL, and HINT.

Do not assert transactionality or automatic rollback without evidence. If application errors, do not rerun; use a new SELECT-only query to inspect persistent objects and rows.

## Run remote postflight

Generate checks from the actual migration and verify at least:

- expected tables, columns, constraints, indexes, and types;
- backfill UUID, row count, and values;
- RLS enabled on every affected table;
- policy names, commands, USING expressions, and WITH CHECK expressions;
- table and column GRANT/REVOKE state, checked independently from RLS because object privileges and row policies are separate access layers;
- function definitions, security mode, and fixed `search_path`;
- trigger table, event, timing, column scope, and called function;
- every affected FK and `delete_rule`;
- negative and invariant behavior required by the Slice.

Apply the remote SQL Editor result-set rule from `../SKILL.md`. Mechanically split postflight into one reviewed file per result-producing statement. Require each file to contain exactly `BEGIN TRANSACTION READ ONLY`, one result-producing `SELECT` or `WITH ... SELECT`, and `ROLLBACK`. Record its SHA-256, compare the editor contents byte-for-byte before execution, run it once, save and evaluate its single result set, and continue only after every expected result passes. Stop immediately without retrying or advancing on content mismatch, partial selection, missing results, drift, an unexpected row or count, SQL or browser error, or incomplete ROLLBACK.

This split requirement is remote SQL Editor-specific. Keep local `npm run supabase:db:query`, pgTAP, and other local tools in their normal form when they preserve all required result sets.

Return full result rows when policy, trigger, or FK names matter. Stop on zero, duplicate, missing, unexpected, or mismatched results. Do not run remote E2E until postflight passes.

## Prepare a correction migration

1. Preserve the applied migration byte-for-byte.
2. Create a new, later timestamped migration with the fixed local CLI and the smallest behavior-preserving correction.
3. Prefer `CREATE OR REPLACE FUNCTION` for a function-only correction when compatible.
4. Keep existing data deletion, broad updates, and re-backfill out unless separately required and approved.
5. Confirm the correction remains safe to execute once; describe idempotence only where it actually exists.
6. Apply the correction locally, run focused postflight, advisor checks, clean-chain replay, focused E2E, and required full local E2E.
7. Present the complete correction SQL and focused remote postflight SQL, then stop for remote application approval.
8. Split the focused remote postflight by the same remote SQL Editor result-set rule in `Run remote postflight`; do not combine independent evidence SELECTs into one SQL Editor run.
9. After remote application, inspect `pg_get_functiondef` or the corrected object and all trigger bindings that consume it through the reviewed split postflight files.
10. Re-run the affected remote database behavior before the full remote E2E gate.

If a correction changes the cleanup schema, update `project-profile.md`, the generator profile version, and its tests in the same Skill change before any later cleanup.

## Stop conditions

Stop on:

- wrong repository, dirty or divergent baseline, or ambiguous worktree role;
- missing localhost wrapper, target contract, environment profile, or fixed CLI command/flag;
- a published Docker HostIp other than `127.0.0.1` or an unexpected port;
- local / remote target mismatch or raw secret-bearing status output;
- an edited applied migration;
- unknown local or remote application state;
- local migration, postflight, advisor, clean-chain, or required local E2E failure;
- unconfirmed Supabase target;
- unexpected destructive SQL;
- SQL Editor partial selection or application error;
- incomplete error details;
- backfill, RLS, policy, GRANT, FK, function, trigger, or invariant mismatch;
- a correction that needs unrelated refactoring, service role, privileged RPC, or policy broadening.
