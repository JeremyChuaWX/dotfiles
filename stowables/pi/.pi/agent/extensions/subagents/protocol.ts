import type { ThinkingLevel } from "@earendil-works/pi-agent-core";

/** Event-bus channel used to publish the active jobs to other extensions. */
export const SUBAGENT_JOBS_CHANNEL = "pi.subagents.jobs";

/** Complete active-job snapshot for one parent session. */
export interface SubagentJobsEvent {
    sessionId: string;
    jobs: Job[];
}

/** The execution settings a profile declares. */
export interface ProfileConfig {
    tools: readonly string[];
    model: string;
    thinkingLevel: ThinkingLevel;
    systemPrompt: string;
    promptMode: "replace" | "append";
    inactivityMs: number;
    hardMs: number;
}

/** Everything a runner needs to execute one job: the profile's settings plus the spawn call. */
export interface JobConfig extends ProfileConfig {
    profile: string;
    task: string;
    cwd: string;
}

export interface JobUsage {
    input: number;
    output: number;
    totalTokens: number;
    cost: number;
}

/** What a runner hands back. `partial` means the last assistant message carried no text and an earlier one was used. */
export interface RunResult {
    text: string;
    partial: boolean;
    usage: JobUsage;
}

export type JobState = "queued" | "running" | "completed" | "failed" | "cancelled" | "timed_out";

export interface Job {
    id: string;
    profile: string;
    task: string;
    cwd: string;
    state: JobState;
    createdAt: number;
    startedAt?: number;
    endedAt?: number;
    result?: RunResult;
    error?: string;
}

/** Terminal job as handed to the delivery callback. */
export interface JobResult {
    job: Job;
    status: Exclude<JobState, "queued" | "running">;
    text: string;
    partial: boolean;
    runtimeMs: number;
    usage?: JobUsage;
    error?: string;
}

/** Executes one job. Must resolve or reject; must stop when `signal` aborts; calls `onActivity` whenever work happens. */
export type Runner = (config: JobConfig, signal: AbortSignal, onActivity: () => void) => Promise<RunResult>;

export type Deliver = (result: JobResult) => void;
