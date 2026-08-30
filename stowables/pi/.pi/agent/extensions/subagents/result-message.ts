import * as fs from "node:fs";
import * as path from "node:path";
import { getMarkdownTheme, keyHint, type MessageRenderer } from "@earendil-works/pi-coding-agent";
import { Box, Markdown, Spacer, Text } from "@earendil-works/pi-tui";
import { seconds } from "./manager.ts";
import type { JobResult } from "./protocol.ts";

/** Inline text beyond this is cut; the full text is always on disk. */
const INLINE_LIMIT = 16 * 1024;

/** Compact metadata persisted with the custom message for TUI rendering. */
export interface SubagentResultDetails {
    id: string;
    profile: string;
    task: string;
    status: JobResult["status"];
    runtimeMs: number;
    partial: boolean;
    totalTokens?: number;
    error?: string;
    location: string;
}

export interface PreparedResultMessage {
    content: string;
    details: SubagentResultDetails;
}

function tokenLabel(totalTokens: number | undefined): string {
    return totalTokens === undefined ? "" : `, ${Math.round(totalTokens / 1000)}k tokens`;
}

/** Persist the complete output and prepare the bounded message injected into the parent context. */
export function prepareResultMessage(result: JobResult, dir: string): PreparedResultMessage {
    const { job } = result;
    let location = path.join(dir, `${job.id}.md`);
    try {
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(location, result.text || (result.error ?? ""), "utf8");
    } catch (error) {
        location = `not written (${error instanceof Error ? error.message : String(error)})`;
    }

    const totalTokens = result.usage?.totalTokens;
    const header = `[${job.id}] ${result.status} in ${seconds(result.runtimeMs)}${tokenLabel(totalTokens)}${result.partial ? ", partial output" : ""}\nTask: ${job.task}\nFull output: ${location}`;
    const body = result.error ? `Error: ${result.error}\n\n${result.text}` : result.text;
    const preview = body.length > INLINE_LIMIT ? `${body.slice(0, INLINE_LIMIT)}\n\n[truncated; read the full output file]` : body;

    return {
        content: `${header}\n\n${preview}`.trimEnd(),
        details: {
            id: job.id,
            profile: job.profile,
            task: job.task,
            status: result.status,
            runtimeMs: result.runtimeMs,
            partial: result.partial,
            totalTokens,
            error: result.error,
            location,
        },
    };
}

function contentText(content: string | Array<{ type: string; text?: string }>): string {
    return typeof content === "string" ? content : content.filter((part) => part.type === "text").map((part) => part.text ?? "").join("\n");
}

function normalizeDetails(details: unknown): SubagentResultDetails | undefined {
    if (!details || typeof details !== "object") return undefined;
    const current = details as Partial<SubagentResultDetails>;
    if (
        typeof current.id === "string" &&
        typeof current.profile === "string" &&
        typeof current.task === "string" &&
        typeof current.status === "string" &&
        typeof current.runtimeMs === "number" &&
        typeof current.partial === "boolean" &&
        typeof current.location === "string"
    ) {
        return current as SubagentResultDetails;
    }
    return undefined;
}

function previewFromContent(content: string): string {
    const separator = content.indexOf("\n\n");
    return separator < 0 ? "" : content.slice(separator + 2);
}

function compactTask(task: string): string {
    const oneLine = task.replace(/\s+/g, " ").trim();
    return oneLine.length > 120 ? `${oneLine.slice(0, 117)}...` : oneLine;
}

/** Render detached completions like tool results: compact by default and expanded globally with Ctrl-O. */
export const renderResultMessage: MessageRenderer<SubagentResultDetails> = (message, { expanded, outputPad }, theme) => {
    const textContent = contentText(message.content);
    const details = normalizeDetails(message.details);
    if (!details) return undefined;

    const succeeded = details.status === "completed";
    const background = succeeded ? "toolSuccessBg" : "toolErrorBg";
    const color = succeeded ? "success" : "error";
    const icon = succeeded ? "✓" : details.status === "timed_out" ? "⏱" : "✗";
    const partial = details.partial ? ", partial output" : "";
    const title = `${theme.fg(color, icon)} ${theme.fg("toolTitle", theme.bold(`[${details.id}]`))} ${theme.fg(color, details.status)}${theme.fg("dim", ` in ${seconds(details.runtimeMs)}${tokenLabel(details.totalTokens)}${partial}`)}`;
    const box = new Box(outputPad, 1, (text) => theme.bg(background, text));
    box.addChild(new Text(title, 0, 0));

    if (!expanded) {
        const hint = keyHint("app.tools.expand", "to expand");
        box.addChild(new Text(`${theme.fg("dim", `Task: ${compactTask(details.task)} (`)}${hint}${theme.fg("dim", ")")}`, 0, 0));
        return box;
    }

    box.addChild(new Text(`${theme.fg("muted", "Task:")} ${details.task}\n${theme.fg("muted", "Full output:")} ${details.location}`, 0, 0));
    const preview = previewFromContent(textContent);
    if (preview) {
        box.addChild(new Spacer(1));
        box.addChild(new Markdown(preview, 0, 0, getMarkdownTheme()));
    }
    return box;
};
