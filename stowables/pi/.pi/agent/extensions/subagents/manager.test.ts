import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Manager } from "./manager.ts";
import type { JobConfig, JobResult, RunResult, Runner } from "./protocol.ts";

const config = (over: Partial<JobConfig> = {}): JobConfig => ({
    profile: "explorer",
    task: "look around",
    cwd: "/tmp",
    tools: ["read"],
    model: "openrouter/z-ai/glm-5.3-flash",
    thinkingLevel: "low",
    systemPrompt: "be brief",
    promptMode: "replace",
    inactivityMs: 10_000,
    hardMs: 60_000,
    ...over,
});

const ok = (text = "done"): RunResult => ({ text, partial: false, usage: { input: 1, output: 1, totalTokens: 2, cost: 0 } });

/** A runner whose jobs the test finishes by hand. */
function fakeRunner() {
    const started: Array<{ config: JobConfig; signal: AbortSignal; onActivity: Parameters<Runner>[2]; resolve: (r: RunResult) => void; reject: (e: unknown) => void }> = [];
    const run: Runner = (config, signal, onActivity) =>
        new Promise<RunResult>((resolve, reject) => {
            started.push({ config, signal, onActivity, resolve, reject });
        });
    return { run, started };
}

const flush = () => new Promise((r) => setImmediate(r));

function setup(options: Partial<ConstructorParameters<typeof Manager>[0]> = {}) {
    const runner = fakeRunner();
    const delivered: JobResult[] = [];
    const manager = new Manager({ run: runner.run, deliver: (r) => delivered.push(r), maxActive: 2, maxQueued: 3, ...options });
    return { manager, runner, delivered };
}

