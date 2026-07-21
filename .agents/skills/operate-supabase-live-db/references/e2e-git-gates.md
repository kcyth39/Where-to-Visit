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

## Enter the Git publication gate

Enter Git publication only after all required local and remote gates pass and the approved Execution Contract includes Git publication. Otherwise stop and request that scope.

The standard implementer may complete the following flow without a separate approval between each operation:

1. Run `git status --short` and inspect `git diff --name-status`.
2. Confirm only approved files changed.
3. Confirm docs, dependencies, and applied migrations are unchanged unless explicitly in scope.
4. Confirm both the original migration and any later correction migration are included when required.
5. Stage exact paths rather than broad unrelated changes.
6. Commit with a message that matches the approved scope.
7. Confirm branch, HEAD, upstream, remote URL, ahead／behind, and working-tree cleanliness.
8. Use a normal push to the work branch. Do not force, amend published history, rebase, merge, or push directly to `main`.
9. Verify the remote branch commit and local／remote relationship.
10. Create a new Draft PR or update the existing Draft PR title／body and current validation evidence.
11. Continue in-scope review fixes with revalidation, commit, normal push, and PR updates.
12. After the Definition of Done passes, mark the PR Ready for review.

Do not create a new PR as Ready from the start. The standard implementer does not approve review, merge, close the PR, delete local／remote branches, remove a worktree, discard worktree files, force push, or push directly to `main`.

Keep Vercel Production confirmation, remote database operations, E2E cleanup, and every other Production action as their own Human gates. A normal work-branch push is not Production approval. If the intended push target is a deployment branch, stop rather than applying this standard flow.

After merge, the standard implementer may verify the merge, required commit integration, uncommitted／unpushed changes, remaining branch-specific work, and future use. Report whether branch／worktree closeout is possible, but do not perform deletion without a separate request to the User or designated manager.

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
- missing Git publication scope in the approved Execution Contract;
- wrong branch, upstream, remote, or deployment target;
- non-fast-forward or remote drift;
- a request for force push or history rewriting outside explicit scope.
