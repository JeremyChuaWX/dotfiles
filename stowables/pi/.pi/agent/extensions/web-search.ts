import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type, type Static } from "typebox";

const SEARCH_PARAMS = Type.Object({
  query: Type.String({ description: "Search query using OpenAI/ChatGPT built-in web search." }),
  max_results: Type.Optional(Type.Number({ description: "Maximum number of source URLs to return. Defaults to 5; capped at 10." })),
  source: Type.Optional(
    Type.Union([Type.Literal("web"), Type.Literal("news")], {
      description: "Search vertical hint. Defaults to web.",
    }),
  ),
});

type SearchParams = Static<typeof SEARCH_PARAMS>;
type OpenAISearchProvider = "openai" | "chatgpt";

type ModelLike = {
  id: string;
  api: string;
  provider: string;
  baseUrl: string;
  headers?: Record<string, string>;
};

type SearchHit = {
  title: string;
  url: string;
};

type SearchResult = {
  provider: OpenAISearchProvider;
  model: string;
  query: string;
  answer: string;
  sources: SearchHit[];
};

const SEARCH_SYSTEM_PROMPT =
  "You are an assistant for performing web search. Return concise, useful findings and preserve source URLs.";
const MAX_OUTPUT_TOKENS = 16000;

function clampResultCount(value: unknown): number {
  const n = typeof value === "number" && Number.isFinite(value) ? Math.floor(value) : 5;
  return Math.max(1, Math.min(10, n));
}

function maybeString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function buildSearchInput(params: SearchParams): string {
  const prefix = params.source === "news" ? "Perform a web/news search for the query: " : "Perform a web search for the query: ";
  return `${prefix}${params.query}`;
}

function uniquePushHit(results: SearchHit[], seen: Set<string>, title: unknown, url: unknown) {
  const resolvedUrl = maybeString(url);
  if (!resolvedUrl || seen.has(resolvedUrl)) return;
  seen.add(resolvedUrl);
  results.push({ title: maybeString(title) ?? resolvedUrl, url: resolvedUrl });
}

function normalizeEndpoint(baseUrl: string, suffix: string): string {
  const normalized = baseUrl.replace(/\/+$/, "");
  return normalized.endsWith(suffix) ? normalized : `${normalized}${suffix}`;
}

function resolveCodexResponsesUrl(model: ModelLike): string {
  const normalized = model.baseUrl.replace(/\/+$/, "");
  if (normalized.endsWith("/codex/responses")) return normalized;
  if (normalized.endsWith("/codex")) return `${normalized}/responses`;
  return `${normalized}/codex/responses`;
}

function extractChatGptAccountId(token: string): string | undefined {
  try {
    const [, payload] = token.split(".");
    if (!payload) return undefined;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(Buffer.from(normalized, "base64").toString("utf8"));
    return maybeString(decoded?.["https://api.openai.com/auth"]?.chatgpt_account_id);
  } catch {
    return undefined;
  }
}

function detectOpenAISearchProvider(model: ModelLike): OpenAISearchProvider | undefined {
  if (model.provider === "openai" && model.api === "openai-responses") return "openai";
  if (model.provider === "openai-codex" && model.api === "openai-codex-responses") return "chatgpt";
  return undefined;
}

function resolveSearchModel(ctx: any): ModelLike | undefined {
  const configured = process.env.WEB_SEARCH_MODEL?.trim();
  if (configured) {
    const slash = configured.indexOf("/");
    const provider = slash === -1 ? ctx.model?.provider : configured.slice(0, slash);
    const modelId = slash === -1 ? configured : configured.slice(slash + 1);
    const found = ctx.modelRegistry?.find?.(provider, modelId);
    if (found) return found;
  }
  return ctx.model;
}

async function getModelAuth(ctx: any, model: ModelLike): Promise<{ apiKey?: string; headers: Record<string, string> }> {
  const auth = await ctx.modelRegistry.getApiKeyAndHeaders(model);
  if (!auth.ok) throw new Error(auth.error);
  return { apiKey: auth.apiKey, headers: auth.headers ?? {} };
}

function collectResponseText(payload: any): string {
  const direct = maybeString(payload?.output_text);
  if (direct) return direct;

  const parts: string[] = [];
  for (const item of Array.isArray(payload?.output) ? payload.output : []) {
    if (item?.type !== "message" || !Array.isArray(item.content)) continue;
    for (const part of item.content) {
      const text = maybeString(part?.text);
      if (part?.type === "output_text" && text) parts.push(text);
    }
  }
  return parts.join("\n\n");
}

