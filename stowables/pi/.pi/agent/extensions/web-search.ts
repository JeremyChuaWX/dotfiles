import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type, type Static } from "typebox";

const FIRECRAWL_SEARCH_URL = "https://api.firecrawl.dev/v2/search";
const FIRECRAWL_SCRAPE_URL = "https://api.firecrawl.dev/v2/scrape";
const TAVILY_SEARCH_URL = "https://api.tavily.com/search";
const TAVILY_EXTRACT_URL = "https://api.tavily.com/extract";

const SEARCH_PARAMS = Type.Object({
  query: Type.String({ description: "Search query, or a URL to open/fetch directly." }),
  url: Type.Optional(
    Type.String({ description: "Optional URL to open/fetch directly. Use this after search to inspect a result page." }),
  ),
  max_results: Type.Optional(
    Type.Number({ description: "Maximum number of results to return. Defaults to 5; capped at 10." }),
  ),
  source: Type.Optional(
    Type.Union([Type.Literal("web"), Type.Literal("news"), Type.Literal("images")], {
      description:
        "Result source to prefer. Defaults to web. Firecrawl supports web/news/images; Tavily supports web/news.",
    }),
  ),
  include_content: Type.Optional(
    Type.Boolean({
      description:
        "Whether to fetch clean page content/markdown for returned search results. Defaults to false for fast discovery.",
    }),
  ),
  only_main_content: Type.Optional(
    Type.Boolean({ description: "For URL opens, only return the main page content. Defaults to true." }),
  ),
  wait_for: Type.Optional(
    Type.Number({ description: "For URL opens, milliseconds to wait before capture; useful for JS-heavy pages." }),
  ),
  timeout: Type.Optional(
    Type.Number({ description: "Provider request timeout in milliseconds. Defaults to 30000 where supported." }),
  ),
  include_metadata: Type.Optional(
    Type.Boolean({ description: "For URL opens, append page metadata to the text output. Full metadata is always in details." }),
  ),
});

type SearchParams = Static<typeof SEARCH_PARAMS>;
type Provider = "tavily" | "firecrawl";
type SearchProvider = Provider | "auto";
type Source = "web" | "news" | "images";

type SearchResult = {
  title: string;
  url: string;
  snippet?: string;
  markdown?: string;
  score?: number;
  provider?: Provider;
  contentProvider?: Provider;
  matchedQueries?: string[];
  metadata?: any;
};

type FirecrawlSearchOptions = {
  query: string;
  includeContent: boolean;
  limit: number;
  source?: Source;
  timeout?: number;
  signal?: AbortSignal;
};

type FirecrawlScrapeOptions = {
  url: string;
  onlyMainContent?: boolean;
  waitFor?: number;
  timeout?: number;
  signal?: AbortSignal;
};

type TavilySearchOptions = {
  query: string;
  includeContent: boolean;
  limit: number;
  source?: Source;
  signal?: AbortSignal;
};

type TavilyExtractOptions = {
  url: string;
  timeout?: number;
  signal?: AbortSignal;
};

function clampResultCount(value: unknown): number {
  const n = typeof value === "number" && Number.isFinite(value) ? Math.floor(value) : 5;
  return Math.max(1, Math.min(10, n));
}

function firecrawlApiKey(): string | undefined {
  return process.env.FIRECRAWL_API_KEY;
}

function tavilyApiKey(): string | undefined {
  return process.env.TAVILY_API_KEY;
}

function requireFirecrawlApiKey(): string {
  const apiKey = firecrawlApiKey();
  if (!apiKey) {
    throw new Error(
      "FIRECRAWL_API_KEY is not set. Export it in your shell before starting pi, or run Firecrawl onboarding/auth first.",
    );
  }
  return apiKey;
}

function requireTavilyApiKey(): string {
  const apiKey = tavilyApiKey();
  if (!apiKey) {
    throw new Error("TAVILY_API_KEY is not set. Export it in your shell before starting pi.");
  }
  return apiKey;
}

