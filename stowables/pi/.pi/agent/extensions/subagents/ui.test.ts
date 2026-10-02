import assert from "node:assert/strict";
import { it } from "node:test";
import { createEventBus, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { visibleWidth } from "@earendil-works/pi-tui";
import subagents from "./index.ts";
import { SUBAGENT_JOBS_CHANNEL, type Job } from "./protocol.ts";

type Handler = (...args: any[]) => any;

it("registers the subagent widget independently of statusline", async () => {
    const handlers = new Map<string, Handler>();
    const events = createEventBus();
    let factory: Handler | undefined;
    const pi = {
        on(event: string, handler: Handler) { handlers.set(event, handler); },
        registerTool() {},
        registerMessageRenderer() {},
        events,
    } as unknown as ExtensionAPI;
    subagents(pi, { createRunner: () => async () => { throw new Error("unused"); } });
    const sessionId = "subagent-ui-test";
    const ctx = {
        mode: "tui",
        sessionManager: { getSessionId: () => sessionId },
        modelRegistry: { find: () => undefined },
        ui: {
            setWidget(key: string, value: Handler, options: { placement: string }) {
                assert.equal(key, "subagents");
                assert.equal(options.placement, "aboveEditor");
                factory = value;
            },
        },
    };
    await handlers.get("session_start")!({}, ctx);
    assert.ok(factory);
    let renders = 0;
    const widget = factory({ requestRender: () => renders++ }, { fg: (_: string, text: string) => text });
    try {
        assert.deepEqual(widget.render(120), []);
        const now = Date.now();
        const jobs: Job[] = [
            { id: "explorer_1", profile: "explorer", task: "Inspect", cwd: "/work", state: "running", createdAt: now - 5000, startedAt: now - 4000, usage: { input: 3000, output: 2000, totalTokens: 5000, cost: 0 } },
            { id: "worker_1", profile: "worker", task: "Implement", cwd: "/work", state: "queued", createdAt: now - 2000 },
        ];
        events.emit(SUBAGENT_JOBS_CHANNEL, { sessionId, jobs });
        assert.equal(renders, 1);
        const lines = widget.render(120);
        assert.equal(lines.length, 2);
        assert.match(lines[0], /^\[explorer_1\] running \d+s 5\.0k$/);
        assert.match(lines[1], /^\[worker_1\] queued \d+s 0$/);
        assert.ok(widget.render(20).every((line: string) => visibleWidth(line) <= 20));
        events.emit(SUBAGENT_JOBS_CHANNEL, { sessionId: "other", jobs: [] });
        assert.equal(widget.render(120).length, 2);
        events.emit(SUBAGENT_JOBS_CHANNEL, { sessionId, jobs: [] });
        assert.deepEqual(widget.render(120), []);
    } finally {
        widget.dispose();
        const before = renders;
        events.emit(SUBAGENT_JOBS_CHANNEL, { sessionId, jobs: [] });
        assert.equal(renders, before);
        await handlers.get("session_shutdown")!({}, ctx);
    }
});
