---
name: close-merged-worktree
description: Safely remove an implementer's own normal registered Git worktree and normally delete its local branch after the associated work is merged and the Human declares local end-of-use. Use only for task-owned post-merge local closeout with current-main ancestry, a clean target, no unpublished work, classified ignored files, resolved runtime disposition, and a verified external control location. Keep remote branch deletion and absence confirmation as a separate Human-owned lifecycle. Do not use for remote deletion, primary/shared/other-owner/unknown/legacy or abnormal worktrees, squash or rebase recovery, abandonment decisions, baseline synchronization, pruning, filesystem deletion, Docker recovery, force removal, or force branch deletion.
---

# Close Merged Worktree

Close only the standard implementer's own completed normal registered task worktree. Follow the canonical lifecycle in [`docs/06_qa-flow.md` §1.1](../../../docs/06_qa-flow.md#11-pr-readyreviewmergecloseout): `LOCAL_OPEN`, `LOCAL_CLOSEOUT_READY`, `LOCAL_CLOSED_REMOTE_PENDING`, `FULLY_CLOSED`, and `RECOVERY_HANDOFF_REQUIRED`. This Skill performs only the `LOCAL_CLOSEOUT_READY` to `LOCAL_CLOSED_REMOTE_PENDING` transition.

## Confirm authority and exact target

1. Read the repository's governing `AGENTS.md` and the canonical Git workflow in `docs/06_qa-flow.md` §1.1.
2. Identify the exact absolute worktree path, exact local branch, remote, applicable PR and PR Head SHA, task Head, baseline branch, and implementer ownership.
3. For a PR-backed task, require evidence that the PR is `MERGED`; for every task, require the task Head to be contained in current main.
4. Require the Human to state in a traceable message that the task／shared branch and worktree are no longer needed.
5. Do not require remote branch absence, successful remote inspection, network availability, or Human remote deletion as local closeout permission.

Stop if the target is a primary, shared, other-owner, owner-unknown, legacy, active, reusable, unregistered, orphaned, prunable, locked, or metadata-mismatched worktree. Classify it as `RECOVERY_HANDOFF_REQUIRED`; do not decide that an abandoned or unclear task may be deleted.

## Establish the control location

Before evaluating deletion, identify a control location that is:

- outside the target worktree;
- a valid Git context for the same repository;
- clean;
- ownership-known; and
- confirmed available for the removal commands and postchecks.

Do not infer that a primary, shared, or owner-unknown worktree is usable. Do not create a temporary control worktree automatically. If no qualifying control location exists, keep the target and report the stop condition.

From the verified control location, run `git worktree list --porcelain` and require exactly one normal registered record whose `worktree` value exactly equals the target's absolute path. Require that record's `branch` value to exactly equal `refs/heads/<exact-local-branch>`. Classify the target as `RECOVERY_HANDOFF_REQUIRED` if the record contains `locked` or `prunable`, if the path or branch differs, or if zero or multiple records match. Report read-only evidence and stop without recovery.

## Verify current baseline integration

1. From a valid repository context, identify the current main baseline without changing a checkout. Remote task-branch state is not part of this check.
2. When required and authorized, fetch only the baseline ref and commit objects, for example `git fetch origin refs/heads/main:refs/remotes/origin/main`.
3. Do not use checkout, merge, reset, rebase, pull, or prune as part of closeout.
4. As an independent identity check, resolve the local branch Head with `git rev-parse refs/heads/<exact-local-branch>` and require exact equality with the merged PR Head SHA.
5. Separately, as an integration check, run `git merge-base --is-ancestor <exact-local-head> <exact-baseline-ref>` and require exit status 0 against the latest fetched baseline.

If ancestry is not proven, keep both worktree and branch and report `RECOVERY_HANDOFF_REQUIRED`. Squash merge, rebase merge, patch equivalence, or any other non-ancestral integration is outside this Skill and returns to Human judgment.

## Verify the target is disposable

Run every check in this section against the target worktree at `<exact-absolute-target-path>`, not against the control location. Keep the control location's clean-state check separate. Inspect metadata and filenames without reading secret contents. Require all of the following:

- `git -C <exact-absolute-target-path> status --porcelain=v1 --untracked-files=all` returns no tracked or untracked entry;
- no unpushed or local-only commit;
- no remaining task work, handoff, or future use;
- no linked process or active operation that makes removal unsafe;
- no unresolved runtime resource disposition;
- no submodule, lock, or repository-state ambiguity;
- Git administrative state has no merge, rebase, cherry-pick, revert, or bisect in progress; inspect `MERGE_HEAD`, `rebase-merge`, `rebase-apply`, `CHERRY_PICK_HEAD`, `REVERT_HEAD`, `BISECT_START`, and `BISECT_LOG` through target-specific paths resolved by `git -C <exact-absolute-target-path> rev-parse --git-path <state>`; and
- `git -C <exact-absolute-target-path> status --short --ignored=matching` path names are fully classified without reading file contents.

The following ignored paths may be treated as reproducible when project rules do not say otherwise: `node_modules/`, `.next/`, `coverage/`, `playwright-report/`, `test-results/`, and known tool caches.

Stop on `.env*`, credentials, local profiles, database volumes or state, uploads, manually created artifacts, untracked evidence, any unclassified ignored path, or any Human-owned／user-created content that deletion could lose. Report `RECOVERY_HANDOFF_REQUIRED`. Do not inspect or print secret values. Do not discard a file merely because Git ignores it.

## Perform normal local closeout

Only after every prior check passes, run from the verified control location:

1. `git worktree remove <exact-absolute-target-path>`
2. Run `git worktree list --porcelain` again and confirm no record's `worktree` value equals the removed exact path; also confirm the control location remains clean.
3. `git branch -d <exact-local-branch>`
4. Confirm the target path and local branch are absent and re-check the control location.
5. Report `LOCAL_CLOSED_REMOTE_PENDING` regardless of whether the remote branch exists, is unconfirmed, or cannot be inspected because of a network failure.

Never delete the remote branch. Never use force push, remote prune, forced worktree removal, `git branch -D`, filesystem deletion, reset, clean, automatic `git worktree prune`, Docker／Compose stop or removal, or recovery automation. Never broaden an exact target into bulk branch cleanup.

If worktree removal fails, stop before branch deletion. If worktree removal succeeds but `git branch -d` fails, report the partial state—worktree removed, local branch retained—and do not force, recreate, or conceal it.

Stale remote-tracking refs are not proof of current remote state. Their pruning is outside this Skill and is not a local closeout completion condition. The Human alone decides and performs remote branch deletion. Only after that operation and a fresh actual-remote absence check may the lifecycle move from `LOCAL_CLOSED_REMOTE_PENDING` to `FULLY_CLOSED`; a network failure leaves it pending.

## Report evidence

Report:

- repository, control location, target path, local branch, remote branch, PR, PR Head, and baseline;
- the Human's explicit end-of-use statement and the local lifecycle state;
- limited fetch and ancestry result;
- exact `git worktree list --porcelain` target record, branch record, and locked／prunable result;
- tracked, untracked, Git administrative-state, unpublished-commit, ignored-file, residual-work, and ownership checks;
- each removal command result and postcheck;
- any retained path, branch, stale ref, partial state, or `RECOVERY_HANDOFF_REQUIRED` reason;
- the `LOCAL_CLOSED_REMOTE_PENDING` Human remote-deletion handoff, or a separately established `FULLY_CLOSED` result; and
- confirmation that no remote deletion, force operation, prune, Production action, or database operation occurred.
