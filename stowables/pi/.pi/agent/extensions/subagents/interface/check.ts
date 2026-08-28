import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import type { SubagentRuntimeService } from "./broker.ts";

const CheckParams = Type.Object({ id: Type.String() });

export function registerSubagentCheckTool(pi: ExtensionAPI, runtime: SubagentRuntimeService): void {
    pi.registerTool({
        name: "subagent_check",
        label: "Check Background Subagent",
        description: "Inspect one explorer or worker job without waiting or consuming result delivery.",
        promptSnippet: "Inspect one background explorer or worker job",
        parameters: CheckParams,
        async execute(_id, params) {
            const job = runtime.check(params.id);
            return {
                content: [
                    {
                        type: "text",
                        text: `[${job.id}] ${job.title} - ${job.run.status}\n${job.run.outputPreview ?? job.run.error ?? "No output yet."}`,
                    },
                ],
                details: job,
            };
        },
    });
}
