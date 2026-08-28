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

`subagents/index.ts` registers the three shared management tools. `explorer/index.ts` and `worker/index.ts` register the profile tools through `interface/spawn.ts`.

## Module layout

- `runtime/` owns child process supervision, jobs, protocols, and profile execution.
- `interface/` contains profile registration, the runtime broker, and shared tool adapters.
- `lib/` contains process, retention, semaphore, event, and validation support. The web extension imports its retention and validation helpers from here.

## Profiles

| Profile | Child tools | Prompt behavior | Model | Timeout |
| --- | --- | --- | --- | --- |
| `explorer` | `read`, `grep`, `find`, `ls` | replaces the normal coding prompt with `explorer/prompt.md` | `openrouter/z-ai/glm-5.3-flash:low` | 5 min |
| `worker` | `read`, `bash`, `edit`, `write`, `grep`, `find`, `ls` | appends `worker/prompt.md` to the normal coding prompt | `openrouter/z-ai/glm-5.3-flash:max` | none |

Both profiles disable child sessions, extensions, skills, prompt templates, and context-file loading. Relative `cwd` values resolve from the parent session's working directory. `~`, `~/...`, and a stray leading `@` are normalized first.

The worker is not sandboxed. It can edit files, run arbitrary shell commands, and inherits the parent environment.

## Background behavior

Profile tools return a job id immediately and share one process-wide FIFO concurrency limit. Completion is delivered exactly once as a `subagent-result` custom message unless `subagent_wait` consumes it first. One wait can consume explorer and worker jobs together. Aborting a wait does not cancel its jobs.

Reload, session replacement, fork, and quit abort all queued and running jobs. `subagent_cancel` provides explicit cancellation during a session. Explorer jobs have a five-minute deadline. Worker jobs have no wall-clock deadline and run until completion, failure, explicit cancellation, or session shutdown.

Model-visible output is capped at pi's 50 KB and 2000-line limits. Complete output beyond that is written to a mode-`0600` file in a private temp directory. The result includes its path, and session shutdown removes it.

## Runtime boundary

Pi loads extension entry points independently, so profile extensions do not share an imported manager singleton. `interface/broker.ts` uses `pi.events` to resolve the current runtime owner when a profile tool executes. The runtime owns the only job map and registers `check`, `wait`, and `cancel` once.

## Configuration

| Setting | Default | Purpose |
| --- | --- | --- |
| `PI_SUBAGENT_MAX_CONCURRENCY` | `4` | Process-wide child limit, from 1 to 64 |

The profiles pin their model. Callers cannot override it.

Progress snapshots continue to use the `pui.subagent.background` event channel for compatibility with pui consumers. Regular pi falls back to generic tool rendering.
