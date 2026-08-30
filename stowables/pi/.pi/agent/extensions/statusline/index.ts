import * as os from "node:os";
import * as path from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { truncateToWidth } from "@earendil-works/pi-tui";
import { createSubagentStatusline } from "./subagents.ts";

function compactPath(cwd: string): string {
    const home = process.env.HOME || os.homedir();
    if (cwd === home) return "~";
    if (home && cwd.startsWith(`${home}${path.sep}`)) return `~${cwd.slice(home.length)}`;
    return cwd;
}

function formatTokens(count: number): string {
    if (count === 0) return "0.0k";
    if (count < 1000) return count.toString();
    if (count < 1000000) return `${(count / 1000).toFixed(1)}k`;
    return `${(count / 1000000).toFixed(1)}M`;
}

export default function statusline(pi: ExtensionAPI) {
    pi.on("session_start", (_event, ctx) => {
        ctx.ui.setFooter((tui, theme, footerData) => {
            const requestRender = () => tui.requestRender();
            const unsubscribeBranch = footerData.onBranchChange(requestRender);
            const subagents = createSubagentStatusline(pi.events, ctx.sessionManager.getSessionId(), requestRender);

            return {
                dispose: () => {
                    unsubscribeBranch();
                    subagents.dispose();
                },
                invalidate() {},
                render(width: number): string[] {
                    const cwd = compactPath(ctx.sessionManager.getCwd());
                    const branch = footerData.getGitBranch();
                    const context = formatTokens(ctx.getContextUsage()?.tokens ?? 0);
                    const model = ctx.model;
                    const modelName = model?.id || "no-model";
                    const thinking = model?.reasoning ? pi.getThinkingLevel() : "";
                    const parts = [cwd, ...(branch ? [branch] : []), context, `${modelName}${thinking ? ` ${thinking}` : ""}`];
                    const ellipsis = theme.fg("dim", "...");
                    const original = truncateToWidth(theme.fg("dim", parts.join(" | ")), width, ellipsis);

                    return [original, ...subagents.render(width, theme)];
                },
            };
        });
    });
}
