# Where-to-Visit project profile

Treat this file as a checked-in adapter, not proof of current external state. Reconfirm mutable values before every live operation.

## Repository identity

- Expected repository: `kcyth39/Where-to-Visit`.
- Expected root name: `Where-to-Visit`. Discover the absolute path; do not hardcode one user's home path into generated artifacts.
- Expected primary branch and remote: `main` and `origin`. Verify both rather than assuming.
- Pushes to the deployment branch may trigger Vercel production deployment. Treat push as a separate external-state approval.
- Governing instructions: root `AGENTS.md`. Keep `CLAUDE.md` byte-identical whenever either is changed.

## Supabase target

- Human-confirmed expected dashboard project: `where-to-visit-dev`.
- Human-confirmed expected database: `Primary database`.
- Human-confirmed expected SQL Editor role: `postgres`.
- Schema: `public`.

The dashboard target is not defined in the repository. Ask the user to state or confirm project, database, and role immediately before every write. Stop if any value differs or is uncertain.

## Paths and commands

- Migration directory: `supabase/migrations/`.
- Migration naming: `YYYYMMDDHHMMSS_snake_case.sql` with a strictly later timestamp for corrections.
- Current remote application mode: human-run SQL Editor, as documented by this repository. Record this as manual application evidence; it does not automatically update `supabase_migrations.schema_migrations`.
- Do not mix manual SQL Editor application with a later CLI-history workflow. If `supabase migration list` or `supabase db push` becomes authoritative, reconcile the transition as a separately approved task before applying another migration.
- E2E files: `tests/slice-N.spec.ts`.
- Runtime environment variables: `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
- Validation:
  - `npm run test:e2e`
  - `npm run check`
  - `npm run build`
  - `git diff --check`

Do not read or print secret values. Confirm only whether required variables are present.

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

## Cleanup schema profile

Use profile version `where-to-visit-slice5-20260710021000` in cleanup manifests.

The generator intentionally pins this profile, schema, marker, entity list, FK-root order, and nullability expectations as executable constants. This is the project adapter and safety interlock; keep the reusable phase logic in `SKILL.md` and `cleanup-protocol.md`, and do not make these pins runtime-overridable. A schema change requires a reviewed profile, generator, and test update together.

| Entity | Root path for inventory | Relevant delete behavior |
|---|---|---|
| `events` | root `id` / `title` | Explicit cleanup target |
| `participants` | `event_id → events.id` | CASCADE |
| `candidates` | `event_id → events.id` | CASCADE |
| `criteria` | `event_id → events.id` | CASCADE; `created_by` SET NULL |
| `reactions` | `candidate_id → candidates.id` | Candidate, participant, criterion CASCADE |
| `concerns` | `candidate_id → candidates.id` | Candidate and participant CASCADE |
| `comments` | `candidate_id → candidates.id` | Candidate CASCADE; participant SET NULL |

Expected FK-column nullability:

- `reactions.candidate_id`, `participant_id`, and `criterion_id`: `NOT NULL`;
- `concerns.candidate_id` and `participant_id`: `NOT NULL`;
- `comments.candidate_id`: `NOT NULL`; `comments.participant_id`: nullable;
- `events.owner_participant_id`, `candidates.created_by`, and `criteria.created_by`: nullable;
- `participants.event_id`, `candidates.event_id`, and `criteria.event_id`: `NOT NULL`.

The reverse owner reference `events.owner_participant_id → participants.id` is `ON DELETE RESTRICT`. Clear it only for UUID-and-prefix-approved target events inside the cleanup transaction.

## Known trigger and CASCADE hazard

The current `comments_event_guard` fires before insert or updates of `candidate_id` or `participant_id`. Its function raises `candidate not found` if the referenced candidate has already disappeared. During an event cascade, candidate deletion can therefore conflict with the participant-driven `comments.participant_id = NULL` update.

For this schema profile, explicitly delete in this order:

1. `comments`
2. `reactions`
3. `concerns`
4. set target `events.owner_participant_id = NULL`
5. delete target `events`

Then let existing cascades remove participants, candidates, and criteria. This is an operational workaround, not a general deletion rule.

Before every cleanup, inspect live FK and trigger definitions. Stop if the schema differs, if a new migration changes these relationships, or if the profile version is stale. Update and revalidate the Skill before generating write SQL for a changed schema.

The current cleanup-graph FKs are immediate, non-deferrable constraints. Treat a live `is_deferrable` or `initially_deferred` change as schema drift and stop before write SQL.

Also require zero violations for owner-participant, creator-participant, feedback-participant, and reaction-criterion event matching. The transaction must reject any non-target event, candidate, criterion, reaction, concern, or comment that would be changed through a target participant or criterion.

The transaction locks target events, participants, candidates, and criteria with `FOR UPDATE` in a stable order. PostgreSQL documents that `FOR UPDATE` conflicts with `FOR KEY SHARE`, so an FK check that needs one of those target rows waits and is bounded by `lock_timeout`; it cannot silently widen the fixed deletion scope. See [Explicit Locking](https://www.postgresql.org/docs/17/explicit-locking.html#LOCKING-ROWS).
