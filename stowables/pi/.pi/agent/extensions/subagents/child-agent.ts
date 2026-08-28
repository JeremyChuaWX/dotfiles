import { spawn, type ChildProcessByStdio } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import type { Readable } from "node:stream";
import type { AssistantMessage } from "@earendil-works/pi-ai";
import { JsonLineParser } from "./json-events.ts";
import { createGracefulTermination, killProcessTree } from "./process.ts";
import { appendBoundedUtf8, truncateUtf8 } from "../lib/retained-output.ts";
import { emptySubagentUsage, errorMessage, isRecord, type SubagentActiveTool, type SubagentUsage } from "./jobs.ts";

const THROTTLE_MS = 75;
const KILL_GRACE_MS = 2_000;
const STALL_CHECK_INTERVAL_MS = 5_000;
const STDERR_CAP_BYTES = 16 * 1024;
const DIAGNOSTIC_CAP_BYTES = 8 * 1024;
const OUTPUT_PREVIEW_BYTES = 4 * 1024;
const EVENT_TITLE_BYTES = 512;
const ASSISTANT_STOP_REASONS = new Set(["stop", "length", "toolUse", "error", "aborted"]);
const THINKING_SUFFIX = /:(off|minimal|low|medium|high|xhigh|max)$/;

export type ChildAgentPhase = "thinking" | "tool" | "exiting";

/** One notable moment in a child agent's lifetime. */
export type ChildAgentEvent =
    | { kind: "turn" | "tool_start"; timestamp: number; title: string }
    | { kind: "tool_end" | "assistant" | "diagnostic"; timestamp: number; title: string; isError: boolean };

/** The rolling view of the child, delivered with every event flush. */
export interface ChildAgentState {
    phase: ChildAgentPhase;
    activeTools: SubagentActiveTool[];
    model: string;
    usage: SubagentUsage;
    /** Last non-empty assistant text, preview-bounded; empty until the child produces text. */
    outputPreview: string;
    updatedAt: number;
}

export type ChildAgentTerminalStatus = "succeeded" | "failed" | "cancelled" | "timed_out";

export interface ChildAgentResult {
    status: ChildAgentTerminalStatus;
    error?: string;
    /** Text of the final assistant message; empty when the child never finalized one. */
    output: string;
    model: string;
    usage: SubagentUsage;
    outputPreview: string;
}

export interface ChildAgentLimits {
    /** Whole-job wall clock. 0 disables. */
    timeoutMs: number;
    /** Abort when the child produces no events while no tool is active. 0 disables. */
    stallTimeoutMs: number;
    /** Abort when the child produces no events while a tool call is active. 0 disables. */
    toolStallTimeoutMs: number;
}

export interface RunChildAgentOptions extends ChildAgentLimits {
    command: string;
    args: string[];
    cwd: string;
    /** Initial model label, canonicalized as the child reports its provider and model. */
    model: string;
    signal: AbortSignal;
    /** Receives batched events with the folded state, throttled except at tool boundaries and termination. */
    onFlush: (events: ChildAgentEvent[], state: ChildAgentState) => void;
}

/** Resolve how to launch a child Pi: reuse this process's CLI when the host is Pi itself, else `pi` on PATH. */
export function getPiInvocation(args: string[]): { command: string; args: string[] } {
    const currentScript = process.argv[1];
    let resolvedScript: string | undefined;
    if (currentScript && !currentScript.startsWith("/$bunfs/root/") && fs.existsSync(currentScript)) {
        try {
            resolvedScript = fs.realpathSync(currentScript);
        } catch {
            resolvedScript = currentScript;
        }
    }
    const packageSegment = `${path.sep}@earendil-works${path.sep}pi-coding-agent${path.sep}`;
    const isPiCli =
        resolvedScript?.includes(packageSegment) === true && path.basename(resolvedScript).toLowerCase() === "cli.js";
    if (isPiCli && currentScript) return { command: process.execPath, args: [currentScript, ...args] };
    const isPiExecutable = /^pi(\.exe)?$/.test(path.basename(process.execPath).toLowerCase());
    return isPiExecutable ? { command: process.execPath, args } : { command: "pi", args };
}

