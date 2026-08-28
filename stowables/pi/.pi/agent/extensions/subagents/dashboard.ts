import { DynamicBorder, type ExtensionAPI, type Theme } from "@earendil-works/pi-coding-agent";
import { matchesKey, truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import {
    formatSubagentDuration,
    isSubagentActive,
    type SubagentJob,
    subagentInactivityMs,
    subagentQuietness,
    summarizeSubagentJobs,
} from "./jobs.ts";
import type { SubagentManager } from "./manager.ts";

const MAX_LIST_ROWS = 12;
const MAX_DETAIL_LINES = 26;
const DETAIL_ACTIVITY_LINES = 10;
const DETAIL_PROMPT_LINES = 6;
const REFRESH_INTERVAL_MS = 1_000;

type Style = (text: string) => string;
type Notify = (message: string, level?: "info" | "warning" | "error") => void;

const shortId = (id: string) => id.slice(0, 8);

function formatTokens(count: number): string {
    if (count < 1000) return `${count}`;
    if (count < 1_000_000) return `${(count / 1000).toFixed(1)}k`;
    return `${(count / 1_000_000).toFixed(1)}M`;
}

function statusStyle(theme: Theme, job: SubagentJob): Style {
    switch (job.status) {
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
    }
}

function activityText(job: SubagentJob): string {
    return job.activeTools.at(-1)?.title ?? job.recentActivity.at(-1)?.title ?? job.phase;
}

function elapsedText(job: SubagentJob, now: number): string {
    return formatSubagentDuration((job.endedAt ?? now) - (job.startedAt ?? job.updatedAt));
}

function quietLabel(job: SubagentJob, now: number): { text: string; color: "warning" | "error" } | undefined {
    const quietness = subagentQuietness(job, now);
    if (!quietness) return undefined;
    return {
        text: `idle ${formatSubagentDuration(subagentInactivityMs(job, now))}`,
        color: quietness === "stalled" ? "error" : "warning",
    };
}

class Dashboard {
    private selected = 0;
    private detail = false;
    private confirmId: string | undefined;
    private readonly refreshTimer: ReturnType<typeof setInterval>;
    private readonly unsubscribe: () => void;

    constructor(
        private readonly tui: { requestRender(): void },
        private readonly theme: Theme,
        private readonly manager: SubagentManager,
        private readonly notify: Notify,
        private readonly close: () => void,
    ) {
        this.refreshTimer = setInterval(() => tui.requestRender(), REFRESH_INTERVAL_MS);
        this.refreshTimer.unref();
        this.unsubscribe = manager.subscribe(() => tui.requestRender());
    }

    dispose(): void {
        clearInterval(this.refreshTimer);
        this.unsubscribe();
    }

    private sorted(): SubagentJob[] {
        return this.manager.list().sort((a, b) => {
            const aDone = isSubagentActive(a) ? 0 : 1;
            const bDone = isSubagentActive(b) ? 0 : 1;
            return aDone !== bDone ? aDone - bDone : b.updatedAt - a.updatedAt;
        });
    }

    private cancel(jobId: string): void {
        void this.manager
            .cancel([jobId])
            .then((jobs) => this.notify(`Cancelled ${shortId(jobId)} (${jobs[0]?.status ?? "unknown"}).`, "info"))
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
        if (matchesKey(data, "escape")) return this.close();
        if (matchesKey(data, "up")) this.selected = Math.max(0, this.selected - 1);
        else if (matchesKey(data, "down")) this.selected = Math.min(Math.max(0, sorted.length - 1), this.selected + 1);
        else if (matchesKey(data, "enter")) this.detail = sorted.length > 0 && !this.detail;
        else if (data === "c") {
            const job = sorted[this.selected];
            if (job && isSubagentActive(job)) this.confirmId = job.id;
        }
        this.tui.requestRender();
    }

    render(width: number): string[] {
        const sorted = this.sorted();
        if (this.selected >= sorted.length) this.selected = Math.max(0, sorted.length - 1);
        const selectedJob = sorted[this.selected];
        const lines = this.detail && selectedJob ? this.renderDetail(width, selectedJob) : this.renderList(width, sorted);
        const border = new DynamicBorder((s: string) => this.theme.fg("border", s)).render(width)[0] ?? "";
        return [border, ...lines, border].map((line) => truncateToWidth(line, width));
    }

    private frame(width: number, content: string): string {
        const inner = Math.max(1, width - 2);
        const text = truncateToWidth(content, inner);
        const padding = " ".repeat(Math.max(0, inner - visibleWidth(text)));
        return `${this.theme.fg("border", "│")}${text}${padding}${this.theme.fg("border", "│")}`;
    }

    private renderList(width: number, sorted: SubagentJob[]): string[] {
        const th = this.theme;
        const active = sorted.filter(isSubagentActive).length;
        const lines = [
            this.frame(
                width,
                ` ${th.fg("accent", th.bold("Subagents"))} ${th.fg("muted", `${this.selected + 1}/${sorted.length} · ${active} active`)}`,
            ),
        ];
        if (sorted.length === 0) lines.push(this.frame(width, ` ${th.fg("dim", "No subagent jobs.")}`));

        const start =
            sorted.length <= MAX_LIST_ROWS
                ? 0
                : Math.min(Math.max(0, this.selected - MAX_LIST_ROWS + 1), sorted.length - MAX_LIST_ROWS);
        const now = Date.now();
        sorted.slice(start, start + MAX_LIST_ROWS).forEach((job, offset) => {
            const isSelected = start + offset === this.selected;
            const marker = isSelected ? th.fg("accent", "›") : " ";
            const status = statusStyle(th, job)(job.status.padEnd(9));
            const id = th.fg("dim", shortId(job.id));
            const age = th.fg("dim", elapsedText(job, now).padStart(5));
            const confirm = this.confirmId === job.id ? ` ${th.fg("warning", th.bold("cancel? y/n"))}` : "";
            const quiet = confirm ? undefined : quietLabel(job, now);
            const quietPart = quiet ? ` ${th.fg(quiet.color, quiet.text)}` : "";
            const title = truncateToWidth(job.title, 28);
            const activity = th.fg("muted", truncateToWidth(activityText(job), Math.max(10, width - 60)));
            lines.push(this.frame(width, `${marker} ${status} ${id} ${age}  ${title}  ${activity}${quietPart}${confirm}`));
        });
        lines.push(this.frame(width, ` ${th.fg("dim", "↑↓ select · enter details · c cancel · esc close")}`));
        return lines;
    }

    private renderDetail(width: number, job: SubagentJob): string[] {
        const th = this.theme;
        const now = Date.now();
        const indent = " ".repeat(9);
        const label = (name: string, value: string, style?: Style) =>
            this.frame(width, ` ${th.fg("dim", name.padEnd(9))}${style ? style(value) : value}`);
        const section = (name: string, note: string, color: "accent" | "dim" | "error" = "dim") =>
            this.frame(width, ` ${th.fg("dim", name.padEnd(9))}${th.fg(color, note)}`);
        const item = (text: string, style: Style = (s) => s) =>
            this.frame(width, ` ${indent}${style(truncateToWidth(text, Math.max(10, width - 14)))}`);
        const quiet = quietLabel(job, now);

        const lines = [
            this.frame(width, ` ${th.fg("accent", th.bold(`Subagent ${shortId(job.id)}`))} ${th.fg("muted", "· detail")}`),
            label("title", truncateToWidth(job.title, Math.max(10, width - 16))),
            label("id", job.id),
            label("agent", `${job.agent} · ${job.model}`),
            label("cwd", job.cwd),
            label("status", `${job.status} (${job.phase})`, statusStyle(th, job)),
            label("age", `${elapsedText(job, now)}${job.endedAt ? " (ended)" : ""}`),
            label(
                "updated",
                `${formatSubagentDuration(now - job.updatedAt)} ago${quiet ? ` · ${quiet.text}` : ""}`,
                quiet ? (text) => th.fg(quiet.color, text) : undefined,
            ),
            label(
                "usage",
                `${formatTokens(job.usage.totalTokens)} tok · ${job.usage.turns} turns · $${job.usage.cost.toFixed(4)}`,
            ),
        ];

        if (job.activeTools.length > 0) {
            lines.push(section("tools", "running:", "accent"));
            for (const tool of job.activeTools.slice(-3)) lines.push(item(`▸ ${tool.title}`, (s) => th.fg("accent", s)));
        }
        const activity = job.recentActivity.slice(-DETAIL_ACTIVITY_LINES).reverse();
        if (activity.length > 0) {
            lines.push(section("activity", "newest first"));
            for (const entry of activity) {
                const time = th.fg("dim", formatSubagentDuration(Math.max(0, now - entry.timestamp)).padStart(5));
                const title = truncateToWidth(entry.title.replace(/\s+/g, " "), Math.max(10, width - 18));
                lines.push(this.frame(width, ` ${indent}${time}  ${entry.isError ? th.fg("error", title) : title}`));
            }
        }
        if (job.error) {
            lines.push(section("error", "problem:", "error"));
            for (const line of job.error.split("\n").slice(0, 4)) lines.push(item(line, (s) => th.fg("error", s)));
        }
        if (job.fullOutputPath) lines.push(label("output", truncateToWidth(job.fullOutputPath, Math.max(10, width - 14))));
        if (job.prompt) {
            lines.push(section("prompt", "first lines"));
            for (const line of job.prompt.split("\n").slice(0, DETAIL_PROMPT_LINES)) {
                if (line.trim()) lines.push(item(line, (s) => th.fg("muted", s)));
            }
        }
        if (lines.length > MAX_DETAIL_LINES) {
            const omitted = lines.length - (MAX_DETAIL_LINES - 1);
            lines.splice(MAX_DETAIL_LINES - 1, omitted, this.frame(width, ` ${th.fg("dim", `… ${omitted} more line(s)`)}`));
        }
        lines.push(this.frame(width, ` ${th.fg("dim", "enter back · c cancel · esc close")}`));
        return lines;
    }
}

export function registerSubagentDashboard(pi: ExtensionAPI, manager: SubagentManager): void {
    pi.registerCommand("subagents", {
        description: "Show the live subagent dashboard",
        handler: async (_args, ctx) => {
            if (ctx.mode !== "tui") {
                ctx.ui.notify(summarizeSubagentJobs(manager.list()), "info");
                return;
            }
            await ctx.ui.custom<void>(
                (tui, theme, _keybindings, done) => {
                    const dashboard = new Dashboard(tui, theme, manager, (m, level) => ctx.ui.notify(m, level), () => {
                        dashboard.dispose();
                        done();
                    });
                    return {
                        render: (width) => dashboard.render(width),
                        invalidate: () => {},
                        handleInput: (data) => dashboard.handleInput(data),
                    };
                },
                { overlay: true, overlayOptions: { anchor: "center", width: "76%", minWidth: 48, maxHeight: "80%" } },
            );
        },
    });
}
