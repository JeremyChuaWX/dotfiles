import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import type { AssistantMessage } from "@earendil-works/pi-ai";
import { StringEnum } from "@earendil-works/pi-ai";
import type { AgentSessionEvent, ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { DEFAULT_MAX_BYTES, DEFAULT_MAX_LINES, formatSize, truncateHead } from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";
import { Type } from "typebox";

const AGENT_NAMES = ["explore"] as const;
type AgentName = (typeof AGENT_NAMES)[number];

type AgentPreset = {
  description: string;
  tools: readonly string[];
  defaultModel: string;
  modelEnv?: string;
  promptPath: string;
  timeoutMs: number;
};

const extensionDir = path.dirname(fileURLToPath(import.meta.url));
const AGENTS: Record<AgentName, AgentPreset> = {
  explore: {
    description: "read-only codebase exploration",
    tools: ["read", "grep", "find", "ls"],
    defaultModel: "openai-codex/gpt-5.4-mini:off",
    modelEnv: "PI_EXPLORE_MODEL",
    promptPath: path.join(extensionDir, "agents", "explore.md"),
    timeoutMs: 120_000,
  },
};

const AGENT_SUMMARY = AGENT_NAMES.map((name) => {
  const agent = AGENTS[name];
  return `${name} (${agent.description}; tools: ${agent.tools.join(", ")}; default model: ${agent.defaultModel})`;
}).join("; ");

const SubagentParams = Type.Object({
  agent: StringEnum(AGENT_NAMES, {
    description: "Fixed subagent configuration to use.",
  }),
  prompt: Type.String({
    description: "Task prompt for the subagent.",
  }),
  cwd: Type.String({
    description: "Working directory for the subagent process. Relative paths resolve from the parent working directory.",
  }),
  model: Type.Optional(
    Type.String({
      description: "Optional model override. Omit to use the selected agent's default model.",
    }),
  ),
});

type UsageDetails = {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  totalTokens: number;
  cost: number;
};

type SubagentDetails = {
  agent: AgentName;
  model?: string;
  toolCalls: string[];
  usage: UsageDetails;
  fullOutputPath?: string;
};

export function getPiInvocation(
  args: string[],
  currentScript = process.argv[1],
  execPath = process.execPath,
): { command: string; args: string[] } {
  // Reuse the current script only when it is Pi's actual CLI entrypoint. SDK hosts
  // (such as pi-tui) have their own process.argv[1] and cannot parse Pi CLI flags.
  let resolvedScript: string | undefined;
  if (currentScript && !currentScript.startsWith("/$bunfs/root/") && fs.existsSync(currentScript)) {
    try {
      resolvedScript = fs.realpathSync(currentScript);
    } catch {
      resolvedScript = currentScript;
    }
  }
  const packageSegment = `${path.sep}@earendil-works${path.sep}pi-coding-agent${path.sep}`;
  const isPiCli =
    resolvedScript?.includes(packageSegment) === true && path.basename(resolvedScript).toLowerCase() === "cli.js";
  if (isPiCli && currentScript) return { command: execPath, args: [currentScript, ...args] };

  const execName = path.basename(execPath).toLowerCase();
  return /^(node|bun)(\.exe)?$/.test(execName) ? { command: "pi", args } : { command: execPath, args };
}

function compactToolCall(toolName: string, input: unknown): string {
  const args = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
  if (toolName === "read") return `read ${String(args.path ?? args.file_path ?? "...")}`;
  if (toolName === "grep") return `grep ${String(args.pattern ?? "...")} in ${String(args.path ?? ".")}`;
  if (toolName === "find") return `find ${String(args.pattern ?? "*")} in ${String(args.path ?? ".")}`;
  if (toolName === "ls") return `ls ${String(args.path ?? ".")}`;
  if (toolName === "bash") return `$ ${String(args.command ?? "...")}`;
  return toolName;
}

type ParsedRun = {
  finalMessage?: AssistantMessage;
  toolCalls: string[];
  usage: UsageDetails;
};

function parseRun(stdout: string): ParsedRun {
  let finalMessage: AssistantMessage | undefined;
  const toolCalls: string[] = [];
  const usage: UsageDetails = {
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheWrite: 0,
    totalTokens: 0,
    cost: 0,
  };

  for (const line of stdout.split("\n")) {
    if (!line.trim()) continue;

    let event: AgentSessionEvent;
    try {
      event = JSON.parse(line) as AgentSessionEvent;
    } catch {
      continue;
    }

    if (event.type === "message_end" && event.message?.role === "assistant") {
      finalMessage = event.message;
      usage.input += event.message.usage.input || 0;
      usage.output += event.message.usage.output || 0;
      usage.cacheRead += event.message.usage.cacheRead || 0;
      usage.cacheWrite += event.message.usage.cacheWrite || 0;
      usage.totalTokens += event.message.usage.totalTokens || 0;
      usage.cost += event.message.usage.cost?.total || 0;
    } else if (event.type === "tool_execution_start" && event.toolName) {
      toolCalls.push(compactToolCall(event.toolName, event.args));
    }
  }

  return { finalMessage, toolCalls, usage };
}

function assistantText(message: AssistantMessage): string {
  return message.content
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("\n\n")
    .trim();
}

function resolveModel(agent: AgentPreset, override: string | undefined): string {
  const explicit = override?.trim();
  if (explicit) return explicit;
  const fromEnvironment = agent.modelEnv ? process.env[agent.modelEnv]?.trim() : undefined;
  return fromEnvironment || agent.defaultModel;
}

async function resolveWorkingDirectory(input: string, parentCwd: string): Promise<string> {
  let value = input.trim().replace(/^@/, "");
  if (!value) throw new Error("Subagent cwd must not be empty.");
  if (value === "~") value = os.homedir();
  else if (value.startsWith("~/")) value = path.join(os.homedir(), value.slice(2));

  const resolved = path.resolve(parentCwd, value);
  let stats: fs.Stats;
  try {
    stats = await fs.promises.stat(resolved);
  } catch {
    throw new Error(`Subagent cwd does not exist: ${resolved}`);
  }
  if (!stats.isDirectory()) throw new Error(`Subagent cwd is not a directory: ${resolved}`);
  return fs.promises.realpath(resolved);
}

async function saveFullOutput(output: string): Promise<string | undefined> {
  try {
    const directory = await fs.promises.mkdtemp(path.join(os.tmpdir(), "pi-subagent-"));
    const outputPath = path.join(directory, "output.md");
    await fs.promises.writeFile(outputPath, output, { encoding: "utf8", mode: 0o600 });
    return outputPath;
  } catch {
    return undefined;
  }
}

function formatFailure(prefix: string, output: string): string {
  const diagnostic = truncateHead(output.trim(), { maxLines: 40, maxBytes: 8 * 1024 }).content;
  return diagnostic ? `${prefix}\n\n${diagnostic}` : prefix;
}

export default function subagentExtension(pi: ExtensionAPI) {
  pi.registerTool({
    name: "subagent",
    label: "Subagent",
    description:
      "Spawn an isolated Pi subagent using an agent preset, task prompt, and working directory. " +
      `Available presets: ${AGENT_SUMMARY}. ` +
      "An optional model argument overrides the preset default. Output is capped at 50KB or 2000 lines.",
    promptSnippet: "Spawn an isolated Pi subagent for a task in a specified working directory.",
    promptGuidelines: [
      'Use subagent with agent "explore" for isolated, read-only codebase reconnaissance.',
      "Give subagent a focused prompt and the exact working directory it should inspect.",
      "Issue multiple independent subagent calls in the same turn when their exploration tasks can run in parallel.",
      "Omit subagent's model argument unless a model override is specifically useful.",
    ],
    parameters: SubagentParams,

    async execute(_toolCallId, params, signal, onUpdate, ctx) {
      const agentName = params.agent as AgentName;
      const agent = AGENTS[agentName];
      const cwd = await resolveWorkingDirectory(params.cwd, ctx.cwd);
      const model = resolveModel(agent, params.model);
      const systemPrompt = await fs.promises.readFile(agent.promptPath, "utf8");
      const tools = agent.tools.join(",");

      const args = [
        "--mode",
        "json",
        "--no-session",
        "--no-extensions",
        "--no-skills",
        "--no-prompt-templates",
        "--no-context-files",
        "--tools",
        tools,
        "--model",
        model,
        "--system-prompt",
        systemPrompt,
        params.prompt,
      ];

      onUpdate?.({
        content: [{ type: "text", text: `${agentName} subagent is running...` }],
        details: { agent: agentName, model },
      });

      const invocation = getPiInvocation(args);
      const execution = await pi.exec(invocation.command, invocation.args, {
        cwd,
        signal,
        timeout: agent.timeoutMs,
      });
      const run = parseRun(execution.stdout);
      const output = run.finalMessage ? assistantText(run.finalMessage) : "";
      const diagnostic = output || execution.stderr.trim();
      const aborted = signal?.aborted ?? false;
      const timedOut = execution.killed && !aborted;

      if (aborted || run.finalMessage?.stopReason === "aborted") {
        throw new Error(formatFailure("Subagent was aborted.", diagnostic));
      }
      if (timedOut) {
        throw new Error(formatFailure(`Subagent timed out after ${agent.timeoutMs / 1000} seconds.`, diagnostic));
      }
      if (execution.code !== 0) {
        throw new Error(formatFailure(`Subagent failed with exit code ${execution.code}.`, diagnostic));
      }
      if (!run.finalMessage) {
        throw new Error(formatFailure("Subagent exited without a final assistant message.", execution.stderr));
      }
      if (run.finalMessage.stopReason === "error") {
        throw new Error(formatFailure(run.finalMessage.errorMessage || "Subagent model request failed.", diagnostic));
      }

      const visibleOutput = output || "(no output)";
      const truncation = truncateHead(visibleOutput, {
        maxLines: DEFAULT_MAX_LINES,
        maxBytes: DEFAULT_MAX_BYTES,
      });
      const fullOutputPath = truncation.truncated ? await saveFullOutput(visibleOutput) : undefined;
      let resultText = truncation.content;
      if (truncation.truncated) {
        resultText += `\n\n[Output truncated to ${formatSize(DEFAULT_MAX_BYTES)} or ${DEFAULT_MAX_LINES} lines.`;
        if (fullOutputPath) resultText += ` Full output saved to: ${fullOutputPath}`;
        resultText += "]";
      }

      const details: SubagentDetails = {
        agent: agentName,
        model: run.finalMessage.model || model,
        toolCalls: run.toolCalls,
        usage: run.usage,
        fullOutputPath,
      };

      return {
        content: [{ type: "text", text: resultText }],
        details,
      };
    },

    renderCall(args, theme) {
      const agent = typeof args.agent === "string" ? args.agent : "...";
      const prompt = typeof args.prompt === "string" ? args.prompt : "...";
      const preview = prompt.length > 80 ? `${prompt.slice(0, 80)}...` : prompt;
      let text = `${theme.fg("toolTitle", theme.bold("subagent "))}${theme.fg("accent", agent)}`;
      if (typeof args.cwd === "string") text += theme.fg("muted", ` in ${args.cwd}`);
      text += `\n${theme.fg("dim", preview)}`;
      return new Text(text, 0, 0);
    },

    renderResult(result, { expanded, isPartial }, theme, context) {
      const details = result.details as Partial<SubagentDetails> | undefined;
      if (isPartial) {
        return new Text(theme.fg("warning", `${details?.agent ?? "subagent"} is running...`), 0, 0);
      }

      const content = result.content.find((item) => item.type === "text");
      const icon = context.isError ? theme.fg("error", "✗") : theme.fg("success", "✓");
      let text = `${icon} ${theme.fg("toolTitle", details?.agent ?? "subagent")}`;
      if (details?.model) text += theme.fg("dim", ` ${details.model}`);
      if (details?.toolCalls?.length) text += `\n${theme.fg("dim", details.toolCalls.slice(-8).join("\n"))}`;
      if (details?.usage) {
        const usage = details.usage;
        text += theme.fg("dim", `\n↑${usage.input} ↓${usage.output} total:${usage.totalTokens} $${usage.cost.toFixed(4)}`);
      }
      if (content?.type === "text" && (context.isError || expanded)) {
        const color = context.isError ? "error" : "toolOutput";
        text += `\n\n${theme.fg(color, content.text)}`;
      }
      return new Text(text, 0, 0);
    },
  });
}
