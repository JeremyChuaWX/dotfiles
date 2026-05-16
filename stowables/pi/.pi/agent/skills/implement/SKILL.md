---
name: implement
description: Implement approved local markdown issues created by to-issues, using serial Implementation workers, shared implementation logging, and orchestrator verification. Use manually when the user wants to implement ready-for-agent issues from .scratch.
disable-model-invocation: true
---

# Implement

Run through local markdown implementation issues created by `to-issues` as an **orchestrator** that delegates each issue to an **Implementation worker** and then verifies the result.

Default backend: run the script-backed orchestrator at `scripts/implement.mjs`. It discovers local issues, creates per-issue packets, and invokes `scripts/run-worker.mjs` to spawn a fresh headless `pi` worker per issue. This gives worker isolation without requiring native subagents in the pi config. If headless spawning is unavailable, execute each issue serially in the current session while preserving the same worker boundaries.

Do not let workers own orchestration state. Workers implement one issue and report back; the orchestrator owns ordering, status changes, comments, shared logs, and final verification.

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

### 0. Prefer the script-backed orchestrator

Use the Node orchestrator unless the user explicitly asks for manual orchestration:

```bash
/Users/jer/.dotfiles/stowables/pi/.pi/agent/skills/implement/scripts/implement.mjs --plan .scratch/<feature-slug>
/Users/jer/.dotfiles/stowables/pi/.pi/agent/skills/implement/scripts/implement.mjs --run .scratch/<feature-slug>
```

The script runs serially by default. It prints the plan in `--plan` mode, and `--run` executes that plan with headless pi workers.

Optional worker controls:

```bash
PI_WORKER_MODEL='openai/gpt-5.5' PI_WORKER_THINKING=medium \
  /Users/jer/.dotfiles/stowables/pi/.pi/agent/skills/implement/scripts/implement.mjs --run .scratch/<feature-slug>
```

Use the remaining process sections as the behavioral contract for the script and as the fallback procedure when running manually.

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

Topologically order issues by local blockers. Default to serial execution, with one fresh headless worker per issue. Only run independent issues concurrently if the user explicitly asks and the repository strategy prevents file conflicts, such as separate git worktrees.

Before coding, present the execution order and ask for approval. Show:

- Issue title and path
- Why it is eligible now
- Any unresolved blockers
- Whether it is `AFK` or `HITL` when known
- Whether execution will use `scripts/implement.mjs` headless pi workers or current-session worker boundaries
- The worker model/provider if overridden by `PI_WORKER_MODEL` or `PI_WORKER_PROVIDER`

Do not start implementation until the user approves.

### 4. Create an issue packet for each Implementation worker

Minimize context. For each issue, create a temporary packet under `.scratch/<feature-slug>/worker-packets/`, for example `.scratch/<feature-slug>/worker-packets/01-slug.packet.md`. Each packet contains only:

- Issue path and full contents
- Parent `.scratch/<feature-slug>/PRD.md`, or relevant PRD sections if identifiable
- `.scratch/<feature-slug>/IMPLEMENTATION.md`
- Verification expectations derived from acceptance criteria
- Any relevant comments from the issue
- A reminder that the worker must not edit issue status/comments or mark the issue done

Do not preload ADRs into every worker. Instruct the worker to discover relevant docs or ADRs only when its preflight exploration touches an area with ADRs or when it faces an architectural decision.

Recommended packet shape:

```md
# Implementation worker packet

## Assignment
- Issue: .scratch/<feature-slug>/issues/<NN>-<slug>.md
- Worker boundary: implement only this issue
- Orchestrator-owned files: issue status/comments and IMPLEMENTATION.md final updates

## Issue contents
...

## Parent context
...

## Shared implementation log
...

## Verification expectations
...
```

### 4a. Spawn the worker

When using `scripts/implement.mjs`, it delegates worker execution to `scripts/run-worker.mjs`. The worker runner invokes `pi --print --no-session --no-skills` with a worker system prompt and writes the worker's final report to `.scratch/<feature-slug>/worker-reports/`.

Direct worker invocation, mostly for debugging:

```bash
/Users/jer/.dotfiles/stowables/pi/.pi/agent/skills/implement/scripts/run-worker.mjs \
  .scratch/<feature-slug>/worker-packets/<NN>-<slug>.packet.md \
  .scratch/<feature-slug>/worker-reports/<NN>-<slug>.report.md \
  "$PWD"
```

Manual equivalent:

```bash
pi --print --mode text --no-session --no-skills \
  --append-system-prompt '<worker system prompt>' \
  "Read this issue packet and act as the Implementation worker. $(cat .scratch/<feature-slug>/worker-packets/<NN>-<slug>.packet.md)" \
  | tee .scratch/<feature-slug>/worker-reports/<NN>-<slug>.report.md
```

Before spawning, mark the issue `Status: in-progress`. After spawning, read the worker report before doing orchestrator verification.

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

Workers must not edit issue status lines, append issue comments, or mark issues `done`; the orchestrator does that after verification.

### 6. Orchestrator verification after each worker

After each worker finishes, the orchestrator must:

1. Review changed files and the worker report.
2. Run project checks only when the user or project configuration explicitly provides them. Do not invent check commands.
3. Mark the issue:
   - `Status: in-progress` before spawning or entering the worker boundary
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
