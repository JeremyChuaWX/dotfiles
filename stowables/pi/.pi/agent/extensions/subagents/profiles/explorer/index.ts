import { defineProfile, promptFile } from "../profile.ts";

export default defineProfile({
    name: "explorer",
    label: "Explorer",
    blocking: true,
    description:
        "Run a read-only subagent for focused codebase exploration and return its findings. " +
        "This tool waits for the investigation to finish before the parent continues. The child can read, grep, find, and list files, but cannot run shell commands or modify files.",
    promptSnippet: "Delegate read-only codebase exploration and wait for its findings",
    promptGuidelines: [
        "Use explorer for read-only codebase exploration, locating relevant code, and explaining existing behavior.",
        "Give explorer a focused, self-contained prompt; child context files, skills, and extensions are disabled.",
        "Explorer returns its findings directly; no separate wait or polling tool is needed.",
    ],
    tools: ["read", "grep", "find", "ls"],
    model: "openrouter/z-ai/glm-5.3-flash",
    thinkingLevel: "low",
    systemPrompt: promptFile(import.meta.url, "prompt.md"),
    promptMode: "replace",
});
