# Where-to-Visit project profile

Treat this file as a checked-in adapter, not proof of current external state. Reconfirm mutable values before every live operation.

## Repository identity

- Expected repository: `kcyth39/Where-to-Visit`.
- Expected root name: `Where-to-Visit`. Discover the absolute path; do not hardcode one user's home path into generated artifacts.
- Expected primary branch and remote: `main` and `origin`. Verify both rather than assuming.
- A normal push to an approved work branch may follow the standard Git publication scope. Pushes to a deployment branch may trigger Vercel Production and are not included; stop instead. Do not push directly to `main`; the User merges an approved PR.
- Governing instructions: root `AGENTS.md`. Keep `CLAUDE.md` byte-identical whenever either is changed.

## Supabase target

- Human-confirmed expected dashboard project: `where-to-visit-dev`.
- Human-confirmed expected database: `Primary database`.
- Human-confirmed expected SQL Editor role: `postgres`.
- Schema: `public`.

The tracked remote hostname contract is `config/supabase-targets.json`; the dashboard project name, database, and SQL Editor role still require immediate human confirmation before every remote write. Stop if the hostname, project, database, or role differs or is uncertain.

## Local development profile

- Supabase CLI: exact devDependency `2.109.1`.
- Local config: `supabase/config.toml`.
- PostgreSQL: 17.
- Auth and seed: disabled.
- Expected ports: API 54321, DB 54322, Studio 54323, Mailpit 54324, Analytics 54327.
- Untracked profiles: `.env.supabase.local` and `.env.supabase.remote`.
- Tracked target contract: `config/supabase-targets.json`.
- Exact local API URL: `http://127.0.0.1:54321`.
- Required remote URL shape: HTTPS, port 443, and exact match to the human-confirmed dev-project hostname in the tracked contract.

The target implementation provides these scripts:

| Script | Contract |
|---|---|
| `dev:local` / `dev:remote` | Validate the named profile and target before starting Next.js |
| `test:e2e:local` / `test:e2e:remote` | Give the same profile to Playwright and a fresh Next.js server |
| `dev` / `test:e2e` | Compatibility aliases to the explicit local scripts |
| `supabase:start` | Create or reuse the project network, bind published ports to `127.0.0.1`, start with `--network-id`, and verify every HostIp |
| `supabase:status` | Report stack, service, port, and HostIp state without printing keys or passwords |
| `supabase:stop` | Stop the stack while retaining volumes, verify no project container remains, then remove the project network |
| `supabase:migration:list` / `supabase:migration:up` | Run local migration inspection/application through the fixed network wrapper |
| `supabase:db:query` / `supabase:db:advisors` / `supabase:test:db` | Run local postflight, advisor, and pgTAP through the fixed network wrapper |
| `supabase:db:reset` | Recreate the local DB through the Docker create proxy, require DB-create observation, and verify all final bindings |
| `supabase:cleanup:local` | Dedicated cleanup exception: execute one reviewed, hash-pinned local ROLLBACK or COMMIT through stdin inside the unique localhost-bound DB container; require a regular non-symlink `/private/tmp` file, owner-only permissions, and size at most 1 MiB; never use raw Docker/psql, host DB URLs, or remote SQL |

Until these wrappers, profiles, and tracked target contract exist and pass their checks, do not treat raw `supabase start`, generic `npm run dev`, or generic `npm run test:e2e` as valid local evidence.

## Paths and commands

