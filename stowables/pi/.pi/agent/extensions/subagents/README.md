# Subagents

Profiles declare `blocking` in `defineProfile(...)`:

| Profile | `blocking` | Result delivery |
| --- | --- | --- |
| Explorer | `true` | The tool waits and returns the investigation's findings directly. |
| Worker | `false` | The tool returns a job ID immediately; a `subagent-result` message delivers the eventual findings. |

Both modes use the same manager, queue, concurrency limits, child runner, timeouts,
output files and footer. Adding another profile does not require a new delivery mechanism.

## Blocking calls

The parent turn stays active until the child completes. Pi cannot make its next
model request before receiving the tool result. Steering remains queued for Pi's
next safe processing point. Aborting the parent tool cancels its queued/running
child and releases the wait; failures and timeouts become tool errors.

Tool results use Pi's built-in renderer: a 10-line preview with Ctrl-O
(`app.tools.expand`) to expand/collapse longer output. No custom tool renderer is
registered. This only changes presentation, not the model-facing result.

No separate completion message is injected. Independent tool calls can still run
concurrently under Pi's tool execution policy and the manager's concurrency limit.

## Background calls

The parent may finish its turn while the child continues. Results are injected
through Pi's normal extension message API and trigger a new turn when idle.
Only these background completion messages use a custom renderer, showing a compact
summary or expanded findings according to Pi's built-in Ctrl-O state. Pi's default
custom-message renderer does not collapse its content.
The parent tool's abort signal does not own an already-launched background job.
Use `subagent_cancel` for explicit cancellation; cancelled background jobs do not
inject results. Session shutdown/reload cancels both kinds and suppresses late
background delivery. `subagent_list` remains a snapshot tool, not a polling/wait tool.

No native async provider adapter, special model restriction, call ledger, or
transcript projection is used. This uses ordinary Pi tools and extension messages.
After removing the experimental native adapter, reload the extension and start a
fresh session if the current history contains experimental native calls.
