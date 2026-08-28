import type { EventBus } from "@earendil-works/pi-coding-agent";

export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

export const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/** Event bus channel the manager publishes job snapshots on; the statusline consumes it. */
export const SUBAGENT_JOBS_CHANNEL = "pi.subagents.jobs";
export const MAX_RECENT_ACTIVITY = 20;

export type SubagentStatus = "queued" | "starting" | "running" | "succeeded" | "failed" | "cancelled" | "timed_out";
export type SubagentPhase = "queued" | "spawning" | "thinking" | "tool" | "exiting";
export type SubagentActivityKind = "turn" | "tool_start" | "tool_end" | "assistant" | "diagnostic";

export interface SubagentActiveTool {
    id: string;
    name: string;
    title: string;
    startedAt: number;
}

export interface SubagentActivity {
    timestamp: number;
    kind: SubagentActivityKind;
    title: string;
    isError?: boolean;
}

export interface SubagentUsage {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
    totalTokens: number;
    cost: number;
    turns: number;
}

export interface SubagentJob {
    id: string;
    title: string;
    prompt: string;
    agent: string;
    model: string;
    cwd: string;
    status: SubagentStatus;
    phase: SubagentPhase;
    startedAt?: number;
    updatedAt: number;
    endedAt?: number;
    activeTools: SubagentActiveTool[];
    recentActivity: SubagentActivity[];
    usage: SubagentUsage;
    outputPreview?: string;
    error?: string;
    fullOutputPath?: string;
}

export interface SubagentJobEvent {
    sessionId: string;
    type: "ready" | "reset" | "upsert" | "remove";
    job?: SubagentJob;
}

export function emptySubagentUsage(): SubagentUsage {
    return { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: 0, turns: 0 };
}

export function isTerminalStatus(status: SubagentStatus): boolean {
    return status === "succeeded" || status === "failed" || status === "cancelled" || status === "timed_out";
}

export function isSubagentActive(job: SubagentJob): boolean {
    return !isTerminalStatus(job.status);
}

/** Inactivity after which an active job is shown as quiet. Display only. */
export const QUIET_MS = 2 * 60_000;
/** Inactivity after which an active job is shown as stalled. Display only; the watchdog is the only automatic stop. */
export const STALLED_MS = 5 * 60_000;

export type SubagentQuietness = "quiet" | "stalled";

/** Milliseconds since the job's last update. */
export function subagentInactivityMs(job: SubagentJob, now = Date.now()): number {
    return Math.max(0, now - job.updatedAt);
}

export function subagentQuietness(job: SubagentJob, now = Date.now()): SubagentQuietness | undefined {
    if (!isSubagentActive(job)) return undefined;
    const inactivity = subagentInactivityMs(job, now);
    if (inactivity >= STALLED_MS) return "stalled";
    if (inactivity >= QUIET_MS) return "quiet";
    return undefined;
}

/** Compact duration label like `45s`, `5m`, or `1h 5m`. */
export function formatSubagentDuration(ms: number): string {
    if (!Number.isFinite(ms) || ms <= 0) return "0s";
    const totalSeconds = Math.floor(ms / 1000);
    if (totalSeconds < 60) return `${totalSeconds}s`;
    const totalMinutes = Math.floor(totalSeconds / 60);
    if (totalMinutes < 60) return `${totalMinutes}m`;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

/** Summary line shared by the statusline segment and the non-TUI dashboard fallback. */
export function summarizeSubagentJobs(jobs: SubagentJob[], now = Date.now()): string {
    const active = jobs.filter(isSubagentActive);
    if (active.length === 0) {
        return jobs.length > 0 ? `No active subagents. ${jobs.length} finished job(s) tracked.` : "No subagent jobs.";
    }
    const running = active.filter((job) => job.status === "running").length;
    let line = `subagents: ${running} running, ${active.length - running} queued`;
    const oldestQuiet = Math.max(0, ...active.map((job) => subagentInactivityMs(job, now)));
    if (oldestQuiet >= QUIET_MS) line += `, oldest idle ${formatSubagentDuration(oldestQuiet)}`;
    return line;
}

function parseJobEvent(value: unknown): SubagentJobEvent | undefined {
    if (!isRecord(value) || typeof value.sessionId !== "string") return undefined;
    const type = value.type;
    if (type === "ready" || type === "reset") return { sessionId: value.sessionId, type };
    if ((type !== "upsert" && type !== "remove") || !isRecord(value.job) || typeof value.job.id !== "string")
        return undefined;
    return { sessionId: value.sessionId, type, job: value.job as unknown as SubagentJob };
}

/**
 * Consumer-side view of the jobs channel for extensions that do not own the manager.
 * `ready` and `reset` clear the session; `upsert` and `remove` maintain snapshots.
 */
export class SubagentJobTracker {
    private readonly jobs = new Map<string, SubagentJob>();
    private readonly unsubscribe: () => void;

    constructor(
        events: EventBus,
        private readonly sessionId: () => string,
        onChange: () => void,
    ) {
        this.unsubscribe = events.on(SUBAGENT_JOBS_CHANNEL, (payload) => {
            const event = parseJobEvent(payload);
            if (!event || event.sessionId !== this.sessionId()) return;
            if (event.type === "upsert" && event.job) this.jobs.set(event.job.id, event.job);
            else if (event.type === "remove" && event.job) this.jobs.delete(event.job.id);
            else if (event.type === "ready" || event.type === "reset") this.jobs.clear();
            onChange();
        });
    }

    list(): SubagentJob[] {
        return [...this.jobs.values()];
    }

    dispose(): void {
        this.unsubscribe();
        this.jobs.clear();
    }
}
