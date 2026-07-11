# Migration and correction gates

## Establish the phase

Classify the request as one of:

- prepare a new migration;
- hand off an unapplied migration;
- verify an applied migration;
- diagnose an application error;
- prepare or apply a correction migration.

Do not cross into the next phase without its evidence and approval.

## Run migration preflight

1. Confirm repository, branch, HEAD, upstream, ahead/behind, worktree, and working-tree state.
2. Read the current Slice source of truth, `AGENTS.md`, `docs/04_data-model.md`, `docs/05_dod.md`, `docs/06_qa-flow.md`, and applicable ADR/report files.
3. Identify all existing migrations and determine which are already applied. Stop if application state is unknown.
4. Identify the deployment-history mode. The current project procedure is a human-run SQL Editor application, which does not automatically add a Supabase migration-history record. Treat it as manual application evidence and verify live objects and data; never infer application from a filename alone. If the project has adopted `supabase migration list` / `supabase db push` as its source of truth, stop and reconcile that history instead of mixing both modes.
5. Confirm no applied migration changed in the worktree.
6. Inspect the new SQL in full. Report:
   - created, replaced, altered, or dropped objects;
   - DML and backfill scope;
   - RLS, policy, GRANT, REVOKE, function, trigger, and FK effects;
   - actual `DROP`, `TRUNCATE`, `DELETE`, broad `UPDATE`, or other destructive statements.
7. Do not treat a keyword search as the audit. Distinguish executable statements from comments and strings.
8. For backfill, record a stable pre-application row by UUID plus identifying fields and state the exact expected postflight result.
9. Run safe local gates that do not require the new schema, normally `npm run check`, `npm run build`, and `git diff --check`.
10. Prepare the pre-application report and stop for approval.

## Hand off SQL Editor application

This is the repository's current manual deployment procedure. Supabase recommends deploying tracked remote migrations with `supabase db push`; direct remote SQL Editor changes bypass CLI migration history. Do not silently switch deployment modes, claim that SQL Editor updated migration history, or repair history as part of this gate. See [Database Migrations](https://supabase.com/docs/guides/deployment/database-migrations).

Require the human to:

1. Confirm project, database, and role from `project-profile.md`.
2. Open a new SQL Editor query.
3. Paste the migration from first statement through last statement.
4. Clear search and selection so only the intended full query runs.
5. Run it once.
6. Return the success result or the full error, line, DETAIL, and HINT.

Do not assert transactionality or automatic rollback without evidence. If application errors, do not rerun; use a new SELECT-only query to inspect persistent objects and rows.

## Run postflight

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

Return full result rows when policy, trigger, or FK names matter. Stop on zero, duplicate, missing, unexpected, or mismatched results. Do not run real-database E2E until postflight passes.

## Prepare a correction migration

1. Preserve the applied migration byte-for-byte.
2. Create a new, later timestamped migration with the smallest behavior-preserving correction.
3. Prefer `CREATE OR REPLACE FUNCTION` for a function-only correction when compatible.
4. Keep existing data deletion, broad updates, and re-backfill out unless separately required and approved.
5. Confirm the correction remains safe to execute once; describe idempotence only where it actually exists.
6. Re-run local non-DB gates.
7. Present the complete correction SQL and focused postflight SQL, then stop for application approval.
8. After application, inspect `pg_get_functiondef` or the corrected object and all trigger bindings that consume it.
9. Re-run the affected database behavior before the full E2E gate.

If a correction changes the cleanup schema, update `project-profile.md`, the generator profile version, and its tests in the same Skill change before any later cleanup.

## Stop conditions

Stop on:

- wrong repository, dirty or divergent baseline, or ambiguous worktree role;
- an edited applied migration;
- unknown application state;
- unconfirmed Supabase target;
- unexpected destructive SQL;
- SQL Editor partial selection or application error;
- incomplete error details;
- backfill, RLS, policy, GRANT, FK, function, trigger, or invariant mismatch;
- a correction that needs unrelated refactoring, service role, privileged RPC, or policy broadening.
