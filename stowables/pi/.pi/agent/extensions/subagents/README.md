# subagents

Runs child Pi processes as background jobs. One extension registers the `explorer` and `worker` spawn tools, the three management tools, and the `/subagents` dashboard.

## Tools

| Tool | Purpose |
| --- | --- |
| `explorer` | Start a read-only exploration job and return its id |
| `worker` | Start a write-capable coding job and return its id |
| `subagent_check` | Inspect one job without waiting or consuming its result |
| `subagent_wait` | Wait for one or more jobs and return their results |
| `subagent_cancel` | Cancel queued or running jobs and await terminal state |

## Files

- `profiles/` declares each agent: each agent is a directory with an `index.ts` declaration and its `prompt.md`, `profile.ts` has the shared type, default limits, and `childArgs`, and `index.ts` lists what gets registered. To add an agent, declare it and append it to that list.
- `child-agent.ts` spawns one `pi --mode json` process, folds its event stream into a running state, and owns the wall clock, the progress watchdog, and SIGTERM/SIGKILL escalation.
- `manager.ts` owns the job map: queueing behind the process-wide semaphore, running the child, spilling large output to disk, and delivering results.
- `jobs.ts` is the job type, the event channel the statusline consumes, and the display helpers.
- `tools.ts` and `dashboard.ts` are the model-facing and user-facing interfaces.
- `json-events.ts`, `process.ts`, and `semaphore.ts` are the JSONL parser, process-tree signalling, and the process-wide concurrency limit.
- `../lib/retained-output.ts` is the only shared module: the spill-to-disk output store that the web extension also uses.

## Profiles

| Profile | Child tools | Prompt | Model |
| --- | --- | --- | --- |
| `explorer` | `read`, `grep`, `find`, `ls` | replaces the system prompt with `profiles/explorer/prompt.md` | `openrouter/z-ai/glm-5.3-flash:low` |
| `worker` | `read`, `bash`, `edit`, `write`, `grep`, `find`, `ls` | appends `profiles/worker/prompt.md` | `openrouter/z-ai/glm-5.3-flash:high` |

Both profiles disable child sessions, extensions, skills, prompt templates, and context files. Relative `cwd` values resolve from the parent working directory; `~` and a stray leading `@` are normalized first. The worker is not sandboxed.

## Limits

Three limits apply to every job, defaulted in `profiles/profile.ts` and overridable per agent:

- `timeoutMs` (60 min) is a whole-job wall clock. It catches a child that keeps making tool calls but never finishes.
- `stallTimeoutMs` (10 min) stops a job whose child has produced no events while no tool is active, which means a hung model stream.
- `toolStallTimeoutMs` (15 min) does the same while a tool call is active, which means a wedged command. Streaming bash output resets it.

Any child event resets the stall clocks. All three report status `timed_out` with the reason in the job's error and activity log. Setting a value to 0 disables that limit.

## Delivery

Spawn tools return immediately. When a job finishes, its result arrives as a `subagent-result` message queued with `deliverAs: "followUp"`, so pi delivers it after the current turn or starts a turn if the agent is idle. If a `subagent_wait` is in flight for that job, the wait consumes the result instead and no message is sent. Aborting a wait leaves its jobs running.

Result text is capped at pi's 50 KB and 2000-line limits, and auto-delivered results at 12 KB. Anything beyond that is written to a mode-0600 file in a private temp directory whose path is included in the result. Session shutdown removes those files and aborts every job.

## Dashboard

`/subagents` opens a live overlay listing every job with status, age, title, current activity, and time since the last child event. Enter toggles a detail view with prompt, model, cwd, usage, the activity timeline, error, and retained output path. `c` cancels the selected job after a y/n confirmation. Esc closes.

A running job with no events for 2 minutes shows `idle Nm` in warning color, and past 5 minutes in error color. These are display states only. The statusline extension shows the same `sub N run` segment and the oldest idle time.

## Configuration

| Setting | Default | Purpose |
| --- | --- | --- |
| `PI_SUBAGENT_MAX_CONCURRENCY` | `4` | Process-wide child limit, from 1 to 64 |