async function readJson(response: Response, provider: Provider, operation: string): Promise<any> {
  const text = await response.text();
  if (!response.ok) {
    const message = text.length > 500 ? `${text.slice(0, 500)}...` : text;
    throw new Error(`${provider} ${operation} returned HTTP ${response.status}: ${message}`);
  }
  return text ? JSON.parse(text) : {};
}

function extractResults(payload: any): any[] {
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data?.results)) return payload.data.results;
  if (Array.isArray(payload?.data?.web)) return payload.data.web;
  if (Array.isArray(payload?.web)) return payload.web;
  return [];
}

function normalizeFirecrawlResult(item: any): SearchResult | undefined {
  const url = item.url ?? item.link ?? item.sourceURL ?? item.sourceUrl ?? item.metadata?.sourceURL ?? item.metadata?.url;
  if (!url) return undefined;

  const title = item.title ?? item.metadata?.title ?? item.ogTitle ?? item.metadata?.ogTitle ?? url;
  const snippet =
    item.description ??
    item.snippet ??
    item.content ??
    item.text ??
    item.summary ??
    item.markdown?.slice(0, 500) ??
    item.metadata?.description ??
    item.metadata?.ogDescription;
  const markdown = item.markdown ?? item.contentMarkdown;

  return { title, url, snippet, markdown, provider: "firecrawl", contentProvider: markdown ? "firecrawl" : undefined };
}

function normalizeTavilyResult(item: any): SearchResult | undefined {
  const url = item.url ?? item.link;
  if (!url) return undefined;

  const markdown = item.raw_content ?? item.rawContent;
  const title = item.title ?? url;
  const snippet = item.content ?? item.snippet ?? item.description ?? markdown?.slice(0, 500);
  const score = typeof item.score === "number" ? item.score : undefined;

  return { title, url, snippet, markdown, score, provider: "tavily", contentProvider: markdown ? "tavily" : undefined };
}

function normalizeScrapeResult(url: string, payload: any): SearchResult {
  const data = payload?.data ?? payload;
  const metadata = data?.metadata ?? {};
  const markdown = data?.markdown ?? data?.content ?? data?.text;
  const title = data?.title ?? metadata.title ?? metadata.ogTitle ?? url;
  const snippet = data?.description ?? metadata.description ?? metadata.ogDescription ?? markdown?.slice(0, 500);

  return {
    title,
    url: data?.url ?? metadata.sourceURL ?? metadata.url ?? url,
    snippet,
    markdown,
    provider: "firecrawl",
    contentProvider: markdown ? "firecrawl" : undefined,
    metadata,
  };
}

function normalizeTavilyExtractResult(url: string, payload: any): SearchResult {
  const item = payload?.results?.[0] ?? payload?.data?.results?.[0] ?? payload?.data ?? payload;
  const markdown = item?.raw_content ?? item?.rawContent ?? item?.content;
  const title = item?.title ?? item?.metadata?.title ?? url;
  const snippet = item?.description ?? item?.content ?? markdown?.slice(0, 500);

  return {
    title,
    url: item?.url ?? url,
    snippet,
    markdown,
    provider: "tavily",
    contentProvider: markdown ? "tavily" : undefined,
    metadata: item?.metadata,
  };
}

function normalizeFirecrawlResults(items: any[], maxResults: number): SearchResult[] {
  return normalizeResults(items, maxResults, normalizeFirecrawlResult);
}

function normalizeTavilyResults(items: any[], maxResults: number): SearchResult[] {
  return normalizeResults(items, maxResults, normalizeTavilyResult);
}

function normalizeResults(
  items: any[],
  maxResults: number,
  normalize: (item: any) => SearchResult | undefined,
): SearchResult[] {
  const seen = new Set<string>();
  const results: SearchResult[] = [];

  for (const item of items) {
    const result = normalize(item);
    if (!result || seen.has(result.url)) continue;
    seen.add(result.url);
    results.push(result);
    if (results.length >= maxResults) break;
  }

  return results;
}

