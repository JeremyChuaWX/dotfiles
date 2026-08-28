import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { registerSubagentProfile } from "../subagents/interface/spawn.ts";

const prompt = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "prompt.md"), "utf8");

export default function workerExtension(pi: ExtensionAPI): void {
    registerSubagentProfile(pi, {
        profile: {
            name: "worker",
            tools: ["read", "bash", "edit", "write", "grep", "find", "ls"],
            model: "openrouter/z-ai/glm-5.3-flash:max",
            prompt,
            promptFlag: "--append-system-prompt",
            timeoutMs: 0,
        },
        label: "Worker",
        description:
            "Start a write-capable Pi subagent for delegated implementation, debugging, testing, or review and return its job id immediately. " +
            "The child can edit files and run arbitrary shell commands and is not sandboxed.",
        promptSnippet: "Delegate write-capable coding work to an isolated background subagent",
        promptGuidelines: [
            "Use worker when the user asks to delegate implementation, debugging, testing, review, or other write-capable coding work.",
            "Give worker a focused, self-contained prompt and the exact working directory because child context files, skills, and extensions are disabled.",
            "Issue multiple independent worker calls in the same turn when their tasks can run in parallel.",
            "After worker starts, continue useful parent work; use subagent_wait only when progress depends on its result.",
        ],
    });
}
