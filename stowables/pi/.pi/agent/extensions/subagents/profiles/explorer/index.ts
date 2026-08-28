import { defineProfile, promptFile } from "../profile.ts";

export default defineProfile({
    name: "explorer",
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
    tools: ["read", "grep", "find", "ls"],
    model: "openrouter/z-ai/glm-5.3-flash:low",
    systemPrompt: promptFile(import.meta.url, "prompt.md"),
    promptFlag: "--system-prompt",
});