function nonNegativeNumber(value: unknown): number {
    return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

function usageField(usage: unknown, field: string): number {
    return isRecord(usage) ? nonNegativeNumber(usage[field]) : 0;
}

function usageCost(usage: unknown): number {
    if (!isRecord(usage)) return 0;
    const cost = usage.cost;
    if (typeof cost === "number") return nonNegativeNumber(cost);
    if (isRecord(cost)) return nonNegativeNumber(cost.total);
    return 0;
}

function addUsage(current: SubagentUsage, assistantUsage: unknown): SubagentUsage {
    const input = usageField(assistantUsage, "input");
    const output = usageField(assistantUsage, "output");
    const cacheRead = usageField(assistantUsage, "cacheRead");
    const cacheWrite = usageField(assistantUsage, "cacheWrite");
    const reportedTotal = usageField(assistantUsage, "totalTokens");
    return {
        input: current.input + input,
        output: current.output + output,
        cacheRead: current.cacheRead + cacheRead,
        cacheWrite: current.cacheWrite + cacheWrite,
        totalTokens: current.totalTokens + (reportedTotal || input + output + cacheRead + cacheWrite),
        cost: current.cost + usageCost(assistantUsage),
        turns: current.turns + 1,
    };
}

/** Canonical `provider/model[:thinking]` label from a child assistant message. */
function modelLabel(current: string, provider?: string, model?: string): string {
    const childProvider = provider?.trim();
    const childModel = model?.trim();
    if (!childProvider || !childModel) return current;
    const reportedSuffix = childModel.match(THINKING_SUFFIX)?.[0] ?? "";
    const reportedBase = reportedSuffix ? childModel.slice(0, -reportedSuffix.length) : childModel;
    const canonicalBase = reportedBase.startsWith(`${childProvider}/`) ? reportedBase : `${childProvider}/${reportedBase}`;
    const currentSuffix = current.match(THINKING_SUFFIX)?.[0] ?? "";
    const currentBase = currentSuffix ? current.slice(0, -currentSuffix.length) : current;
    return `${canonicalBase}${currentBase === canonicalBase ? currentSuffix || reportedSuffix : reportedSuffix}`;
}

function numberOrUndefined(value: unknown): number | undefined {
    return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function stringOrUndefined(value: unknown): string | undefined {
    return typeof value === "string" ? value : undefined;
}

function assistantText(message: unknown): string {
    if (!isRecord(message) || !Array.isArray(message.content)) return "";
    return message.content
        .filter((part): part is Record<string, unknown> => isRecord(part) && part.type === "text")
        .map((part) => (typeof part.text === "string" ? part.text : ""))
        .filter(Boolean)
        .join("\n\n")
        .trim();
}

function shorten(value: unknown, fallback = "..."): string {
    const text = typeof value === "string" ? value : fallback;
    return truncateUtf8(text.replace(/\s+/g, " ").trim() || fallback, 240).content;
}

function compactToolTitle(toolName: string, input: unknown): string {
    const args = isRecord(input) ? input : {};
    let title: string;
    if (toolName === "read") title = `read ${shorten(args.path ?? args.file_path)}`;
    else if (toolName === "grep") title = `grep ${shorten(args.pattern)} in ${shorten(args.path, ".")}`;
    else if (toolName === "find") title = `find ${shorten(args.pattern, "*")} in ${shorten(args.path, ".")}`;
    else if (toolName === "ls") title = `ls ${shorten(args.path, ".")}`;
    else if (toolName === "bash") title = `$ ${shorten(args.command)}`;
    else if (toolName === "edit") title = `edit ${shorten(args.path ?? args.file_path)}`;
    else if (toolName === "write") title = `write ${shorten(args.path ?? args.file_path)}`;
    else title = toolName;
    return truncateUtf8(title, EVENT_TITLE_BYTES).content;
}

function messageFingerprint(message: Record<string, unknown>): string {
    const usage = isRecord(message.usage) ? message.usage : {};
    return [message.timestamp, message.provider, message.model, message.stopReason, usage.input, usage.output]
        .map((value) => String(value ?? ""))
        .join(":");
}

function withDiagnostic(prefix: string, candidate: string): string {
    const diagnostic = truncateUtf8(candidate.trim(), DIAGNOSTIC_CAP_BYTES).content;
    return diagnostic ? `${prefix}\n\n${diagnostic}` : prefix;
}

type JsonEvent = { type: string; [key: string]: unknown };
type Termination = { status: "cancelled" | "timed_out"; message: string };

/**
 * Run one child Pi process in JSON mode and always resolve to a structured terminal result.
 * Owns the wall-clock cap, the progress watchdog, and SIGTERM/SIGKILL escalation.
 */
export function runChildAgent(options: RunChildAgentOptions): Promise<ChildAgentResult> {
    const activeTools = new Map<string, SubagentActiveTool>();
    const state: ChildAgentState = {
        phase: "thinking",
        activeTools: [],
        model: options.model,
        usage: emptySubagentUsage(),
        outputPreview: "",
        updatedAt: Date.now(),
    };
    let child: ChildProcessByStdio<null, Readable, Readable> | undefined;
    let stderr = "";
    let diagnostics = "";
    let finalMessage: AssistantMessage | undefined;
    let finalOutput = "";
    let exitCode: number | null = null;
    let spawnError: Error | undefined;
    let termination: Termination | undefined;
    let settled = false;
    let closed = false;
    let updateTimer: NodeJS.Timeout | undefined;
    let timeoutTimer: NodeJS.Timeout | undefined;
    let stallTimer: NodeJS.Timeout | undefined;
    let lastFlush = Number.NEGATIVE_INFINITY;
    let lastActivityAt = Date.now();
    let pendingEvents: ChildAgentEvent[] = [];
    const finalizedMessages = new Set<string>();

    const flush = (force = false) => {
        if (settled && !force) return;
        const wait = THROTTLE_MS - (Date.now() - lastFlush);
        if (!force && wait > 0) {
            updateTimer ??= setTimeout(() => {
                updateTimer = undefined;
                flush(true);
            }, wait);
            return;
        }
        if (updateTimer) clearTimeout(updateTimer);
        updateTimer = undefined;
        lastFlush = Date.now();
        const events = pendingEvents;
        pendingEvents = [];
        try {
            options.onFlush(events, { ...state, activeTools: [...activeTools.values()] });
        } catch {
            // Presentation failures must never strand the child process.
        }
    };

    const touch = (timestamp: number) => {
        state.updatedAt = timestamp;
        lastActivityAt = Date.now();
    };

    const pushEvent = (event: ChildAgentEvent, force = false) => {
        pendingEvents.push({ ...event, title: truncateUtf8(event.title, EVENT_TITLE_BYTES).content });
        flush(force);
    };

    const addDiagnostic = (message: string) => {
        const bounded = truncateUtf8(message, EVENT_TITLE_BYTES).content;
        diagnostics = appendBoundedUtf8(diagnostics, `${diagnostics ? "\n" : ""}${bounded}`, DIAGNOSTIC_CAP_BYTES);
        const timestamp = Date.now();
        touch(timestamp);
        pushEvent({ kind: "diagnostic", timestamp, title: bounded, isError: true });
    };

    const phaseForTools = (): "tool" | "thinking" => (activeTools.size > 0 ? "tool" : "thinking");

    type Handler = (event: JsonEvent, timestamp: number) => void;
    const turnHandler =
        (label: string): Handler =>
        (event, timestamp) => {
            const index = numberOrUndefined(event.turnIndex);
            state.phase = phaseForTools();
            touch(timestamp);
            pushEvent({ kind: "turn", timestamp, title: index === undefined ? `Turn ${label}` : `Turn ${index + 1} ${label}` });
        };
    const exiting: Handler = (_event, timestamp) => {
        state.phase = "exiting";
        touch(timestamp);
        flush();
    };
    const handlers: Record<string, Handler> = {
        turn_start: turnHandler("started"),
        turn_end: turnHandler("completed"),
        tool_execution_start: (event, timestamp) => {
            const id = stringOrUndefined(event.toolCallId);
            const name = stringOrUndefined(event.toolName);
            if (!id || !name) return addDiagnostic("Child emitted an invalid tool_execution_start event.");
            const title = compactToolTitle(name, event.args);
            activeTools.set(id, { id, name, title, startedAt: timestamp });
            state.phase = "tool";
            touch(timestamp);
            pushEvent({ kind: "tool_start", timestamp, title }, true);
        },
        tool_execution_update: (event, timestamp) => {
            const id = stringOrUndefined(event.toolCallId);
            const active = id ? activeTools.get(id) : undefined;
            if (!id || !active) return;
            activeTools.set(id, { ...active, title: compactToolTitle(active.name, event.args) });
            state.phase = "tool";
            touch(timestamp);
            flush();
        },
        tool_execution_end: (event, timestamp) => {
            const id = stringOrUndefined(event.toolCallId);
            const active = id ? activeTools.get(id) : undefined;
            const title = active?.title ?? compactToolTitle(stringOrUndefined(event.toolName) ?? "tool", undefined);
            if (id) activeTools.delete(id);
            state.phase = phaseForTools();
            touch(timestamp);
            pushEvent({ kind: "tool_end", timestamp, title, isError: event.isError === true }, true);
        },
        message_update: (event, timestamp) => {
            if (!isRecord(event.message) || event.message.role !== "assistant") return;
            const preview = assistantText(event.message);
            if (preview) state.outputPreview = truncateUtf8(preview, OUTPUT_PREVIEW_BYTES).content;
            state.model = modelLabel(state.model, stringOrUndefined(event.message.provider), stringOrUndefined(event.message.model));
            state.phase = phaseForTools();
            touch(timestamp);
            flush();
        },
        message_end: (event, timestamp) => {
            if (!isRecord(event.message) || event.message.role !== "assistant") return;
            const stopReason = stringOrUndefined(event.message.stopReason);
            if (!Array.isArray(event.message.content) || !stopReason || !ASSISTANT_STOP_REASONS.has(stopReason)) {
                return addDiagnostic("Child emitted an invalid finalized assistant message.");
            }
            finalMessage = event.message as unknown as AssistantMessage;
            finalOutput = assistantText(finalMessage);
            const fingerprint = messageFingerprint(event.message);
            if (!finalizedMessages.has(fingerprint)) {
                finalizedMessages.add(fingerprint);
                state.usage = addUsage(state.usage, event.message.usage);
            }
            state.model = modelLabel(state.model, finalMessage.provider, finalMessage.model);
            const preview = truncateUtf8(finalOutput, OUTPUT_PREVIEW_BYTES).content;
            if (preview) state.outputPreview = preview;
            state.phase = phaseForTools();
            touch(timestamp);
            pushEvent({
                kind: "assistant",
                timestamp,
                title: preview
                    ? `Assistant: ${shorten(preview, "response")}`
                    : stopReason === "toolUse"
                      ? "Assistant requested tools"
                      : "Assistant response completed",
                isError: stopReason === "error" || stopReason === "aborted",
            });
        },
        agent_end: exiting,
        agent_settled: exiting,
    };

    const parser = new JsonLineParser({
        onValue: (value) => {
            if (settled || !isRecord(value) || typeof value.type !== "string") return;
            handlers[value.type]?.(value as JsonEvent, numberOrUndefined(value.timestamp) ?? Date.now());
        },
        onDiagnostic: addDiagnostic,
    });

    const terminator = createGracefulTermination((signal) => {
        if (child && !closed) killProcessTree(child, signal);
    }, KILL_GRACE_MS);

    const terminate = (next: Termination) => {
        if (settled || closed || termination) return;
        termination = next;
        const timestamp = Date.now();
        state.phase = "exiting";
        touch(timestamp);
        pushEvent({ kind: "diagnostic", timestamp, title: next.message, isError: true }, true);
        terminator.begin();
    };
    const onAbort = () => terminate({ status: "cancelled", message: "Cancellation requested" });

    const checkStall = () => {
        const limit = activeTools.size > 0 ? options.toolStallTimeoutMs : options.stallTimeoutMs;
        if (limit <= 0 || Date.now() - lastActivityAt < limit) return;
        const scope = activeTools.size > 0 ? "tool output" : "model output";
        const minutes = Math.max(1, Math.round(limit / 60_000));
        terminate({ status: "timed_out", message: `No ${scope} for ${minutes} minutes; stopped by the progress watchdog.` });
    };

    const finalize = (): ChildAgentResult => {
        if (timeoutTimer) clearTimeout(timeoutTimer);
        if (stallTimer) clearInterval(stallTimer);
        terminator.dispose();
        options.signal.removeEventListener("abort", onAbort);
        flush(true);
        if (updateTimer) clearTimeout(updateTimer);
        settled = true;
        if (child) {
            child.stdout.removeAllListeners();
            child.stderr.removeAllListeners();
            child.removeAllListeners();
        }

        const stderrOrDiagnostic = stderr.trim() || diagnostics.trim();
        const outputOrDiagnostic = finalOutput.trim() || stderrOrDiagnostic;
        const stopReason = finalMessage?.stopReason;
        let status: ChildAgentTerminalStatus;
        let error: string | undefined;
        if (termination) {
            status = termination.status;
            error = withDiagnostic(`${termination.message}.`.replace(/\.\.$/, "."), outputOrDiagnostic);
        } else if (spawnError) {
            status = "failed";
            error = withDiagnostic(`Unable to start child Pi: ${spawnError.message}`, stderrOrDiagnostic);
        } else if (exitCode !== 0) {
            status = "failed";
            error = withDiagnostic(`Subagent failed with exit code ${exitCode ?? "unknown"}.`, outputOrDiagnostic);
        } else if (!finalMessage || stopReason === "toolUse") {
            status = "failed";
            error = withDiagnostic("Subagent exited without a final assistant response.", stderrOrDiagnostic);
        } else if (stopReason === "aborted" || stopReason === "error") {
            status = "failed";
            const fallback = stopReason === "aborted" ? "Child assistant stopped unexpectedly." : "Subagent model request failed.";
            error = withDiagnostic(finalMessage.errorMessage || fallback, outputOrDiagnostic);
        } else {
            status = "succeeded";
        }
        return {
            status,
            ...(error ? { error } : {}),
            output: finalOutput,
            model: finalMessage ? modelLabel(state.model, finalMessage.provider, finalMessage.model) : state.model,
            usage: state.usage,
            outputPreview: truncateUtf8(finalOutput, OUTPUT_PREVIEW_BYTES).content,
        };
    };

    if (options.signal.aborted) {
        termination = { status: "cancelled", message: "Cancellation requested" };
        return Promise.resolve(finalize());
    }
    try {
        child = spawn(options.command, options.args, {
            cwd: options.cwd,
            shell: false,
            detached: process.platform !== "win32",
            stdio: ["ignore", "pipe", "pipe"],
            windowsHide: true,
        });
    } catch (error) {
        spawnError = error instanceof Error ? error : new Error(String(error));
        return Promise.resolve(finalize());
    }
    const running = child;
    touch(Date.now());
    flush(true);

    return new Promise<ChildAgentResult>((resolve) => {
        running.stdout.on("data", (chunk: Buffer | string) => {
            try {
                parser.write(chunk);
            } catch (error) {
                addDiagnostic(`Unable to process child output: ${errorMessage(error)}`);
            }
        });
        running.stdout.on("error", (error) => addDiagnostic(`Child stdout failed: ${error.message}`));
        running.stderr.on("data", (chunk: Buffer | string) => {
            stderr = appendBoundedUtf8(stderr, chunk.toString(), STDERR_CAP_BYTES);
        });
        running.stderr.on("error", (error) => {
            stderr = appendBoundedUtf8(stderr, `\nChild stderr failed: ${error.message}`, STDERR_CAP_BYTES);
        });
        running.on("error", (error) => {
            spawnError = error;
        });
        running.on("close", (code) => {
            // The direct Pi process can exit after SIGTERM while a tool subprocess in its
            // process group ignores it. Escalate the group before clearing the grace timer.
            terminator.escalateOnClose();
            closed = true;
            exitCode = code;
            parser.end();
            resolve(finalize());
        });

        options.signal.addEventListener("abort", onAbort, { once: true });
        if (options.timeoutMs > 0) {
            const minutes = Math.max(1, Math.round(options.timeoutMs / 60_000));
            timeoutTimer = setTimeout(
                () => terminate({ status: "timed_out", message: `Reached the ${minutes} minute job limit` }),
                options.timeoutMs,
            );
        }
        if (options.stallTimeoutMs > 0 || options.toolStallTimeoutMs > 0) {
            stallTimer = setInterval(checkStall, STALL_CHECK_INTERVAL_MS);
            stallTimer.unref();
        }
        if (options.signal.aborted) onAbort();
    });
}
