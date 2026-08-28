import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import type { ChildAgentLimits } from "../child-agent.ts";

export interface SubagentProfile extends ChildAgentLimits {
    name: string;
    label: string;
    description: string;
    promptSnippet: string;
    promptGuidelines: string[];
    tools: readonly string[];
    model: string;
    systemPrompt: string;
    /** Whether the prompt replaces pi's coding prompt or is appended to it. */
    promptFlag: "--system-prompt" | "--append-system-prompt";
}

const MINUTE = 60_000;

/** Default limits: a generous wall clock so a busy-but-looping child cannot run forever, plus the progress watchdog. */
export const DEFAULT_LIMITS: ChildAgentLimits = {
    timeoutMs: 60 * MINUTE,
    stallTimeoutMs: 10 * MINUTE,
    toolStallTimeoutMs: 15 * MINUTE,
};

/** Read a prompt file that sits next to the declaring module. */
export function promptFile(moduleUrl: string, fileName: string): string {
    return fs.readFileSync(path.join(path.dirname(fileURLToPath(moduleUrl)), fileName), "utf8");
}

export function defineProfile(profile: Omit<SubagentProfile, keyof ChildAgentLimits> & Partial<ChildAgentLimits>): SubagentProfile {
    return { ...DEFAULT_LIMITS, ...profile };
}

export function childArgs(profile: SubagentProfile, prompt: string): string[] {
    return [
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
        profile.promptFlag,
        profile.systemPrompt,
        prompt,
    ];
}
