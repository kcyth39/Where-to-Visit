# E2E cleanup protocol

## Contents

1. Boundaries
2. Prepare a runtime manifest
3. Phase 1: discovery
4. Phase 2: ROLLBACK validation
5. Phase 3: committed deletion
6. Phase 4: post-COMMIT checks
7. Stop conditions

## Boundaries

Run cleanup only when the user explicitly asks to inventory or remove E2E data. Start with SELECT-only discovery even if an earlier run found targets.

The checked-in cleanup profile describes the current eight-table collaborative response-row schema. A later schema change again requires the profile, generator, manifest template, and self-test to be updated and reviewed together before rendering write SQL.

- Keep SQL execution human-operated in the confirmed Supabase SQL Editor.
- Do not use service role, privileged RPC, new DELETE policy, Auth, or application event deletion.
- Do not use a title prefix alone for deletion.
- Do not use UUIDs alone for deletion.
- Do not edit a successful ROLLBACK script into a COMMIT script.
- Do not reuse prior UUIDs, counts, FK results, trigger results, or the historical 40-event cleanup.
- Keep runtime manifests and rendered SQL outside the repository.

For local generator integration, run discovery and postcheck as single-statement files through `npm run supabase:db:query`. The sole local cleanup exception for reviewed multi-statement ROLLBACK and COMMIT files is `npm run supabase:cleanup:local`: use the repository npm wrapper, the unique localhost-bound local DB container, an absolute regular non-symlink file under `/private/tmp` with owner-only permissions and size at most 1 MiB, and an exact SHA-256. The wrapper sends SQL through stdin only. Remote discovery/postcheck retain the three-statement SQL Editor split files; remote writes remain human-run SQL Editor operations. Never use raw `docker exec`, raw `psql`, a host DB URL, or the cleanup wrapper remotely.

## Prepare a runtime manifest

Copy `assets/cleanup-manifest.template.json` to a uniquely named path under `/tmp`. Do not edit the checked-in template.

The manifest contains:

- schema profile version;
- schema and marker prefix;
- human-approved target event UUIDs;
- expected counts for all eight entities;
- expected remaining prefix event count;
- local transaction timeouts;
- ROLLBACK verification state and the generator-produced scope digest;
- explicit COMMIT authorization.

The generator rejects a stale profile, wrong schema or prefix, invalid or duplicate UUIDs, count mismatches, invalid timeouts, a changed scope digest, and incomplete COMMIT authorization.

After changing the profile, manifest, or generator, run its dependency-free self-test before rendering live SQL:

```bash
node .agents/skills/operate-supabase-live-db/scripts/test-render-e2e-cleanup-sql.mjs
```

## Phase 1: discovery

1. Confirm the dashboard project, database, and role.
2. Render discovery SQL:

   ```bash
   node .agents/skills/operate-supabase-live-db/scripts/render-e2e-cleanup-sql.mjs \
     --manifest /tmp/where-to-visit-e2e-cleanup.json \
     --mode discovery
   ```

3. Review the output. Confirm it contains SELECT statements only.
4. Identify every result-producing statement. Supabase SQL Editor may retain only the last result set from a multi-statement run, so do not run the combined discovery output when all results are required as evidence.
5. Split discovery mechanically into one reviewed file per result-producing statement. Each file must:
   - begin with `BEGIN TRANSACTION READ ONLY`;
   - contain exactly one result-producing `SELECT` or `WITH ... SELECT` copied byte-for-byte from the reviewed output;
   - end with `ROLLBACK`;
   - have a recorded line count, statement count, and SHA-256 digest.
6. Run the split files in order. For each file:
   - clear the SQL Editor and confirm it is empty;
   - enter the full file and read it back;
   - compare the editor contents byte-for-byte with the local file and verify the hash, first line, and last line;
   - execute the complete file once;
   - save the single result set and confirm `ROLLBACK` completed;
   - evaluate all expected rows, counts, match flags, digests, and invariants before proceeding.
7. Continue automatically to the next read-only split file only after the current result passes. Stop immediately without retrying or advancing on content mismatch, partial selection, missing result rows, drift, an unexpected count or reference, SQL or browser error, or incomplete ROLLBACK.
8. Capture:
   - every prefix-matching event UUID, title, and creation time;
   - per-event and aggregate counts for all eight entities;
   - the expected and actual nullability of every cleanup-relevant FK column, with every match flag true;
   - every FK, ordered source/reference columns, delete/update rule, match mode, validation, and deferrability setting whose side touches the eight-table cleanup graph;
   - every user trigger on the eight tables, including definition digest.
   - every reported cross-event invariant, all of which must have zero violations.
9. Compare live nullability, FK, trigger, and cross-event invariant results with `project-profile.md` and the latest migrations.
10. Stop on any drift. Update and revalidate this Skill before proceeding.
11. If discovery finds zero marker-prefix events, record the zero-target evidence, skip ROLLBACK and COMMIT cleanup phases, and do not render DELETE SQL.
12. Otherwise, have the human choose the exact event UUID allowlist.
13. Fill `targetEventIds`, `expectedCounts`, and `expectedRemainingPrefixEvents` from fresh results.
14. Keep `rollbackVerification.completed` and `baselineRestored` false, `scopeDigest` null, and `commitAuthorization` null.
15. Report the manifest summary and stop for approval to render ROLLBACK SQL.

