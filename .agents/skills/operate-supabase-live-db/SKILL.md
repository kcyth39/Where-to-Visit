---
name: operate-supabase-live-db
description: Guide safe local-first Supabase migration work and live-database operations for the Where-to-Visit repository, including localhost-only stack gates, local migration replay, local and remote Playwright gates, SQL Editor application, correction migrations, Git publication gates, and manual cleanup of marked E2E data. Use when a task prepares, applies, verifies, or repairs a Supabase migration; crosses from local verification to the configured remote database; runs DB-dependent E2E; decides whether a verified change may enter the authorized Git publication flow; or inventories and removes [E2E] records. Do not use for ordinary app implementation, local-only tests unrelated to Supabase, or generic SQL design that does not affect the configured project.
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
- Keep the existing `npm run supabase:*` commands on the default `n6` profile. The bounded N9 Stage 1 local profile must use `node scripts/supabase-local-n9-stage1.mjs --profile n9-stage1 ...`; never omit or substitute that selector. Its generated workdir remains under the ignored `supabase/.branches/n9-stage1-runtime` path, and foreign／unknown ownership must fail before Docker or Supabase mutation. Runtime start, reset, migration replay, and tests still require their own Human gate.
- Keep `.env.supabase.local`, `.env.supabase.qa`, and `.env.supabase.remote` untracked. Validate each against tracked `config/supabase-targets.json` before starting Next.js or Playwright. QA must use only project `where-to-visit-qa` / ref `twcbycyyrxbovtgiqaun`; never fall back to Production credentials or URL.
- Do not introduce Supabase Auth, a service-role key, a privileged cleanup RPC, a cleanup DELETE policy, or a local fallback.
- Do not turn manual E2E cleanup into the product's event-delete feature.
- Keep docs, dependencies, and unrelated application code unchanged unless the user explicitly widens scope.
- Local database-changing SQL may run only through reviewed migration files and explicit `--local` CLI commands, except for the dedicated reviewed cleanup transaction wrapper described below. Do not execute remote database-changing SQL through credentials or connectors; prepare reviewed SQL for the user to run in the confirmed Supabase SQL Editor.
- Do not use `supabase login`, `supabase link`, `supabase db pull`, `supabase db push`, `--linked`, a remote `--db-url`, or migration-history repair.
- Require the user to confirm project, database, and role immediately before every SQL Editor write.
- Treat selected-text execution as unsafe. Ask the user to close search, clear selections, and run the intended full query.
- Assume Supabase SQL Editor preserves only one result set from a multi-statement run. Do not use one long script when every SELECT result is required as evidence. Split it into reviewed files with exactly `BEGIN TRANSACTION READ ONLY`, one result-producing statement, and `ROLLBACK`.
- Cleanup ROLLBACK and COMMIT are the deliberate exception to read-only result splitting: each is one indivisible write transaction. The generator must suppress intermediate result sets and emit exactly one evidence-producing statement immediately before the terminal `ROLLBACK` or `COMMIT`, containing the fixed scope, pre-delete counts, operation counts, saved-primary-key remaining counts, and final guard verdict.
- For split SQL Editor gates, process files in order without requiring a fresh user approval between read-only steps: verify the file hash and exact editor contents, run it once, save and evaluate its single result set, then continue only when every expected value matches. Stop immediately on content mismatch, missing results, drift, an unexpected row or count, SQL or browser error, or incomplete ROLLBACK. Never retry or advance after a stop condition without a new diagnosis and approval.
- Apply the three-statement SQL Editor rule only to remote evidence collection. Fixed CLI 2.109.1 executes each local `npm run supabase:db:query -- --file ...` file as one prepared statement: use exactly one `SELECT` or `WITH ... SELECT`, without `BEGIN` or `ROLLBACK`. Do not combine multiple statements; aggregate needed values into one result or use separate single-statement files. This is separate from remote result-set splitting and does not apply to pgTAP. Never bypass the repository wrapper.
- Run every local DB command through a repository-owned wrapper. The default N6 profile uses the `npm run supabase:*` wrappers; the bounded N9 Stage 1 profile uses only `node scripts/supabase-local-n9-stage1.mjs --profile n9-stage1 ...`. Never invoke a raw local `migration list`, `migration up`, `db query`, `db advisors`, `test db`, or `db reset`; the selected wrapper owns the Docker proxy and fixed network-id.
- Run reviewed multi-statement local cleanup transactions only with `npm run supabase:cleanup:local -- --mode rollback|commit --file /tmp/... --sha256 ...`. This is the sole exception to the migration-or-`--local` CLI rule: before selecting the DB container or performing any runtime mutation, the repository npm wrapper must classify the fixed CLI 2.109.1 Studio `supabase/snippets` bind mount as owned by the current canonical repository root and require owner state `CURRENT`. A non-`CURRENT` rejection performs no Docker, database, profile, or network mutation; this owner guard applies only to the local cleanup wrapper and does not make other Supabase operations owner-guarded. After ownership passes, the wrapper must select the unique localhost-bound local DB container, require an absolute regular non-symlink `/private/tmp` file with owner-only permissions, a size at most 1 MiB, an exact SHA-256 digest, and the matching terminal transaction statement, and send SQL through stdin only. Never use raw `docker exec`, raw `psql`, a host DB URL, or this wrapper for remote work.
- On any SQL error, do not retry. Capture the full error, DETAIL, HINT, and line, then inspect persistent state with a new SELECT-only query.

