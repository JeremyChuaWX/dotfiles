import assert from "node:assert/strict";
import { it } from "node:test";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { visibleWidth } from "@earendil-works/pi-tui";
import statusline from "./index.ts";

type Handler = (...args: any[]) => any;

it("registers only a single-line footer", async () => {
    const handlers = new Map<string, Handler>();
    let factory: Handler | undefined;
    statusline({
        on(event: string, handler: Handler) { handlers.set(event, handler); },
        getThinkingLevel: () => "high",
    } as unknown as ExtensionAPI);
    await handlers.get("session_start")!({}, {
        sessionManager: { getCwd: () => "/work" },
        getContextUsage: () => ({ tokens: 1500 }),
        model: { id: "test-model", reasoning: true },
        ui: { setFooter(value: Handler) { factory = value; } },
    });
    assert.ok(factory);
    let disposed = false;
    const footer = factory(
        { requestRender() {} },
        { fg: (_: string, text: string) => text },
        { getGitBranch: () => "main", onBranchChange: () => () => { disposed = true; } },
    );
    try {
        assert.deepEqual(footer.render(120), ["/work | main | 1.5k | test-model high"]);
        assert.ok(footer.render(30).every((line: string) => visibleWidth(line) <= 30));
    } finally {
        footer.dispose();
    }
    assert.equal(disposed, true);
});
