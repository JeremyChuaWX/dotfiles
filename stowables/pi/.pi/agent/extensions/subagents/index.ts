import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { Manager } from "./manager.ts";
import { profiles } from "./profiles/index.ts";
import type { JobResult } from "./protocol.ts";
import { createRunner } from "./subagent.ts";

const MAX_ACTIVE = clamp(Number(process.env.PI_SUBAGENT_MAX_ACTIVE) || 4, 1, 64);
const MAX_QUEUED = 16;
/** Inline text beyond this is cut; the full text is always on disk. */
const INLINE_LIMIT = 16 * 1024;

function clamp(n: number, lo: number, hi: number): number {
    return Math.min(hi, Math.max(lo, n));
}

function seconds(ms: number): string {
    return `${Math.round(ms / 1000)}s`;
}

/** "provider/model-id" as written in a profile. */
function splitModel(spec: string): [string, string] {
    const slash = spec.indexOf("/");
    return [spec.slice(0, slash), spec.slice(slash + 1)];
}

/** Write the full result to disk and return the follow-up message text. */
function render(result: JobResult, dir: string): string {
    const { job } = result;
    const file = path.join(dir, `${job.id}.md`);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, result.text || (result.error ?? ""), "utf8");
    const tokens = result.usage ? `, ${Math.round(result.usage.totalTokens / 1000)}k tokens` : "";
    const header = `[${job.id}] ${result.status} in ${seconds(result.runtimeMs)}${tokens}${result.partial ? ", partial output" : ""}\nTask: ${job.task}\nFull output: ${file}`;
    const body = result.error ? `Error: ${result.error}\n\n${result.text}` : result.text;
    const cut = body.length > INLINE_LIMIT ? `${body.slice(0, INLINE_LIMIT)}\n\n[truncated; read the full output file]` : body;
    return `${header}\n\n${cut}`.trimEnd();
}

export default function subagents(pi: ExtensionAPI) {
    let manager: Manager | undefined;

    pi.on("session_start", (_event, ctx) => {
        void manager?.shutdown();
        const dir = path.join(os.tmpdir(), "pi-subagents", ctx.sessionManager.getSessionId());
        manager = new Manager({
            maxActive: MAX_ACTIVE,
            maxQueued: MAX_QUEUED,
            run: createRunner({ resolveModel: (spec) => ctx.modelRegistry.find(...splitModel(spec)) }),
            deliver: (result) => {
                pi.sendMessage(
                    { customType: "subagent-result", content: render(result, dir), display: true, details: result },
                    { deliverAs: "followUp", triggerTurn: true },
                );
            },
        });
    });

    pi.on("session_shutdown", async () => {
        await manager?.shutdown();
        manager = undefined;
    });

    const active = () => {
        if (!manager) throw new Error("Subagents are not ready yet.");
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
                const job = active().spawn({
                    profile: profile.name,
                    task: params.task,
                    cwd: params.cwd ? path.resolve(ctx.cwd, params.cwd) : ctx.cwd,
                    tools: profile.tools,
                    model: profile.model,
                    thinkingLevel: profile.thinkingLevel,
                    systemPrompt: profile.systemPrompt,
                    promptMode: profile.promptMode,
                    inactivityMs: profile.inactivityMs,
                    hardMs: profile.hardMs,
                });
                return { content: [{ type: "text", text: `Started ${job.id} (${job.state}). Its result will arrive as a follow-up message.` }], details: job };
            },
        });
    }

    pi.registerTool({
        name: "subagent_cancel",
        label: "Cancel Subagents",
        description: "Cancel queued or running subagent jobs and return their final state. Cancelled jobs send no follow-up.",
        promptSnippet: "Cancel background subagent jobs",
        parameters: Type.Object({ ids: Type.Array(Type.String(), { minItems: 1, maxItems: 64 }) }),
        async execute(_id, params) {
            const jobs = await active().cancel(params.ids);
            return { content: [{ type: "text", text: jobs.map((job) => `[${job.id}] ${job.state}`).join("\n") }], details: { jobs } };
        },
    });

    pi.registerTool({
        name: "subagent_list",
        label: "List Subagents",
        description: "List queued and running subagent jobs.",
        promptSnippet: "List active background subagent jobs",
        parameters: Type.Object({}),
        async execute() {
            const jobs = active().list();
            const now = Date.now();
            const text = jobs.length
                ? jobs.map((job) => `[${job.id}] ${job.state} ${seconds(now - (job.startedAt ?? job.createdAt))}: ${job.task.slice(0, 80)}`).join("\n")
                : "No active subagent jobs.";
            return { content: [{ type: "text", text }], details: { jobs } };
        },
    });
}
