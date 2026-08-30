import type { EventBus, Theme } from "@earendil-works/pi-coding-agent";
import { truncateToWidth } from "@earendil-works/pi-tui";
import { SUBAGENT_JOBS_CHANNEL, type Job, type SubagentJobsEvent } from "../subagents/protocol.ts";

function parseJobsEvent(value: unknown): SubagentJobsEvent | undefined {
    if (!value || typeof value !== "object") return undefined;
    const event = value as Partial<SubagentJobsEvent>;
    if (typeof event.sessionId !== "string" || !Array.isArray(event.jobs)) return undefined;
    return event as SubagentJobsEvent;
}

function formatJob(job: Job, now: number): string {
    const elapsed = Math.round((now - (job.startedAt ?? job.createdAt)) / 1000);
    return `[${job.id}] ${job.state} ${elapsed}s`;
}

export interface SubagentStatusline {
    dispose(): void;
    render(width: number, theme: Theme): string[];
}

/** Subscribes one footer to active-job snapshots for its parent session. */
export function createSubagentStatusline(
    events: EventBus,
    sessionId: string,
    requestRender: () => void,
): SubagentStatusline {
    let jobs: Job[] = [];
    const unsubscribe = events.on(SUBAGENT_JOBS_CHANNEL, (value) => {
        const event = parseJobsEvent(value);
        if (!event || event.sessionId !== sessionId) return;
        jobs = event.jobs.filter((job) => job.state === "queued" || job.state === "running");
        requestRender();
    });
    const timer = setInterval(() => {
        if (jobs.length > 0) requestRender();
    }, 1_000);
    timer.unref?.();

    return {
        dispose() {
            unsubscribe();
            clearInterval(timer);
        },
        render(width, theme) {
            const now = Date.now();
            const ellipsis = theme.fg("dim", "...");
            return jobs.map((job) => truncateToWidth(theme.fg("dim", formatJob(job, now)), width, ellipsis));
        },
    };
}
