import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { describe, it, type TestContext } from "node:test";
import { initTheme, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import subagents from "./index.ts";
import { SUBAGENT_JOBS_CHANNEL, type JobConfig, type RunResult, type Runner, type SubagentJobsEvent } from "./protocol.ts";

type Handler = (...args: any[]) => any;
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));
const done = (text = "## Finding\n\nFound it."): RunResult => ({
    text, partial: false, usage: { input: 3000, output: 2000, totalTokens: 5000, cost: 0 },
});

async function setup(t: TestContext, customRun?: Runner) {
    const handlers = new Map<string, Handler>();
    const tools = new Map<string, { execute: Handler; renderResult?: Handler }>();
    const renderers = new Map<string, Handler>();
    const sent: Array<{ message: any; options: any }> = [];
    const busEvents: Array<{ channel: string; data: unknown }> = [];
    const started: Array<{ config: JobConfig; signal: AbortSignal; resolve: (r: RunResult) => void; reject: (e: Error) => void }> = [];
    const run: Runner = customRun ?? ((config, signal) => new Promise((resolve, reject) => {
        started.push({ config, signal, resolve, reject });
        signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
    }));
    // No provider, context-projection or ledger API is needed.
    const pi = {
        on(event: string, handler: Handler) { handlers.set(event, handler); },
        registerTool(tool: any) { tools.set(tool.name, tool); },
        registerMessageRenderer(type: string, renderer: Handler) { renderers.set(type, renderer); },
        sendMessage(message: any, options: any) { sent.push({ message, options }); },
        events: { emit(channel: string, data: unknown) { busEvents.push({ channel, data }); } },
    } as unknown as ExtensionAPI;
    const sessionId = `subagent-extension-test-${process.pid}-${Math.random()}`;
    const resultDir = path.join(os.tmpdir(), "pi-subagents", sessionId);
    const ctx = {
        cwd: "/work", mode: "rpc", model: undefined,
        sessionManager: { getSessionId: () => sessionId },
        modelRegistry: { find: () => undefined },
    };
    subagents(pi, { createRunner: () => run });
    t.after(async () => {
        await handlers.get("session_shutdown")!({}, ctx);
        fs.rmSync(resultDir, { recursive: true, force: true });
    });
    await handlers.get("session_start")!({}, ctx);
    const execute = (name: string, signal?: AbortSignal): Promise<any> => tools.get(name)!.execute("call_1", { task: "inspect it", cwd: "src" }, signal, undefined, ctx);
    return { handlers, tools, renderers, sent, busEvents, started, ctx, execute };
}

