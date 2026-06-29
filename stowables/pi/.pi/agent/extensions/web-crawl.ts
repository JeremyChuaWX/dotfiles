import { randomUUID } from "node:crypto";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { DEFAULT_MAX_BYTES, DEFAULT_MAX_LINES, formatSize, truncateHead } from "@earendil-works/pi-coding-agent";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type, type Static } from "typebox";

const CRAWL_PARAMS = Type.Object({
  url: Type.String({ description: "HTTP(S) URL to crawl/scrape for readable page content." }),
  max_bytes: Type.Optional(Type.Number({ description: "Maximum bytes of content to return. Defaults to 50KB; capped at 50KB." })),
});

type CrawlParams = Static<typeof CRAWL_PARAMS>;
type BuiltinProvider = "openai" | "chatgpt";

type ModelLike = {
  id: string;
  api: string;
  provider: string;
  baseUrl: string;
  headers?: Record<string, string>;
};

type Source = {
  title: string;
  url: string;
};

type CrawlResult = {
  mode: "builtin" | "firecrawl";
  url: string;
  content: string;
  title?: string;
  provider?: BuiltinProvider;
  model?: string;
  sources: Source[];
  metadata?: Record<string, unknown>;
  fallbackReason?: string;
};

const CRAWL_SYSTEM_PROMPT =
  "You are an assistant for crawling one webpage. Open the exact URL supplied by the user and extract the main human-readable page content as Markdown/plain text. Preserve headings, lists, key facts, and source URLs. Do not invent content.";
const MAX_OUTPUT_TOKENS = 16000;
const CHATGPT_USER_AGENT = "pi-web-crawl";
const FIRECRAWL_DEFAULT_BASE_URL = "https://api.firecrawl.dev";

function clampMaxBytes(value: unknown): number {
  const n = typeof value === "number" && Number.isFinite(value) ? Math.floor(value) : DEFAULT_MAX_BYTES;
  return Math.max(1, Math.min(DEFAULT_MAX_BYTES, n));
}

function maybeString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizeHttpUrl(value: string): string {
  const url = new URL(value.trim());
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("web_crawl only accepts http(s) URLs.");
  return url.toString();
}

function normalizeEndpoint(baseUrl: string, suffix: string): string {
  const normalized = baseUrl.replace(/\/+$/, "");
  return normalized.endsWith(suffix) ? normalized : `${normalized}${suffix}`;
}