- Migration directory: `supabase/migrations/`.
- Migration naming: `YYYYMMDDHHMMSS_snake_case.sql` with a strictly later timestamp for corrections.
- Current remote application mode: human-run SQL Editor, as documented by this repository. Record this as manual application evidence; it does not automatically update `supabase_migrations.schema_migrations`.
- Do not mix manual SQL Editor application with a later CLI-history workflow. If `supabase migration list` or `supabase db push` becomes authoritative, reconcile the transition as a separately approved task before applying another migration.
- E2E files: `tests/slice-N.spec.ts`.
- Runtime environment variables: `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
- Validation:
  - `npm run test:e2e:local` for local evidence;
  - `npm run test:e2e:remote` for remote evidence;
  - `npm run check`
  - `npm run build`
  - `git diff --check`

Official reports must use the explicit `:local` or `:remote` command name, even though compatibility aliases exist. Do not read or print secret values, raw `supabase status`, or profile contents. Confirm only target metadata and whether required variables are present.

Fixed CLI 2.109.1 treats a local `db query --file` as one prepared statement. Local SELECT-only files must contain exactly one `SELECT` or `WITH ... SELECT`, with no transaction wrapper or additional statement. Keep the remote SQL Editor `BEGIN TRANSACTION READ ONLY` / one result statement / `ROLLBACK` contract unchanged.

## Product and authorization boundaries

- Use Supabase Postgres and anon clients with request tokens; do not add Supabase Auth.
- Do not use a service-role key.
- Do not add a privileged cleanup RPC or broaden DELETE policy for cleanup.
- Keep event deletion outside the product MVP. Manual E2E cleanup is an administrative operation, not application functionality.
- Keep existing applied migrations unchanged.

## E2E marker

- Marker prefix: `[E2E]`.
- Root filter: `public.events.title LIKE '[E2E]%'`.
- Current environment-dependent known skip: `Slice 1 setup state › shows a configuration error instead of using a local fallback` when Supabase is configured.

Verify the skip registration in current test code. Do not fix total test or skip counts in this profile.

## pgTAP file selection

Always pass explicit test paths to `npm run supabase:test:db`. A pathless run recursively collects `fixtures/` and ordinary SELECT checks and is not valid pgTAP evidence.

The standard post-clean-chain pgTAP set is:

- `supabase/tests/collaborative_response_row_model_test.sql` (`plan(18)`);
- `supabase/tests/private_rls_helpers_test.sql` (`plan(10)`).

Require Files 2 / Tests 28 / PASS. Run `adr6_data_preservation_test.sql` and `adr6_concern_backfill_test.sql` only inside their dedicated fixture lifecycle. Files under `supabase/tests/fixtures/*.sql` and `supabase/tests/adr6_failed_migration_rollback_check.sql` are supporting SQL, not pgTAP tests; do not add artificial TAP plans to them.

## Cleanup schema profile

Use profile version `where-to-visit-collaborative-response-row-20260712144228` in cleanup manifests. It is fixed to the schema after migrations `20260712032527` and `20260712144228` and is not runtime-overridable.

The generator intentionally pins this profile, schema, marker, entity list, FK-root order, and nullability expectations as executable constants. This is the project adapter and safety interlock; keep the reusable phase logic in `SKILL.md` and `cleanup-protocol.md`, and do not make these pins runtime-overridable. A schema change requires a reviewed profile, generator, and test update together.

| Entity | Root path for inventory | Relevant delete behavior |
|---|---|---|
| `events` | root `id` / `title` | Explicit cleanup target |
| `participants` | `event_id → events.id` | CASCADE |
| `candidates` | `event_id → events.id` | CASCADE |
| `criteria` | `event_id → events.id` | CASCADE; `created_by` SET NULL |
| `votes` | `candidate_id → candidates.id` | Candidate and participant CASCADE |
| `reactions` | `candidate_id → candidates.id` | Candidate, participant, criterion CASCADE |
| `concerns` | `candidate_id → candidates.id` | Candidate, participant, criterion CASCADE |
| `comments` | `candidate_id → candidates.id` | Candidate and participant CASCADE |

Expected FK-column nullability:

- `reactions.candidate_id`, `participant_id`, and `criterion_id`: `NOT NULL`;
- `votes.candidate_id` and `participant_id`: `NOT NULL`;
- `concerns.candidate_id`, `participant_id`, and `criterion_id`: `NOT NULL`;
- `comments.candidate_id` and `participant_id`: `NOT NULL`;
- `candidates.created_by` and `criteria.created_by`: nullable;
- `participants.event_id`, `candidates.event_id`, and `criteria.event_id`: `NOT NULL`.

## Current trigger and deletion profile

Require the exact 12-trigger set: `events_prepare_row`, `participants_prepare_row`, `candidates_prepare_row`, `criteria_prepare_row`, `votes_prepare_row`, `comments_prepare_row`, `votes_event_guard`, `reactions_event_guard`, `concerns_event_guard`, `comments_event_guard`, `reactions_reject_update`, and `concerns_reject_update`. Compare schema, table, enabled state, timing, events, UPDATE column scope, row/statement scope, called function, and definition digest during discovery.

For this schema profile, explicitly delete in this order:

1. `votes`
2. `comments`
3. `reactions`
4. `concerns`
5. delete target `events`

Then let existing cascades remove participants, candidates, and criteria. This is an operational workaround, not a general deletion rule.

Before every cleanup, inspect live FK and trigger definitions. Stop if the schema differs, if a new migration changes these relationships, or if the profile version is stale. Update and revalidate the Skill before generating write SQL for a changed schema.

The current cleanup-graph FKs are immediate, non-deferrable constraints. Treat a live `is_deferrable` or `initially_deferred` change as schema drift and stop before write SQL.

Require zero violations for candidate/criterion creators and for Vote, Reaction, Concern, and Comment event matching. Use the catalog to reject every FK crossing the eight-table cleanup graph boundary; do not infer boundary safety from a hand-written public-table list. The transaction must also reject any non-target known row that references a target candidate, participant, or criterion.

The transaction locks target events, participants, candidates, and criteria with `FOR UPDATE` in a stable order. PostgreSQL documents that `FOR UPDATE` conflicts with `FOR KEY SHARE`, so an FK check that needs one of those target rows waits and is bounded by `lock_timeout`; it cannot silently widen the fixed deletion scope. See [Explicit Locking](https://www.postgresql.org/docs/17/explicit-locking.html#LOCKING-ROWS).