describe("subagent execution modes", () => {
    it("blocks explorers and returns findings directly, with bounded text and full output on disk", async (t) => {
        const ext = await setup(t);
        let settled = false;
        const pending = ext.execute("explorer").then((result) => { settled = true; return result; });
        await flush();
        assert.equal(settled, false);
        assert.equal(ext.started.length, 1);
        assert.equal(ext.started[0].config.cwd, "/work/src");
        assert.equal(ext.sent.length, 0);
        const running = ext.busEvents.filter(({ channel }) => channel === SUBAGENT_JOBS_CHANNEL).at(-1)?.data as SubagentJobsEvent;
        assert.equal(running.jobs[0].state, "running");
        const listed = await ext.tools.get("subagent_list")!.execute("list", {});
        assert.match(listed.content[0].text, /explorer_1.*running/);

        const text = "Explorer finding\n" + "x".repeat(20_000);
        ext.started[0].resolve(done(text));
        const result = await pending;
        assert.match(result.content[0].text, /Explorer finding/);
        assert.match(result.content[0].text, /truncated/);
        assert.equal(result.details.status, "completed");
        assert.equal(fs.readFileSync(result.details.location, "utf8"), text);
        assert.equal(ext.sent.length, 0);
        const idle = ext.busEvents.at(-1)?.data as SubagentJobsEvent;
        assert.deepEqual(idle.jobs, []);
    });

    it("uses Pi's built-in tool renderer and registers custom rendering only for background messages", async (t) => {
        const ext = await setup(t);
        assert.equal(ext.tools.get("explorer")!.renderResult, undefined);
        assert.equal(ext.tools.get("worker")!.renderResult, undefined);
        assert.deepEqual([...ext.renderers.keys()], ["subagent-result"]);
    });

    it("returns worker acknowledgements immediately and injects their completed results once", async (t) => {
        const ext = await setup(t);
        const parent = new AbortController();
        const spawned = await ext.execute("worker", parent.signal);
        assert.match(spawned.content[0].text, /Started worker_1/);
        assert.equal(spawned.details.id, "worker_1");
        assert.equal(ext.sent.length, 0);
        parent.abort(); // Background lifetime is independent of the parent tool invocation.
        assert.equal(ext.started[0].signal.aborted, false);
        ext.started[0].resolve(done());
        await flush();
        assert.equal(ext.sent.length, 1);
        const [{ message, options }] = ext.sent;
        assert.equal(message.customType, "subagent-result");
        assert.equal(message.display, true);
        assert.match(message.content, /Found it/);
        assert.equal(fs.readFileSync(message.details.location, "utf8"), done().text);
        assert.deepEqual(options, { deliverAs: "steer", triggerTurn: true });

        initTheme("dark", false);
        const theme = { fg: (_: string, text: string) => text, bg: (_: string, text: string) => text, bold: (text: string) => text };
        const renderer = ext.renderers.get("subagent-result")!;
        const original = JSON.stringify(message);
        const collapsed = renderer(message, { expanded: false, outputPad: 1 }, theme).render(120).join("\n");
        const expanded = renderer(message, { expanded: true, outputPad: 1 }, theme).render(120).join("\n");
        assert.match(collapsed, /worker_1/);
        assert.doesNotMatch(collapsed, /Found it/);
        assert.match(expanded, /Found it/);
        assert.match(collapsed, /to expand/);
        assert.equal(renderer(message, { expanded: false, outputPad: 1 }, theme).render(120).join("\n"), collapsed);
        assert.equal(JSON.stringify(message), original);
    });

    it("routes mixed explorer/worker completions independently", async (t) => {
        const ext = await setup(t);
        const explorer = ext.execute("explorer");
        await ext.execute("worker");
        ext.started[1].resolve(done("worker output"));
        await flush();
        assert.equal(ext.sent.length, 1);
        assert.match(ext.sent[0].message.content, /worker output/);
        ext.started[0].resolve(done("explorer output"));
        assert.match((await explorer).content[0].text, /explorer output/);
        assert.equal(ext.sent.length, 1);
    });

    it("aborts a blocking explorer with its parent and never injects a completion", async (t) => {
        const ext = await setup(t);
        const parent = new AbortController();
        const pending = ext.execute("explorer", parent.signal);
        parent.abort();
        await assert.rejects(pending, /cancelled/);
        assert.equal(ext.started[0].signal.aborted, true);
        await flush();
        assert.equal(ext.sent.length, 0);
        await assert.rejects(ext.execute("explorer", parent.signal), /cancelled before start/);
        assert.equal(ext.started.length, 1);
    });

    it("does not leave the parent blocked if a child ignores cancellation", async (t) => {
        const ext = await setup(t, () => new Promise(() => {}));
        const parent = new AbortController();
        const pending = ext.execute("explorer", parent.signal);
        parent.abort();
        await assert.rejects(pending, /cancelled/);
        // Exercise the bounded shutdown without waiting five real seconds.
        t.mock.timers.enable({ apis: ["setTimeout"] });
        const shutdown = ext.handlers.get("session_shutdown")!({}, ext.ctx);
        t.mock.timers.tick(5000);
        await shutdown;
    });

    it("surfaces explorer failure as a tool error instead of a background message", async (t) => {
        const ext = await setup(t);
        const pending = ext.execute("explorer");
        ext.started[0].reject(new Error("model exploded"));
        await assert.rejects(pending, /model exploded/);
        assert.equal(ext.sent.length, 0);
    });

    it("handles a synchronous runner exception without leaving a blocking call pending", async (t) => {
        const ext = await setup(t, () => { throw new Error("setup failed"); });
        await assert.rejects(ext.execute("explorer"), /setup failed/);
        assert.equal(ext.sent.length, 0);
    });

    it("cancels background workers silently and releases blocking callers on shutdown", async (t) => {
        const ext = await setup(t);
        const worker = await ext.execute("worker");
        await ext.tools.get("subagent_cancel")!.execute("cancel", { ids: [worker.details.id] });
        const pending = assert.rejects(ext.execute("explorer"), /cancelled/);
        await ext.handlers.get("session_shutdown")!({}, ext.ctx);
        await pending;
        assert.equal(ext.sent.length, 0);
    });
});