## Review three Postgres practices when relevant

Apply only the rules related to the change, mark the others `N/A`, and keep evidence proportional to the change and risk. Use the existing findings, STOP, handoff, and Human approval boundaries; do not create a dedicated gate, approval, evidence packet, verdict, or workflow.

1. **RLS performance review:** Only when adding or changing an RLS policy, review indexes for columns used by predicates, joins, or subqueries; avoid unnecessary row-by-row evaluation of stable helpers and excessive table scans; and obtain performance evidence in a safe environment before Production application. Do not require Supabase Auth or `auth.uid()`.
2. **Foreign key index review:** Only when adding or changing a foreign key, review join and filter use, parent-row delete or update reference checks, cascade, locking, and scan effects, the Performance Advisor's `unindexed foreign keys` finding, existing index coverage, and duplicate indexes. Do not add an index unconditionally.
3. **Short transactions:** For migration, cleanup, and correction SQL, keep Human decisions or approval waits, network, browser, and external API work outside transactions; do not pause for long periods while holding locks; and commit or roll back at a safe responsibility boundary. If work is split, preserve guards, atomicity, rollback, and evidence. Keep an existing reviewed indivisible cleanup transaction intact.

## Preserve approval boundaries

Stop and obtain separate confirmation at each applicable boundary:

