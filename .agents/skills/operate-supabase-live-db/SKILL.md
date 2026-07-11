---
name: operate-supabase-live-db
description: Guide safe live Supabase operations for the Where-to-Visit repository, including migration preflight and postflight checks, additive correction migrations, real-database Playwright gates, commit and push approval gates, and manual cleanup of marked E2E data. Use when a task prepares, applies, verifies, or repairs a Supabase migration; runs E2E against the configured database; decides whether a verified change may be committed or pushed; or inventories and removes [E2E] records. Do not use for ordinary app implementation, local-only tests, or generic SQL design that does not affect the configured project.
---

# Operate Supabase Live DB

## Purpose

Run Where-to-Visit database operations as explicit, reviewable phases. Keep reusable procedure here and in references; read current migrations and live inspection results as the source of truth.

## Start every run

1. Resolve the repository root with `git rev-parse --show-toplevel` and confirm it is Where-to-Visit.
2. Read the governing `AGENTS.md` and verify `CLAUDE.md` remains identical when either file is in scope.
3. Read [project-profile.md](references/project-profile.md).
4. Record `pwd`, branch, HEAD, `git status --short --branch`, worktree role, upstream, and `git rev-list --left-right --count <upstream>...HEAD`.
5. Identify the requested phase before changing files or presenting write SQL.
6. Stop on an unexplained dirty tree, wrong repository, or ambiguous source of truth. Read-only repository inspection may continue while the Supabase target is unconfirmed, but do not run a live query or hand off write SQL until the target is confirmed.

Interpret ahead/behind by phase. Require the expected baseline at task start and after push; allow a reviewed local-ahead state after commit and before push.

## Route the request

- For a new migration, migration application, post-application inspection, or correction migration, read [migration-gates.md](references/migration-gates.md).
- For real-database E2E, validation, commit, or push decisions, read [e2e-git-gates.md](references/e2e-git-gates.md).
- For E2E inventory or deletion, read [cleanup-protocol.md](references/cleanup-protocol.md) and use the generator described there.
- For handoffs and gate reports, read [report-templates.md](references/report-templates.md).

Load only the references needed for the active phase.

## Enforce shared boundaries

- Treat applied migrations as immutable. Add a later timestamped correction migration instead of rewriting history.
- Keep each correction minimal and re-verify the affected function, trigger, policy, constraint, or data invariant.
- Do not introduce Supabase Auth, a service-role key, a privileged cleanup RPC, a cleanup DELETE policy, or a local fallback.
- Do not turn manual E2E cleanup into the product's event-delete feature.
- Keep docs, dependencies, and unrelated application code unchanged unless the user explicitly widens scope.
- Do not execute database-changing SQL through credentials or connectors. Prepare reviewed SQL for the user to run in the confirmed Supabase SQL Editor.
- Require the user to confirm project, database, and role immediately before every SQL Editor write.
- Treat selected-text execution as unsafe. Ask the user to close search, clear selections, and run the intended full query.
- On any SQL error, do not retry. Capture the full error, DETAIL, HINT, and line, then inspect persistent state with a new SELECT-only query.

## Preserve approval boundaries

Stop and obtain separate confirmation at each applicable boundary:

1. Before a human applies a new or correction migration.
2. After database postflight and before real-database E2E.
3. After verification and before commit.
4. After commit and before push.
5. After cleanup discovery and before rendering ROLLBACK validation SQL.
6. After ROLLBACK restoration is verified and before rendering COMMIT SQL.
7. Before the human runs COMMIT SQL.

Never infer a later approval from an earlier one.

## Use the cleanup generator

Keep runtime manifests outside the repository, normally under `/tmp`. Start from [cleanup-manifest.template.json](assets/cleanup-manifest.template.json), then run:

```bash
node .agents/skills/operate-supabase-live-db/scripts/render-e2e-cleanup-sql.mjs \
  --manifest /tmp/where-to-visit-e2e-cleanup.json \
  --mode discovery
```

Supported modes are `discovery`, `rollback`, `commit`, and `postcheck`.

- `discovery` emits SELECT-only inventory, FK, and trigger queries.
- `rollback` requires fixed UUIDs and expected counts, prints their scope digest, and always ends with `ROLLBACK`.
- `commit` requires verified restoration metadata, the unchanged scope digest, and the exact commit authorization phrase.
- `postcheck` emits SELECT-only checks for the fixed UUIDs and expected remaining prefix count; it remains available for safe diagnosis without COMMIT authorization.

The generator reads JSON and prints SQL only. It must never connect to Supabase or write repository files.

## Report evidence

Report commands and results, not assumptions. Include:

- repository, branch, HEAD, upstream, and working-tree state;
- migration names and whether each was already applied;
- database target confirmation and all postflight checks;
- E2E total, pass, fail, skip, skipped test names, and reasons;
- `check`, `build`, and `git diff --check` results;
- exact changed files at commit and push gates;
- cleanup manifest summary, operation counts, ROLLBACK restoration, and post-COMMIT checks.

Stop rather than smoothing over missing evidence.