function words(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^a-z0-9+#./-]+/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);
}

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "best",
  "but",
  "by",
  "for",
  "from",
  "how",
  "i",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "the",
  "to",
  "vs",
  "what",
  "when",
  "where",
  "with",
]);

function uniquePush(values: string[], value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized && !values.some((existing) => existing.toLowerCase() === normalized.toLowerCase())) {
    values.push(normalized);
  }
}

function compactKeywords(query: string, maxWords = 8): string {
  return words(query)
    .filter((word) => !STOP_WORDS.has(word))
    .slice(0, maxWords)
    .join(" ");
}

function planSearchQueries(query: string): string[] {
  const planned: string[] = [];
  const normalized = query.replace(/\s+/g, " ").trim();
  uniquePush(planned, normalized);

  const compact = compactKeywords(normalized, 8);
  uniquePush(planned, compact);

  const queryWords = words(normalized).filter((word) => !STOP_WORDS.has(word));
  const productWords = queryWords.slice(0, 4).join(" ");
  const researchTerms = ["docs", "pricing", "alternatives", "autocomplete", "geocoding", "react native", "expo"];

  for (const term of researchTerms) {
    if (normalized.toLowerCase().includes(term)) {
      uniquePush(planned, compactKeywords(`${productWords} ${term}`, 7));
    }
  }

  // Split multi-intent questions into Google-like focused searches.
  for (const part of normalized.split(/\b(?:and|or|vs|versus|alternatives?|pricing|costs?|docs?|documentation)\b/i)) {
    const focused = compactKeywords(part, 7);
    if (focused.split(/\s+/).length >= 2) uniquePush(planned, focused);
  }

  // Preserve local context around intent words so trailing intents such as
  // "Google Places alternatives React Native" do not get lost behind the
  // leading product keywords.
  const triggers = /^(alternatives?|pricing|costs?|docs?|documentation|autocomplete|geocoding|expo)$/i;
  queryWords.forEach((word, index) => {
    if (!triggers.test(word)) return;
    const window = queryWords.slice(Math.max(0, index - 4), Math.min(queryWords.length, index + 5)).join(" ");
    uniquePush(planned, compactKeywords(window, 8));
  });

  uniquePush(planned, queryWords.slice(0, 3).join(" "));
  return planned.filter(Boolean).slice(0, 8);
}

function isComplexQuery(query: string): boolean {
  const count = words(query).length;
  return count > 6 || /\b(?:alternatives?|pricing|geocoding|autocomplete|expo|react native|compare|vs)\b/i.test(query);
}

function preferredSearchProvider(): SearchProvider {
  const configured = process.env.WEB_SEARCH_PROVIDER?.trim().toLowerCase();
  return configured === "tavily" || configured === "firecrawl" ? configured : "auto";
}

function tavilySearchDepth(): "ultra-fast" | "fast" | "basic" | "advanced" {
  const configured = process.env.WEB_SEARCH_TAVILY_DEPTH?.trim().toLowerCase();
  return configured === "ultra-fast" || configured === "fast" || configured === "advanced" ? configured : "basic";
}

function availableSearchProviders(source: Source = "web"): Provider[] {
  const preferred = preferredSearchProvider();
  const available: Provider[] = [];

  // Tavily is the fast default for web/news. Firecrawl is required for image search.
  if (source !== "images" && tavilyApiKey()) available.push("tavily");
  if (firecrawlApiKey()) available.push("firecrawl");

  if (preferred === "auto") return available;
  return available.includes(preferred) ? [preferred, ...available.filter((provider) => provider !== preferred)] : available;
}

