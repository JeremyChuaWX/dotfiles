import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { registerSubagentProfile } from "../subagents/interface/spawn.ts";

const prompt = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "prompt.md"), "utf8");

export default function explorerExtension(pi: ExtensionAPI): void {
    registerSubagentProfile(pi, {
        profile: {
            name: "explorer",
            tools: ["read", "grep", "find", "ls"],
            model: "openrouter/z-ai/glm-5.3-flash:low",
            prompt,
            promptFlag: "--system-prompt",
            timeoutMs: 0,
            stallTimeoutMs: 600_000,
            toolStallTimeoutMs: 1_800_000,
        },
        label: "Explorer",
        description:
            "Start a read-only Pi subagent for focused codebase reconnaissance and return its job id immediately. " +
            "The child can read, grep, find, and list files, but cannot run shell commands or modify files.",
        promptSnippet: "Delegate read-only codebase exploration to an isolated background subagent",
        promptGuidelines: [
            "Use explorer for read-only codebase reconnaissance, locating relevant code, and explaining existing behavior.",
            "Give explorer a focused, self-contained prompt and the exact working directory because child context files, skills, and extensions are disabled.",
            "After explorer starts, continue useful parent work; use subagent_wait only when progress depends on its result.",
        ],
    });
}
