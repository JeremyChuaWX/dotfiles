import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import type { SubagentProfile } from "../runtime/profile.ts";
import { resolveSubagentRuntime } from "./broker.ts";

const SpawnParams = Type.Object({
    prompt: Type.String({ description: "Focused, self-contained task prompt for the subagent." }),
    cwd: Type.String({
        description: "Working directory for the child process. Relative paths resolve from the parent working directory.",
    }),
    name: Type.Optional(Type.String({ description: "Short display name for the background job." })),
});

export interface SubagentProfileTool {
    profile: SubagentProfile;
    label: string;
    description: string;
    promptSnippet: string;
    promptGuidelines: string[];
}

export function registerSubagentProfile(pi: ExtensionAPI, tool: SubagentProfileTool): void {
    pi.registerTool({
        name: tool.profile.name,
        label: tool.label,
        description: tool.description,
        promptSnippet: tool.promptSnippet,
        promptGuidelines: tool.promptGuidelines,
        parameters: SpawnParams,
        async execute(_id, params, signal, _update, ctx) {
            const runtime = resolveSubagentRuntime(pi);
            const job = await runtime.spawn({
                profile: tool.profile,
                prompt: params.prompt,
                cwd: params.cwd,
                ...(params.name ? { name: params.name } : {}),
                parentCwd: ctx.cwd,
                signal,
            });
            return {
                content: [{ type: "text", text: `Started ${tool.profile.name} ${job.id} (${job.title}).` }],
                details: job,
            };
        },
    });
}