async function searchFirecrawlOnce(options: FirecrawlSearchOptions): Promise<{ payload: any; results: SearchResult[] }> {
  const formats = options.includeContent ? ["markdown"] : undefined;
  const payload = await readJson(
    await fetch(FIRECRAWL_SEARCH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${requireFirecrawlApiKey()}`,
      },
      body: JSON.stringify({
        query: options.query,
        limit: options.limit,
        sources: [options.source ?? "web"],
        ...(formats ? { scrapeOptions: { formats, timeout: options.timeout ?? 30000 } } : {}),
        timeout: options.timeout ?? 30000,
      }),
      signal: options.signal,
    }),
    "firecrawl",
    "search",
  );

  if (process.env.WEB_SEARCH_DEBUG === "1") {
    console.dir(payload, { depth: null });
  }

  return { payload, results: normalizeFirecrawlResults(extractResults(payload), options.limit) };
}

async function scrapeFirecrawl(options: FirecrawlScrapeOptions): Promise<SearchResult> {
  const payload = await readJson(
    await fetch(FIRECRAWL_SCRAPE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${requireFirecrawlApiKey()}`,
      },
      body: JSON.stringify({
        url: options.url,
        formats: ["markdown"],
        onlyMainContent: options.onlyMainContent ?? true,
        waitFor: options.waitFor,
        timeout: options.timeout ?? 30000,
      }),
      signal: options.signal,
    }),
    "firecrawl",
    "scrape",
  );

  if (process.env.WEB_SEARCH_DEBUG === "1") {
    console.dir(payload, { depth: null });
  }

  return normalizeScrapeResult(options.url, payload);
}

async function searchTavilyOnce(options: TavilySearchOptions): Promise<{ payload: any; results: SearchResult[] }> {
  const payload = await readJson(
    await fetch(TAVILY_SEARCH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${requireTavilyApiKey()}`,
      },
      body: JSON.stringify({
        query: options.query,
        max_results: options.limit,
        search_depth: tavilySearchDepth(),
        topic: options.source === "news" ? "news" : "general",
        include_answer: false,
        include_raw_content: options.includeContent,
      }),
      signal: options.signal,
    }),
    "tavily",
    "search",
  );

  if (process.env.WEB_SEARCH_DEBUG === "1") {
    console.dir(payload, { depth: null });
  }

  return { payload, results: normalizeTavilyResults(extractResults(payload), options.limit) };
}

async function extractTavily(options: TavilyExtractOptions): Promise<SearchResult> {
  const payload = await readJson(
    await fetch(TAVILY_EXTRACT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${requireTavilyApiKey()}`,
      },
      body: JSON.stringify({
        urls: options.url,
        extract_depth: "advanced",
        timeout: options.timeout ?? 30000,
      }),
      signal: options.signal,
    }),
    "tavily",
    "extract",
  );

  if (process.env.WEB_SEARCH_DEBUG === "1") {
    console.dir(payload, { depth: null });
  }

  return normalizeTavilyExtractResult(options.url, payload);
}

function mergeResults(batches: Array<{ query: string; results: SearchResult[] }>, maxResults: number): SearchResult[] {
  const merged = new Map<string, SearchResult>();

  batches.forEach((batch, queryIndex) => {
    batch.results.forEach((result, resultIndex) => {
      const existing = merged.get(result.url);
      const relevance = typeof result.score === "number" ? result.score * 100 : 0;
      const score = 100 - queryIndex * 8 + Math.max(0, 20 - resultIndex * 2) + relevance;
      if (existing) {
        existing.score = (existing.score ?? 0) + score + 25;
        existing.matchedQueries = [...new Set([...(existing.matchedQueries ?? []), batch.query])];
        if (!existing.snippet && result.snippet) existing.snippet = result.snippet;
        if (!existing.markdown && result.markdown) existing.markdown = result.markdown;
        if (!existing.contentProvider && result.contentProvider) existing.contentProvider = result.contentProvider;
        return;
      }
      merged.set(result.url, { ...result, score, matchedQueries: [batch.query] });
    });
  });

  return [...merged.values()]
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, maxResults);
}

