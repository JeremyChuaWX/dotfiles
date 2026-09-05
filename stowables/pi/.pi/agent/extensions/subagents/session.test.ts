import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { it } from "node:test";
import { createAssistantMessageEventStream, InMemoryCredentialStore, type AssistantMessage, type Model, type ProviderStreams, type SimpleStreamOptions } from "@earendil-works/pi-ai";
import { convertResponsesMessages, convertResponsesTools } from "@earendil-works/pi-ai/api/openai-responses-shared";
import { createAgentSession, DefaultResourceLoader, ModelRuntime, SessionManager, SettingsManager, type ExtensionContext } from "@earendil-works/pi-coding-agent";
import subagents from "./index.ts";
import type { RunResult } from "./protocol.ts";

for (const scenario of ["blocking explorer", "background worker", "aborted explorer"] as const) {
    it(`real Pi session: ${scenario}`, { timeout: 10_000 }, async () => {
        const tool = scenario === "background worker" ? "worker" : "explorer";
        const dir = mkdtempSync(join(tmpdir(), "pi-subagent-session-"));
        const sm = SessionManager.inMemory(dir);
        let finishChild!: (result: RunResult) => void;
        let childSignal!: AbortSignal;
        let onStarted!: () => void;
        const started = new Promise<void>((resolve) => { onStarted = resolve; });
        let ctx!: ExtensionContext;
        const requests: any[] = [];
        const errors: unknown[] = [];
        const model: Model<"openai-responses"> = {
            id: "test-model", name: "Test model", provider: "test-subagents", api: "openai-responses", baseUrl: "https://test.invalid",
            reasoning: false, input: ["text"], contextWindow: 100000, maxTokens: 4096,
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        };
        const stream: ProviderStreams["streamSimple"] = (_model, context, options) => {
            const events = createAssistantMessageEventStream();
            const message: AssistantMessage = {
                role: "assistant", provider: model.provider, model: model.id, api: model.api, timestamp: Date.now(), content: [], stopReason: "stop",
                usage: { input: 1, output: 1, cacheRead: 0, cacheWrite: 0, totalTokens: 2, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
            };
            void (async () => {
                try {
                    const payload = { input: convertResponsesMessages(model, context, new Set([model.provider])), tools: convertResponsesTools(context.tools ?? []) };
                    requests.push(await options?.onPayload?.(payload, model) ?? payload);
                    if (requests.length === 1) {
                        message.content = [{ type: "toolCall", id: "call_child|fc_child", name: tool, arguments: { task: "inspect" } }];
                        message.stopReason = "toolUse";
                    } else message.content = [{ type: "text", text: `Response ${requests.length}` }];
                    events.push({ type: "start", partial: message });
                    events.push({ type: "done", reason: message.stopReason === "toolUse" ? "toolUse" : "stop", message });
                    events.end();
                } catch (error) {
                    events.push({ type: "error", reason: "error", error: { ...message, stopReason: "error", errorMessage: String(error) } });
                    events.end();
                }
            })();
            return events;
        };
        const runtime = await ModelRuntime.create({ credentials: new InMemoryCredentialStore(), modelsPath: null, modelsStorePath: join(dir, "models.json"), refreshOnCreate: false });
        runtime.registerNativeProvider({
            id: model.provider, name: "Test", auth: { apiKey: { name: "Test", resolve: async () => ({ auth: { apiKey: "test" }, source: "test" }) } },
            getModels: () => [model], stream: (m, c, o) => stream(m, c, o as SimpleStreamOptions), streamSimple: stream,
        });
        const settingsManager = SettingsManager.inMemory({ compaction: { enabled: false }, retry: { enabled: false } });
        const loader = new DefaultResourceLoader({
            cwd: dir, agentDir: dir, settingsManager, noExtensions: true, noContextFiles: true, noSkills: true, noThemes: true, noPromptTemplates: true,
            extensionFactories: [(pi) => {
                subagents(pi, { createRunner: () => (_config, signal) => new Promise((resolve, reject) => {
                    finishChild = resolve;
                    childSignal = signal;
                    signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
                    onStarted();
                }) });
                pi.on("session_start", (_event, context) => { ctx = context; });
            }],
        });
        await loader.reload();
        const { session } = await createAgentSession({ cwd: dir, agentDir: dir, model, modelRuntime: runtime, resourceLoader: loader, sessionManager: sm, settingsManager, tools: [tool] });
        const outcome: RunResult = { text: "CHILD_FINDINGS", partial: false, usage: { input: 1, output: 1, totalTokens: 2, cost: 0 } };
        try {
            await session.bindExtensions({ mode: "rpc", onError: (error) => errors.push(error) });
            let promptFinished = false;
            const prompt = session.prompt("Delegate the task.").then(() => { promptFinished = true; });
            await started;
            assert.equal(requests[0].tools.find((t: any) => t.name === tool).async, undefined);

            if (tool === "explorer") {
                await delay(20);
                assert.equal(requests.length, 1); // No continuation until findings exist.
                assert.equal(promptFinished, false);
                assert.equal(session.isStreaming, true);
                assert.equal(ctx.isIdle(), false);
                if (scenario === "aborted explorer") {
                    await session.abort();
                    await prompt;
                    assert.equal(childSignal.aborted, true);
                    assert.equal(requests.length, 1);
                } else {
                    await session.steer("STEERING_NOTE");
                    assert.equal(requests.length, 1);
                    finishChild(outcome);
                    await prompt;
                    assert.equal(requests.length, 2);
                    const outputs = requests[1].input.filter((i: any) => i.type === "function_call_output");
                    assert.equal(outputs.length, 1);
                    assert.equal(outputs[0].call_id, "call_child");
                    assert.match(outputs[0].output, /CHILD_FINDINGS/);
                    assert.match(JSON.stringify(requests[1]), /STEERING_NOTE/);
                }
                assert.equal(session.state.messages.some((m) => m.role === "custom" && m.customType === "subagent-result"), false);
            } else {
                await prompt;
                assert.equal(ctx.isIdle(), true);
                assert.equal(requests.length, 2);
                assert.match(JSON.stringify(requests[1]), /Started worker_1/);
                await delay(20);
                assert.equal(requests.length, 2);
                await session.prompt("Answer another question while the worker runs.");
                assert.equal(requests.length, 3);
                assert.equal(ctx.isIdle(), true);
                const resumed = new Promise<void>((resolve) => {
                    const unsubscribe = session.subscribe((event) => {
                        if (event.type === "agent_end" && requests.length === 4) { unsubscribe(); resolve(); }
                    });
                });
                finishChild(outcome);
                await resumed;
                await session.waitForIdle();
                assert.match(JSON.stringify(requests[3]), /CHILD_FINDINGS/);
                assert.equal(session.state.messages.filter((m) => m.role === "custom" && m.customType === "subagent-result").length, 1);
            }
            assert.equal(ctx.isIdle(), true);
            assert.deepEqual(errors, []);
        } finally {
            await session.abort();
            session.dispose();
            rmSync(dir, { recursive: true, force: true });
            rmSync(join(tmpdir(), "pi-subagents", sm.getSessionId()), { recursive: true, force: true });
        }
    });
}