1. Before discarding local data with a clean-chain reset when disposal was not already approved for the phase.
2. After all local migration, postflight, advisor, and E2E gates and before any remote cleanup or migration application.
3. Before a human applies each new or correction migration remotely.
4. After remote database postflight and before remote E2E.
5. Before Git publication when the approved Execution Contract does not already include it. When it does, follow the standard implementer flow in `e2e-git-gates.md` without adding separate commit／push／Draft PR／Ready approvals.
6. After cleanup discovery and before rendering ROLLBACK validation SQL.
7. After ROLLBACK restoration is verified and before rendering COMMIT SQL.
8. Before the human runs COMMIT SQL.
9. Before post-merge local closeout unless the Human has explicitly declared the task／shared branch finished. Then leave this Skill and follow the canonical lifecycle in [`docs/06_qa-flow.md` §1.1](../../../docs/06_qa-flow.md#11-pr-readyreviewmergecloseout), routing a task-owned normal registered worktree to `close-merged-worktree` without making remote branch state a local permission condition.

Never infer remote cleanup, migration, remote E2E, Production, E2E cleanup, merge, unmerged PR close, remote branch deletion, or either local-closeout signal from Git publication authorization or an earlier DB gate.

The canonical Git closeout states are `LOCAL_OPEN`, `LOCAL_CLOSEOUT_READY`, `LOCAL_CLOSED_REMOTE_PENDING`, `FULLY_CLOSED`, and `RECOVERY_HANDOFF_REQUIRED`. This Skill defines no independent closeout conditions and grants no remote deletion permission: `close-merged-worktree` owns normal local safety checks and removal, while abnormal worktrees return `RECOVERY_HANDOFF_REQUIRED`. After local closeout, retain `LOCAL_CLOSED_REMOTE_PENDING` until the Human deletes the remote branch and actual remote absence is freshly confirmed. Do not treat stale remote-tracking refs or network failure as actual remote evidence. Keep this routing separate from every local, remote, Production, migration, cleanup, and SQL authorization in this Skill.

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

Legacy manifests keep this stdout-only interface. A manifest whose contract version is
`S1-C1B-PRODUCTION-SMOKE-CLEANUP-RESCOPED-v1.0` uses
[cleanup-manifest.rescoped.template.json](assets/cleanup-manifest.rescoped.template.json)
and must not fall back to the legacy path. Its `rollback` and `commit` modes require
the raw manifest SHA-256, a separately authorized mode-specific record and its raw
SHA-256, and an absent artifact-bundle directory:

```bash
node .agents/skills/operate-supabase-live-db/scripts/render-e2e-cleanup-sql.mjs \
  --manifest /tmp/runtime-manifest-rescoped.json \
  --manifest-sha256 <sha256> \
  --authorization-record /tmp/rollback-generation-authorization.json \
  --authorization-record-sha256 <sha256> \
  --mode rollback \
  --artifact-directory /private/tmp/where-to-visit-cleanup-artifacts/rollback-bundle
```

The rescoped generator re-computes the contract scope digest, binds the exact
`postgres` database／role and `public` schema, and places fail-closed database／role
guards before target access. The caller must first establish the bundle parent as
an owner-only `0700` non-symlink directory. The generator reserves the absent child
artifact directory exactly once, writes fixed-name SQL and generation-record files
without replacing existing entries, and creates `COMPLETE` last. Treat the bundle
as executable only when the read-only bundle validator accepts `COMPLETE` and both
recorded hashes. Incomplete output may remain as evidence, but it is never an
executable artifact without a valid `COMPLETE` marker and must not be retried or
reused without a separate Human gate.

Validate a completed bundle without rendering or executing SQL:

```bash
node .agents/skills/operate-supabase-live-db/scripts/render-e2e-cleanup-sql.mjs \
  --validate-artifact-directory /private/tmp/where-to-visit-cleanup-artifacts/rollback-bundle
```

The rescoped manifest keeps a mode-neutral transaction-terminator contract. The
mode-specific authorization record, generation record, `COMPLETE`, evidence mode,
and SQL terminal statement must all agree: `rollback` ends in `ROLLBACK`, while
`commit` ends in `COMMIT`. This permits the unchanged scope digest to bind both the
verified ROLLBACK and a separately authorized later COMMIT. ROLLBACK and COMMIT
generation authorizations are not interchangeable; artifact generation does not
authorize SQL execution or permanent deletion. Blocked artifacts are evidence only
and must not be regenerated, edited, or reused. Production SQL execution remains
Human-only in the confirmed SQL Editor and is always a separate gate.

For rescoped COMMIT, keep artifact-generation authorization, SQL-execution
authorization, and permanent-deletion authorization as three separate decisions.
A valid COMMIT bundle with a passing `COMPLETE` marker authorizes neither execution
nor permanent deletion. After static bundle review, the Human must separately
approve the exact bundle path and SQL SHA-256, target scope, one full-query run,
retry count zero, permanent deletion, and the subsequent SELECT-only postcheck.

The generator must never connect to Supabase or write repository files. Legacy
generation prints only SQL to stdout; rescoped artifact generation writes only the
explicitly named Git-external bundle and never emits metadata on stdout.

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
