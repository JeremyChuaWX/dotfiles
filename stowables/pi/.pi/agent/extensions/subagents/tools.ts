import { DEFAULT_MAX_BYTES, DEFAULT_MAX_LINES, type ExtensionAPI, truncateHead } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { composeBoundedOutput } from "../lib/retained-output.ts";
import type { SubagentManager, SubagentResult } from "./manager.ts";
import { profiles } from "./profiles/index.ts";

const SpawnParams = Type.Object({
    prompt: Type.String({ description: "Focused, self-contained task prompt for the subagent." }),
    cwd: Type.String({
        description: "Working directory for the child process. Relative paths resolve from the parent working directory.",
    }),
    name: Type.Optional(Type.String({ description: "Short display name for the background job." })),
});
const IdsParams = Type.Object({ ids: Type.Array(Type.String(), { minItems: 1, maxItems: 64 }) });

function renderResults(results: SubagentResult[]): string {
    const content = results
        .map((item) => {
            const pathNote = item.fullOutputPath ? `\nFull output: ${item.fullOutputPath}` : "";
            return `[${item.id}] ${item.title} - ${item.status}\n${item.text}${pathNote}`;
        })
        .join("\n\n");
    const limits = { maxBytes: DEFAULT_MAX_BYTES, maxLines: DEFAULT_MAX_LINES };
    if (!truncateHead(content, limits).truncated) return content;
    return composeBoundedOutput(content, limits, {
        nonRetentionReason: "the combined wait output is not retained; use each job's retained path when available",
    });
}

export function registerSubagentTools(pi: ExtensionAPI, manager: SubagentManager): void {
    for (const profile of profiles) {
        pi.registerTool({
            name: profile.name,
            label: profile.label,
            description: profile.description,
            promptSnippet: profile.promptSnippet,
            promptGuidelines: profile.promptGuidelines,
            parameters: SpawnParams,
            async execute(_id, params, signal, _update, ctx) {
                const job = await manager.spawn({
                    profile,
                    prompt: params.prompt,
                    cwd: params.cwd,
                    ...(params.name ? { name: params.name } : {}),
                    parentCwd: ctx.cwd,
                    signal,
                });
                return {
                    content: [{ type: "text", text: `Started ${profile.name} ${job.id} (${job.title}).` }],
                    details: job,
                };
            },
        });
    }

    pi.registerTool({
        name: "subagent_check",
        label: "Check Subagent",
        description: "Inspect one explorer or worker job without waiting or consuming its result.",
        promptSnippet: "Inspect one background explorer or worker job",
        parameters: Type.Object({ id: Type.String() }),
        async execute(_id, params) {
            const job = manager.check(params.id);
            const body = job.outputPreview ?? job.error ?? "No output yet.";
            return {
                content: [{ type: "text", text: `[${job.id}] ${job.title} - ${job.status}\n${body}` }],
                details: job,
            };
        },
    });

    pi.registerTool({
        name: "subagent_wait",
        label: "Wait for Subagents",
        description: "Wait for explorer or worker jobs and return their results. Aborting the wait does not cancel the jobs.",
        promptSnippet: "Wait for background explorer or worker jobs",
        parameters: IdsParams,
        async execute(_id, params, signal) {
            const results = await manager.wait(params.ids, signal);
            return { content: [{ type: "text", text: renderResults(results) }], details: { results } };
        },
    });

    pi.registerTool({
        name: "subagent_cancel",
        label: "Cancel Subagents",
        description: "Cancel queued or running explorer and worker jobs and await their terminal state.",
        promptSnippet: "Cancel background explorer or worker jobs",
        parameters: IdsParams,
        async execute(_id, params) {
            const jobs = await manager.cancel(params.ids);
            return {
                content: [{ type: "text", text: jobs.map((job) => `[${job.id}] ${job.status}`).join("\n") }],
                details: { jobs },
            };
        },
    });
}
