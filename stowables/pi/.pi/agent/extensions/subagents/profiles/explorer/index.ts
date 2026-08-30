import { defineProfile, promptFile } from "../profile.ts";

export default defineProfile({
    name: "explorer",
    label: "Explorer",
    description:
        "Start a read-only background subagent for focused codebase reconnaissance and return its job id immediately. " +
        "The result arrives later as a follow-up message. The child can read, grep, find, and list files, but cannot run shell commands or modify files.",
    promptSnippet: "Delegate read-only codebase exploration to a background subagent",
    promptGuidelines: [
        "Use explorer for read-only codebase reconnaissance, locating relevant code, and explaining existing behavior.",
        "Give explorer a focused, self-contained prompt; child context files, skills, and extensions are disabled.",
        "After explorer starts, continue useful work or end your turn. The result arrives as a follow-up message; there is nothing to wait on.",
    ],
    tools: ["read", "grep", "find", "ls"],
    model: "openrouter/z-ai/glm-5.3-flash",
    thinkingLevel: "low",
    systemPrompt: promptFile(import.meta.url, "prompt.md"),
    promptMode: "replace",
});
