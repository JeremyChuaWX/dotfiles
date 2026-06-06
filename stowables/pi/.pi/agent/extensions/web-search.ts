import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type, type Static } from "typebox";

const FIRECRAWL_SEARCH_URL = "https://api.firecrawl.dev/v2/search";

const SEARCH_PARAMS = Type.Object({
  query: Type.String({ description: "Search query." }),
  max_results: Type.Optional(
    Type.Number({ description: "Maximum number of results to return. Defaults to 5; capped at 10." }),
  ),
  include_content: Type.Optional(
    Type.Boolean({
      description:
        "Whether to ask Firecrawl to include clean page content/markdown in search results. Defaults to false for fast discovery.",
    }),
  ),
});

type SearchParams = Static<typeof SEARCH_PARAMS>;

type SearchResult = {
  title: string;
  url: string;
  snippet?: string;
  markdown?: string;
};

function clampResultCount(value: unknown): number {
  const n = typeof value === "number" && Number.isFinite(value) ? Math.floor(value) : 5;
  return Math.max(1, Math.min(10, n));
}

function requireFirecrawlApiKey(): string {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    throw new Error(
      "FIRECRAWL_API_KEY is not set. Export it in your shell before starting pi, or run Firecrawl onboarding/auth first.",
    );
  }
  return apiKey;
}

async function readJson(response: Response): Promise<any> {
  const text = await response.text();
  if (!response.ok) {
    const message = text.length > 500 ? `${text.slice(0, 500)}...` : text;
    throw new Error(`Firecrawl search returned HTTP ${response.status}: ${message}`);
  }
  return text ? JSON.parse(text) : {};
}

function extractResults(payload: any): any[] {
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data?.results)) return payload.data.results;
  return [];
}

function normalizeResults(items: any[], maxResults: number): SearchResult[] {
  const seen = new Set<string>();
  const results: SearchResult[] = [];

  for (const item of items) {
    const url = item.url ?? item.link ?? item.sourceURL ?? item.metadata?.sourceURL;
    if (!url || seen.has(url)) continue;
    seen.add(url);

    const title = item.title ?? item.metadata?.title ?? url;
    const snippet = item.description ?? item.snippet ?? item.content ?? item.markdown?.slice(0, 500);
    const markdown = item.markdown;

    results.push({ title, url, snippet, markdown });
    if (results.length >= maxResults) break;
  }

  return results;
}

async function searchFirecrawl(params: SearchParams, maxResults: number, signal?: AbortSignal): Promise<SearchResult[]> {
  const formats = params.include_content ? ["markdown"] : undefined;
  const payload = await readJson(await fetch(FIRECRAWL_SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${requireFirecrawlApiKey()}`,
    },
    body: JSON.stringify({
      query: params.query,
      limit: maxResults,
      ...(formats ? { scrapeOptions: { formats } } : {}),
    }),
    signal,
  }));

  return normalizeResults(extractResults(payload), maxResults);
}

function truncate(text: string, maxLength: number): string {
  const compact = text.replace(/\s+/g, " ").trim();
  return compact.length <= maxLength ? compact : `${compact.slice(0, maxLength)}...`;
}

function formatResults(query: string, results: SearchResult[]): string {
  if (results.length === 0) return `No Firecrawl web search results found for ${JSON.stringify(query)}.`;

  return [
    `Firecrawl web search results for ${JSON.stringify(query)}:`,
    "",
    ...results.map((result, index) => {
      const lines = [`${index + 1}. ${result.title}`, `   URL: ${result.url}`];
      if (result.snippet) lines.push(`   Snippet: ${truncate(result.snippet, 700)}`);
      if (result.markdown) lines.push(`   Content: ${truncate(result.markdown, 1600)}`);
      return lines.join("\n");
    }),
  ].join("\n");
}

export default function webSearchExtension(pi: ExtensionAPI) {
  pi.registerTool({
    name: "web_search",
    label: "Web Search",
    description: "Search the web with Firecrawl and return ranked results with URLs and snippets/content.",
    promptSnippet: "Search the web with Firecrawl, returning URLs and snippets for citation.",
    promptGuidelines: [
      "Use web_search when the answer may depend on current, external, or recently changed information.",
      "When using web_search, cite result URLs in the final answer and distinguish search snippets from verified page contents.",
      "Set include_content=true when snippets are not enough and clean page markdown would materially improve the answer.",
    ],
    parameters: SEARCH_PARAMS,
    async execute(_toolCallId, params, signal) {
      const maxResults = clampResultCount(params.max_results);
      const results = await searchFirecrawl(params, maxResults, signal);

      return {
        content: [{ type: "text", text: formatResults(params.query, results) }],
        details: { provider: "firecrawl", query: params.query, results },
      };
    },
  });

  pi.registerCommand("web-search-status", {
    description: "Show Firecrawl web_search configuration status.",
    handler: async (_args, ctx) => {
      ctx.ui.notify(
        process.env.FIRECRAWL_API_KEY
          ? "web_search provider configured: firecrawl"
          : "web_search provider not configured: FIRECRAWL_API_KEY is not set",
        process.env.FIRECRAWL_API_KEY ? "info" : "warning",
      );
    },
  });
}
