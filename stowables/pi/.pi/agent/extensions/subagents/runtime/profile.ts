import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

export interface SubagentProfile {
    name: string;
    tools: readonly string[];
    model: string;
    prompt?: string;
    promptFlag?: "--system-prompt" | "--append-system-prompt";
    timeoutMs: number;
    /** Abort when a running child produces no events between turns for this long. 0 disables. */
    stallTimeoutMs?: number;
    /** Abort when an active tool call produces no events for this long. Defaults to 3x stallTimeoutMs. */
    toolStallTimeoutMs?: number;
}

export function workingDirectoryCandidate(input: string, parentCwd: string): string {
    let value = input.trim().replace(/^@/, "");
    if (!value) return path.resolve(parentCwd);
    if (value === "~") value = os.homedir();
    else if (value.startsWith("~/")) value = path.join(os.homedir(), value.slice(2));
    return path.resolve(parentCwd, value);
}

export async function resolveWorkingDirectory(input: string, parentCwd: string): Promise<string> {
    if (!input.trim().replace(/^@/, "")) throw new Error("Subagent cwd must not be empty.");
    const resolved = workingDirectoryCandidate(input, parentCwd);
    let stats: fs.Stats;
    try {
        stats = await fs.promises.stat(resolved);
    } catch {
        throw new Error(`Subagent cwd does not exist: ${resolved}`);
    }
    if (!stats.isDirectory()) throw new Error(`Subagent cwd is not a directory: ${resolved}`);
    return fs.promises.realpath(resolved);
}

export function childArgs(profile: SubagentProfile, prompt: string): string[] {
    const args = [
        "--mode",
        "json",
        "--no-session",
        "--no-extensions",
        "--no-skills",
        "--no-prompt-templates",
        "--no-context-files",
        "--tools",
        profile.tools.join(","),
        "--model",
        profile.model,
    ];
    if (profile.promptFlag && profile.prompt !== undefined) args.push(profile.promptFlag, profile.prompt);
    args.push(prompt);
    return args;
}
