import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createEventBus, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { visibleWidth } from "@earendil-works/pi-tui";
import statusline from "./index.ts";
import { SUBAGENT_JOBS_CHANNEL, type Job, type SubagentJobsEvent } from "../subagents/protocol.ts";

type Handler = (...args: any[]) => any;

describe("statusline", () => {
    it("renders each active subagent beneath the original status line", async () => {
        const handlers = new Map<string, Handler>();
        const events = createEventBus();
        let footerFactory: Handler | undefined;
        const pi = {
            on(event: string, handler: Handler) {
                handlers.set(event, handler);
            },
            getThinkingLevel: () => "high",
            events,
        } as unknown as ExtensionAPI;
        statusline(pi);

        const sessionId = "statusline-test";
        const ctx = {
            sessionManager: {
                getCwd: () => "/work",
                getSessionId: () => sessionId,
            },
            getContextUsage: () => ({ tokens: 1500 }),
            model: { id: "test-model", reasoning: true },
            ui: {
                setFooter(factory: Handler) {
                    footerFactory = factory;
                },
            },
        };
        await handlers.get("session_start")?.({ type: "session_start", reason: "startup" }, ctx);
        assert.ok(footerFactory);

        let renders = 0;
        const tui = { requestRender: () => renders++ };
        const theme = { fg: (_color: string, text: string) => text };
        const footerData = {
            getGitBranch: () => "main",
            onBranchChange: () => () => {},
        };
        const footer = footerFactory(tui, theme, footerData);

        try {
            assert.deepEqual(footer.render(120), ["/work | main | 1.5k | test-model high"]);

            const now = Date.now();
            const jobs: Job[] = [
                {
                    id: "explorer_1",
                    profile: "explorer",
                    task: "Inspect the statusline",
                    cwd: "/work",
                    state: "running",
                    createdAt: now - 5_000,
                    startedAt: now - 4_000,
                    usage: { input: 3000, output: 2000, totalTokens: 5000, cost: 0 },
                },
                {
                    id: "worker_1",
                    profile: "worker",
                    task: "Implement\n  the change",
                    cwd: "/work",
                    state: "queued",
                    createdAt: now - 2_000,
                },
            ];
            events.emit(SUBAGENT_JOBS_CHANNEL, { sessionId, jobs } satisfies SubagentJobsEvent);

            const lines = footer.render(120);
            assert.equal(renders, 1);
            assert.equal(lines[0], "/work | main | 1.5k | test-model high");
            assert.match(lines[1], /^\[explorer_1\] running \d+s 5\.0k$/);
            assert.match(lines[2], /^\[worker_1\] queued \d+s 0$/);
            assert.ok(footer.render(30).every((line: string) => visibleWidth(line) <= 30));

            events.emit(SUBAGENT_JOBS_CHANNEL, { sessionId: "another-session", jobs: [] } satisfies SubagentJobsEvent);
            assert.equal(footer.render(120).length, 3);

            events.emit(SUBAGENT_JOBS_CHANNEL, { sessionId, jobs: [] } satisfies SubagentJobsEvent);
            assert.deepEqual(footer.render(120), ["/work | main | 1.5k | test-model high"]);
        } finally {
            footer.dispose();
        }
    });
});
