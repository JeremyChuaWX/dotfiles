import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { createBackgroundChannel } from "./lib/background-channel.ts";
import { RetainedOutputStore } from "./lib/retained-output.ts";
import {
    registerSubagentRuntimeBroker,
    SUBAGENT_RUNTIME_SCHEMA,
    SUBAGENT_RUNTIME_VERSION,
    type SubagentRuntimeService,
} from "./interface/broker.ts";
import { registerSubagentCancelTool } from "./interface/cancel.ts";
import { registerSubagentCheckTool } from "./interface/check.ts";
import { registerSubagentDashboard } from "./interface/dashboard.ts";
import { registerSubagentWaitTool } from "./interface/wait.ts";
import { BackgroundSubagentManager, type BackgroundTerminalResult } from "./runtime/background-manager.ts";
import {
    BACKGROUND_SUBAGENT_CHANNEL,
    BACKGROUND_SUBAGENT_CONTROL_CHANNEL,
    BACKGROUND_SUBAGENT_SCHEMA,
    BACKGROUND_SUBAGENT_VERSION,
    type BackgroundSubagentJobV1,
    parseBackgroundSubagentControl,
} from "./runtime/background-protocol.ts";
import { getPiInvocation, PROCESS_CHILD_AGENT_SEMAPHORE } from "./runtime/child-agent.ts";

export default function subagentsExtension(pi: ExtensionAPI): void {
    let shuttingDown = false;
    let sessionId = "unbound";
    const instanceId = crypto.randomUUID();
    let idle = true;
    let background: BackgroundSubagentManager;
    const route = () => ({ sessionId, instanceId });
    const channel = createBackgroundChannel({
        events: pi.events,
        eventChannel: BACKGROUND_SUBAGENT_CHANNEL,
        controlChannel: BACKGROUND_SUBAGENT_CONTROL_CHANNEL,
        parseControl: parseBackgroundSubagentControl,
        controlRoute: (control) => ({ sessionId: control.sessionId, instanceId: control.instanceId }),
        envelope: (type, target, extra) => ({
            schema: BACKGROUND_SUBAGENT_SCHEMA,
            version: BACKGROUND_SUBAGENT_VERSION,
            ...target,
            type,
            ...extra,
        }),
        onControl: (control) => {
            if (!shuttingDown) void background.cancel([control.jobId]).catch(() => {});
        },
    });
    const emit = (job: BackgroundSubagentJobV1, type: "upsert" | "remove" = "upsert") =>
        channel.emit(type, { job }, route());
    const deliver = (result: BackgroundTerminalResult) => {
        if (shuttingDown) return;
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
    };

    background = new BackgroundSubagentManager({
        semaphore: PROCESS_CHILD_AGENT_SEMAPHORE,
        invocation: getPiInvocation,
        now: Date.now,
        emit,
        deliver,
        isIdle: () => idle,
        outputStore: new RetainedOutputStore({ prefix: "pi-subagent-", fileName: "output.md" }),
    });

    const runtime: SubagentRuntimeService = {
        schema: SUBAGENT_RUNTIME_SCHEMA,
        version: SUBAGENT_RUNTIME_VERSION,
        spawn: (request) =>
            background.spawn(
                {
                    profile: request.profile,
                    prompt: request.prompt,
                    cwd: request.cwd,
                    ...(request.name ? { name: request.name } : {}),
                },
                request.parentCwd,
                request.signal,
            ),
        list: () => background.list(),
        check: (id) => background.check(id),
        wait: (ids, signal) => background.wait(ids, signal),
        cancel: (ids) => background.cancel(ids),
    };
    Object.freeze(runtime);

    registerSubagentRuntimeBroker(pi, runtime);
    registerSubagentCheckTool(pi, runtime);
    registerSubagentWaitTool(pi, runtime);
    registerSubagentCancelTool(pi, runtime);
    registerSubagentDashboard(pi, runtime);

    pi.on("session_start", (_event, ctx) => {
        shuttingDown = false;
        background.startSession();
        sessionId = ctx.sessionManager.getSessionId();
        idle = ctx.isIdle();
        channel.bind(route());
        channel.ready();
    });
    pi.on("agent_start", () => {
        idle = false;
    });
    pi.on("agent_settled", () => {
        idle = true;
        background.flushDeferred();
    });
    pi.on("session_shutdown", async () => {
        shuttingDown = true;
        await channel.shutdown(() => background.shutdown());
    });
}
