# Local / remote database E2E and Git gates

## Enter the E2E gate

Classify the gate before starting:

- **Local E2E:** run only after local incremental application, local postflight, advisor checks, and clean-chain replay pass.
- **Remote E2E:** run only after each required remote migration or correction is human-applied, remote postflight passes, and the user separately approves remote E2E.

Confirm `SUPABASE_URL` and `SUPABASE_ANON_KEY` are present in the named untracked profile without printing their values. Verify the profile against `config/supabase-targets.json` before starting either the test runner or Next.js.

Before running, record:

- active branch and HEAD;
- current diff and changed-file scope;
- which Slice cases must execute;
- current skip registrations and their environment predicates;
- local or remote phase, explicit command name, and confirmed non-secret target metadata.

## Run tests and validations

For a test-only correction, run the previously failing test first with the same target-specific wrapper. After it passes, run the applicable full gate.

Local:

1. `npm run test:e2e:local`
2. `npm run check`
3. `npm run build`
4. `git diff --check`

Remote:

1. `npm run test:e2e:remote`
2. `npm run check`
3. `npm run build`
4. `git diff --check`

Do not use the compatibility alias `npm run test:e2e` as formal gate evidence. Playwright must use `reuseExistingServer: false` so its runner and newly started Next.js process receive the same validated profile.

Do not use fixed sleeps to repair E2E timing. Wait for observable UI completion such as URL change, input clear, item count change, or persisted text before querying the database or starting the next mutation.

## Interpret E2E results

Report:

- phase, profile name, explicit command, and non-secret target metadata;
- total, pass, fail, and skip counts;
- every skipped test's full title and reason;
- required Slice cases and whether any were skipped;
- regression status for prior Slices;
- recurrence or absence of the database error under investigation.

Do not require global skip zero. In the configured environment, the setup-warning test may intentionally skip because Supabase is present. Verify that fact in current `tests/slice-1.spec.ts`; do not rely on this reference alone.

Require zero failures. Require zero skips in the Slice-specific real-database cases being accepted unless the current task explicitly approves a documented exception.

Local and remote results are separate evidence. A passing local run never proves the remote migration was applied, and a passing remote run never replaces the required local clean-chain replay.

## Handle failures

Classify each failure before changing anything:

- database schema, RLS, trigger, function, or data invariant;
- application behavior;
- locator ambiguity or stale locator state;
- missing mutation completion wait;
- environment or server setup;
- local / remote profile mismatch or an existing server using a different target;
- unrelated regression.

Preserve logs and traces. Report the cause and smallest proposed correction before stacking additional fixes. If a migration correction is needed, return to `migration-gates.md` and re-enter the approval cycle.

## Enter the commit gate

Commit only after the user explicitly requests it and all required local and remote gates pass.

1. Run `git status --short` and inspect `git diff --name-status`.
2. Confirm only approved files changed.
3. Confirm docs, dependencies, and applied migrations are unchanged unless explicitly in scope.
4. Confirm both the original migration and any later correction migration are included when required.
5. Stage exact paths rather than broad unrelated changes.
6. Commit once with the approved message.
7. Report commit hash, message, committed files, `git status --short`, and whether the tree is clean.

Do not amend, add another commit, or push without a new instruction.

## Enter the push gate

Push only after a separate explicit approval.

1. Confirm branch, HEAD, upstream, remote URL, and working-tree cleanliness.
2. Fetch only if current remote state must be refreshed and fetching is authorized.
3. Compare local HEAD with the intended remote branch.
4. Stop on detached HEAD, missing upstream, unexpected remote commits, non-fast-forward state, or wrong deployment branch.
5. Use a normal push. Do not force, amend, rebase, or merge.
6. After push, verify remote branch commit, ahead/behind, and clean status.
7. Report whether push may have triggered deployment and keep production smoke testing as its own authorized phase.

## Phase-aware ahead and behind

- At a clean task baseline, expect the explicitly approved starting relationship, commonly `0 / 0`.
- After commit and before push, local-ahead is expected.
- After successful push, expect local and remote to match.

Never use a universal `0 / 0` rule across all three phases.

## Stop conditions

Stop on:

- unapplied or unverified migration;
- missing local clean-chain replay or local E2E evidence;
- local / remote profile or tracked target mismatch;
- E2E failure or unexplained skip;
- required Slice case skipped;
- `check`, `build`, or `diff --check` failure;
- unexpected changed file;
- missing commit or push approval;
- wrong branch, upstream, remote, or deployment target;
- non-fast-forward or remote drift;
- a request for force push or history rewriting outside explicit scope.
