---
name: operate-supabase-live-db
description: Guide safe local-first Supabase migration work and live-database operations for the Where-to-Visit repository, including localhost-only stack gates, local migration replay, local and remote Playwright gates, SQL Editor application, correction migrations, Git approvals, and manual cleanup of marked E2E data. Use when a task prepares, applies, verifies, or repairs a Supabase migration; crosses from local verification to the configured remote database; runs DB-dependent E2E; decides whether a verified change may be committed or pushed; or inventories and removes [E2E] records. Do not use for ordinary app implementation, local-only tests unrelated to Supabase, or generic SQL design that does not affect the configured project.
---

# Operate Supabase Live DB

## Purpose

Run Where-to-Visit database operations as explicit, reviewable local and remote phases. Keep reusable procedure here and in references; read current migrations, local replay results, and remote inspection results as the source of truth for their respective environments.

## Start every run

1. Resolve the repository root with `git rev-parse --show-toplevel` and confirm it is Where-to-Visit.
2. Read the governing `AGENTS.md` and verify `CLAUDE.md` remains identical when either file is in scope.
3. Read [project-profile.md](references/project-profile.md).
4. Record `pwd`, branch, HEAD, `git status --short --branch`, worktree role, upstream, and `git rev-list --left-right --count <upstream>...HEAD`.
5. Identify the requested phase as local or remote, name the environment profile and target evidence, and state the next approval boundary before changing files or presenting write SQL.
6. Stop on an unexplained dirty tree, wrong repository, ambiguous source of truth, or local / remote target mismatch. If the approved task is creating a missing wrapper, profile contract, or target contract, file implementation may continue, but do not start Next.js, Playwright, Docker, or a DB operation until the complete target gate passes. Read-only repository inspection may continue while the remote target is unconfirmed, but do not run a remote query or hand off write SQL until it is confirmed.

Interpret ahead/behind by phase. Require the expected baseline at task start and after push; allow a reviewed local-ahead state after commit and before push.

## Route the request

- For a new migration, local incremental application, clean-chain replay, remote handoff, post-application inspection, or correction migration, read [migration-gates.md](references/migration-gates.md).
- For local or remote DB-dependent E2E, validation, commit, or push decisions, read [e2e-git-gates.md](references/e2e-git-gates.md).
- For E2E inventory or deletion, read [cleanup-protocol.md](references/cleanup-protocol.md) and use the generator described there.
- For handoffs and gate reports, read [report-templates.md](references/report-templates.md).

Load only the references needed for the active phase.

## Enforce shared boundaries

- Treat applied migrations as immutable. Add a later timestamped correction migration instead of rewriting history.
- Keep each correction minimal and re-verify the affected function, trigger, policy, constraint, or data invariant.
- Use Supabase CLI 2.109.1 for local operations only. Confirm required commands with the fixed CLI's `--help`, pass `--local` to every DB operation, and never infer that a generic command targets local.
- Start the Docker stack only through the repository's localhost-binding wrapper. Stop if any published `HostIp` is not `127.0.0.1` or if an unexpected port is exposed.
- Keep `.env.supabase.local` and `.env.supabase.remote` untracked. Validate each against tracked `config/supabase-targets.json` before starting Next.js or Playwright.
- Do not introduce Supabase Auth, a service-role key, a privileged cleanup RPC, a cleanup DELETE policy, or a local fallback.
- Do not turn manual E2E cleanup into the product's event-delete feature.
- Keep docs, dependencies, and unrelated application code unchanged unless the user explicitly widens scope.
- Local database-changing SQL may run only through reviewed migration files and explicit `--local` CLI commands. Do not execute remote database-changing SQL through credentials or connectors; prepare reviewed SQL for the user to run in the confirmed Supabase SQL Editor.
- Do not use `supabase login`, `supabase link`, `supabase db pull`, `supabase db push`, `--linked`, a remote `--db-url`, or migration-history repair.
- Require the user to confirm project, database, and role immediately before every SQL Editor write.
- Treat selected-text execution as unsafe. Ask the user to close search, clear selections, and run the intended full query.
- Assume Supabase SQL Editor preserves only one result set from a multi-statement run. Do not use one long script when every SELECT result is required as evidence. Split it into reviewed files with exactly `BEGIN TRANSACTION READ ONLY`, one result-producing statement, and `ROLLBACK`.
- For split SQL Editor gates, process files in order without requiring a fresh user approval between read-only steps: verify the file hash and exact editor contents, run it once, save and evaluate its single result set, then continue only when every expected value matches. Stop immediately on content mismatch, missing results, drift, an unexpected row or count, SQL or browser error, or incomplete ROLLBACK. Never retry or advance after a stop condition without a new diagnosis and approval.
- Apply this result-set splitting rule only to remote Supabase SQL Editor evidence collection. Do not split local `npm run supabase:db:query`, pgTAP, or other local tools that preserve all required results.
- Run every local DB command through the repository npm wrappers. Never invoke a raw local `migration list`, `migration up`, `db query`, `db advisors`, `test db`, or `db reset`; the reset wrapper owns the Docker proxy and fixed network-id.
- On any SQL error, do not retry. Capture the full error, DETAIL, HINT, and line, then inspect persistent state with a new SELECT-only query.

## Preserve approval boundaries

Stop and obtain separate confirmation at each applicable boundary:

1. Before discarding local data with a clean-chain reset when disposal was not already approved for the phase.
2. After all local migration, postflight, advisor, and E2E gates and before any remote cleanup or migration application.
3. Before a human applies each new or correction migration remotely.
4. After remote database postflight and before remote E2E.
5. After verification and before commit.
6. After commit and before push.
7. After cleanup discovery and before rendering ROLLBACK validation SQL.
8. After ROLLBACK restoration is verified and before rendering COMMIT SQL.
9. Before the human runs COMMIT SQL.

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
- phase, profile, target contract, CLI version, and localhost-binding evidence;
- migration names and whether each was already applied;
- local incremental and clean-chain migration results, advisor output summary, and local postflight checks;
- remote target confirmation, SQL Editor application evidence, and remote postflight checks;
- local and remote E2E total, pass, fail, skip, skipped test names, and reasons, reported separately;
- `check`, `build`, and `git diff --check` results;
- exact changed files at commit and push gates;
- cleanup manifest summary, operation counts, ROLLBACK restoration, and post-COMMIT checks.

Stop rather than smoothing over missing evidence.