async function runSearchProvider(
  provider: Provider,
  params: SearchParams,
  maxResults: number,
  signal?: AbortSignal,
): Promise<{ provider: Provider; results: SearchResult[]; queries: string[] }> {
  const plannedQueries = planSearchQueries(params.query);
  const queriesToRun = isComplexQuery(params.query) ? plannedQueries.slice(0, 5) : plannedQueries.slice(0, 1);
  const batches: Array<{ query: string; results: SearchResult[] }> = [];
  const perQueryLimit = Math.max(maxResults, 5);

  for (const query of queriesToRun) {
    const { results } = provider === "tavily"
      ? await searchTavilyOnce({ query, includeContent: params.include_content ?? false, limit: perQueryLimit, source: params.source ?? "web", signal })
      : await searchFirecrawlOnce({ query, includeContent: params.include_content ?? false, limit: perQueryLimit, source: params.source ?? "web", timeout: params.timeout, signal });
    batches.push({ query, results });
  }

  // If a simple query misses, progressively fall back to simpler Google-style searches.
  if (!isComplexQuery(params.query) && batches.every((batch) => batch.results.length === 0)) {
    for (const query of plannedQueries.slice(1, 5)) {
      const { results } = provider === "tavily"
        ? await searchTavilyOnce({ query, includeContent: params.include_content ?? false, limit: perQueryLimit, source: params.source ?? "web", signal })
        : await searchFirecrawlOnce({ query, includeContent: params.include_content ?? false, limit: perQueryLimit, source: params.source ?? "web", timeout: params.timeout, signal });
      batches.push({ query, results });
      if (results.length > 0) break;
    }
  }

  return { provider, results: mergeResults(batches, maxResults), queries: batches.map((batch) => batch.query) };
}