Treat partially created events as valid inventory rows. Do not assume every event has a participant, candidate, or criterion. The six current cross-event invariant rows must all report zero before cleanup can continue.

## Phase 2: ROLLBACK validation

1. After approval, render:

   ```bash
   node .agents/skills/operate-supabase-live-db/scripts/render-e2e-cleanup-sql.mjs \
     --manifest /tmp/where-to-visit-e2e-cleanup.json \
     --mode rollback
   ```

2. Verify the rendered script:
   - begins with `BEGIN`;
   - contains the fixed UUIDs;
   - uses both UUID and prefix conditions;
   - displays a SHA-256 scope digest;
   - sets local lock and statement timeouts;
   - guards the current prefix-event total before DML;
   - rejects missing columns or nullability drift before creating its target snapshot;
   - locks target events, participants, candidates, and criteria in a stable order before taking the primary-key snapshot;
   - stores every target primary key before deletion;
   - guards pre-delete and affected-row counts;
   - rejects any non-target row that would be changed through a target participant or criterion;
   - checks saved primary keys directly in all eight tables;
   - emits no intermediate evidence result sets and returns exactly one final evidence result set immediately before `ROLLBACK`, containing mode, scope digest, fixed UUIDs, prefix count, all eight pre-delete counts, five explicit operation counts, all eight saved-primary-key remaining counts, and the final guard verdict;
   - contains no `COMMIT`;
   - ends with exactly one `ROLLBACK`.
3. Ask the human to confirm the target again, clear editor selections, and run the full script.
4. If Supabase warns about temporary tables without RLS, do not enable RLS on them. Continue only after confirming the warning refers to this reviewed transaction.
5. Save and evaluate the single final evidence result set. Require:
   - every pre-delete count equals the manifest;
   - the prefix-event total equals target events plus expected remaining prefix events;
   - every explicit child-delete and event operation count equals the manifest;
   - all eight saved-primary-key remaining counts are zero;
   - the final all-guards-passed value is true;
   - no lock timeout, statement timeout, trigger error, or other SQL error.
6. In a new query after ROLLBACK, rerun SELECT-only inventory and confirm the exact baseline counts and target UUIDs returned.
7. Do not infer ROLLBACK success from a UI success banner alone.
8. Record the printed scope digest with the restoration evidence, report it, and stop.

On any error, do not rerun. Use a new SELECT-only query to determine persistent state.

## Phase 3: committed deletion

Proceed only after the user separately approves permanent deletion.

1. Set all of the following in the runtime manifest:
   - `rollbackVerification.completed = true`;
   - `rollbackVerification.baselineRestored = true`;
   - `rollbackVerification.verifiedAt` to the actual verification time;
   - `rollbackVerification.scopeDigest` to the exact digest printed by the successful ROLLBACK script;
   - `commitAuthorization = "APPROVED_E2E_CLEANUP_COMMIT"`.
2. Do not change UUIDs, prefix, profile version, expected counts, expected remaining prefix events, or timeouts after ROLLBACK verification. The generator must reject a digest mismatch. If any scope value must change, return to discovery and ROLLBACK.
3. Render a separate script with `--mode commit`.
4. Verify it contains no `ROLLBACK`, returns the same single evidence result shape immediately before the transaction terminator, and ends with exactly one `COMMIT`.
5. Ask the human to reconfirm project, database, role, and target summary.
6. Clear search and selections, then run the complete script once.
7. Save and evaluate the single final evidence result set. Require the same pre-delete, operation-count, saved-primary-key, scope, and final-verdict checks as ROLLBACK.
8. On any error, do not rerun. Inspect persistent state from a new SELECT-only query.

## Phase 4: post-COMMIT checks

Render `--mode postcheck` from the same manifest. Confirm the output is SELECT-only, then run it in a new query. Because it is read-only, postcheck remains available for diagnosis even when COMMIT authorization or completed ROLLBACK metadata is absent.

Require:

- zero remaining rows for every fixed target event UUID;
- actual remaining prefix event count equals `expectedRemainingPrefixEvents`;
- the committed script reported zero saved-primary-key rows across all eight tables;
- repository state remains unchanged by the database operation.

Report completion with target count, entity counts, operation counts, postcheck results, and repository status.

## Stop conditions

Stop immediately on:

- unconfirmed project, database, or role;
- empty, duplicate, malformed, missing, or non-prefix UUID;
- schema-profile mismatch, unknown inbound or outbound FK, or unknown trigger;
- missing cleanup column or nullability mismatch;
- any cross-event invariant violation;
- inventory drift after the manifest is filled;
- a non-target row that references a target participant or criterion and would be changed by cleanup;
- count mismatch before or during deletion;
- lock or statement timeout;
- trigger or SQL error;
- any saved target primary key remaining;
- ROLLBACK baseline not fully restored;
- missing or changed scope digest after ROLLBACK;
- missing separate permanent-delete approval;
- a request to bypass the authorization phrase or safety checks;
- unexpected remaining UUID or prefix count after COMMIT.
- a SQL Editor content mismatch, partial selection, missing result set, or result that cannot be saved and reviewed before the next split query.
