import type { ExtensionAPI, Theme } from "@earendil-works/pi-coding-agent";
import { DynamicBorder } from "@earendil-works/pi-coding-agent";
import { matchesKey, truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import {
    BackgroundJobTracker,
    formatSubagentDuration,
    isSubagentActive,
    subagentInactivityMs,
    subagentQuietness,
    type SubagentQuietness,
} from "../lib/job-tracker.ts";
import type { BackgroundSubagentJobV1 } from "../runtime/background-protocol.ts";
import type { SubagentRunV1 } from "../runtime/protocol.ts";
import type { SubagentRuntimeService } from "./broker.ts";

const MAX_LIST_ROWS = 12;
const MAX_DETAIL_LINES = 26;
const DETAIL_ACTIVITY_LINES = 10;
const DETAIL_PROMPT_LINES = 6;
const REFRESH_INTERVAL_MS = 1_000;

type UiTheme = Theme;
type Notify = (message: string, level?: "info" | "warning" | "error") => void;

function shortId(id: string): string {
    return id.slice(0, 8);
}

function formatTokens(count: number): string {
    if (count < 1000) return `${count}`;
    if (count < 1_000_000) return `${(count / 1000).toFixed(1)}k`;
    return `${(count / 1_000_000).toFixed(1)}M`;
}

function statusStyle(theme: UiTheme, run: SubagentRunV1): (text: string) => string {
    switch (run.status) {
        case "running":
        case "starting":
            return (text) => theme.fg("accent", text);
        case "queued":
            return (text) => theme.fg("muted", text);
        case "succeeded":
            return (text) => theme.fg("success", text);
        case "failed":
        case "timed_out":
            return (text) => theme.fg("error", text);
        case "cancelled":
            return (text) => theme.fg("warning", text);
        default:
            return (text) => theme.fg("text", text);
    }
}

function activityText(run: SubagentRunV1): string {
    const activeTool = run.activeTools.at(-1);
    if (activeTool) return activeTool.title;
    const activity = run.recentActivity.at(-1);
    if (activity) return activity.title;
    return run.phase ?? run.status;
}

function elapsedText(run: SubagentRunV1, nowMs: number): string {
    const anchor = run.startedAt ?? run.updatedAt;
    const end = run.endedAt ?? nowMs;
    return formatSubagentDuration(end - anchor);
}

function quietColorFor(quietness: SubagentQuietness): "warning" | "error" {
    return quietness === "stalled" ? "error" : "warning";
}

function quietLabel(job: BackgroundSubagentJobV1, nowMs: number): { text: string; color: "warning" | "error" } | undefined {
    const quietness = subagentQuietness(job, nowMs);
    if (!quietness) return undefined;
    return {
        text: `idle ${formatSubagentDuration(subagentInactivityMs(job, nowMs))}`,
        color: quietColorFor(quietness),
    };
}

function summarize(jobs: BackgroundSubagentJobV1[]): string {
    const nowMs = Date.now();
    const active = jobs.filter((job) => isSubagentActive(job));
    if (active.length === 0) {
        return jobs.length > 0
            ? `No active subagents. ${jobs.length} finished job(s) tracked.`
            : "No background subagent jobs.";
    }
    const running = active.filter((job) => job.run.status === "running").length;
    const queued = active.length - running;
    let line = `subagents: ${running} running, ${queued} queued`;
    const oldestQuiet = Math.max(0, ...active.map((job) => subagentInactivityMs(job, nowMs)));
    if (oldestQuiet >= 2 * 60_000) line += `, oldest idle ${formatSubagentDuration(oldestQuiet)}`;
    return line;
}

class SubagentsDashboard {
    private selected = 0;
    private detail = false;
    private confirmId: string | undefined;
    private readonly refreshTimer: ReturnType<typeof setInterval>;

    constructor(
        private readonly tui: { requestRender(): void },
        private readonly theme: UiTheme,
        private readonly runtime: SubagentRuntimeService,
        private readonly notify: Notify,
        private readonly close: () => void,
        private readonly tracker: BackgroundJobTracker,
        private readonly sessionId: string,
    ) {
        this.refreshTimer = setInterval(() => this.tui.requestRender(), REFRESH_INTERVAL_MS);
        this.refreshTimer.unref();
    }

    /** Only clean up; the overlay factory disposes the component on close. */
    dispose(): void {
        clearInterval(this.refreshTimer);
        this.tracker.dispose();
    }

    private sorted(): BackgroundSubagentJobV1[] {
        return this.tracker.list(this.sessionId).sort((a, b) => {
            const aDone = isSubagentActive(a) ? 0 : 1;
            const bDone = isSubagentActive(b) ? 0 : 1;
            if (aDone !== bDone) return aDone - bDone;
            return b.run.updatedAt - a.run.updatedAt;
        });
    }

    private cancel(jobId: string): void {
        void this.runtime
            .cancel([jobId])
            .then((results) => {
                this.notify(`Cancelled ${shortId(jobId)} (${results[0]?.run.status ?? "unknown"}).`, "info");
            })
            .catch((error: unknown) => {
                this.notify(`Cancel failed: ${error instanceof Error ? error.message : String(error)}`, "error");
            })
            .finally(() => this.tui.requestRender());
    }

    handleInput(data: string): void {
        const sorted = this.sorted();
        if (this.confirmId) {
            if (data === "y") {
                const id = this.confirmId;
                this.confirmId = undefined;
                this.cancel(id);
            } else if (data === "n" || matchesKey(data, "escape")) {
                this.confirmId = undefined;
            }
            this.tui.requestRender();
            return;
        }
        if (matchesKey(data, "escape")) {
            this.close();
            return;
        }
        if (matchesKey(data, "up")) {
            this.selected = Math.max(0, this.selected - 1);
        } else if (matchesKey(data, "down")) {
            this.selected = Math.min(Math.max(0, sorted.length - 1), this.selected + 1);
        } else if (matchesKey(data, "enter")) {
            if (sorted.length > 0) this.detail = !this.detail;
        } else if (data === "c") {
            const job = sorted[this.selected];
            if (job && isSubagentActive(job)) this.confirmId = job.id;
        }
        this.tui.requestRender();
    }

    invalidate(): void {}

    render(width: number): string[] {
        const sorted = this.sorted();
        if (this.selected >= sorted.length) this.selected = Math.max(0, sorted.length - 1);
        const selectedJob = sorted[this.selected];
        const lines = this.detail && selectedJob
            ? this.renderDetail(width, selectedJob)
            : this.renderList(width, sorted);
        const framed = [
            new DynamicBorder((s: string) => this.theme.fg("border", s)).render(width)[0] ?? "",
            ...lines,
            new DynamicBorder((s: string) => this.theme.fg("border", s)).render(width)[0] ?? "",
        ];
        return framed.map((line) => truncateToWidth(line, width));
    }

    private frame(width: number, content: string): string {
        const inner = Math.max(1, width - 2);
        const text = truncateToWidth(content, inner);
        const padding = " ".repeat(Math.max(0, inner - visibleWidth(text)));
        return `${this.theme.fg("border", "│")}${text}${padding}${this.theme.fg("border", "│")}`;
    }

    private renderList(width: number, sorted: BackgroundSubagentJobV1[]): string[] {
        const th = this.theme;
        const lines: string[] = [];
        const active = sorted.filter((job) => isSubagentActive(job)).length;
        const title = `${this.selected + 1}/${sorted.length} · ${active} active`;
        lines.push(this.frame(width, ` ${th.fg("accent", th.bold("Subagents"))} ${th.fg("muted", title)}`));

        if (sorted.length === 0) {
            lines.push(this.frame(width, ` ${th.fg("dim", "No background subagent jobs.")}`));
        }

        const start = sorted.length <= MAX_LIST_ROWS
            ? 0
            : Math.min(Math.max(0, this.selected - MAX_LIST_ROWS + 1), sorted.length - MAX_LIST_ROWS);
        const window = sorted.slice(start, start + MAX_LIST_ROWS);
        const nowMs = Date.now();
        for (const job of window) {
            const index = sorted.indexOf(job);
            const isSelected = index === this.selected;
            const marker = isSelected ? th.fg("accent", "›") : " ";
            const run = job.run;
            const status = statusStyle(th, run)(run.status.padEnd(9));
            const id = th.fg("dim", shortId(job.id));
            const age = th.fg("dim", elapsedText(run, nowMs).padStart(5));
            const confirm = this.confirmId === job.id
                ? ` ${th.fg("warning", th.bold("cancel? y/n"))}`
                : "";
            const quiet = confirm ? undefined : quietLabel(job, nowMs);
            const quietPart = quiet
                ? ` ${th.fg(quiet.color, quiet.text)}`
                : "";
            const titleText = truncateToWidth(job.title, 28);
            const activity = truncateToWidth(activityText(run), Math.max(10, width - 60));
            lines.push(
                this.frame(
                    width,
                    `${marker} ${status} ${id} ${age}  ${titleText}  ${th.fg("muted", activity)}${quietPart}${confirm}`,
                ),
            );
        }

        lines.push(
            this.frame(
                width,
                ` ${th.fg("dim", "↑↓ select · enter details · c cancel · esc close")}`,
            ),
        );
        return lines;
    }

    private renderDetail(width: number, job: BackgroundSubagentJobV1): string[] {
        const th = this.theme;
        const run = job.run;
        const nowMs = Date.now();
        const lines: string[] = [];
        const label = (name: string, value: string, style?: (text: string) => string): string =>
            ` ${th.fg("dim", `${name.padEnd(9)}`)}${style ? style(value) : value}`;

        lines.push(
            this.frame(
                width,
                ` ${th.fg("accent", th.bold(`Subagent ${shortId(job.id)}`))} ${th.fg("muted", "· detail")}`,
            ),
        );
        lines.push(this.frame(width, label("title", truncateToWidth(job.title, Math.max(10, width - 16)))));
        lines.push(this.frame(width, label("id", job.id)));
        lines.push(this.frame(width, label("agent", `${run.agent} · ${run.model}`)));
        lines.push(this.frame(width, label("cwd", run.cwd)));
        lines.push(
            this.frame(
                width,
                label(
                    "status",
                    `${run.status}${run.phase ? ` (${run.phase})` : ""}`,
                    statusStyle(th, run),
                ),
            ),
        );
        lines.push(
            this.frame(
                width,
                label("age", `${elapsedText(run, nowMs)}${run.endedAt ? " (ended)" : ""}`),
            ),
        );
        const quiet = quietLabel(job, nowMs);
        lines.push(
            this.frame(
                width,
                label(
                    "updated",
                    `${formatSubagentDuration(nowMs - run.updatedAt)} ago${quiet ? ` · ${quiet.text}` : ""}`,
                    quiet ? (text) => th.fg(quiet.color, text) : undefined,
                ),
            ),
        );
        lines.push(
            this.frame(
                width,
                label(
                    "usage",
                    `${formatTokens(run.usage.totalTokens)} tok · ${run.usage.turns} turns · $${run.usage.cost.toFixed(4)}`,
                ),
            ),
        );

        if (run.activeTools.length > 0) {
            lines.push(this.frame(width, ` ${th.fg("dim", "tools".padEnd(9))}${th.fg("accent", "running:")}`));
            for (const tool of run.activeTools.slice(-3)) {
                lines.push(
                    this.frame(
                        width,
                        ` ${" ".repeat(9)}${th.fg("accent", `▸ ${truncateToWidth(tool.title, Math.max(10, width - 14))}`)}`,
                    ),
                );
            }
        }

        const activity = run.recentActivity.slice(-DETAIL_ACTIVITY_LINES).reverse();
        if (activity.length > 0) {
            lines.push(this.frame(width, ` ${th.fg("dim", "activity".padEnd(9))}${th.fg("dim", "newest first")}`));
            for (const entry of activity) {
                const time = th.fg("dim", formatSubagentDuration(Math.max(0, nowMs - entry.timestamp)).padStart(5));
                const title = truncateToWidth(entry.title.replace(/\s+/g, " "), Math.max(10, width - 18));
                const styled = entry.isError ? th.fg("error", title) : title;
                lines.push(this.frame(width, ` ${" ".repeat(9)}${time}  ${styled}`));
            }
        }

        if (run.error) {
            lines.push(this.frame(width, ` ${th.fg("dim", "error".padEnd(9))}${th.fg("error", "problem:")}`));
            for (const line of run.error.split("\n").slice(0, 4)) {
                lines.push(this.frame(width, ` ${" ".repeat(9)}${th.fg("error", truncateToWidth(line, Math.max(10, width - 14)))}`));
            }
        }
        if (run.fullOutputPath) {
            lines.push(this.frame(width, label("output", truncateToWidth(run.fullOutputPath, Math.max(10, width - 14)))));
        }
        if (job.prompt) {
            lines.push(this.frame(width, ` ${th.fg("dim", "prompt".padEnd(9))}${th.fg("dim", "first lines")}`));
            for (const line of job.prompt.split("\n").slice(0, DETAIL_PROMPT_LINES)) {
                if (!line.trim()) continue;
                lines.push(
                    this.frame(width, ` ${" ".repeat(9)}${th.fg("muted", truncateToWidth(line, Math.max(10, width - 14)))}`),
                );
            }
        }

        if (lines.length > MAX_DETAIL_LINES) {
            const kept = lines.slice(0, MAX_DETAIL_LINES - 1);
            const omitted = lines.length - kept.length;
            kept.push(this.frame(width, ` ${th.fg("dim", `… ${omitted} more line(s)`)} `));
            lines.length = 0;
            lines.push(...kept);
        }
        lines.push(
            this.frame(
                width,
                ` ${th.fg("dim", "enter back · c cancel · esc close")}`,
            ),
        );
        return lines;
    }
}

function textSummary(runtime: SubagentRuntimeService): string {
    try {
        return summarize(runtime.list());
    } catch {
        return "Subagent runtime unavailable.";
    }
}

export function registerSubagentDashboard(pi: ExtensionAPI, runtime: SubagentRuntimeService): void {
    pi.registerCommand("subagents", {
        description: "Show the live background subagent dashboard",
        handler: async (_args, ctx) => {
            if (ctx.mode !== "tui") {
                ctx.ui.notify(textSummary(runtime), "info");
                return;
            }
            await ctx.ui.custom<void>((tui, theme, _keybindings, done) => {
                const sessionId = ctx.sessionManager.getSessionId();
                const tracker = new BackgroundJobTracker({
                    events: pi.events,
                    onChange: () => tui.requestRender(),
                });
                let dashboard: SubagentsDashboard | undefined;
                const finish = () => {
                    dashboard?.dispose();
                    done();
                };
                dashboard = new SubagentsDashboard(
                    tui,
                    theme,
                    runtime,
                    (message, level) => ctx.ui.notify(message, level),
                    finish,
                    tracker,
                    sessionId,
                );
                return {
                    render: (width) => dashboard!.render(width),
                    invalidate: () => dashboard!.invalidate(),
                    handleInput: (data) => dashboard!.handleInput(data),
                };
            }, {
                overlay: true,
                overlayOptions: {
                    anchor: "center",
                    width: "76%",
                    minWidth: 48,
                    maxHeight: "80%",
                },
            });
        },
    });
}