function collectResponseHits(output: any): SearchHit[] {
  const hits: SearchHit[] = [];
  const seen = new Set<string>();
  for (const item of Array.isArray(output) ? output : []) {
    if (item?.type === "web_search_call" && item.action?.type === "search" && Array.isArray(item.action.sources)) {
      for (const source of item.action.sources) uniquePushHit(hits, seen, source.title ?? source.url, source.url);
    }
    if (item?.type !== "message" || !Array.isArray(item.content)) continue;
    for (const part of item.content) {
      if (part?.type !== "output_text" || !Array.isArray(part.annotations)) continue;
      for (const annotation of part.annotations) {
        if (annotation.type === "url_citation") uniquePushHit(hits, seen, annotation.title, annotation.url);
      }
    }
  }
  return hits;
}

function parseSseEvents(text: string): Array<{ event: string; data: any }> {
  const events: Array<{ event: string; data: any }> = [];
  for (const block of text.split(/\n\n+/)) {
    const lines = block.split("\n");
    const event = lines.find((line) => line.startsWith("event: "))?.slice(7).trim();
    const data = lines.filter((line) => line.startsWith("data: ")).map((line) => line.slice(6)).join("");
    if (!event || !data || data === "[DONE]") continue;
    try {
      events.push({ event, data: JSON.parse(data) });
    } catch {
      // Ignore malformed SSE fragments.
    }
  }
  return events;
}

function parseChatGptSseResponse(text: string): { answer: string; sources: SearchHit[] } {
  let answer = "";
  const sources: SearchHit[] = [];
  const seen = new Set<string>();

  for (const { event, data } of parseSseEvents(text)) {
    if (event === "response.output_text.delta" && typeof data.delta === "string") answer += data.delta;
    const item = data.item ?? data.response?.output?.find?.((entry: any) => entry?.type === "web_search_call");
    if (item?.type === "web_search_call" && item.action?.type === "search" && Array.isArray(item.action.sources)) {
      for (const source of item.action.sources) uniquePushHit(sources, seen, source.title ?? source.url, source.url);
    }
    for (const hit of collectResponseHits(data.response?.output)) uniquePushHit(sources, seen, hit.title, hit.url);
  }

  return { answer: answer.trim(), sources };
}

async function executeOpenAISearch(
  model: ModelLike,
  provider: OpenAISearchProvider,
  params: SearchParams,
  ctx: any,
  signal?: AbortSignal,
): Promise<SearchResult> {
  const auth = await getModelAuth(ctx, model);
  if (!auth.apiKey) throw new Error(`No API key for ${model.provider}/${model.id}`);

  const headers: Record<string, string> = {
    ...model.headers,
    ...auth.headers,
    Authorization: `Bearer ${auth.apiKey}`,
    "Content-Type": "application/json",
  };

  const body: Record<string, any> = {
    include: ["web_search_call.action.sources"],
    input: buildSearchInput(params),
    instructions: SEARCH_SYSTEM_PROMPT,
    max_output_tokens: MAX_OUTPUT_TOKENS,
    model: model.id,
    store: false,
    tool_choice: "auto",
    tools: [{ type: "web_search" }],
  };

  let url = normalizeEndpoint(model.baseUrl, "/responses");

  if (provider === "chatgpt") {
    url = resolveCodexResponsesUrl(model);
    const accountId = extractChatGptAccountId(auth.apiKey);
    if (accountId) headers["chatgpt-account-id"] = accountId;
    headers["OpenAI-Beta"] = headers["OpenAI-Beta"] ?? "responses=experimental";
    headers.originator = headers.originator ?? "pi";
    headers.accept = headers.accept ?? "text/event-stream";
    body.input = [{ role: "user", content: [{ type: "input_text", text: buildSearchInput(params) }] }];
    body.stream = true;
    body.text = { verbosity: "low" };
    body.parallel_tool_calls = true;
  }

  const response = await fetch(url, { method: "POST", headers, body: JSON.stringify(body), signal });
  const text = await response.text();
  if (!response.ok) throw new Error(`${provider} built-in search returned HTTP ${response.status}: ${text.slice(0, 700)}`);

  if (provider === "chatgpt") {
    const parsed = parseChatGptSseResponse(text);
    return { provider, model: `${model.provider}/${model.id}`, query: params.query, answer: parsed.answer, sources: parsed.sources };
  }

  const payload = text ? JSON.parse(text) : {};
  return {
    provider,
    model: `${model.provider}/${model.id}`,
    query: params.query,
    answer: collectResponseText(payload),
    sources: collectResponseHits(payload.output),
  };
}

