import * as fs from "node:fs";
import * as path from "node:path";
import type { Message } from "@earendil-works/pi-ai";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { DEFAULT_MAX_BYTES, DEFAULT_MAX_LINES, truncateHead } from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";
import { Type, type Static } from "typebox";

const DEFAULT_MODEL = "openai-codex/gpt-5.4-mini:off";
const DEFAULT_TIMEOUT_SECONDS = 120;
const MAX_TIMEOUT_SECONDS = 600;
const TOOLS = "read,grep,find,ls";

const ExploreParams = Type.Object({
  prompt: Type.String({ description: "Steering prompt for the read-only codebase exploration." }),
  model: Type.Optional(Type.String({ description: `Model to use for the subagent. Defaults to PI_EXPLORE_MODEL or ${DEFAULT_MODEL}.` })),
  timeout_seconds: Type.Optional(Type.Number({ description: `Timeout in seconds. Default ${DEFAULT_TIMEOUT_SECONDS}, max ${MAX_TIMEOUT_SECONDS}.` })),
});

type ExploreParams = Static<typeof ExploreParams>;

type ExploreDetails = {
  model: string;
  timeoutSeconds: number;
  tools: string;
  exitCode: number;
  timedOut: boolean;
  aborted: boolean;
  progress: string[];
  messages: Message[];
  stderr: string;
  fullOutput: string;
  truncated: boolean;
};

const SYSTEM_PROMPT = `You are a read-only codebase exploration subagent.

Explore only what is needed to answer the user's prompt. Use read, grep, find, and ls. Do not propose code changes unless explicitly asked; focus on locating and explaining relevant code.

Return a compact report in this exact shape:

## Summary
One-paragraph answer to the exploration prompt.

## Relevant Files
- \`path\` — why it matters
- \`path:line-range\` — key section

## Key Findings
- Finding with evidence
- Finding with evidence

## Suggested Next Reads
- \`path\` — why`;

function clampTimeout(value: unknown): number {
  const n = typeof value === "number" && Number.isFinite(value) ? Math.floor(value) : DEFAULT_TIMEOUT_SECONDS;
  return Math.max(1, Math.min(MAX_TIMEOUT_SECONDS, n));
}

function getModel(params: ExploreParams): string {
  return params.model?.trim() || process.env.PI_EXPLORE_MODEL?.trim() || DEFAULT_MODEL;
}

function getPiInvocation(args: string[]): { command: string; args: string[] } {
  const currentScript = process.argv[1];
  if (currentScript && !currentScript.startsWith("/$bunfs/root/") && fs.existsSync(currentScript)) {
    return { command: process.execPath, args: [currentScript, ...args] };
  }

  const execName = path.basename(process.execPath).toLowerCase();
  return /^(node|bun)(\.exe)?$/.test(execName) ? { command: "pi", args } : { command: process.execPath, args };
}

function finalAssistantText(messages: Message[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role !== "assistant") continue;
    const parts = message.content.filter((part): part is { type: "text"; text: string } => part.type === "text");
    if (parts.length) return parts.map((part) => part.text).join("\n\n").trim();
  }
  return "";
}

function compactToolCall(toolName: string, input: unknown): string {
  const args = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
  if (toolName === "read") return `read ${String(args.path ?? args.file_path ?? "...")}`;
  if (toolName === "grep") return `grep ${String(args.pattern ?? "...")} in ${String(args.path ?? ".")}`;
  if (toolName === "find") return `find ${String(args.pattern ?? "*")} in ${String(args.path ?? ".")}`;
  if (toolName === "ls") return `ls ${String(args.path ?? ".")}`;
  return toolName;
}

type PiJsonEvent = {
  type?: string;
  message?: Message;
  toolName?: string;
  tool_name?: string;
  name?: string;
  args?: unknown;
  input?: unknown;
  arguments?: unknown;
};

function parsePiOutput(stdout: string): { messages: Message[]; progress: string[] } {
  const messages: Message[] = [];
  const progress: string[] = [];

  for (const line of stdout.split("\n")) {
    if (!line.trim()) continue;

    let event: PiJsonEvent;
    try {
      event = JSON.parse(line) as PiJsonEvent;
    } catch {
      continue;
    }

    if (event.type === "message_end" && event.message) messages.push(event.message);

    const toolName = event.toolName ?? event.tool_name ?? event.name;
    if ((event.type === "tool_execution_start" || event.type === "tool_call") && toolName) {
      progress.push(compactToolCall(toolName, event.args ?? event.input ?? event.arguments));
    }
  }

  return { messages, progress };
}

