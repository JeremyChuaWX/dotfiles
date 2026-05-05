---
name: implement
description: Execute local plan slices created by to-plan using serial Implementation workers, shared implementation logging, and orchestrator verification. Use manually when the user wants to implement an approved .harness plan.
disable-model-invocation: true
---

# Implement

Run through local plan slices created by `to-plan` and implement them one at a time.

Use **Implementation worker** for the execution context assigned to a single slice. If worker spawning is available in the current environment, spawn one worker per slice. If it is not available, execute each slice serially in the current session while preserving the same worker boundaries.

Do not create remote tracker items. Do not use remote tracker CLIs.

## Inputs

The user may provide:

- A feature directory: `.harness/<feature-slug>/`
- A plan directory: `.harness/<feature-slug>/plan/`
- One or more plan slice files

If no path is provided, discover candidate plan directories under `.harness/*/plan/` and ask which one to implement.

## Process

### 1. Discover the plan

Read the selected plan slice files. Include only slices with local statuses that can be worked:

- `Status: needs-triage`
- `Status: blocked` only if its blockers are now resolved

Skip `Status: done` slices.

For each slice, identify:

- Slice file path
- Title
- Status
- Blockers from `## Blocked by`
- Acceptance criteria

### 2. Prepare the Implementation log

Use a single shared **Implementation log** at `.harness/<feature-slug>/IMPLEMENTATION.md`.

Create it lazily if it does not exist, using this shape:

```md
# Implementation Log

## Current state

## Cross-slice decisions

## Slice notes

## Verification history
```

Keep it compact. Record cross-slice insights, not exhaustive transcripts or full diffs.

### 3. Build an execution order

Topologically order slices by local blockers. Default to serial execution.

Before coding, present the execution order and ask for approval. Show:

- Slice title and path
- Why it is eligible now
- Any unresolved blockers
- Whether execution will use spawned workers or current-session worker boundaries

Do not start implementation until the user approves.

### 4. Create a slice packet for each Implementation worker

Minimize context. Each worker receives only:

- Plan slice path and full contents
- Root `CONTEXT.md`, or the relevant `CONTEXT-MAP.md` entry when present
- Relevant PRD sections if identifiable; otherwise a brief PRD summary and path
- `.harness/<feature-slug>/IMPLEMENTATION.md`
- Verification expectations derived from acceptance criteria

Do not preload ADRs into every worker. Instruct the worker to discover relevant docs or ADRs only when its preflight exploration touches an area with ADRs or when it faces an architectural decision.

### 5. Worker protocol

Each Implementation worker must:

1. Read its slice packet.
2. Perform brief preflight exploration before editing:
   - find relevant files, tests, docs, and ADRs as needed
   - state the intended change
3. Implement only its assigned Plan slice.
4. Run slice-specific verification that is clear from acceptance criteria.
5. Report:
   - files changed
   - acceptance criteria status
   - verification performed
   - decisions or insights worth adding to the Implementation log
   - follow-ups or blockers

Workers should not mark slices `done` themselves unless they are also acting as the orchestrator in the current session.

### 6. Orchestrator verification after each worker

After each worker finishes, the orchestrator must:

1. Review changed files and the worker report.
2. Run project checks only when the user or project configuration explicitly provides them. Do not invent check commands.
3. Mark the slice:
   - `Status: done` only if acceptance criteria and orchestrator verification pass
   - `Status: blocked` if implementation cannot proceed or verification fails
4. Update `.harness/<feature-slug>/IMPLEMENTATION.md` with compact entries for:
   - current state changes
   - cross-slice decisions
   - slice notes keyed by slice file
   - verification history
5. Continue to the next unblocked slice only after status and log updates are complete.

### 7. Failure handling

If verification fails:

- Do not continue blindly to dependent slices.
- Record the failure in the Implementation log.
- Mark the failed slice `Status: blocked`.
- Ask the user whether to fix immediately, skip independent slices, or stop.

If a slice is too broad:

- Stop and propose splitting it into smaller Plan slices.
- Do not silently expand scope.

## Status vocabulary

Use local status vocabulary only:

- `Status: needs-triage`
- `Status: in-progress`
- `Status: blocked`
- `Status: done`

When beginning a slice, the orchestrator may mark it `Status: in-progress`. When ending a slice, the orchestrator must replace `in-progress` with `done` or `blocked`.
