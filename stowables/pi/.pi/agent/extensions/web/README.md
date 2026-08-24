# web

Ported from [pui](https://github.com/JeremyChuaWX/pui) (`src/modules/web`) into a standalone pi extension.
Registers `web_search`.

`web_search` calls the ChatGPT Codex standalone search endpoint, which runs searches server-side
without model inference, so searches consume no model tokens. Credentials resolve in order:

1. `CODEX_ACCESS_TOKEN` (with optional `CODEX_ACCOUNT_ID`)
2. a pi-authenticated ChatGPT/Codex model — the active model, or `WEB_SEARCH_MODEL=provider/model`
   to select another registered one
3. the Codex CLI login at `~/.codex/auth.json`

Output is limited to 50 KB and pi's default line limit, with at most 10 sources. When a complete
formatted result exceeds that, the extension may retain it in a private temporary `result.md` and
include the path in the result. Retention is best-effort and capped at 10 MiB per result and 50 MiB
per session; retained files are removed at session shutdown.

## Port notes

- pui's `web_crawl` tool was not ported (it needs `FIRECRAWL_API_KEY`). To add it back, copy
  `src/modules/web/crawl.ts` from pui and register it in `index.ts`.
