import { defineProfile, promptFile } from "../profile.ts";

export default defineProfile({
    name: "worker",
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
    tools: ["read", "bash", "edit", "write", "grep", "find", "ls"],
    model: "openrouter/z-ai/glm-5.3-flash:high",
    systemPrompt: promptFile(import.meta.url, "prompt.md"),
    promptFlag: "--append-system-prompt",
});
