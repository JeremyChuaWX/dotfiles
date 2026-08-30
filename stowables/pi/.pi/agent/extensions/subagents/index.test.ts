import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { describe, it } from "node:test";
import { initTheme, type ExtensionAPI, type MessageRenderer } from "@earendil-works/pi-coding-agent";
import subagents from "./index.ts";
import type { RunResult, Runner } from "./protocol.ts";
import type { SubagentResultDetails } from "./result-message.ts";

const flush = () => new Promise((resolve) => setImmediate(resolve));

type Handler = (...args: any[]) => any;
type RegisteredTool = { name: string; execute: Handler };
type SentMessage = {
    message: { customType: string; content: string; display: boolean; details: SubagentResultDetails };
    options: { deliverAs?: string; triggerTurn?: boolean };
};

function fakeExtension() {
    const handlers = new Map<string, Handler>();
    const tools = new Map<string, RegisteredTool>();
    const renderers = new Map<string, MessageRenderer<any>>();
    const sent: SentMessage[] = [];
    const pi = {
        on(event: string, handler: Handler) {
            handlers.set(event, handler);
        },
        registerTool(tool: RegisteredTool) {
            tools.set(tool.name, tool);
        },
        registerMessageRenderer(type: string, renderer: MessageRenderer<any>) {
            renderers.set(type, renderer);
        },
        sendMessage(message: SentMessage["message"], options: SentMessage["options"]) {
            sent.push({ message, options });
        },
    } as unknown as ExtensionAPI;
    return { pi, handlers, tools, renderers, sent };
}

describe("subagent extension", () => {
    it("returns control after dispatch and steers each completed result into a collapsible tool-style message", async () => {
        let resolveRun!: (result: RunResult) => void;
        const run: Runner = () =>
            new Promise<RunResult>((resolve) => {
                resolveRun = resolve;
            });
        const extension = fakeExtension();
        subagents(extension.pi, { createRunner: () => run });

        const sessionId = `subagent-extension-test-${process.pid}-${Date.now()}`;
        const resultDir = path.join(os.tmpdir(), "pi-subagents", sessionId);
        const ctx = {
            cwd: "/work",
            sessionManager: { getSessionId: () => sessionId },
            modelRegistry: { find: () => undefined },
        };

        try {
            await extension.handlers.get("session_start")?.({ type: "session_start", reason: "startup" }, ctx);

            const spawned = await extension.tools.get("explorer")?.execute("call_1", { task: "inspect it" }, undefined, undefined, ctx);
            assert.equal(spawned.terminate, undefined);
            assert.match(spawned.content[0].text, /do not wait or poll/);

            const listed = await extension.tools.get("subagent_list")?.execute("call_2", {}, undefined, undefined, ctx);
            assert.equal(listed.terminate, true);
            assert.match(listed.content[0].text, /explorer_1.*running/);

            resolveRun({
                text: "## Finding\n\nFound it.",
                partial: false,
                usage: { input: 3000, output: 2000, totalTokens: 5000, cost: 0 },
            });
            await flush();

            assert.equal(extension.sent.length, 1);
            const [{ message, options }] = extension.sent;
            assert.deepEqual(options, { deliverAs: "steer", triggerTurn: true });
            assert.equal(message.customType, "subagent-result");
            assert.equal(message.details.id, "explorer_1");
            assert.equal(message.details.status, "completed");
            assert.equal(fs.readFileSync(message.details.location, "utf8"), "## Finding\n\nFound it.");

            const renderer = extension.renderers.get("subagent-result");
            assert.ok(renderer);
            initTheme("dark", false);
            const customMessage = { role: "custom", timestamp: Date.now(), ...message } as any;
            const theme = {
                fg: (_color: string, text: string) => text,
                bg: (_color: string, text: string) => text,
                bold: (text: string) => text,
            } as any;
            const collapsed = renderer(customMessage, { expanded: false, outputPad: 1 }, theme)?.render(120).join("\n") ?? "";
            const expanded = renderer(customMessage, { expanded: true, outputPad: 1 }, theme)?.render(120).join("\n") ?? "";
            assert.match(collapsed, /explorer_1/);
            assert.doesNotMatch(collapsed, /Found it/);
            assert.match(expanded, /Found it/);
        } finally {
            await extension.handlers.get("session_shutdown")?.({ type: "session_shutdown", reason: "quit" }, ctx);
            fs.rmSync(resultDir, { recursive: true, force: true });
        }
    });
});
