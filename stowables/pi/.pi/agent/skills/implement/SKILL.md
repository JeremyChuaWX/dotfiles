---
name: implement
description: Implement approved local markdown issues created by to-issues, using serial Implementation workers, shared implementation logging, and orchestrator verification. Use manually when the user wants to implement ready-for-agent issues from .scratch.
disable-model-invocation: true
---

# Implement

Run through local markdown implementation issues created by `to-issues` and implement them one at a time.

Use **Implementation worker** for the execution context assigned to a single issue. If worker spawning is available in the current environment, spawn one worker per issue. If it is not available, execute each issue serially in the current session while preserving the same worker boundaries.

The project issue tracker is Matt's **Local Markdown** tracker only:

- One feature per directory: `.scratch/<feature-slug>/`
- The PRD is `.scratch/<feature-slug>/PRD.md`
- Implementation issues are `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01`
- Triage state is recorded as a `Status:` line near the top of each issue file
- Comments and conversation history append to the bottom of the file under a `## Comments` heading

Do not create remote tracker items. Do not use remote tracker CLIs. Ignore GitHub, GitLab, Linear, Jira, and any other remote issue tracker.

## Inputs

The user may provide:

- A feature directory: `.scratch/<feature-slug>/`
- An issues directory: `.scratch/<feature-slug>/issues/`
- One or more local issue files
- An issue number, when the feature directory is clear from context

If no path is provided, discover candidate issue directories under `.scratch/*/issues/` and ask which one to implement.

## Process

### 1. Discover the issues

Read the selected local issue files. Include only issues with local statuses that can be worked:

- `Status: ready-for-agent`
- `Status: blocked` only if its blockers are now resolved

Skip `Status: done` issues.

For each issue, identify:

- Issue file path
- Title
- Status
- Type, if present (`HITL` / `AFK`)
- Parent PRD or parent issue from `## Parent`, if present
- Blockers from `## Blocked by`
- Acceptance criteria
- Comments relevant to implementation

Do not start `HITL` issues without explicit user approval for that issue, even if they are otherwise unblocked.

### 2. Prepare the Implementation log

Use a single shared **Implementation log** at `.scratch/<feature-slug>/IMPLEMENTATION.md`.

Create it lazily if it does not exist, using this shape:

```md
# Implementation Log

## Current state

## Cross-issue decisions

## Issue notes

## Verification history
```

Keep it compact. Record cross-issue insights, not exhaustive transcripts or full diffs.

### 3. Build an execution order

Topologically order issues by local blockers. Default to serial execution.

Before coding, present the execution order and ask for approval. Show:

- Issue title and path
- Why it is eligible now
- Any unresolved blockers
- Whether it is `AFK` or `HITL` when known
- Whether execution will use spawned workers or current-session worker boundaries

Do not start implementation until the user approves.

### 4. Create an issue packet for each Implementation worker

Minimize context. Each worker receives only:

- Issue path and full contents
- Parent `.scratch/<feature-slug>/PRD.md`, or relevant PRD sections if identifiable
- `.scratch/<feature-slug>/IMPLEMENTATION.md`
- Verification expectations derived from acceptance criteria
- Any relevant comments from the issue

Do not preload ADRs into every worker. Instruct the worker to discover relevant docs or ADRs only when its preflight exploration touches an area with ADRs or when it faces an architectural decision.

### 5. Worker protocol

Each Implementation worker must:

1. Read its issue packet.
2. Perform brief preflight exploration before editing:
   - find relevant files, tests, docs, and ADRs as needed
   - state the intended change
3. Implement only its assigned issue.
4. Run issue-specific verification that is clear from acceptance criteria.
5. Report:
   - files changed
   - acceptance criteria status
   - verification performed
   - decisions or insights worth adding to the Implementation log
   - follow-ups or blockers

Workers should not mark issues `done` themselves unless they are also acting as the orchestrator in the current session.

### 6. Orchestrator verification after each worker

After each worker finishes, the orchestrator must:

1. Review changed files and the worker report.
2. Run project checks only when the user or project configuration explicitly provides them. Do not invent check commands.
3. Mark the issue:
   - `Status: in-progress` when beginning work
   - `Status: done` only if acceptance criteria and orchestrator verification pass
   - `Status: blocked` if implementation cannot proceed or verification fails
4. Append a compact note under the issue's `## Comments` heading with:
   - implementation outcome
   - verification performed
   - follow-ups or blockers, if any
5. Update `.scratch/<feature-slug>/IMPLEMENTATION.md` with compact entries for:
   - current state changes
   - cross-issue decisions
   - issue notes keyed by issue file
   - verification history
6. Continue to the next unblocked issue only after status, comments, and log updates are complete.

### 7. Failure handling

If verification fails:

- Do not continue blindly to dependent issues.
- Record the failure in the issue comments and Implementation log.
- Mark the failed issue `Status: blocked`.
- Ask the user whether to fix immediately, skip independent issues, or stop.

If an issue is too broad:

- Stop and propose splitting it into smaller tracer-bullet issues using the `to-issues` workflow.
- Do not silently expand scope.

## Status vocabulary

Use local status vocabulary only:

- `Status: ready-for-agent`
- `Status: in-progress`
- `Status: blocked`
- `Status: done`

When beginning an issue, the orchestrator may mark it `Status: in-progress`. When ending an issue, the orchestrator must replace `in-progress` with `done` or `blocked`.