async function searchOpenAI(params: SearchParams, ctx: any, signal?: AbortSignal): Promise<SearchResult> {
  const model = resolveSearchModel(ctx);
  if (!model) throw new Error("No active pi model is available for web_search.");

  const provider = detectOpenAISearchProvider(model);
  if (!provider) {
    throw new Error(
      `Active model ${model.provider}/${model.id} is not an OpenAI/ChatGPT built-in-search model. Use provider openai/openai-responses or openai-codex/openai-codex-responses, or set WEB_SEARCH_MODEL=provider/model.`,
    );
  }

  return executeOpenAISearch(model, provider, params, ctx, signal);
}

function formatSearchResult(result: SearchResult, maxResults: number): string {
  const sources = result.sources.slice(0, maxResults);
  return [
    `Web search results for ${JSON.stringify(result.query)}:`,
    `Search provider: ${result.provider}; model: ${result.model}`,
    "",
    result.answer ? `Model-generated search answer:\n${result.answer}` : "Model-generated search answer: (empty)",
    "",
    sources.length > 0 ? "Sources returned by provider:" : "Sources returned by provider: none",
    ...sources.map((source, index) => `${index + 1}. ${source.title}\n   URL: ${source.url}`),
  ].join("\n");
}

function configuredProviderText(ctx: any): string {
  const model = resolveSearchModel(ctx);
  const provider = model ? detectOpenAISearchProvider(model) : undefined;
  return provider && model ? `${provider} (${model.provider}/${model.id})` : "none";
}

export default function webSearchExtension(pi: ExtensionAPI) {
  pi.registerTool({
    name: "web_search",
    label: "Web Search",
    description:
      "Google-for-agents web search powered only by OpenAI/ChatGPT built-in web search. No Tavily, Firecrawl, Anthropic, Copilot, or Moonshot adapters are used.",
    promptSnippet:
      "Search the web using OpenAI/ChatGPT built-in search. Returns model-generated findings and provider source URLs.",
    promptGuidelines: [
      "Use web_search when the answer may depend on current, external, or recently changed information.",
      "web_search only supports OpenAI API models and ChatGPT/Codex subscription models with built-in web search support.",
      "When using web_search, cite returned URLs in the final answer and make clear they are provider-returned sources.",
      "Use WEB_SEARCH_MODEL=provider/model to pin a dedicated OpenAI/ChatGPT search-capable model.",
    ],
    parameters: SEARCH_PARAMS,
    async execute(
      _toolCallId: string,
      params: SearchParams,
      signal?: AbortSignal,
      onUpdate?: (update: any) => void,
      ctx?: any,
    ) {
      try {
        if (!ctx) throw new Error("Extension context is required for OpenAI/ChatGPT web search.");
        const maxResults = clampResultCount(params.max_results);
        onUpdate?.({ content: [{ type: "text", text: `Searching with OpenAI/ChatGPT built-in web search: ${params.query}` }] });
        const result = await searchOpenAI(params, ctx, signal);
        if (signal?.aborted) throw new Error("Search cancelled");
        return {
          content: [{ type: "text", text: formatSearchResult(result, maxResults) }],
          details: { mode: "builtin", ...result, maxResults },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { content: [{ type: "text", text: `web_search failed: ${message}` }], details: { error: message }, isError: true };
      }
    },
  });

  pi.registerCommand("web-search-status", {
    description: "Show OpenAI/ChatGPT web_search configuration status.",
    handler: async (_args: string, ctx: any) => {
      const provider = configuredProviderText(ctx);
      const ok = provider !== "none";
      ctx.ui.notify(
        ok
          ? `web_search provider configured: ${provider}`
          : "web_search provider unavailable: use an OpenAI/ChatGPT built-in-search-capable model or set WEB_SEARCH_MODEL=provider/model.",
        ok ? "info" : "warning",
      );
    },
  });
}
