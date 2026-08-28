import {
    type ChildAgentEvent,
    type ChildAgentState,
    runChildAgent,
    type SpawnChildAgent,
} from "./child-agent.ts";
import { truncateUtf8 } from "../lib/retained-output.ts";
import {
    appendSubagentActivity,
    createTerminalSubagentDetails,
    isSubagentDetailsV1,
    type SubagentDetailsV1,
    updateSubagentDetails,
} from "./protocol.ts";

const ACTIVITY_TITLE_BYTES = 512;
const STALL_CHECK_INTERVAL_MS = 5_000;
const TOOL_STALL_MULTIPLIER = 3;

export interface RunSubagentOptions {
    details: SubagentDetailsV1;
    command: string;
    args: string[];
    cwd: string;
    timeoutMs: number;
    /** Abort when the child shows no activity between turns for this long. 0 disables. */
    stallTimeoutMs?: number;
    /** Abort when an active tool call shows no activity for this long. Defaults to 3x stallTimeoutMs. */
    toolStallTimeoutMs?: number;
    signal?: AbortSignal;
    onSnapshot?: (details: SubagentDetailsV1) => void;
    throttleMs?: number;
    killGraceMs?: number;
    now?: () => number;
    spawn?: SpawnChildAgent;
}

export interface SubagentRunResult {
    details: SubagentDetailsV1;
    output: string;
    stderr: string;
    exitCode: number | null;
    signal: NodeJS.Signals | null;
}

/**
 * Run one child Pi process and always return a structured terminal snapshot: the protocol adapter
 * folding the shared child-agent runtime's event stream into `SubagentDetailsV1`. The caller
 * decides whether a failed terminal result should be thrown as a tool error.
 */
export async function runSubagent(options: RunSubagentOptions): Promise<SubagentRunResult> {
    if (!isSubagentDetailsV1(options.details)) throw new Error("runSubagent requires valid protocol v1 details");

    const now = options.now ?? Date.now;
    let details = structuredClone(options.details);

    // Progress watchdog: unlike timeoutMs (whole-job wall clock), this only fires when the child
    // produces no events at all for a while, so long-lived tool calls and slow turns are safe.
    const stallTimeoutMs = Math.max(0, options.stallTimeoutMs ?? 0);
    const toolStallTimeoutMs = Math.max(
        0,
        options.toolStallTimeoutMs ?? stallTimeoutMs * TOOL_STALL_MULTIPLIER,
    );
    let lastActivityAt = now();
    let lastPhase: "thinking" | "tool" = "thinking";
    let stallKind: "turn" | "tool" | undefined;
    let stallLimitMs = 0;
    let stallTimer: ReturnType<typeof setInterval> | undefined;
    const stallController = new AbortController();
    const checkStall = () => {
        if (stallKind) return;
        const limit = lastPhase === "tool" ? toolStallTimeoutMs : stallTimeoutMs;
        if (limit <= 0) return;
        const idle = now() - lastActivityAt;
        if (idle < limit) return;
        stallKind = lastPhase === "tool" ? "tool" : "turn";
        stallLimitMs = limit;
        stallController.abort();
    };
    if (stallTimeoutMs > 0 || toolStallTimeoutMs > 0) {
        stallTimer = setInterval(checkStall, STALL_CHECK_INTERVAL_MS);
        stallTimer.unref();
    }
    const signal = options.signal
        ? AbortSignal.any([options.signal, stallController.signal])
        : stallController.signal;

    const publish = () => {
        if (!options.onSnapshot) return;
        try {
            options.onSnapshot(structuredClone(details));
        } catch {
            // Renderer progress must never be able to strand the child process.
        }
    };
    const fold = (events: ChildAgentEvent[], state: ChildAgentState) => {
        lastActivityAt = now();
        lastPhase = state.phase === "tool" ? "tool" : "thinking";
        for (const event of events) {
            if (event.kind === "spawned") {
                details = updateSubagentDetails(
                    details,
                    {
                        status: "running",
                        phase: "thinking",
                        startedAt: details.run.startedAt ?? event.timestamp,
                        activeTools: [],
                    },
                    event.timestamp,
                );
            } else {
                details = appendSubagentActivity(
                    details,
                    {
                        timestamp: event.timestamp,
                        kind: event.kind,
                        title: event.title,
                        ...("isError" in event ? { isError: event.isError } : {}),
                    },
                    event.timestamp,
                );
            }
        }
        details = updateSubagentDetails(
            details,
            {
                phase: state.phase,
                activeTools: state.activeTools,
                model: state.model,
                usage: state.usage,
                ...(state.outputPreview ? { outputPreview: state.outputPreview } : {}),
            },
            state.updatedAt,
        );
        publish();
    };

    const result = await runChildAgent({
        command: options.command,
        args: options.args,
        cwd: options.cwd,
        timeoutMs: options.timeoutMs,
        model: details.run.model,
        usage: details.run.usage,
        signal,
        onFlush: fold,
        throttleMs: options.throttleMs,
        killGraceMs: options.killGraceMs,
        now: options.now,
        spawn: options.spawn,
    });
    if (stallTimer) clearInterval(stallTimer);
    if (stallKind) {
        const minutes = Math.max(1, Math.round(stallLimitMs / 60_000));
        const scope = stallKind === "tool" ? "tool output" : "model output";
        result.status = "timed_out";
        result.error = `No ${scope} for ${minutes} minutes; stopped by the progress watchdog.`;
    }

    const succeeded = result.status === "succeeded";
    const endedAt = now();
    details = appendSubagentActivity(
        details,
        {
            timestamp: endedAt,
            kind: succeeded ? "assistant" : "diagnostic",
            title: truncateUtf8(
                succeeded ? "Subagent completed" : result.error?.split("\n", 1)[0] || "Subagent failed",
                ACTIVITY_TITLE_BYTES,
            ).content,
            isError: !succeeded,
        },
        endedAt,
    );
    details = createTerminalSubagentDetails(
        details,
        {
            status: result.status,
            ...(result.error ? { error: result.error } : {}),
            ...(result.outputPreview ? { outputPreview: result.outputPreview } : {}),
            model: result.model,
        },
        now(),
    );
    publish();

    return { details, output: result.output, stderr: result.stderr, exitCode: result.exitCode, signal: result.signal };
}