async function openPage(
  url: string,
  params: Pick<SearchParams, "only_main_content" | "wait_for" | "timeout">,
  signal?: AbortSignal,
): Promise<{ result: SearchResult; provider: Provider; fallbackErrors: string[] }> {
  const providers: Provider[] = [];
  if (firecrawlApiKey()) providers.push("firecrawl");
  if (tavilyApiKey()) providers.push("tavily");

  if (providers.length === 0) {
    throw new Error("web_search is not configured: set FIRECRAWL_API_KEY and/or TAVILY_API_KEY before starting pi.");
  }

  const fallbackErrors: string[] = [];
  for (const provider of providers) {
    try {
      const result = provider === "firecrawl"
        ? await scrapeFirecrawl({
            url,
            onlyMainContent: params.only_main_content,
            waitFor: params.wait_for,
            timeout: params.timeout,
            signal,
          })
        : await extractTavily({ url, timeout: params.timeout, signal });
      return { result, provider, fallbackErrors };
    } catch (error) {
      fallbackErrors.push(`${provider}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  throw new Error(`Unable to open ${url}: ${fallbackErrors.join("; ")}`);
}

async function enrichResultsWithContent(results: SearchResult[], signal?: AbortSignal): Promise<string[]> {
  const errors: string[] = [];

  for (const result of results) {
    try {
      // Prefer Firecrawl for rendered markdown even when Tavily supplied raw content.
      const opened = firecrawlApiKey()
        ? await scrapeFirecrawl({ url: result.url, signal })
        : result.markdown
          ? undefined
          : tavilyApiKey()
            ? await extractTavily({ url: result.url, signal })
            : undefined;

      if (!opened) continue;
      result.title = opened.title || result.title;
      result.snippet = opened.snippet || result.snippet;
      result.markdown = opened.markdown || result.markdown;
      result.contentProvider = opened.contentProvider ?? opened.provider ?? result.contentProvider;
    } catch (error) {
      errors.push(`${result.url}: ${error instanceof Error ? error.message : String(error)}`);
      result.snippet = `${result.snippet ? `${result.snippet} ` : ""}[Content fetch failed: ${error instanceof Error ? error.message : String(error)}]`;
    }
  }

  return errors;
}

async function searchWeb(
  params: SearchParams,
  maxResults: number,
  signal?: AbortSignal,
): Promise<{ provider: Provider; results: SearchResult[]; queries: string[]; fallbackErrors: string[]; contentErrors: string[] }> {
  const providers = availableSearchProviders(params.source ?? "web");
  if (providers.length === 0) {
    throw new Error("web_search is not configured: set TAVILY_API_KEY and/or FIRECRAWL_API_KEY before starting pi.");
  }

  const fallbackErrors: string[] = [];
  let lastEmpty: { provider: Provider; results: SearchResult[]; queries: string[] } | undefined;

  for (const provider of providers) {
    try {
      const search = await runSearchProvider(provider, params, maxResults, signal);
      if (search.results.length > 0) {
        const contentErrors = params.include_content ? await enrichResultsWithContent(search.results, signal) : [];
        return { ...search, fallbackErrors, contentErrors };
      }
      lastEmpty = search;
      fallbackErrors.push(`${provider}: no results`);
    } catch (error) {
      fallbackErrors.push(`${provider}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (lastEmpty) return { ...lastEmpty, fallbackErrors, contentErrors: [] };
  throw new Error(`All web_search providers failed: ${fallbackErrors.join("; ")}`);
}

function directUrl(params: SearchParams): string | undefined {
  const candidate = params.url ?? params.query.trim();
  try {
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function truncate(text: string, maxLength: number): string {
  const compact = text.replace(/\s+/g, " ").trim();
  return compact.length <= maxLength ? compact : `${compact.slice(0, maxLength)}...`;
}

function providerSummary(searchProvider: Provider, results: SearchResult[], includeContent: boolean): string {
  if (!includeContent) return `Search provider: ${searchProvider}`;
  const contentProviders = [...new Set(results.map((result) => result.contentProvider).filter(Boolean))];
  return `Search provider: ${searchProvider}; content provider: ${contentProviders.join(", ") || "none"}`;
}

function formatResults(
  query: string,
  results: SearchResult[],
  attemptedQueries: string[],
  provider: Provider,
  fallbackErrors: string[],
  contentErrors: string[],
  includeContent: boolean,
): string {
  if (results.length === 0) {
    return [
      `No web search results found for ${JSON.stringify(query)} after trying: ${attemptedQueries.map((q) => JSON.stringify(q)).join(", ")}.`,
      fallbackErrors.length > 0 ? `Provider fallbacks/errors: ${fallbackErrors.join(" | ")}` : "",
    ].filter(Boolean).join("\n");
  }

  return [
    `Web search results for ${JSON.stringify(query)}:`,
    providerSummary(provider, results, includeContent),
    attemptedQueries.length > 1 ? `Focused searches tried: ${attemptedQueries.map((q) => JSON.stringify(q)).join(", ")}` : "",
    fallbackErrors.length > 0 ? `Provider fallbacks/errors: ${fallbackErrors.join(" | ")}` : "",
    contentErrors.length > 0 ? `Content fetch errors: ${contentErrors.join(" | ")}` : "",
    "",
    ...results.map((result, index) => {
      const lines = [`${index + 1}. ${result.title}`, `   URL: ${result.url}`];
      if (result.provider) lines.push(`   Search source: ${result.provider}`);
      if (result.snippet) lines.push(`   Snippet: ${truncate(result.snippet, 700)}`);
      if (result.markdown) {
        lines.push(`   Verified page content (${result.contentProvider ?? "provider"}): ${truncate(result.markdown, 1600)}`);
      }
      return lines.join("\n");
    }),
  ].filter((line) => line !== "").join("\n");
}

function formatOpenedPage(result: SearchResult, provider: Provider, fallbackErrors: string[], includeMetadata: boolean): string {
  const lines = [`Opened page: ${result.title}`, `URL: ${result.url}`, `Content provider: ${provider}`];
  if (fallbackErrors.length > 0) lines.push(`Provider fallbacks/errors: ${fallbackErrors.join(" | ")}`);
  if (result.snippet) lines.push(`Snippet: ${truncate(result.snippet, 700)}`);
  if (result.markdown) lines.push(`Verified page content (${result.contentProvider ?? provider}): ${truncate(result.markdown, 6000)}`);
  if (!result.markdown) lines.push("Content: No extracted content returned by provider.");
  if (includeMetadata && result.metadata) lines.push(`Metadata: ${JSON.stringify(result.metadata, null, 2)}`);
  return lines.join("\n");
}

function configuredProvidersText(): string {
  const providers = [
    tavilyApiKey() ? "tavily search" : undefined,
    firecrawlApiKey() ? "firecrawl scrape/search" : undefined,
  ].filter(Boolean);
  return providers.length > 0 ? providers.join(" + ") : "none";
}

export default function webSearchExtension(pi: ExtensionAPI) {
  pi.registerTool({
    name: "web_search",
    label: "Web Search",
    description:
      "Codex-like web search/open over Tavily and Firecrawl: search the web, then open result URLs as rendered clean markdown instead of raw curl output.",
    promptSnippet:
      "Search the web or open a URL with Tavily/Firecrawl. Use include_content=true or url=... to access rendered page content for citation.",
    promptGuidelines: [
      "Use web_search when the answer may depend on current, external, or recently changed information.",
      "When using web_search, cite result URLs in the final answer and distinguish search snippets from verified page contents.",
      "Call web_search with url=<result URL> to open a page, or pass a URL as query. Opening uses Firecrawl first for JavaScript-rendered markdown, then Tavily extract as fallback.",
      "Set include_content=true when search snippets are not enough; web_search will fetch page content for returned results.",
      "Use source=news for news-specific searches and source=images when image results are requested.",
    ],
    parameters: SEARCH_PARAMS,
    async execute(_toolCallId: string, params: SearchParams, signal?: AbortSignal, onUpdate?: (update: any) => void) {
      try {
        const maxResults = clampResultCount(params.max_results);
        const url = directUrl(params);

        if (url) {
          onUpdate?.({ content: [{ type: "text", text: `Opening page with web_search: ${url}` }] });
          const { result, provider, fallbackErrors } = await openPage(url, params, signal);
          if (signal?.aborted) throw new Error("Open cancelled");
          return {
            content: [{ type: "text", text: formatOpenedPage(result, provider, fallbackErrors, params.include_metadata ?? false) }],
            details: { provider, mode: "open", url, result, fallbackErrors },
          };
        }

        onUpdate?.({
          content: [
            {
              type: "text",
              text: `Searching the web (${params.source ?? "web"}) for: ${params.query}`,
            },
          ],
        });
        const { provider, results, queries, fallbackErrors, contentErrors } = await searchWeb(params, maxResults, signal);
        if (signal?.aborted) throw new Error("Search cancelled");

        return {
          content: [
            {
              type: "text",
              text: formatResults(
                params.query,
                results,
                queries,
                provider,
                fallbackErrors,
                contentErrors,
                params.include_content ?? false,
              ),
            },
          ],
          details: {
            provider,
            query: params.query,
            source: params.source ?? "web",
            attemptedQueries: queries,
            results,
            fallbackErrors,
            contentErrors,
          },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `web_search failed: ${message}` }],
          details: { error: message },
          isError: true,
        };
      }
    },
  });

  pi.registerCommand("web-search-status", {
    description: "Show web_search configuration status.",
    handler: async (_args: string, ctx: any) => {
      const configured = Boolean(tavilyApiKey() || firecrawlApiKey());
      const preferred = preferredSearchProvider();
      ctx.ui.notify(
        configured
          ? `web_search providers configured: ${configuredProvidersText()} (preferred search: ${preferred})`
          : "web_search provider not configured: set TAVILY_API_KEY and/or FIRECRAWL_API_KEY before starting pi",
        configured ? "info" : "warning",
      );
    },
  });
}
