---
name: coordinate-claude-codex-worktree
description: Safely coordinate Claude running in a mounted Cowork VM and Codex running on the macOS host across dedicated Git worktrees, with shared-worktree recovery as an exception. Use when assigning agent worktrees, establishing an implementation boundary, handing work between Claude and Codex, resolving mixed or unclear change ownership, or diagnosing `.git/index.lock` and `com.apple.Virtualization` without disturbing existing work.
---

# Coordinate Claude and Codex Across Worktrees

Protect uncommitted work before resuming development. Treat lock recovery, change ownership, Git publication, and implementation setup as separate gates.

## Default to one agent per worktree

1. Assign each active agent its own linked worktree and branch before allowing edits.
2. Reserve the primary checkout for human coordination and source review unless the human explicitly assigns it to one agent.
3. Keep one implementation slice in one dedicated worktree. Do not let Claude and Codex edit the same worktree concurrently.
4. Treat same-worktree collaboration as an exception that requires explicit human direction and the ownership controls below.
5. Remember that linked worktrees isolate working files and indexes but share objects, refs, and remotes. Do not check out the same branch in multiple worktrees or bypass approval gates for branch, commit, push, or merge operations.

## 1. Establish the exact worktree and approved baseline

1. Read the governing `AGENTS.md` completely.
2. Resolve the exact approved baseline SHA from the Execution Contract or traceable Human authorization. A branch name alone is not sufficient evidence of the approved baseline.
3. When the approved baseline is described as the current `main` or current default branch, confirm the current remote SHA through the GitHub API or `git ls-remote`. Do not rely on a potentially stale local remote-tracking ref.
4. If the approved commit object or ref is not available locally, perform only the fetch allowed by the applicable authorization. A verification-only fetch must not perform checkout, pull, merge, reset, rebase, or prune, and must not change worktree content.
5. Before creating a dedicated worktree, use `git worktree list --porcelain` and exact path and branch checks to confirm that the target path and branch are not already in use and that the intended branch is not checked out in another worktree.
6. For a new branch, confirm that its exact local ref does not exist. Reuse an existing local branch only when the Execution Contract or Human explicitly authorizes that reuse, ownership is known, its exact `HEAD` already equals the approved baseline SHA, and it is not checked out in any worktree. Otherwise stop before creating the worktree.
7. Create the branch and worktree only when the current request or a separate Human authorization permits those exact operations.
8. After creation, verify that the worktree record contains the exact target path and branch once, `HEAD` equals the approved baseline SHA, and the worktree and index are clean. Report the absolute working directory, repository root, branch, HEAD, upstream, and ahead/behind counts.
9. Run read-only status checks before changing files.
10. Stop if the requested repository or worktree differs from the resolved location, remote-current evidence cannot be obtained, the exact baseline cannot be proved, `HEAD` differs from it, the target branch is duplicated, branch ownership or reuse permission is unclear, or the worktree is not clean.

## 2. Diagnose `.git/index.lock`

Do not treat the lock as stale from its size, age, or process name alone.

1. Resolve the lock path with `git -C <exact-worktree-path> rev-parse --git-path index.lock`. If Git returns a relative path, resolve that returned value against the exact worktree path and retain the resulting exact absolute path. Use this Git-derived path as the only target for `stat`, `lsof`, removal, and the post-removal check. Never construct `<worktree>/.git/index.lock` as a string; a linked worktree's `.git` is normally a file that points to its Git directory.
2. Inspect the resolved lock path, size, and modification time.
3. Check for active Git processes on both the host and VM when both environments are available.
4. Inspect `lsof` for the resolved lock path.
5. Treat `com.apple.Virtualization` alone as evidence of the Cowork mount, not as evidence of an active Git operation. Any Git process or any other plausible lock holder is a stop condition.
6. Confirm that read-only Git status works.
7. Classify the lock as stale only when the evidence jointly shows no active Git operation and no non-mount holder.

Before removing a stale lock:

- Reconfirm the exact repository and the resulting exact absolute lock path derived from `git -C <exact-worktree-path> rev-parse --git-path index.lock`.
- Obtain explicit human authorization unless the current request already authorizes that exact removal.
- Remove only the resulting exact absolute lock path from the macOS host. Never use a recursive command, glob, unresolved environment variable, or broad Git cleanup.
- Verify that the resulting exact absolute lock path is absent and re-run read-only Git status.
- Record the evidence and outcome in the handoff.

If the VM receives `EPERM` through virtiofs, do not retry destructively. Hand the exact removal step to the host-side operator or Codex.

## 3. Build a change-ownership map

List staged, tracked-modified, and untracked paths separately. For every path, record:

- owner or origin: human, Claude, Codex, or unknown;
- workstream or slice;
- canonical, proposal, operational reference, implementation, or generated artifact;
- permitted next action and required approval.

Use explicit handoff evidence and diffs. Do not infer ownership from the filename alone. Mark unresolved paths as `unknown`.

While ownership is unresolved, do not edit, stage, commit, discard, restore, move, or rename those paths. Do not use stash as a substitute for ownership resolution.

## 4. Separate publication and implementation

Follow [`docs/06_qa-flow.md` §1.1](../../../docs/06_qa-flow.md#11-pr-readyreviewmergecloseout) for commit, push, Draft PR, Ready, review, merge, and remote-branch responsibilities. This Skill does not grant Git publication, review, merge, remote deletion, or Production permission.

When an exceptional shared checkout contains mixed work:

1. Stop new implementation in that checkout and keep it as the coordination and source-review workspace.
2. Obtain human approval for the exact files in each docs-only or governance commit.
3. Keep publication gates separate as required by `docs/06_qa-flow.md` §1.1.
4. Start implementation in a clean branch or clean worktree from the approved baseline. Do not carry unrelated dirty files into it.
5. Copy or reapply only the approved slice. Verify the resulting diff against the approved file list.

Creating a branch or worktree, moving changes, performing a verification-only fetch, or publishing Git state requires its own authorization when not already included in the request.

Confirm through the GitHub API that the PR's current state is `MERGED`; do not rely on an earlier report or local branch state. Then require both closeout signals independently:

1. The Human states through a traceable channel that the shared branch is no longer needed.
2. The GitHub API or `git ls-remote` confirms that the remote branch is currently absent.

Do not infer the Human's end-of-use decision from remote absence alone. When both signals are present, route task-owned worktree and local-branch closeout to [`close-merged-worktree`](../close-merged-worktree/SKILL.md). Do not use this Skill for remote-branch deletion, force removal, general cleanup, primary/shared/owner-unknown worktrees, or legacy branches.

## 5. Hand off with explicit stop conditions

Report:

- exact worktree, branch, HEAD, upstream, and ahead/behind state;
- lock evidence, classification, removal authorization, and result;
- ownership map and unresolved paths;
- files intentionally changed and files intentionally untouched;
- current development slice and approved baseline;
- next action, responsible role, and next human approval boundary.

Stop instead of guessing when repository identity, ownership, baseline, or authorization is unclear.

## 6. Keep governance concise

Keep detailed worktree coordination and shared-worktree recovery procedure in this Skill. Put only the durable principle and a pointer to this Skill in `AGENTS.md` and its synchronized counterpart. Do not describe this Skill as a product-specification source of truth.