function resolveFirecrawlScrapeUrl(): string {
  const normalized = (process.env.FIRECRAWL_API_URL?.trim() || FIRECRAWL_DEFAULT_BASE_URL).replace(/\/+$/, "");
  if (normalized.endsWith("/scrape")) return normalized;
  if (normalized.endsWith("/v2")) return `${normalized}/scrape`;
  return `${normalized}/v2/scrape`;
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

function detectBuiltinProvider(model: ModelLike): BuiltinProvider | undefined {
  if (model.provider === "openai" && model.api === "openai-responses") return "openai";
  if (model.provider === "openai-codex" && model.api === "openai-codex-responses") return "chatgpt";
  return undefined;
}

function resolveCrawlModel(ctx: any): ModelLike | undefined {
  const configured = process.env.WEB_CRAWL_MODEL?.trim();
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

function uniquePushSource(results: Source[], seen: Set<string>, title: unknown, url: unknown) {
  const resolvedUrl = maybeString(url);
  if (!resolvedUrl || seen.has(resolvedUrl)) return;
  seen.add(resolvedUrl);
  results.push({ title: maybeString(title) ?? resolvedUrl, url: resolvedUrl });
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

function collectResponseSources(output: any): Source[] {
  const sources: Source[] = [];
  const seen = new Set<string>();
  for (const item of Array.isArray(output) ? output : []) {
    if (item?.type === "web_search_call" && item.action?.type === "search" && Array.isArray(item.action.sources)) {
      for (const source of item.action.sources) uniquePushSource(sources, seen, source.title ?? source.url, source.url);
    }
    if (item?.type !== "message" || !Array.isArray(item.content)) continue;
    for (const part of item.content) {
      if (part?.type !== "output_text" || !Array.isArray(part.annotations)) continue;
      for (const annotation of part.annotations) {
        if (annotation.type === "url_citation") uniquePushSource(sources, seen, annotation.title, annotation.url);
      }
    }
  }
  return sources;
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

function parseChatGptSseResponse(text: string): { answer: string; sources: Source[] } {
  let answer = "";
  const sources: Source[] = [];
  const seen = new Set<string>();

  for (const { event, data } of parseSseEvents(text)) {
    if (event === "response.output_text.delta" && typeof data.delta === "string") answer += data.delta;
    const item = data.item ?? data.response?.output?.find?.((entry: any) => entry?.type === "web_search_call");
    if (item?.type === "web_search_call" && item.action?.type === "search" && Array.isArray(item.action.sources)) {
      for (const source of item.action.sources) uniquePushSource(sources, seen, source.title ?? source.url, source.url);
    }
    for (const source of collectResponseSources(data.response?.output)) uniquePushSource(sources, seen, source.title, source.url);
  }

  return { answer: answer.trim(), sources };
}

async function executeBuiltinCrawl(urlToCrawl: string, ctx: any, signal?: AbortSignal): Promise<CrawlResult> {
  const model = resolveCrawlModel(ctx);
  if (!model) throw new Error("No active pi model is available for built-in web crawl.");

  const provider = detectBuiltinProvider(model);
  if (!provider) throw new Error(`Configured model ${model.provider}/${model.id} does not expose OpenAI/ChatGPT built-in web access.`);

  const auth = await getModelAuth(ctx, model);
  if (!auth.apiKey) throw new Error(`No API key for ${model.provider}/${model.id}`);

  const inputText = `Open this exact URL and extract the main page content as Markdown/plain text. URL: ${urlToCrawl}`;
  const headers: Record<string, string> = {
    ...model.headers,
    ...auth.headers,
    Authorization: `Bearer ${auth.apiKey}`,
    "Content-Type": "application/json",
  };
  const body: Record<string, any> = {
    include: ["web_search_call.action.sources"],
    input: inputText,
    instructions: CRAWL_SYSTEM_PROMPT,
    max_output_tokens: MAX_OUTPUT_TOKENS,
    model: model.id,
    store: false,
    tool_choice: "auto",
    tools: [{ type: "web_search" }],
  };
  let endpoint = normalizeEndpoint(model.baseUrl, "/responses");

  if (provider === "chatgpt") {
    endpoint = resolveCodexResponsesUrl(model);
    const accountId = extractChatGptAccountId(auth.apiKey);
    if (accountId) headers["chatgpt-account-id"] = accountId;
    headers.Accept = headers.Accept ?? headers.accept ?? "text/event-stream";
    headers["User-Agent"] = headers["User-Agent"] ?? CHATGPT_USER_AGENT;
    delete headers.accept;
    delete body.max_output_tokens;
    body.input = [{ role: "user", content: [{ type: "input_text", text: inputText }] }];
    body.stream = true;
  }

  const response = await fetch(endpoint, { method: "POST", headers, body: JSON.stringify(body), signal });
  const text = await response.text();
  if (!response.ok) throw new Error(`${provider} built-in web crawl returned HTTP ${response.status}: ${text.slice(0, 700)}`);

  const parsed = provider === "chatgpt"
    ? parseChatGptSseResponse(text)
    : (() => {
        const payload = text ? JSON.parse(text) : {};
        return { answer: collectResponseText(payload), sources: collectResponseSources(payload.output) };
      })();
  const content = parsed.answer.trim();
  if (!content) throw new Error("Built-in web crawl returned no page content.");

  return {
    mode: "builtin",
    provider,
    model: `${model.provider}/${model.id}`,
    url: urlToCrawl,
    title: parsed.sources[0]?.title,
    content,
    sources: parsed.sources.length ? parsed.sources : [{ title: urlToCrawl, url: urlToCrawl }],
  };
}

function parseJsonPayload(text: string): any | undefined {
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return undefined;
  }
}

async function executeFirecrawlCrawl(urlToCrawl: string, signal?: AbortSignal): Promise<CrawlResult> {
  const apiKey = process.env.FIRECRAWL_API_KEY?.trim();
  if (!apiKey) throw new Error("FIRECRAWL_API_KEY is not set.");

  const response = await fetch(resolveFirecrawlScrapeUrl(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url: urlToCrawl, formats: ["markdown"], onlyMainContent: true }),
    signal,
  });
  const text = await response.text();
  const payload = parseJsonPayload(text);
  const firecrawlMessage = maybeString(payload?.error) ?? maybeString(payload?.message) ?? text.slice(0, 700);
  if (!payload) throw new Error(`Firecrawl returned non-JSON response: ${text.slice(0, 700)}`);
  if (!response.ok || payload.success === false) throw new Error(`Firecrawl scrape returned HTTP ${response.status}: ${firecrawlMessage}`);

  const data = payload.data ?? payload;
  const content = maybeString(data?.markdown) ?? maybeString(data?.content);
  if (!content) throw new Error("Firecrawl returned no markdown content.");

  const metadata = data?.metadata && typeof data.metadata === "object" ? data.metadata : undefined;
  const title = maybeString(metadata?.title) ?? maybeString(data?.title);
  const sourceUrl = maybeString(metadata?.sourceURL) ?? maybeString(metadata?.url) ?? urlToCrawl;

  return {
    mode: "firecrawl",
    url: sourceUrl,
    title,
    content,
    sources: [{ title: title ?? sourceUrl, url: sourceUrl }],
    metadata,
  };
}

async function crawlWeb(params: CrawlParams, ctx: any | undefined, signal?: AbortSignal): Promise<CrawlResult> {
  const urlToCrawl = normalizeHttpUrl(params.url);
  let fallbackReason: string | undefined;

  if (ctx) {
    const model = resolveCrawlModel(ctx);
    const provider = model ? detectBuiltinProvider(model) : undefined;
    if (model && provider) {
      try {
        return await executeBuiltinCrawl(urlToCrawl, ctx, signal);
      } catch (error) {
        if (signal?.aborted) throw new Error("Crawl cancelled");
        fallbackReason = `Built-in web crawl failed: ${error instanceof Error ? error.message : String(error)}`;
      }
    } else {
      fallbackReason = model
        ? `Configured model ${model.provider}/${model.id} does not expose OpenAI/ChatGPT built-in web access.`
        : "No active pi model is available for built-in web crawl.";
    }
  } else {
    fallbackReason = "Extension context is required for built-in web crawl.";
  }

  try {
    return { ...(await executeFirecrawlCrawl(urlToCrawl, signal)), fallbackReason };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(fallbackReason ? `${fallbackReason} Firecrawl fallback failed: ${message}` : message);
  }
}

async function writeTempContent(content: string): Promise<string> {
  const dir = path.join(os.tmpdir(), "pi-web-crawl");
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, `web-crawl-${Date.now()}-${randomUUID()}.md`);
  await fs.writeFile(file, content, "utf8");
  return file;
}

