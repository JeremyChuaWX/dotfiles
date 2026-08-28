import {
    DEFAULT_MAX_BYTES,
    DEFAULT_MAX_LINES,
    type ExtensionAPI,
    truncateHead,
} from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { composeBoundedOutput } from "../lib/retained-output.ts";
import type { BackgroundTerminalResult } from "../runtime/background-manager.ts";
import type { SubagentRuntimeService } from "./broker.ts";

const WaitParams = Type.Object({ ids: Type.Array(Type.String(), { minItems: 1, maxItems: 64 }) });

function renderResults(results: BackgroundTerminalResult[]): string {
    const content = results
        .map(
            (item) =>
                `[${item.id}] ${item.title} - ${item.status}\n${item.text}${item.fullOutputPath ? `\nFull output: ${item.fullOutputPath}` : ""}`,
        )
        .join("\n\n");
    const truncation = truncateHead(content, { maxBytes: DEFAULT_MAX_BYTES, maxLines: DEFAULT_MAX_LINES });
    return truncation.truncated
        ? composeBoundedOutput(
              content,
              { maxBytes: DEFAULT_MAX_BYTES, maxLines: DEFAULT_MAX_LINES },
              {
                  nonRetentionReason:
                      "the combined wait presentation is not retained; use each job's retained path when available",
              },
          )
        : content;
}

export function registerSubagentWaitTool(pi: ExtensionAPI, runtime: SubagentRuntimeService): void {
    pi.registerTool({
        name: "subagent_wait",
        label: "Wait for Background Subagents",
        description: "Wait for explorer or worker jobs without cancelling them if this wait is aborted.",
        promptSnippet: "Wait for background explorer or worker jobs",
        parameters: WaitParams,
        async execute(_id, params, signal) {
            const results = await runtime.wait(params.ids, signal);
            return { content: [{ type: "text", text: renderResults(results) }], details: { results } };
        },
    });
}
