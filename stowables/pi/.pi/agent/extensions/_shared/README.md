# _shared

Support code shared by the `subagent` and `web` extensions, ported from pui's `src/shared`.
The leading underscore is cosmetic; pi skips this directory during extension discovery because it
has no `index.ts` or `package.json` manifest.

- `agent-runtime/` — child pi process supervision (`child-agent.ts`) and the subagent presets and
  bundled agent prompts (`presets.ts`, `agents/`).
- `lib/` — bounded process termination, JSONL parsing, retained output storage, an abortable
  semaphore, and small validation helpers.

`agents/worker.md` vendors [Ponytail](https://ponytail.dev/) minimal-coding guidance; its upstream
license is preserved in `agents/worker-guidance.LICENSE`.
