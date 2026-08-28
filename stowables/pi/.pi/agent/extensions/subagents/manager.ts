import { randomUUID } from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { DEFAULT_MAX_BYTES, DEFAULT_MAX_LINES, truncateHead } from "@earendil-works/pi-coding-agent";
import { composeBoundedOutput, RetainedOutputStore, truncateUtf8 } from "../lib/retained-output.ts";
import { AbortableSemaphore, configuredSubagentConcurrency } from "./semaphore.ts";
import { getPiInvocation, runChildAgent } from "./child-agent.ts";
import {
    emptySubagentUsage,
    errorMessage,
    isTerminalStatus,
    MAX_RECENT_ACTIVITY,
    type SubagentActivity,
    type SubagentJob,
    type SubagentStatus,
} from "./jobs.ts";
import { childArgs, type SubagentProfile } from "./profiles/index.ts";

const MAX_JOBS = 64;
const TITLE_BYTES = 160;
const PROMPT_BYTES = 2 * 1024;
const ERROR_BYTES = 8 * 1024;
/** Auto-delivered results are kept small; the full text is retained on disk when it exceeds this. */
const AUTO_RESULT_BYTES = 12 * 1024;
const WAIT_JOB_BYTES = 24 * 1024;
const WAIT_TOTAL_BYTES = 48 * 1024;
const DELIVERY_MAX_LINES = DEFAULT_MAX_LINES - 8;

const processState = globalThis as typeof globalThis & { __piSubagentSemaphore?: AbortableSemaphore };
/** One process-wide child-Pi concurrency limit, shared across extension reloads. */
const semaphore = (processState.__piSubagentSemaphore ??= new AbortableSemaphore(configuredSubagentConcurrency()));

export interface SubagentResult {
    id: string;
    title: string;
    status: SubagentStatus;
    text: string;
    fullOutputPath?: string;
}

export interface SpawnRequest {
    profile: SubagentProfile;
    prompt: string;
    cwd: string;
    name?: string;
    parentCwd: string;
    signal?: AbortSignal;
}

export type JobListener = (job: SubagentJob, type: "upsert" | "remove") => void;

interface Entry {
    job: SubagentJob;
    controller: AbortController;
    settlement: Promise<void>;
    result?: SubagentResult;
    /** Active subagent_wait calls; while non-zero the result is not auto-delivered. */
    waiters: number;
    delivered: boolean;
}

async function resolveWorkingDirectory(input: string, parentCwd: string): Promise<string> {
    let value = input.trim().replace(/^@/, "");
    if (!value) throw new Error("Subagent cwd must not be empty.");
    if (value === "~") value = os.homedir();
    else if (value.startsWith("~/")) value = path.join(os.homedir(), value.slice(2));
    const resolved = path.resolve(parentCwd, value);
    let stats: fs.Stats;
    try {
        stats = await fs.promises.stat(resolved);
    } catch {
        throw new Error(`Subagent cwd does not exist: ${resolved}`);
    }
    if (!stats.isDirectory()) throw new Error(`Subagent cwd is not a directory: ${resolved}`);
    return fs.promises.realpath(resolved);
}

function titleFor(prompt: string, name?: string): string {
    const candidate = name?.trim() || prompt.split(/\r?\n/).find((line) => line.trim())?.trim() || "Subagent";
    return truncateUtf8(candidate.replace(/\s+/g, " "), TITLE_BYTES).content;
}

function boundedResult(result: SubagentResult, maxBytes: number): SubagentResult {
    if (!truncateUtf8(result.text, maxBytes).truncated) return result;
    const text = composeBoundedOutput(
        result.text,
        { maxBytes },
        result.fullOutputPath
            ? { retainedPath: result.fullOutputPath }
            : { nonRetentionReason: "complete output was not retained by the subagent" },
    );
    return { ...result, text };
}

function abortError(message: string): Error {
    return Object.assign(new Error(message), { name: "AbortError" });
}

/** Owns every subagent job for one extension instance: queueing, the child process, results, and delivery. */
export class SubagentManager {
    private readonly entries = new Map<string, Entry>();
    private readonly listeners = new Set<JobListener>();
    private readonly outputStore = new RetainedOutputStore({ prefix: "pi-subagent-", fileName: "output.md" });
    private shuttingDown = false;

    constructor(private readonly deliver: (result: SubagentResult) => void) {}

