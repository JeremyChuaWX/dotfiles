import { defineProfile, promptFile } from "../profile.ts";

export default defineProfile({
    name: "worker",
    label: "Worker",
    description:
        "Start a write-capable background subagent for delegated implementation, debugging, testing, or review and return its job id immediately. " +
        "The result arrives later as a follow-up message. The child can edit files and run arbitrary shell commands and is not sandboxed.",
    promptSnippet: "Delegate write-capable coding work to a background subagent",
    promptGuidelines: [
        "Use worker when the user asks to delegate implementation, debugging, testing, review, or other write-capable coding work.",
        "Give worker a focused, self-contained prompt; child context files, skills, and extensions are disabled.",
        "Issue multiple independent worker calls in the same turn when their tasks can run in parallel.",
        "After worker starts, continue useful work or end your turn. The result arrives as a follow-up message; there is nothing to wait on.",
    ],
    tools: ["read", "bash", "edit", "write", "grep", "find", "ls"],
    model: "openrouter/z-ai/glm-5.3-flash",
    thinkingLevel: "high",
    systemPrompt: promptFile(import.meta.url, "prompt.md"),
    promptMode: "append",
});
