import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import type { ProfileConfig } from "../protocol.ts";

const MINUTE = 60_000;

export interface Profile {
    name: string;
    label: string;
    description: string;
    promptSnippet: string;
    promptGuidelines: string[];
    /** Wait for findings in the tool call, rather than deliver a background message. */
    blocking: boolean;
    config: ProfileConfig;
}

export const DEFAULT_LIMITS = { inactivityMs: 10 * MINUTE, hardMs: 60 * MINUTE };

/** Read a prompt file that sits next to the declaring module. */
export function promptFile(moduleUrl: string, fileName: string): string {
    return fs.readFileSync(path.join(path.dirname(fileURLToPath(moduleUrl)), fileName), "utf8");
}

type ProfileInput = Omit<Profile, "config"> & Omit<ProfileConfig, keyof typeof DEFAULT_LIMITS> & Partial<typeof DEFAULT_LIMITS>;

export function defineProfile(input: ProfileInput): Profile {
    const { name, label, description, promptSnippet, promptGuidelines, blocking, ...config } = input;
    return { name, label, description, promptSnippet, promptGuidelines, blocking, config: { ...DEFAULT_LIMITS, ...config } };
}
