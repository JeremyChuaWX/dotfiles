# subagents

Shared runtime and management extension for the `explorer` and `worker` profile extensions. It owns the job queue, child Pi processes, output retention, cancellation, and session lifecycle. Profile extensions only register their model-visible spawn tools and provide immutable child configuration.

## Tools

| Tool | Purpose |
| --- | --- |
| `explorer` | Start a read-only exploration job and return its id |
| `worker` | Start a write-capable coding job and return its id |
| `subagent_check` | Inspect one job without waiting or consuming its result |
| `subagent_wait` | Wait for one or more jobs, including mixed profile jobs |
| `subagent_cancel` | Cancel queued or running jobs and await terminal state |

`subagents/index.ts` registers the three shared management tools and the `/subagents` dashboard. `explorer/index.ts` and `worker/index.ts` register the profile tools through `interface/spawn.ts`.

## Module layout

- `runtime/` owns child process supervision, jobs, protocols, and profile execution.
- `interface/` contains profile registration, the runtime broker, shared tool adapters, and the dashboard overlay.
- `lib/` contains process, retention, semaphore, event, and validation support. The web extension imports its retention and validation helpers from here.

## Profiles

| Profile | Child tools | Prompt behavior | Model | Timeout |
| --- | --- | --- | --- | --- |
| `explorer` | `read`, `grep`, `find`, `ls` | replaces the normal coding prompt with `explorer/prompt.md` | `openrouter/z-ai/glm-5.3-flash:low` | none |
| `worker` | `read`, `bash`, `edit`, `write`, `grep`, `find`, `ls` | appends `worker/prompt.md` to the normal coding prompt | `openrouter/z-ai/glm-5.3-flash:max` | none |

Both profiles disable child sessions, extensions, skills, prompt templates, and context-file loading. Relative `cwd` values resolve from the parent session's working directory. `~`, `~/...`, and a stray leading `@` are normalized first.

Instead of a wall-clock job timeout, both profiles run a progress watchdog: `stallTimeoutMs` (10 min) aborts a running job whose child Pi has produced no events at all between turns, and `toolStallTimeoutMs` (30 min) does the same while one tool call is active. Any event resets the timer, so jobs that are genuinely making progress run as long as they need; only a hung model stream or a wedged command trips the watchdog. Watchdog stops report status `timed_out` with the reason, and setting either value to 0 disables it.

The worker is not sandboxed. It can edit files, run arbitrary shell commands, and inherits the parent environment.

## Background behavior

Profile tools return a job id immediately and share one process-wide FIFO concurrency limit. Completion is delivered exactly once as a `subagent-result` custom message unless `subagent_wait` consumes it first. One wait can consume explorer and worker jobs together. Aborting a wait does not cancel its jobs.

Reload, session replacement, fork, and quit abort all queued and running jobs. `subagent_cancel` provides explicit cancellation during a session. Explorer and worker jobs have no wall-clock deadline. They run until completion, failure, explicit cancellation, watchdog stop, or session shutdown.

Model-visible output is capped at pi's 50 KB and 2000-line limits. Complete output beyond that is written to a mode-`0600` file in a private temp directory. The result includes its path, and session shutdown removes it.

## Dashboard

`/subagents` opens a live overlay listing every tracked job with status, age, title, current tool or last activity, and time since the child last produced an event. Enter toggles a detail view with prompt, model, cwd, usage, the recent activity timeline, error, and retained full-output path. `c` cancels the selected job after an inline y/n confirmation; Esc closes. The overlay follows job upserts as they happen, so there is no manual refresh.

Quiet and stalled are display states, not actions. A running job with no events for two minutes shows `idle Nm` in warning color, and past ten minutes in error color. The dashboard never cancels anything on its own; the progress watchdog is the only automatic stop.

The statusline extension adds a `sub N run` segment to the footer while jobs are active and shows the oldest quiet time once it passes two minutes.

## Runtime boundary

Pi loads extension entry points independently, so profile extensions do not share an imported manager singleton. `interface/broker.ts` uses `pi.events` to resolve the current runtime owner when a profile tool executes. The runtime owns the only job map and registers `check`, `wait`, and `cancel` once.

## Configuration

| Setting | Default | Purpose |
| --- | --- | --- |
| `PI_SUBAGENT_MAX_CONCURRENCY` | `4` | Process-wide child limit, from 1 to 64 |

The profiles pin their model. Callers cannot override it.

Progress snapshots continue to use the `pui.subagent.background` event channel for compatibility with pui consumers. Regular pi falls back to generic tool rendering.