describe("Manager", () => {
    it("runs a spawned job and delivers its result once", async () => {
        const { manager, runner, delivered } = setup();
        const job = manager.spawn(config());
        assert.equal(job.state, "running");
        assert.equal(runner.started.length, 1);
        runner.started[0].resolve(ok("found it"));
        await flush();
        assert.equal(delivered.length, 1);
        assert.equal(delivered[0].status, "completed");
        assert.equal(delivered[0].text, "found it");
        assert.equal(delivered[0].job.id, job.id);
        assert.equal(manager.list().length, 0);
    });

    it("queues spawns beyond maxActive and starts them in order when a slot frees", async () => {
        const { manager, runner } = setup({ maxActive: 1 });
        manager.spawn(config({ task: "a" }));
        const b = manager.spawn(config({ task: "b" }));
        const c = manager.spawn(config({ task: "c" }));
        assert.equal(b.state, "queued");
        assert.equal(c.state, "queued");
        assert.equal(runner.started.length, 1);
        runner.started[0].resolve(ok());
        await flush();
        assert.equal(runner.started.length, 2);
        assert.equal(runner.started[1].config.task, "b");
        assert.equal(manager.list().find((j) => j.id === b.id)?.state, "running");
        assert.equal(manager.list().find((j) => j.id === c.id)?.state, "queued");
    });

    it("publishes snapshots when jobs spawn, change state, and finish", async () => {
        const snapshots: Array<Array<{ id: string; state: string }>> = [];
        const { manager, runner } = setup({
            maxActive: 1,
            onChange: (jobs) => snapshots.push(jobs.map(({ id, state }) => ({ id, state }))),
        });
        const a = manager.spawn(config({ task: "a" }));
        const b = manager.spawn(config({ task: "b" }));
        assert.deepEqual(snapshots.at(-1), [
            { id: a.id, state: "running" },
            { id: b.id, state: "queued" },
        ]);

        runner.started[0].onActivity({ input: 1200, output: 300, totalTokens: 1500, cost: 0 });
        assert.equal(manager.list().find((job) => job.id === a.id)?.usage?.totalTokens, 1500);

        runner.started[0].resolve(ok());
        await flush();
        assert.deepEqual(snapshots.at(-1), [{ id: b.id, state: "running" }]);

        runner.started[1].resolve(ok());
        await flush();
        assert.deepEqual(snapshots.at(-1), []);
    });

    it("rejects a spawn when the queue is full", () => {
        const { manager } = setup({ maxActive: 1, maxQueued: 1 });
        manager.spawn(config());
        manager.spawn(config());
        assert.throws(() => manager.spawn(config()), /queue is full/);
    });

    it("cancelling a background job aborts its signal without delivering a result", async () => {
        const { manager, runner, delivered } = setup();
        const job = manager.spawn(config());
        const pending = manager.cancel([job.id]);
        assert.equal(runner.started[0].signal.aborted, true);
        runner.started[0].reject(new Error("aborted"));
        const [cancelled] = await pending;
        assert.equal(cancelled.state, "cancelled");
        assert.equal(delivered.length, 0);
        assert.equal(manager.list().length, 0);
    });

    it("cancelling a queued job removes it without ever running it", async () => {
        const { manager, runner, delivered } = setup({ maxActive: 1 });
        manager.spawn(config());
        const queued = manager.spawn(config());
        const [cancelled] = await manager.cancel([queued.id]);
        assert.equal(cancelled.state, "cancelled");
        assert.equal(runner.started.length, 1);
        runner.started[0].resolve(ok());
        await flush();
        assert.equal(runner.started.length, 1);
        assert.deepEqual(delivered.map((r) => r.status), ["completed"]);
    });

    it("a runner error delivers a failed result with the message", async () => {
        const { manager, runner, delivered } = setup();
        manager.spawn(config());
        runner.started[0].reject(new Error("model exploded"));
        await flush();
        assert.equal(delivered.length, 1);
        assert.equal(delivered[0].status, "failed");
        assert.equal(delivered[0].error, "model exploded");
    });

    it("times out a job that goes quiet for inactivityMs, but activity resets the clock", async (t) => {
        t.mock.timers.enable({ apis: ["setTimeout", "Date"] });
        const { manager, runner, delivered } = setup();
        manager.spawn(config({ inactivityMs: 10_000, hardMs: 60_000 }));
        t.mock.timers.tick(9_000);
        runner.started[0].onActivity();
        t.mock.timers.tick(9_000);
        assert.equal(runner.started[0].signal.aborted, false);
        t.mock.timers.tick(1_000);
        assert.equal(runner.started[0].signal.aborted, true);
        runner.started[0].reject(new Error("aborted"));
        await flush();
        assert.equal(delivered[0].status, "timed_out");
        assert.match(delivered[0].error ?? "", /no activity for 10s/);
    });

    it("times out a continuously active job at hardMs", async (t) => {
        t.mock.timers.enable({ apis: ["setTimeout", "Date"] });
        const { manager, runner, delivered } = setup();
        manager.spawn(config({ inactivityMs: 10_000, hardMs: 30_000 }));
        for (let i = 0; i < 6; i++) {
            t.mock.timers.tick(5_000);
            runner.started[0].onActivity();
        }
        assert.equal(runner.started[0].signal.aborted, true);
        runner.started[0].resolve(ok("late text"));
        await flush();
        assert.equal(delivered[0].status, "timed_out");
        assert.equal(delivered[0].text, "late text");
        assert.match(delivered[0].error ?? "", /hard limit of 30s/);
    });

    it("the hard clock starts when a queued job launches, not when it is spawned", async (t) => {
        t.mock.timers.enable({ apis: ["setTimeout", "Date"] });
        const { manager, runner } = setup({ maxActive: 1 });
        manager.spawn(config({ hardMs: 30_000, inactivityMs: 60_000 }));
        manager.spawn(config({ hardMs: 30_000, inactivityMs: 60_000 }));
        t.mock.timers.tick(25_000);
        runner.started[0].resolve(ok());
        await flush();
        t.mock.timers.tick(25_000);
        assert.equal(runner.started[1].signal.aborted, false);
    });

    it("shutdown cancels everything and delivers nothing", async () => {
        const { manager, runner, delivered } = setup({ maxActive: 1 });
        manager.spawn(config());
        manager.spawn(config());
        const done = manager.shutdown();
        assert.equal(runner.started[0].signal.aborted, true);
        runner.started[0].reject(new Error("aborted"));
        await done;
        assert.equal(delivered.length, 0);
        assert.equal(manager.list().length, 0);
    });

    it("routes queued blocking jobs to their own completion callback, not background delivery", async () => {
        const { manager, runner, delivered } = setup({ maxActive: 1 });
        manager.spawn(config({ profile: "worker" }));
        const completed: JobResult[] = [];
        const waiting = manager.spawn(config(), (result) => completed.push(result));
        assert.equal(waiting.state, "queued");
        assert.equal(completed.length, 0);
        runner.started[0].resolve(ok("worker"));
        await flush();
        runner.started[1].resolve(ok("explorer"));
        await flush();
        assert.equal(delivered.length, 1);
        assert.equal(delivered[0].text, "worker");
        assert.equal(completed.length, 1);
        assert.equal(completed[0].text, "explorer");
    });

    it("completes a cancelled queued blocking job without launching it", async () => {
        const { manager, runner, delivered } = setup({ maxActive: 1 });
        manager.spawn(config());
        let completed!: JobResult;
        const queued = manager.spawn(config(), (result) => { completed = result; });
        await manager.cancel([queued.id]);
        assert.equal(completed.status, "cancelled");
        assert.equal(runner.started.length, 1);
        assert.equal(delivered.length, 0);
    });

    it("returns timeouts to blocking callers without background delivery", async (t) => {
        t.mock.timers.enable({ apis: ["setTimeout", "Date"] });
        const { manager, runner, delivered } = setup();
        let completed!: JobResult;
        manager.spawn(config(), (result) => { completed = result; });
        t.mock.timers.tick(10_000);
        runner.started[0].reject(new Error("aborted"));
        await flush();
        assert.equal(completed.status, "timed_out");
        assert.match(completed.error ?? "", /no activity/);
        assert.equal(delivered.length, 0);
    });

    it("ids count per profile", () => {
        const { manager } = setup({ maxActive: 3 });
        assert.equal(manager.spawn(config({ profile: "explorer" })).id, "explorer_1");
        assert.equal(manager.spawn(config({ profile: "worker" })).id, "worker_1");
        assert.equal(manager.spawn(config({ profile: "explorer" })).id, "explorer_2");
    });

    it("cancel with an unknown id throws before touching any job", async () => {
        const { manager, runner } = setup();
        const job = manager.spawn(config());
        assert.throws(() => manager.cancel([job.id, "nope_9"]), /Unknown subagent job: nope_9/);
        assert.equal(runner.started[0].signal.aborted, false);
    });

    it("shutdown gives up waiting on a child that never settles", async (t) => {
        t.mock.timers.enable({ apis: ["setTimeout", "Date"] });
        const { manager, runner } = setup();
        manager.spawn(config());
        let done = false;
        const pending = manager.shutdown().then(() => {
            done = true;
        });
        assert.equal(runner.started[0].signal.aborted, true);
        t.mock.timers.tick(5_000);
        await pending;
        assert.equal(done, true);
        assert.throws(() => manager.spawn(config()), /shutting down/);
    });
});
