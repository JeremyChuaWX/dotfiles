import * as os from "node:os";
import * as path from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { Manager, seconds } from "./manager.ts";
import { profiles } from "./profiles/index.ts";
import { prepareResultMessage, renderResultMessage } from "./result-message.ts";
import { createRunner } from "./subagent.ts";

const MAX_ACTIVE = clamp(Number(process.env.PI_SUBAGENT_MAX_ACTIVE) || 4, 1, 64);
const MAX_QUEUED = 16;

function clamp(n: number, lo: number, hi: number): number {
    return Math.min(hi, Math.max(lo, n));
}

/** "provider/model-id" as written in a profile. */
function splitModel(spec: string): [string, string] {
    const slash = spec.indexOf("/");
    return [spec.slice(0, slash), spec.slice(slash + 1)];
}

export interface SubagentExtensionDeps {
    createRunner: typeof createRunner;
}

export default function subagents(pi: ExtensionAPI, deps: SubagentExtensionDeps = { createRunner }) {
    let manager: Manager | undefined;

    pi.registerMessageRenderer("subagent-result", renderResultMessage);

    /** One manager per session. `session_start` also fires on reload, /new, and /fork, so tear down the previous one first. */
    pi.on("session_start", async (_event, ctx) => {
        await manager?.shutdown();
        const dir = path.join(os.tmpdir(), "pi-subagents", ctx.sessionManager.getSessionId());
        manager = new Manager({
            maxActive: MAX_ACTIVE,
            maxQueued: MAX_QUEUED,
            run: deps.createRunner({ resolveModel: (spec) => ctx.modelRegistry.find(...splitModel(spec)) }),
            deliver: (result) => {
                const message = prepareResultMessage(result, dir);
                pi.sendMessage({ customType: "subagent-result", ...message, display: true }, { deliverAs: "steer", triggerTurn: true });
            },
        });
    });

    pi.on("session_shutdown", async () => {
        const current = manager;
        manager = undefined;
        await current?.shutdown();
    });

    const getManager = (): Manager => {
        if (!manager) throw new Error("Subagents are not ready: no session has started.");
        return manager;
    };

    for (const profile of profiles) {
        pi.registerTool({
            name: profile.name,
            label: profile.label,
            description: profile.description,
            promptSnippet: profile.promptSnippet,
            promptGuidelines: profile.promptGuidelines,
            parameters: Type.Object({
                task: Type.String({ description: "Focused, self-contained task for the subagent." }),
                cwd: Type.Optional(Type.String({ description: "Working directory. Defaults to the current one." })),
            }),
            async execute(_id, params, _signal, _update, ctx) {
                const job = getManager().spawn({
                    ...profile.config,
                    profile: profile.name,
                    task: params.task,
                    cwd: params.cwd ? path.resolve(ctx.cwd, params.cwd) : ctx.cwd,
                });
                return {
                    content: [{ type: "text", text: `Started ${job.id} (${job.state}). Its result will be injected when ready; do not wait or poll.` }],
                    details: job,
                };
            },
        });
    }

    pi.registerTool({
        name: "subagent_cancel",
        label: "Cancel Subagents",
        description: "Cancel queued or running subagent jobs and return their final state. Cancelled jobs emit no result message.",
        promptSnippet: "Cancel background subagent jobs",
        parameters: Type.Object({ ids: Type.Array(Type.String(), { minItems: 1, maxItems: 64 }) }),
        async execute(_id, params) {
            const jobs = await getManager().cancel(params.ids);
            return {
                content: [{ type: "text", text: jobs.map((job) => `[${job.id}] ${job.state}`).join("\n") }],
                details: { jobs },
            };
        },
    });

    pi.registerTool({
        name: "subagent_list",
        label: "List Subagents",
        description: "Return an immediate snapshot of queued and running subagent jobs. Never use this tool to wait or poll for completion.",
        promptSnippet: "List active background subagent jobs without waiting",
        promptGuidelines: ["Use subagent_list only for a requested status snapshot; never poll it while waiting for subagents."],
        parameters: Type.Object({}),
        async execute() {
            const jobs = getManager().list();
            const now = Date.now();
            const text = jobs.length
                ? jobs.map((job) => `[${job.id}] ${job.state} ${seconds(now - (job.startedAt ?? job.createdAt))}: ${job.task.slice(0, 80)}`).join("\n")
                : "No active subagent jobs.";
            return { content: [{ type: "text", text }], details: { jobs }, terminate: true };
        },
    });
}
