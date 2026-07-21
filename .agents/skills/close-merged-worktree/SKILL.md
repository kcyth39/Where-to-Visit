---
name: close-merged-worktree
description: Safely remove an implementer's own dedicated Git worktree and normally delete its local branch after the associated PR is merged, the User explicitly declares the shared branch finished, and the remote branch is confirmed absent. Use only for task-owned post-merge closeout with current baseline ancestry, a clean target, no unpublished work, classified ignored files, and a verified external control location. Do not use for remote deletion, primary/shared/other-owner/unknown/legacy worktrees, squash or rebase merges, abandonment decisions, baseline synchronization, pruning, force removal, or force branch deletion.
---

# Close Merged Worktree

Close only the standard implementer's own completed task worktree. Treat the User's shared-branch decision and the technical local-deletion checks as separate gates; stop without deleting when either gate is incomplete.

## Confirm authority and exact target

1. Read the repository's governing `AGENTS.md` and the canonical Git workflow in `docs/06_qa-flow.md` §1.1.
2. Identify the exact absolute worktree path, exact local branch, remote, PR, PR Head SHA, baseline branch, and implementer ownership.
3. Require evidence that the PR is `MERGED`.
4. Require both closeout signals:
   - the User explicitly states in a traceable message that this shared branch is finished; and
   - a current GitHub API or `git ls-remote --heads` check shows the exact remote branch is absent.
5. Do not infer the User's decision from remote absence alone.

Stop if the target is a primary, shared, other-owner, owner-unknown, legacy, active, or reusable worktree. Do not decide that an abandoned or unclear task may be deleted.

## Establish the control location

Before evaluating deletion, identify a control location that is:

- outside the target worktree;
- a valid Git context for the same repository;
- clean;
- ownership-known; and
- confirmed available for the removal commands and postchecks.

Do not infer that a primary, shared, or owner-unknown worktree is usable. Do not create a temporary control worktree automatically. If no qualifying control location exists, keep the target and report the stop condition.

From the verified control location, run `git worktree list --porcelain` and require exactly one record whose `worktree` value exactly equals the target's absolute path. Require that record's `branch` value to exactly equal `refs/heads/<exact-local-branch>`. Stop if the record contains `locked` or `prunable`, if the path or branch differs, or if zero or multiple records match.

## Verify current baseline integration

1. From a valid repository context, obtain current remote evidence without changing a checkout.
2. When required, fetch only the baseline ref and commit objects, for example `git fetch origin refs/heads/main:refs/remotes/origin/main`.
3. Do not use checkout, merge, reset, rebase, pull, or prune as part of closeout.
4. As an independent identity check, resolve the local branch Head with `git rev-parse refs/heads/<exact-local-branch>` and require exact equality with the merged PR Head SHA.
5. Separately, as an integration check, run `git merge-base --is-ancestor <exact-local-head> <exact-baseline-ref>` and require exit status 0 against the latest fetched baseline.

If ancestry is not proven, keep both worktree and branch. Squash merge, rebase merge, patch equivalence, or any other non-ancestral integration is outside this Skill and returns to Human judgment.

## Verify the target is disposable

Inspect metadata and filenames without reading secret contents. Require all of the following:

- `git status --porcelain=v1 --untracked-files=all` returns no tracked or untracked entry;
- no unpushed or local-only commit;
- no remaining task work, handoff, or future use;
- no linked process or active operation that makes removal unsafe;
- no submodule, lock, or repository-state ambiguity;
- Git administrative state has no merge, rebase, cherry-pick, revert, or bisect in progress; inspect `MERGE_HEAD`, `rebase-merge`, `rebase-apply`, `CHERRY_PICK_HEAD`, `REVERT_HEAD`, `BISECT_START`, and `BISECT_LOG` through paths resolved by `git rev-parse --git-path`; and
- `git status --short --ignored=matching` path names are fully classified without reading file contents.

The following ignored paths may be treated as reproducible when project rules do not say otherwise: `node_modules/`, `.next/`, `coverage/`, `playwright-report/`, `test-results/`, and known tool caches.

Stop on `.env*`, credentials, local profiles, database volumes or state, uploads, manually created artifacts, untracked evidence, or any unclassified ignored path. Do not inspect or print secret values. Do not discard a file merely because Git ignores it.

## Perform normal local closeout

Only after every prior check passes, run from the verified control location:

1. `git worktree remove <exact-absolute-target-path>`
2. Run `git worktree list --porcelain` again and confirm no record's `worktree` value equals the removed exact path; also confirm the control location remains clean.
3. `git branch -d <exact-local-branch>`
4. Confirm the target path and local branch are absent and re-check the control location.

Never delete the remote branch. Never use forced worktree removal, `git branch -D`, filesystem deletion, reset, clean, or automatic recovery. Never broaden an exact target into bulk branch cleanup.

If worktree removal fails, stop before branch deletion. If worktree removal succeeds but `git branch -d` fails, report the partial state—worktree removed, local branch retained—and do not force, recreate, or conceal it.

Stale remote-tracking refs are not proof of current remote state. Their pruning is outside this Skill and is not a closeout completion condition.

## Report evidence

Report:

- repository, control location, target path, local branch, remote branch, PR, PR Head, and baseline;
- the User's explicit end-of-use statement and current remote-absence result;
- limited fetch and ancestry result;
- exact `git worktree list --porcelain` target record, branch record, and locked／prunable result;
- tracked, untracked, Git administrative-state, unpublished-commit, ignored-file, residual-work, and ownership checks;
- each removal command result and postcheck;
- any retained path, branch, stale ref, or partial state; and
- confirmation that no remote deletion, force operation, prune, Production action, or database operation occurred.
