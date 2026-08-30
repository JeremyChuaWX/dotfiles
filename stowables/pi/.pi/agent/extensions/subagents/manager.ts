import type { Deliver, Job, JobConfig, JobResult, Runner } from "./protocol.ts";

export interface ManagerOptions {
    run: Runner;
    deliver: Deliver;
    maxActive: number;
    maxQueued: number;
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

/** A cancel or timeout may already have set the terminal state while the runner was still winding down; keep it. */
function terminal(job: Job, ifStillRunning: JobResult["status"]): JobResult["status"] {
    return job.state === "running" || job.state === "queued" ? ifStillRunning : job.state;
}

const seconds = (ms: number) => `${Math.round(ms / 1000)}s`;

/** Owns every job: ids, queue, timeouts, cancellation, and the single delivery path. */
export class Manager {
    private readonly entries = new Map<string, Entry>();
    private readonly counters = new Map<string, number>();

    private readonly options: ManagerOptions;

    constructor(options: ManagerOptions) {
        this.options = options;
    }

    spawn(config: JobConfig): Job {
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
        if (this.queued().length >= this.options.maxQueued) {
            throw new Error(`Subagent queue is full (${this.options.maxQueued} queued, ${this.options.maxActive} running).`);
        }
        let settle!: (job: Job) => void;
        const settled = new Promise<Job>((resolve) => {
            settle = resolve;
        });
        const entry: Entry = { job, config, controller: new AbortController(), settled, settle };
        this.entries.set(job.id, entry);
        this.pump();
        return { ...job };
    }

    /** Abort running jobs, drop queued ones, and resolve once each has reached a terminal state. Cancelled jobs are not delivered. */
    cancel(ids: string[]): Promise<Job[]> {
        return Promise.all(
            ids.map((id) => {
                const entry = this.entries.get(id);
                if (!entry) return Promise.reject(new Error(`Unknown subagent job: ${id}`));
                if (entry.job.state === "queued") {
                    this.finish(entry, "cancelled");
                } else if (entry.job.state === "running") {
                    entry.job.state = "cancelled";
                    entry.controller.abort();
                }
                return entry.settled;
            }),
        );
    }

    /** Cancel every job; used on session shutdown and extension reload. */
    async shutdown(): Promise<void> {
        await this.cancel([...this.entries.keys()]);
    }

    list(): Job[] {
        return [...this.entries.values()].map((e) => ({ ...e.job }));
    }

    private queued(): Entry[] {
        return [...this.entries.values()].filter((e) => e.job.state === "queued");
    }

    private active(): number {
        return [...this.entries.values()].filter((e) => e.job.state === "running").length;
    }

    /** Start queued jobs, oldest first, while slots are free. */
    private pump(): void {
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
        };
        const armInactivity = () => {
            clearTimeout(entry.inactivityTimer);
            entry.inactivityTimer = setTimeout(() => timeOut(`Timed out: no activity for ${seconds(config.inactivityMs)}.`), config.inactivityMs);
        };
        armInactivity();
        entry.hardTimer = setTimeout(() => timeOut(`Timed out: hard limit of ${seconds(config.hardMs)} reached.`), config.hardMs);
        void this.options
            .run(config, controller.signal, armInactivity)
            .then(
                (result) => {
                    job.result = result;
                    this.finish(entry, terminal(job, "completed"));
                },
                (error: unknown) => {
                    if (job.state === "running") job.error = error instanceof Error ? error.message : String(error);
                    this.finish(entry, terminal(job, "failed"));
                },
            );
    }

    private finish(entry: Entry, status: JobResult["status"]): void {
        const { job } = entry;
        clearTimeout(entry.inactivityTimer);
        clearTimeout(entry.hardTimer);
        job.state = status;
        job.endedAt = Date.now();
        this.entries.delete(job.id);
        this.pump();
        entry.settle({ ...job });
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
