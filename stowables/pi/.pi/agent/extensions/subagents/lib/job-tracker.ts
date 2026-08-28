import type { EventBus } from "@earendil-works/pi-coding-agent";
import {
    BACKGROUND_SUBAGENT_CHANNEL,
    parseBackgroundSubagentEvent,
    type BackgroundSubagentJobV1,
} from "../runtime/background-protocol.ts";
import { isTerminalSubagentStatus } from "../runtime/protocol.ts";

/**
 * Inactivity after which an active job is shown as "quiet". Display-only:
 * the runtime never acts on these thresholds on its own.
 */
export const QUIET_MS = 2 * 60_000;
/**
 * Inactivity after which an active job is shown as "stalled". Display-only:
 * jobs are never auto-cancelled; only the user can cancel them.
 */
export const STALLED_MS = 5 * 60_000;

export type SubagentQuietness = "quiet" | "stalled";

export function isSubagentActive(job: BackgroundSubagentJobV1): boolean {
    return !isTerminalSubagentStatus(job.run.status);
}

/** Milliseconds since the job's last protocol update. */
export function subagentInactivityMs(job: BackgroundSubagentJobV1, now: number = Date.now()): number {
    return Math.max(0, now - job.run.updatedAt);
}

/** "quiet"/"stalled" classification for active jobs; undefined when fresh or terminal. */
export function subagentQuietness(
    job: BackgroundSubagentJobV1,
    now: number = Date.now(),
): SubagentQuietness | undefined {
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

export interface BackgroundJobTrackerOptions {
    events: EventBus;
    /** Called after any state-changing event from the background event channel. */
    onChange?: () => void;
}

/**
 * Consumer-side view of the `pui.subagent.background` event channel. Jobs are keyed
 * by `sessionId:jobId` so several sessions can coexist; `list(sessionId)` returns
 * what the current owning manager has reported for a session.
 *
 * Route/reset semantics:
 * - `ready` (a manager bound for that session) and `reset` (its manager shut down)
 *   both clear every job reported for the session before any subsequent upserts;
 * - `upsert` refreshes the job snapshot, `remove` drops it.
 */
export class BackgroundJobTracker {
    private readonly jobs = new Map<string, { sessionId: string; job: BackgroundSubagentJobV1 }>();
    private readonly unsubscribe: () => void;

    constructor(private readonly options: BackgroundJobTrackerOptions) {
        this.unsubscribe = options.events.on(BACKGROUND_SUBAGENT_CHANNEL, (payload) => this.handle(payload));
    }

    private handle(payload: unknown): void {
        const event = parseBackgroundSubagentEvent(payload);
        if (!event) return;
        const key = event.job ? `${event.sessionId}:${event.job.id}` : undefined;
        switch (event.type) {
            case "ready":
            case "reset":
                this.clearSession(event.sessionId);
                break;
            case "upsert":
                if (event.job && key) this.jobs.set(key, { sessionId: event.sessionId, job: event.job });
                break;
            case "remove":
                if (key) this.jobs.delete(key);
                break;
        }
        this.options.onChange?.();
    }

    private clearSession(sessionId: string): void {
        for (const key of [...this.jobs.keys()]) {
            if (key.startsWith(`${sessionId}:`)) this.jobs.delete(key);
        }
    }

    /** Jobs reported for a session, in upsert order. */
    list(sessionId: string): BackgroundSubagentJobV1[] {
        return [...this.jobs.values()].filter((entry) => entry.sessionId === sessionId).map((entry) => entry.job);
    }

    dispose(): void {
        this.unsubscribe();
        this.jobs.clear();
    }
}