export default function exploreExtension(pi: ExtensionAPI) {
  pi.registerTool({
    name: "explore",
    label: "Explore",
    description: "Launch a read-only lightweight Pi subagent to explore the current codebase with an optional steering prompt. Child tools: read, grep, find, ls. Output is capped at 50KB.",
    promptSnippet: "Launch a read-only subagent to explore the codebase and return compact findings.",
    promptGuidelines: [
      "Use explore when you need isolated, read-only codebase reconnaissance before answering or editing.",
      "Pass explore a specific prompt that names the subsystem, question, or files to investigate.",
      "Run multiple explore tool calls in parallel when independent parts of the codebase should be scouted separately.",
    ],
    parameters: ExploreParams,

    async execute(_toolCallId, params, signal, onUpdate, ctx) {
      const model = getModel(params);
      const timeoutSeconds = clampTimeout(params.timeout_seconds);
      const args = [
        "--mode", "json",
        "-p",
        "--no-session",
        "--no-extensions",
        "--no-skills",
        "--no-prompt-templates",
        "--no-context-files",
        "--tools", TOOLS,
        "--model", model,
        "--system-prompt", SYSTEM_PROMPT,
        `Explore this codebase from cwd ${ctx.cwd}.\n\nPrompt:\n${params.prompt}`,
      ];

      onUpdate?.({
        content: [{ type: "text", text: "Exploring codebase..." }],
        details: { model, timeoutSeconds, tools: TOOLS, progress: [] },
      });

      const invocation = getPiInvocation(args);
      const execution = await pi.exec(invocation.command, invocation.args, {
        cwd: ctx.cwd,
        signal,
        timeout: timeoutSeconds * 1000,
      });
      const { messages, progress } = parsePiOutput(execution.stdout);
      const aborted = signal?.aborted ?? false;
      const timedOut = execution.killed && !aborted;
      const exitCode = execution.code;
      const stderr = execution.stderr;

      const fullOutput = finalAssistantText(messages) || stderr.trim() || "(no output)";
      const truncation = truncateHead(fullOutput, { maxLines: DEFAULT_MAX_LINES, maxBytes: DEFAULT_MAX_BYTES });
      const status = timedOut ? `explore timed out after ${timeoutSeconds}s` : aborted ? "explore aborted" : exitCode ? `explore failed with exit code ${exitCode}` : undefined;
      const visibleOutput = status ? `${status}\n\n${truncation.content}` : truncation.content;
      const details: ExploreDetails = { model, timeoutSeconds, tools: TOOLS, exitCode, timedOut, aborted, progress, messages, stderr, fullOutput, truncated: truncation.truncated };

      return {
        content: [{ type: "text", text: truncation.truncated ? `${visibleOutput}\n\n[Output truncated to 50KB. Full output preserved in tool details.]` : visibleOutput }],
        details,
      };
    },

    renderCall(args, theme) {
      const prompt = typeof args.prompt === "string" ? args.prompt : "...";
      const preview = prompt.length > 80 ? `${prompt.slice(0, 80)}...` : prompt;
      return new Text(`${theme.fg("toolTitle", theme.bold("explore "))}${theme.fg("dim", preview)}`, 0, 0);
    },

    renderResult(result, { expanded, isPartial }, theme) {
      const details = result.details as Partial<ExploreDetails> | undefined;
      if (isPartial) return new Text(theme.fg("warning", "exploring...\n") + theme.fg("dim", (details?.progress ?? []).slice(-8).join("\n")), 0, 0);

      const failed = details?.timedOut || details?.aborted || (typeof details?.exitCode === "number" && details.exitCode !== 0);
      const icon = failed ? theme.fg("error", "✗") : theme.fg("success", "✓");
      let text = `${icon} ${theme.fg("toolTitle", "explore")}`;
      if (details?.model) text += theme.fg("dim", ` ${details.model}`);
      if (details?.progress?.length) text += `\n${theme.fg("dim", details.progress.slice(-8).join("\n"))}`;
      if (expanded) {
        const content = result.content[0];
        if (content?.type === "text") text += `\n\n${theme.fg("toolOutput", content.text)}`;
      }
      return new Text(text, 0, 0);
    },
  });
}
