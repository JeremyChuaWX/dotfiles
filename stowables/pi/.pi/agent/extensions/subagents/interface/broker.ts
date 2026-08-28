import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { BackgroundSubagentJobV1 } from "../runtime/background-protocol.ts";
import type { BackgroundTerminalResult } from "../runtime/background-manager.ts";
import type { SubagentProfile } from "../runtime/profile.ts";

const SUBAGENT_RUNTIME_CHANNEL = "pi.subagents.runtime.discover";
export const SUBAGENT_RUNTIME_SCHEMA = "pi.subagents.runtime" as const;
export const SUBAGENT_RUNTIME_VERSION = 1 as const;

export interface SubagentSpawnRequest {
    profile: SubagentProfile;
    prompt: string;
    cwd: string;
    name?: string;
    parentCwd: string;
    signal?: AbortSignal;
}

export interface SubagentRuntimeService {
    schema: typeof SUBAGENT_RUNTIME_SCHEMA;
    version: typeof SUBAGENT_RUNTIME_VERSION;
    spawn(request: SubagentSpawnRequest): Promise<BackgroundSubagentJobV1>;
    list(): BackgroundSubagentJobV1[];
    check(id: string): BackgroundSubagentJobV1;
    wait(ids: string[], signal?: AbortSignal): Promise<BackgroundTerminalResult[]>;
    cancel(ids: string[]): Promise<BackgroundSubagentJobV1[]>;
}

interface RuntimeDiscoveryRequest {
    schema: typeof SUBAGENT_RUNTIME_SCHEMA;
    version: typeof SUBAGENT_RUNTIME_VERSION;
    accept(candidate: unknown): void;
}

function isRuntimeService(value: unknown): value is SubagentRuntimeService {
    if (typeof value !== "object" || value === null) return false;
    const service = value as Partial<SubagentRuntimeService>;
    return (
        service.schema === SUBAGENT_RUNTIME_SCHEMA &&
        service.version === SUBAGENT_RUNTIME_VERSION &&
        typeof service.spawn === "function" &&
        typeof service.list === "function" &&
        typeof service.check === "function" &&
        typeof service.wait === "function" &&
        typeof service.cancel === "function"
    );
}

function isDiscoveryRequest(value: unknown): value is RuntimeDiscoveryRequest {
    if (typeof value !== "object" || value === null) return false;
    const request = value as Partial<RuntimeDiscoveryRequest>;
    return (
        request.schema === SUBAGENT_RUNTIME_SCHEMA &&
        request.version === SUBAGENT_RUNTIME_VERSION &&
        typeof request.accept === "function"
    );
}

export function registerSubagentRuntimeBroker(pi: ExtensionAPI, service: SubagentRuntimeService): void {
    pi.events.on(SUBAGENT_RUNTIME_CHANNEL, (value) => {
        if (isDiscoveryRequest(value)) value.accept(service);
    });
}

export function resolveSubagentRuntime(pi: ExtensionAPI): SubagentRuntimeService {
    let service: SubagentRuntimeService | undefined;
    pi.events.emit(SUBAGENT_RUNTIME_CHANNEL, {
        schema: SUBAGENT_RUNTIME_SCHEMA,
        version: SUBAGENT_RUNTIME_VERSION,
        accept(candidate: unknown) {
            if (!service && isRuntimeService(candidate)) service = candidate;
        },
    } satisfies RuntimeDiscoveryRequest);
    if (!service) throw new Error("The shared subagent runtime extension is not loaded.");
    return service;
}
