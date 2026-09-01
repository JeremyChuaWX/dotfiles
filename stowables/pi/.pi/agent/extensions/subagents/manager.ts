import type { Deliver, Job, JobConfig, JobResult, Runner } from "./protocol.ts";

export interface ManagerOptions {
    run: Runner;
    deliver: Deliver;
    maxActive: number;
    maxQueued: number;
    /** Receives job-state snapshots; observer failures never affect job lifecycle. */
    onChange?: (jobs: Job[]) => void;
}

interface Entry {
    job: Job;
    config: JobConfig;
    controller: AbortController;
    /** Resolves once the job reaches a terminal state. */
    settled: Promise<Job>;
    settle: (job: Job) => void;
    inactivityTimer?: NodeJS.Timeout;
    hardTimer?: NodeJS.Timeout;
}

/** How long shutdown waits for children to wind down before giving up on them. */
const SHUTDOWN_GRACE_MS = 5_000;

export function seconds(ms: number): string {
    return `${Math.round(ms / 1000)}s`;
}

/** A cancel or timeout may already have set the terminal state while the runner was still winding down; keep it. */
function finalStatus(job: Job, ifStillRunning: JobResult["status"]): JobResult["status"] {
    return job.state === "running" ? ifStillRunning : (job.state as JobResult["status"]);
}

/** Timers that must not keep the process alive on their own. */
function after(ms: number, fn: () => void): NodeJS.Timeout {
    const timer = setTimeout(fn, ms);
    timer.unref?.();
    return timer;
}

/** Owns every job: ids, queue, timeouts, cancellation, and the single delivery path. */
export class Manager {
    private readonly options: ManagerOptions;
    private readonly entries = new Map<string, Entry>();
    private readonly counters = new Map<string, number>();
    private closed = false;

    constructor(options: ManagerOptions) {
        this.options = options;
    }

    spawn(config: JobConfig): Job {
        if (this.closed) throw new Error("Subagents are shutting down.");
        if (this.queued().length >= this.options.maxQueued) {
            throw new Error(`Subagent queue is full (${this.options.maxQueued} queued, ${this.options.maxActive} running).`);
        }
        const n = (this.counters.get(config.profile) ?? 0) + 1;
        this.counters.set(config.profile, n);
        const job: Job = {
            id: `${config.profile}_${n}`,
            profile: config.profile,
            task: config.task,
            cwd: config.cwd,
            state: "queued",
            createdAt: Date.now(),
        };
        let settle!: (job: Job) => void;
        const settled = new Promise<Job>((resolve) => {
            settle = resolve;
        });
        const entry: Entry = { job, config, controller: new AbortController(), settled, settle };
        this.entries.set(job.id, entry);
        this.pump();
        this.notify();
        return { ...job };
    }

    /** Abort running jobs, drop queued ones, and resolve once each has reached a terminal state. Cancelled jobs are not delivered. */
    cancel(ids: string[]): Promise<Job[]> {
        const entries = ids.map((id) => {
            const entry = this.entries.get(id);
            if (!entry) throw new Error(`Unknown subagent job: ${id}`);
            return entry;
        });
        for (const entry of entries) {
            if (entry.job.state === "queued") {
                this.finish(entry, "cancelled");
            } else if (entry.job.state === "running") {
                entry.job.state = "cancelled";
                entry.controller.abort();
                this.notify();
            }
        }
        return Promise.all(entries.map((entry) => entry.settled));
    }

    /** Cancel every job; used on session shutdown and extension reload. Gives children a few seconds to wind down. */
    async shutdown(): Promise<void> {
        this.closed = true;
        const done = this.cancel([...this.entries.keys()]);
        await Promise.race([done, new Promise<void>((resolve) => after(SHUTDOWN_GRACE_MS, resolve))]);
    }

    list(): Job[] {
        return [...this.entries.values()].map((e) => ({ ...e.job }));
    }

    private notify(): void {
        try {
            this.options.onChange?.(this.list());
        } catch {
            // Presentation failures must not affect job lifecycle.
        }
    }

    private queued(): Entry[] {
        return [...this.entries.values()].filter((e) => e.job.state === "queued");
    }

    private active(): number {
        return [...this.entries.values()].filter((e) => e.job.state === "running").length;
    }

    /** Start queued jobs, oldest first, while slots are free. */
    private pump(): void {
        if (this.closed) return;
        for (const entry of this.queued()) {
            if (this.active() >= this.options.maxActive) return;
            this.launch(entry);
        }
    }

    private launch(entry: Entry): void {
        const { job, config, controller } = entry;
        job.state = "running";
        job.startedAt = Date.now();
        const timeOut = (reason: string) => {
            if (job.state !== "running") return;
            job.state = "timed_out";
            job.error = reason;
            controller.abort();
            this.notify();
        };
        const armInactivity = (usage = job.usage) => {
            clearTimeout(entry.inactivityTimer);
            entry.inactivityTimer = after(config.inactivityMs, () => timeOut(`Timed out: no activity for ${seconds(config.inactivityMs)}.`));
            if (usage && usage.totalTokens !== job.usage?.totalTokens) {
                job.usage = usage;
                this.notify();
            }
        };
        armInactivity();
        entry.hardTimer = after(config.hardMs, () => timeOut(`Timed out: hard limit of ${seconds(config.hardMs)} reached.`));
        this.options.run(config, controller.signal, armInactivity).then(
            (result) => {
                job.result = result;
                this.finish(entry, finalStatus(job, "completed"));
            },
            (error: unknown) => {
                if (job.state === "running") job.error = error instanceof Error ? error.message : String(error);
                this.finish(entry, finalStatus(job, "failed"));
            },
        );
    }

    /** The only place a job becomes terminal and the only place a result is delivered. */
    private finish(entry: Entry, status: JobResult["status"]): void {
        const { job } = entry;
        clearTimeout(entry.inactivityTimer);
        clearTimeout(entry.hardTimer);
        job.state = status;
        job.endedAt = Date.now();
        this.entries.delete(job.id);
        entry.settle({ ...job });
        this.pump();
        this.notify();
        if (status === "cancelled") return;
        this.options.deliver({
            job: { ...job },
            status,
            text: job.result?.text ?? "",
            partial: job.result?.partial ?? false,
            runtimeMs: job.endedAt - (job.startedAt ?? job.createdAt),
            usage: job.result?.usage,
            error: job.error,
        });
    }
}
