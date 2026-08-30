import type { AgentMessage } from "@earendil-works/pi-agent-core";
import type { Api, Model } from "@earendil-works/pi-ai";
import {
    type AgentSession,
    createAgentSession,
    DefaultResourceLoader,
    getAgentDir,
    SessionManager,
    SettingsManager,
} from "@earendil-works/pi-coding-agent";
import type { JobConfig, JobUsage, RunResult, Runner } from "./protocol.ts";

/** Session events that mean the child is still making progress. */
const ACTIVITY_EVENTS = new Set([
    "message_update",
    "message_end",
    "tool_execution_start",
    "tool_execution_update",
    "tool_execution_end",
    "auto_retry_start",
    "compaction_start",
]);

export interface RunnerDeps {
    resolveModel: (spec: string) => Model<Api> | undefined;
}

/** Build the runner: one in-process AgentSession per job, no extensions, no session file, disposed when done. */
export function createRunner(deps: RunnerDeps): Runner {
    return async (config, signal, onActivity) => {
        const model = deps.resolveModel(config.model);
        if (!model) throw new Error(`Unknown model: ${config.model}`);
        if (signal.aborted) throw new Error("Cancelled before start.");

        const agentDir = getAgentDir();
        const loader = new DefaultResourceLoader({
            cwd: config.cwd,
            agentDir,
            noExtensions: true,
            noSkills: true,
            noPromptTemplates: true,
            noThemes: true,
            noContextFiles: true,
            ...(config.promptMode === "replace" ? { systemPrompt: config.systemPrompt } : { appendSystemPrompt: [config.systemPrompt] }),
        });
        await loader.reload();

        const { session } = await createAgentSession({
            cwd: config.cwd,
            agentDir,
            model,
            thinkingLevel: config.thinkingLevel,
            tools: [...config.tools],
            resourceLoader: loader,
            sessionManager: SessionManager.inMemory(config.cwd),
            settingsManager: SettingsManager.create(config.cwd, agentDir),
        });

        // Cancel or timeout may have fired while the session was being built; the abort event is already gone.
        if (signal.aborted) {
            session.dispose();
            throw new Error("Cancelled before start.");
        }
        const unsubscribe = session.subscribe((event) => {
            if (ACTIVITY_EVENTS.has(event.type)) onActivity();
        });
        const onAbort = () => {
            session.abort().catch(() => {});
        };
        signal.addEventListener("abort", onAbort, { once: true });
        try {
            await session.prompt(config.task, { expandPromptTemplates: false, source: "extension" });
            return collect(session);
        } finally {
            signal.removeEventListener("abort", onAbort);
            unsubscribe();
            session.dispose();
        }
    };
}

/** Build the result: the last assistant message's text, or the most recent one that had any (marked partial), plus summed usage. */
function collect(session: AgentSession): RunResult {
    const assistants = session.state.messages.filter((m): m is Extract<AgentMessage, { role: "assistant" }> => m.role === "assistant");
    const textOf = (m: Extract<AgentMessage, { role: "assistant" }>) =>
        m.content
            .filter((c): c is Extract<(typeof m.content)[number], { type: "text" }> => c.type === "text")
            .map((c) => c.text)
            .join("")
            .trim();
    const last = assistants.at(-1);
    let text = last ? textOf(last) : "";
    let partial = false;
    if (!text) {
        text = [...assistants].reverse().map(textOf).find(Boolean) ?? "";
        partial = true;
    }
    const usage = assistants.reduce<JobUsage>(
        (acc, m) => ({
            input: acc.input + (m.usage?.input ?? 0),
            output: acc.output + (m.usage?.output ?? 0),
            totalTokens: acc.totalTokens + (m.usage?.totalTokens ?? 0),
            cost: acc.cost + (m.usage?.cost?.total ?? 0),
        }),
        { input: 0, output: 0, totalTokens: 0, cost: 0 },
    );
    return { text, partial, usage };
}

