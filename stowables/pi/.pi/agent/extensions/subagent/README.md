# subagent

Ported from [pui](https://github.com/JeremyChuaWX/pui) (`src/modules/subagents` + `src/shared/agent-runtime`) into a
standalone pi extension. Registers the blocking `subagent` tool plus `subagent_spawn`,
`subagent_wait`, `subagent_check`, `subagent_cancel`, and `subagent_list` for session-scoped
background work. The extension owns its presets, queuing, child-process execution, cancellation,
timeouts, and progress snapshots; pi transports snapshots as ordinary tool execution updates.

## Modes

| Mode | Capabilities | Prompt | Default model | Timeout |
| --- | --- | --- | --- | --- |
| `agent` omitted | `read`, `bash`, `edit`, `write`, `grep`, `find`, `ls` | pi's normal coding prompt, steered only by the input prompt | child pi's configured default | 10 min |
| `worker` | same as above | coding prompt plus bundled [Ponytail](https://ponytail.dev/) minimal-coding standards | `openai-codex/gpt-5.6-sol:low` | 10 min |
| `explore` | `read`, `grep`, `find`, `ls` | dedicated read-only exploration prompt | `openai-codex/gpt-5.4-mini:off` | 120 s |

All modes disable child sessions, extensions, skills, prompt templates, and context-file loading, so
the child cannot recursively load this extension. Relative `cwd` values resolve from the parent
session's working directory; `~`, `~/...`, and a stray leading `@` are normalized first.

Background jobs return a job id immediately and share the process-wide FIFO concurrency limit.
Completion is delivered exactly once as a `subagent-result` custom message unless a wait consumes it
first. Reload, session replacement, fork, and quit abort every queued and running job.

> **Unguided and worker calls are write-capable and not sandboxed.** They can edit files and run
> arbitrary shell commands, inherit the parent environment, and are not confined to `cwd`.

## Configuration

| Setting | Default | Purpose |
| --- | --- | --- |
| `PI_SUBAGENT_MAX_CONCURRENCY` | `4` | Process-wide child limit (1–64) |
| `PI_WORKER_MODEL` | `openai-codex/gpt-5.6-sol:low` | Model for the `worker` preset |
| `PI_EXPLORE_MODEL` | `openai-codex/gpt-5.4-mini:off` | Model for the `explore` preset |

Model-visible output is capped at pi's 50 KB / 2000-line limits; complete output beyond that is
written to a mode-`0600` file in a private temp directory whose path is included in the result and
removed at session shutdown.

## Port notes

- Prompts live in `../_shared/agent-runtime/agents/*.md` and are read with `fs` at load time; the
  pui original used bundler text imports.
- Progress snapshots are still emitted on the `pui.subagent.background` event channel
  (`background-protocol.ts`). Regular pi has no consumer, so it falls back to generic tool rendering.
  The pui-side view model and TUI bridge were not ported.
