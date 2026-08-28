import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import type { SubagentRuntimeService } from "./broker.ts";

const CancelParams = Type.Object({ ids: Type.Array(Type.String(), { minItems: 1, maxItems: 64 }) });

export function registerSubagentCancelTool(pi: ExtensionAPI, runtime: SubagentRuntimeService): void {
    pi.registerTool({
        name: "subagent_cancel",
        label: "Cancel Background Subagents",
        description: "Cancel queued or running explorer and worker jobs and await terminal state.",
        promptSnippet: "Cancel background explorer or worker jobs",
        parameters: CancelParams,
        async execute(_id, params) {
            const jobs = await runtime.cancel(params.ids);
            return {
                content: [{ type: "text", text: jobs.map((job) => `[${job.id}] ${job.run.status}`).join("\n") }],
                details: { jobs },
            };
        },
    });
}
