---
name: afk
description: Run a goal-oriented AFK loop over local markdown issues until ready tasks are done or blocked. Use manually when the user wants to go AFK, finish a feature, loop through .scratch tasks, or launch a coding agent goal.
disable-model-invocation: true
---

# AFK

Run a goal-oriented AFK loop over local markdown issues. The main agent is the goal orchestrator: keep taking the next unblocked `ready-for-agent` task, launch one fresh subagent for that task, verify the result, update the local tracker, then continue until the goal is complete or the loop is blocked.

This is intentionally simple. It uses built-in subagents for context management, not a custom worker runtime. Do not depend on Sandcastle. If a repo already has Sandcastle or another AFK runner, you may use it, but the default path is to orchestrate task-scoped subagents from the current session with explicit checkpoints.

## Tracker convention

Use the local markdown issue tracker only:

- Feature directory: `.scratch/<feature-slug>/`
- PRD: `.scratch/<feature-slug>/PRD.md`
- Issue: `.scratch/<feature-slug>/issues/<NN>-<slug>.md`
- Status line: `Status: ready-for-agent`, `Status: in-progress`, `Status: blocked`, or `Status: done`
- Comments: append compact notes under `## Comments`

Do not create remote tracker items. Do not use remote tracker CLIs unless the project already has an explicit AFK runner that uses them.

## Inputs

The user may provide:

- One local issue file
- A `.scratch/<feature-slug>/issues/` directory
- A `.scratch/<feature-slug>/` feature directory
- A goal in plain English, such as "finish this feature" or "work through ready issues until blocked"

If no path is provided, discover candidate feature directories under `.scratch/*/issues/` and ask which goal or feature to run.

## Process

### 1. Define the goal

State the concrete stopping condition before editing. Examples:

- All unblocked `ready-for-agent` issues in `.scratch/<feature-slug>/issues/` are `done`.
- The named issue and any newly unblocked dependent issues are `done`.
- The next task requires HITL, clarification, or unavailable verification.

Ask only if the goal or stopping condition is ambiguous.

### 2. Build the task queue

Read the relevant issues and parent PRD if present. Include only issues that satisfy:

- Status is `ready-for-agent`
- Not marked `HITL`
- `## Blocked by` is empty, says no blockers, or references issues that are already `done`
- Acceptance criteria are specific enough to verify without user input

Skip `done` issues. Leave `blocked` issues alone unless their blockers are now resolved; if resolved, move them back into the queue only after noting why.

Order the queue by blocker relationships, then issue number. If ordering is ambiguous, choose the smallest unblocked issue first. Prefer forward progress over perfect scheduling.

### 3. Choose the execution boundary

Default to the current session as orchestrator and one fresh implementation subagent per issue, working in the current working tree unless the user asks for stronger filesystem isolation or the repo already documents an AFK runner.

If the user asks for isolation, prefer a git worktree on an `agent/<feature-or-issue-slug>` branch. Use Sandcastle only when the repo already has `.sandcastle/` and a documented command, or when the user explicitly asks to set it up.

Before creating a branch, worktree, sandbox, or running a headless agent command, show the selected boundary and ask for approval.

### 4. Launch one subagent per task

For each queued issue:

1. Mark it `Status: in-progress`.
2. Launch a fresh subagent with a task packet containing only the selected issue, relevant PRD context, status rules, and verification rules.
3. Wait for the subagent's final report before touching tracker state again.
4. Inspect the diff and subagent report for obvious mistakes.
5. Run or re-run the narrowest explicit verification from the issue, PRD, package scripts, README, or project docs.
6. Mark `Status: done` only if acceptance criteria and verification pass.
7. Mark `Status: blocked` if implementation cannot proceed, verification fails, or human input is needed.
8. Append a compact `## Comments` note with outcome, verification, files changed, and follow-ups.
9. Rebuild the queue because completing one issue may unblock another.

The subagent owns implementation work for exactly one issue. The orchestrator owns task selection, tracker status, final verification, and deciding whether the loop continues.

Use a `general` subagent for implementation unless the active tool environment provides a more specific coding subagent. The subagent prompt must say:

- Implement only the selected issue.
- Do brief preflight exploration: relevant files, tests, docs, and ADRs only where needed.
- Make the smallest change that satisfies the issue.
- Run only explicit verification commands.
- Do not edit issue status lines.
- Do not append issue comments.
- Do not mark the issue done.
- Return a concise final report: files changed, acceptance criteria status, verification performed, blockers, and follow-ups.

Do not keep working through failed verification. Fix the current issue if the fix is obvious and in scope; otherwise mark it `blocked` and stop the AFK loop.

### 5. Stop conditions

Stop when any of these happen:

- No unblocked `ready-for-agent` issues remain for the goal.
- The next issue is `HITL` or needs clarification.
- Verification fails and the fix is not obvious.
- The diff becomes broader than the selected issue.
- The repo has no explicit verification and the change is risky enough that human review is needed.

### 6. Final report

When the loop stops, report:

- Issues completed
- Issues blocked or skipped, with reasons
- Verification performed
- Files changed
- Subagents launched
- Whether the goal is complete or what remains

Do not merge, commit, or push unless the user explicitly asked.

## Headless runner handoff

If the user specifically wants a separate headless process instead of built-in subagents, prepare a short prompt packet and run the repo's existing AFK command if documented. If no command exists, do not invent a permanent runner. Provide the prompt packet and ask what command/provider they want to use.

The packet should include:

- Goal and stop conditions
- Issue paths to consider
- Local tracker status rules
- Verification rules
- Instruction to work one issue at a time and stop on blockers

Keep setup recommendations repo-specific. Do not add Sandcastle, scripts, dependencies, or config without approval.
