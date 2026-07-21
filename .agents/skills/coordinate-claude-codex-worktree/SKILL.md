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

## 1. Establish the exact worktree

1. Read the governing `AGENTS.md` completely.
2. Report the absolute working directory, repository root, branch, HEAD, upstream, and ahead/behind counts.
3. Run read-only status checks before changing files.
4. Stop if the requested repository or worktree differs from the resolved location.

## 2. Diagnose `.git/index.lock`

Do not treat the lock as stale from its size, age, or process name alone.

1. Inspect the exact lock path, size, and modification time.
2. Check for active Git processes on both the host and VM when both environments are available.
3. Inspect `lsof` for the exact lock path.
4. Treat `com.apple.Virtualization` alone as evidence of the Cowork mount, not as evidence of an active Git operation. Any Git process or any other plausible lock holder is a stop condition.
5. Confirm that read-only Git status works.
6. Classify the lock as stale only when the evidence jointly shows no active Git operation and no non-mount holder.

Before removing a stale lock:

- Resolve the exact repository and exact `.git/index.lock` path.
- Obtain explicit human authorization unless the current request already authorizes that exact removal.
- Remove only that file from the macOS host. Never use a recursive command, glob, unresolved environment variable, or broad Git cleanup.
- Verify that the lock is absent and re-run read-only Git status.
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

Creating a branch or worktree, moving changes, or publishing Git state requires its own authorization when not already included in the request.

After an approved PR is merged and the Human explicitly ends shared-branch use by deleting the remote branch, route task-owned worktree and local-branch closeout to [`close-merged-worktree`](../close-merged-worktree/SKILL.md). Do not use this Skill for remote-branch deletion, force removal, general cleanup, primary/shared/owner-unknown worktrees, or legacy branches.

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
