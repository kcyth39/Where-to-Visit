---
name: draft-execution-contract
description: Draft a Human-gated Execution Contract as chat text or an explicitly authorized Markdown file. Use only when the Human explicitly invokes `$draft-execution-contract` or explicitly approves its use after an agent proposes it; do not use merely because a task appears suitable.
---

# Draft Execution Contract

Turn confirmed Human intent into a self-contained contract without prescribing an unnecessary implementation process. Draft the contract only; do not plan or implement the target task.

## Respect the three Human gates

1. Require explicit Human approval to invoke this Skill. If the task only appears suitable, propose this Skill with a short reason and stop without loading or applying it.
2. Draft the contract in the Human-approved output form, then stop. Wait for the Human to adopt that exact version and authorize plan creation.
3. Let the execution agent inspect sources read-only, draft a plan, and stop. Implementation begins only after a separate Human approval.

Treat the gates separately even when the contract author and execution agent are the same agent. An implementation approval may include standard Git publication through Ready for review only when the contract says so. It never implies Reviewer approval, merge, remote branch deletion, local closeout, or Production authority.

## Choose the output form

The agent may recommend a form, but the Human decides.

- **Chat:** Use for a short, one-off contract. Do not create or modify files.
- **Markdown:** Use when length, version identity, reuse, handoff, or review makes chat unsafe. Before writing, require the Human to approve the exact path, create-versus-update action, ownership, current tracked-or-untracked state, whether the file is a future Git-tracking candidate, and whether later Git publication is in scope. Neither tracking choice authorizes staging.

For Markdown output:

- Change only the approved exact path. Do not stage, commit, push, or add it to a PR without separate authorization or a later approved contract.
- Inspect existing content and ownership before an update, and apply a minimal diff. Stop if the content cannot be inspected or might be lost.
- Add `PROPOSED EXECUTION CONTRACT / NOT YET AUTHORIZED` and state that file creation, tracking, or merge does not authorize implementation.
- Do not treat an untracked file as canonical or as a Reviewer's only evidence. A review artifact must be reachable from the PR as a tracked file or be reproduced in the PR body.

If an adopted chat or Markdown contract changes, its adoption expires. Stop until the Human adopts the new exact version. Identify a chat version by quoting the full contract, using a contract ID or digest, or explicitly adopting the immediately preceding full contract. Identify a Markdown version by exact path plus commit SHA, file hash, or another unambiguous identifier.

## Gather only necessary input

Read available canonical sources and evidence. Separate confirmed facts, Human decisions, hypotheses, examples, discarded approaches, and unresolved matters. Remove conversation-local context that would confuse an execution agent. Do not invent product meaning, technical decisions, permissions, or approval.

## Produce all nine sections

When producing an Execution Contract, always output these nine headings, even when a concise, reasoned `Not applicable` is appropriate. When a STOP RULE prevents contract generation, report the stop instead and do not generate a partial contract.

### 1. Goal

State the verifiable end state. Point to an approved requirements document when it fully defines the goal.

### 2. Scope

Include every required subsection:

- planning scope
- execution scope
- execution role
- allowed deliverables
- allowed change types
- out of scope
- allowed Git publication or other ancillary operations
- disallowed roles, operations, and deliverables

Do not infer permission from a role name.

### 3. Preconditions

List the baseline, dependencies, environment, ownership, approvals, and other state that must be proven before planning or execution.

### 4. References

List the canonical sources and evidence the execution agent needs. Do not treat unadopted chat history, agent memory, or an untracked local file as team authority or an execution basis. A Human-adopted exact chat or Markdown Execution Contract may authorize only its approved task and scope; it does not become a team rule or specification source and does not replace the tracked canonical sources listed in the contract.

### 5. Prohibited actions

State forbidden changes, operations, decisions, scope expansion, and permission escalation.

### 6. Definition of Done

Use objective, verifiable completion conditions, including required evidence and review handoff.

### 7. STOP RULES

Define conditions that require stopping before mutation, the evidence to report, and the role that can release the stop.

### 8. ESCAPE HATCH

Define safe alternatives and resumption conditions. Never use an escape hatch to bypass a stop rule or permission.

### 9. Human decisions

Collect genuine Human decisions with the reason, options, and impact of each option. Do not return questions that repository evidence or a domain owner can resolve.

## Preserve execution-agent freedom

Define goals, boundaries, evidence, and acceptance. Do not prescribe detailed implementation steps unless an existing canonical procedure makes them mandatory. Require the execution agent to propose the plan that best satisfies the contract.

When another opinion would materially help the Human assess the plan, risk, or missing information, offer an independent advisory agent as an option. Do not start one automatically, and do not elevate an advisor into an approver or implementer. Declining independent advice is not a blocker.

## Route Production database work away

Do not generate an Execution Contract whose purpose is a Production database operation. Stop and direct the Human to the current Supabase canonical sources and `$operate-supabase-live-db`. Do not infer or add Production authority from a general contract. Slice 5 governance must be implemented separately.

## Define review handoff when publication is in scope

Require the execution agent to leave the Reviewer enough evidence to independently check the adopted contract against the exact Head. Include PR URL, base and Head SHAs, goal, requirements, DoD, exact scope, actual diff, traceability, QA results, required versus observed checks, conflict, mergeability, unresolved findings, residual risks or exceptions, and any required domain review with its checked Head.

## Stop after drafting

Return the contract in the approved form and stop. Do not inspect for an implementation plan, implement, stage, commit, push, open or update a PR, or change external state during this Skill invocation.
