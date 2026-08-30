import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import type { ThinkingLevel } from "@earendil-works/pi-agent-core";

const MINUTE = 60_000;

export interface Profile {
    name: string;
    label: string;
    description: string;
    promptSnippet: string;
    promptGuidelines: string[];
    tools: readonly string[];
    model: string;
    thinkingLevel: ThinkingLevel;
    systemPrompt: string;
    /** Whether the prompt replaces pi's coding prompt or is appended to it. */
    promptMode: "replace" | "append";
    inactivityMs: number;
    hardMs: number;
}

export const DEFAULT_LIMITS = { inactivityMs: 10 * MINUTE, hardMs: 60 * MINUTE };

/** Read a prompt file that sits next to the declaring module. */
export function promptFile(moduleUrl: string, fileName: string): string {
    return fs.readFileSync(path.join(path.dirname(fileURLToPath(moduleUrl)), fileName), "utf8");
}

export function defineProfile(profile: Omit<Profile, keyof typeof DEFAULT_LIMITS> & Partial<typeof DEFAULT_LIMITS>): Profile {
    return { ...DEFAULT_LIMITS, ...profile };
}
