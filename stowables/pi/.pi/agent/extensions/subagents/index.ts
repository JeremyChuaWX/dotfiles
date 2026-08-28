import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { registerSubagentDashboard } from "./dashboard.ts";
import { SUBAGENT_JOBS_CHANNEL, type SubagentJobEvent } from "./jobs.ts";
import { SubagentManager } from "./manager.ts";
import { registerSubagentTools } from "./tools.ts";

export default function subagentsExtension(pi: ExtensionAPI): void {
    let sessionId = "unbound";
    const emit = (event: Omit<SubagentJobEvent, "sessionId">) =>
        pi.events.emit(SUBAGENT_JOBS_CHANNEL, { sessionId, ...event });

    // followUp queues behind the current turn and triggerTurn starts one when idle, so the
    // manager never needs to know whether the agent is busy.
    const manager = new SubagentManager((result) => {
        const pathNote = result.fullOutputPath ? `\n\nFull output: ${result.fullOutputPath}` : "";
        pi.sendMessage(
            {
                customType: "subagent-result",
                content: `Background subagent ${result.title} (${result.id}) ${result.status}:\n\n${result.text}${pathNote}`,
                display: true,
                details: { id: result.id, title: result.title, status: result.status },
            },
            { deliverAs: "followUp", triggerTurn: true },
        );
    });
    manager.subscribe((job, type) => emit({ type, job }));

    registerSubagentTools(pi, manager);
    registerSubagentDashboard(pi, manager);

    pi.on("session_start", (_event, ctx) => {
        manager.startSession();
        sessionId = ctx.sessionManager.getSessionId();
        emit({ type: "ready" });
    });
    pi.on("session_shutdown", async () => {
        const closing = sessionId;
        await manager.shutdown();
        pi.events.emit(SUBAGENT_JOBS_CHANNEL, { sessionId: closing, type: "reset" });
    });
}