async function formatCrawlResult(result: CrawlResult, maxBytes: number): Promise<{ text: string; truncated: boolean; fullContentPath?: string }> {
  const mode = result.mode === "builtin" ? `builtin (${result.provider}; ${result.model})` : "firecrawl";
  const sources = result.sources.length ? result.sources : [{ title: result.title ?? result.url, url: result.url }];
  const fullText = [
    `Web crawl result for ${result.url}:`,
    `Mode: ${mode}`,
    result.title ? `Title: ${result.title}` : undefined,
    result.fallbackReason ? `Fallback reason: ${result.fallbackReason}` : undefined,
    "",
    "Source URLs:",
    ...sources.map((source, index) => `${index + 1}. ${source.title}\n   URL: ${source.url}`),
    "",
    "Content:",
    result.content,
  ].filter((line): line is string => typeof line === "string").join("\n");
  const truncation = truncateHead(fullText, { maxLines: DEFAULT_MAX_LINES, maxBytes });
  if (!truncation.truncated) return { text: truncation.content, truncated: false };

  const fullContentPath = await writeTempContent(fullText);
  return {
    text: `${truncation.content}\n\n[Output truncated: ${truncation.outputLines} of ${truncation.totalLines} lines (${formatSize(truncation.outputBytes)} of ${formatSize(truncation.totalBytes)}). Full content saved to: ${fullContentPath}]`,
    truncated: true,
    fullContentPath,
  };
}

export default function webCrawlExtension(pi: ExtensionAPI) {
  pi.registerTool({
    name: "web_crawl",
    label: "Web Crawl",
    description:
      "Crawl/scrape a provided URL for readable page content. Uses OpenAI/ChatGPT built-in web access when available; otherwise falls back to Firecrawl (FIRECRAWL_API_KEY). Output is capped at 50KB.",
    promptSnippet: "Fetch readable content from a provided URL using built-in web access, falling back to Firecrawl.",
    promptGuidelines: [
      "Use web_crawl when the user provides a URL and asks for the linked page's content, source text, or details.",
      "Use web_search for discovery/search queries; use web_crawl for a specific URL.",
      "web_crawl first tries OpenAI/ChatGPT built-in web access from the active model or WEB_CRAWL_MODEL, then falls back to Firecrawl.",
      "web_crawl Firecrawl fallback requires FIRECRAWL_API_KEY; FIRECRAWL_API_URL may point to a self-hosted Firecrawl base URL.",
      "When using web_crawl, cite the returned source URL and mention whether content came from built-in web access or Firecrawl.",
    ],
    parameters: CRAWL_PARAMS,
    async execute(
      _toolCallId: string,
      params: CrawlParams,
      signal?: AbortSignal,
      onUpdate?: (update: any) => void,
      ctx?: any,
    ) {
      try {
        const maxBytes = clampMaxBytes(params.max_bytes);
        onUpdate?.({ content: [{ type: "text", text: `Crawling ${params.url}` }], details: { maxBytes } });
        const result = await crawlWeb(params, ctx, signal);
        if (signal?.aborted) throw new Error("Crawl cancelled");
        const formatted = await formatCrawlResult(result, maxBytes);
        return {
          content: [{ type: "text", text: formatted.text }],
          details: {
            mode: result.mode,
            provider: result.provider,
            model: result.model,
            url: result.url,
            title: result.title,
            sources: result.sources,
            metadata: result.metadata,
            fallbackReason: result.fallbackReason,
            maxBytes,
            contentBytes: Buffer.byteLength(result.content, "utf8"),
            truncated: formatted.truncated,
            fullContentPath: formatted.fullContentPath,
          },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { content: [{ type: "text", text: `web_crawl failed: ${message}` }], details: { error: message }, isError: true };
      }
    },
  });
}
