import assert from "node:assert/strict";
import { it, type TestContext } from "node:test";
import type { ExtensionAPI, ExtensionToolContext, ToolDefinition } from "@earendil-works/pi-coding-agent";
import { WebOutputRetention } from "./output-retention.ts";
import registerSearch from "./search.ts";

type AuthResult = Awaited<ReturnType<ExtensionToolContext["modelRegistry"]["getProviderAuth"]>>;

function setup(t: TestContext, options: {
    activeProvider?: string | null;
    auth?: () => Promise<AuthResult>;
    status?: number;
} = {}) {
    // Only mock credentials and fetch: tests never read real auth files or use the network.
    const requests: { url: string; headers: Headers; body: unknown }[] = [];
    const authenticated: string[] = [];
    const provider = options.activeProvider === undefined ? "openai" : options.activeProvider;
    const ctx = {
        model: provider ? { provider, id: "active-model" } : undefined,
        modelRegistry: {
            getProviderAuth: async (provider: string): Promise<AuthResult> => {
                authenticated.push(provider);
                return options.auth ? options.auth() : {
                    auth: { apiKey: "pi-token", headers: { "ChatGPT-Account-ID": "pi-account" } },
                };
            },
        },
    } as unknown as ExtensionToolContext;
    let tool: ToolDefinition | undefined;
    const retention = new WebOutputRetention();
    t.after(async () => { await retention.cleanup(); });
    registerSearch({
        on() {},
        registerTool(value: ToolDefinition) { tool = value; },
    } as unknown as ExtensionAPI, {
        fetch: async (input, init) => {
            requests.push({ url: String(input), headers: new Headers(init?.headers), body: JSON.parse(String(init?.body)) });
            return Response.json({ results: [{ title: "Result", url: "https://example.com" }] }, { status: options.status ?? 200 });
        },
    }, retention);
    assert.ok(tool);
    const registeredTool = tool;
    return {
        requests, authenticated,
        search: () => registeredTool.execute("search-test", { query: "test query" }, undefined, undefined, ctx),
    };
}

it("uses Pi Codex legacy auth regardless of the active provider or model", async (t) => {
    for (const activeProvider of ["openai", "openai-codex", "anthropic", null]) {
        const f = setup(t, { activeProvider });
        const result = await f.search();
        assert.deepEqual(f.authenticated, ["openai-codex"]);
        assert.equal(f.requests[0].headers.get("Authorization"), "Bearer pi-token");
        assert.equal(f.requests[0].headers.get("ChatGPT-Account-ID"), "pi-account");
        assert.equal(f.requests[0].url, "https://chatgpt.com/backend-api/codex/alpha/search");
        assert.deepEqual((f.requests[0].body as { commands: unknown }).commands, { search_query: [{ q: "test query" }] });
        assert.match(JSON.stringify(result.content), /https:\/\/example.com/);
    }
});

it("derives the account header from the Pi access token when no header is supplied", async (t) => {
    const payload = Buffer.from(JSON.stringify({ "https://api.openai.com/auth": { chatgpt_account_id: "jwt-account" } })).toString("base64url");
    const token = `test.${payload}.test`;
    const f = setup(t, { auth: async () => ({ auth: { apiKey: token } }) });
    await f.search();
    assert.equal(f.requests[0].headers.get("ChatGPT-Account-ID"), "jwt-account");
});

it("preserves Pi auth headers and skips null header values", async (t) => {
    const f = setup(t, { auth: async () => ({ auth: {
        apiKey: "pi-token",
        headers: { "ChatGPT-Account-ID": "pi-account", "X-Test": "custom", "X-Absent": null },
    } }) });
    await f.search();
    assert.equal(f.requests[0].headers.get("X-Test"), "custom");
    assert.equal(f.requests[0].headers.has("X-Absent"), false);
});

it("resolves Pi credentials on every call rather than caching the access token", async (t) => {
    let version = 0;
    const f = setup(t, { auth: async () => ({ auth: { apiKey: `pi-token-${++version}` } }) });
    await f.search();
    await f.search();
    assert.deepEqual(f.requests.map(({ headers }) => headers.get("Authorization")), ["Bearer pi-token-1", "Bearer pi-token-2"]);
});

it("directs missing-login errors to Pi without falling back to another credential source", async (t) => {
    for (const auth of [undefined, { auth: {} }, { auth: { apiKey: " " } }]) {
        const f = setup(t, { auth: async () => auth });
        await assert.rejects(f.search(), /No Pi Codex legacy credentials.*\/login in Pi/);
        assert.equal(f.requests.length, 0);
    }
});

it("surfaces Pi auth refresh failures without making a search request", async (t) => {
    const f = setup(t, { auth: async () => { throw new Error("Refresh failed"); } });
    await assert.rejects(f.search(), /web_search failed: Refresh failed/);
    assert.equal(f.requests.length, 0);
});

it("directs rejected authentication to Pi's login flow", async (t) => {
    for (const status of [401, 403]) {
        const f = setup(t, { status });
        await assert.rejects(f.search(), /authentication was rejected.*\/login in Pi.*Codex legacy/);
    }
});