    subscribe(listener: JobListener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    async spawn(request: SpawnRequest): Promise<SubagentJob> {
        if (this.shuttingDown) throw new Error("Subagent manager is shutting down.");
        if (!request.prompt.trim()) throw new Error("Subagent prompt must not be empty.");
        const cwd = await resolveWorkingDirectory(request.cwd, request.parentCwd);
        if (request.signal?.aborted) throw abortError("Subagent spawn was cancelled.");
        this.prune(MAX_JOBS - 1);
        if (this.entries.size >= MAX_JOBS) throw new Error(`Cannot track more than ${MAX_JOBS} subagents.`);

        const now = Date.now();
        const job: SubagentJob = {
            id: randomUUID(),
            title: titleFor(request.prompt, request.name),
            prompt: truncateUtf8(request.prompt, PROMPT_BYTES).content,
            agent: request.profile.name,
            model: request.profile.model,
            cwd,
            status: "queued",
            phase: "queued",
            updatedAt: now,
            activeTools: [],
            recentActivity: [],
            usage: emptySubagentUsage(),
        };
        const entry: Entry = {
            job,
            controller: new AbortController(),
            settlement: Promise.resolve(),
            waiters: 0,
            delivered: false,
        };
        this.entries.set(job.id, entry);
        this.publish(entry);
        entry.settlement = this.execute(entry, request.profile, request.prompt);
        return structuredClone(job);
    }

    list(): SubagentJob[] {
        return [...this.entries.values()].map((entry) => structuredClone(entry.job));
    }

    check(id: string): SubagentJob {
        return structuredClone(this.require(id).job);
    }

    /** Wait for jobs and consume their results. Aborting the wait leaves the jobs running. */
    async wait(ids: string[], signal?: AbortSignal): Promise<SubagentResult[]> {
        const entries = [...new Set(ids)].map((id) => this.require(id)).filter((entry) => !entry.delivered);
        for (const entry of entries) entry.waiters++;
        let consumed = false;
        try {
            const settlement = Promise.all(entries.map((entry) => entry.settlement));
            if (!signal) await settlement;
            else {
                await Promise.race([
                    settlement,
                    new Promise<never>((_, reject) => {
                        const onAbort = () => reject(abortError("Subagent wait was cancelled."));
                        signal.addEventListener("abort", onAbort, { once: true });
                        void settlement.finally(() => signal.removeEventListener("abort", onAbort));
                    }),
                ]);
            }
            consumed = true;
            let remaining = WAIT_TOTAL_BYTES;
            return entries.map((entry) => {
                if (!entry.result) throw new Error(`Subagent ${entry.job.id} did not settle correctly.`);
                entry.delivered = true;
                const result = boundedResult(entry.result, Math.min(WAIT_JOB_BYTES, remaining));
                remaining -= Buffer.byteLength(result.text);
                return result;
            });
        } finally {
            for (const entry of entries) {
                entry.waiters--;
                // A result that settled during an abandoned wait still needs to reach the model.
                if (!consumed && entry.waiters === 0 && entry.result) this.autoDeliver(entry);
            }
        }
    }

    async cancel(ids: string[]): Promise<SubagentJob[]> {
        const entries = [...new Set(ids)].map((id) => this.require(id));
        for (const entry of entries) entry.controller.abort();
        await Promise.all(entries.map((entry) => entry.settlement));
        return entries.map((entry) => structuredClone(entry.job));
    }

    startSession(): void {
        this.shuttingDown = false;
        this.outputStore.startSession();
    }

    async shutdown(timeoutMs = 3_000): Promise<void> {
        if (this.shuttingDown) return;
        this.shuttingDown = true;
        const settlements = [...this.entries.values()].map((entry) => {
            entry.controller.abort();
            return entry.settlement;
        });
        let timer: ReturnType<typeof setTimeout> | undefined;
        await Promise.race([
            Promise.allSettled(settlements),
            new Promise<void>((resolve) => {
                timer = setTimeout(resolve, timeoutMs);
            }),
        ]);
        if (timer) clearTimeout(timer);
        await this.outputStore.cleanup();
    }

    private require(id: string): Entry {
        const entry = this.entries.get(id);
        if (!entry) throw new Error(`Unknown subagent job: ${id}`);
        return entry;
    }

    private publish(entry: Entry, type: "upsert" | "remove" = "upsert"): void {
        if (this.shuttingDown) return;
        const snapshot = structuredClone(entry.job);
        for (const listener of this.listeners) {
            try {
                listener(snapshot, type);
            } catch {
                // UI failures must not affect job lifecycle.
            }
        }
    }

    private autoDeliver(entry: Entry): void {
        if (!entry.result || entry.delivered || this.shuttingDown) return;
        entry.delivered = true;
        try {
            this.deliver(boundedResult(entry.result, AUTO_RESULT_BYTES));
        } catch {
            // Host delivery failures must not reject settled jobs.
        }
    }

    private addActivity(job: SubagentJob, activity: SubagentActivity): void {
        job.recentActivity = [...job.recentActivity, activity].slice(-MAX_RECENT_ACTIVITY);
        job.updatedAt = Math.max(job.updatedAt, activity.timestamp);
    }

    private settle(job: SubagentJob, status: SubagentStatus, error?: string, patch: Partial<SubagentJob> = {}): void {
        const now = Date.now();
        Object.assign(job, patch);
        if (error) job.error = truncateUtf8(error, ERROR_BYTES).content;
        job.status = status;
        job.phase = "exiting";
        job.endedAt = now;
        job.activeTools = [];
        const succeeded = status === "succeeded";
        this.addActivity(job, {
            timestamp: now,
            kind: succeeded ? "assistant" : "diagnostic",
            title: succeeded ? "Subagent completed" : error?.split("\n", 1)[0] || "Subagent failed",
            isError: !succeeded,
        });
        job.updatedAt = now;
    }

    private async execute(entry: Entry, profile: SubagentProfile, prompt: string): Promise<void> {
        const { job } = entry;
        const signal = entry.controller.signal;
        let output = "";
        let release: (() => void) | undefined;

        this.addActivity(job, { timestamp: Date.now(), kind: "diagnostic", title: "Queued for a child Pi process" });
        this.publish(entry);
        try {
            try {
                release = await semaphore.acquire(signal);
            } catch {
                throw new Error("Subagent was cancelled while queued.");
            }
            const startedAt = Date.now();
            job.status = "starting";
            job.phase = "spawning";
            job.startedAt = startedAt;
            this.addActivity(job, { timestamp: startedAt, kind: "diagnostic", title: "Starting child Pi" });
            this.publish(entry);

            const invocation = getPiInvocation(childArgs(profile, prompt));
            const result = await runChildAgent({
                ...invocation,
                cwd: job.cwd,
                model: job.model,
                signal,
                timeoutMs: profile.timeoutMs,
                stallTimeoutMs: profile.stallTimeoutMs,
                toolStallTimeoutMs: profile.toolStallTimeoutMs,
                onFlush: (events, state) => {
                    if (isTerminalStatus(job.status)) return;
                    job.status = "running";
                    for (const event of events) this.addActivity(job, event);
                    job.phase = state.phase;
                    job.activeTools = state.activeTools;
                    job.model = state.model;
                    job.usage = state.usage;
                    if (state.outputPreview) job.outputPreview = state.outputPreview;
                    job.updatedAt = Math.max(job.updatedAt, state.updatedAt);
                    this.publish(entry);
                },
            });
            output = result.output;
            this.settle(job, result.status, result.error, {
                model: result.model,
                usage: result.usage,
                ...(result.outputPreview ? { outputPreview: result.outputPreview } : {}),
            });
        } catch (error) {
            this.settle(job, signal.aborted ? "cancelled" : "failed", errorMessage(error));
        } finally {
            release?.();
        }
        this.publish(entry);

        const delivered = output || job.error || "(no output)";
        const truncation = truncateHead(delivered, { maxBytes: DEFAULT_MAX_BYTES, maxLines: DELIVERY_MAX_LINES });
        if (truncation.truncated || truncateUtf8(delivered, AUTO_RESULT_BYTES).truncated) {
            const savedPath = await this.outputStore.savePath(delivered).catch(() => undefined);
            if (savedPath) {
                job.fullOutputPath = savedPath;
                this.publish(entry);
            }
        }
        entry.result = Object.freeze({
            id: job.id,
            title: job.title,
            status: job.status,
            text: truncation.content,
            ...(job.fullOutputPath ? { fullOutputPath: job.fullOutputPath } : {}),
        });
        if (entry.waiters === 0) this.autoDeliver(entry);
        this.prune();
    }

    /** Drop the oldest finished, delivered jobs above the limit. */
    private prune(limit = MAX_JOBS): void {
        while (this.entries.size > limit) {
            const oldest = [...this.entries.values()].find((entry) => entry.delivered && entry.waiters === 0);
            if (!oldest) break;
            this.entries.delete(oldest.job.id);
            this.publish(oldest, "remove");
        }
    }
}
