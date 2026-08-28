import * as os from "node:os";
import * as path from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { truncateToWidth } from "@earendil-works/pi-tui";
import {
    BackgroundJobTracker,
    formatSubagentDuration,
    isSubagentActive,
    subagentInactivityMs,
} from "./subagents/lib/job-tracker.ts";

/** Footer calls out a running job once it has been quiet this long. */
const SUBAGENT_QUIET_MS = 2 * 60_000;

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
  let tracker: BackgroundJobTracker | undefined;

  pi.on("session_start", (_event, ctx) => {
    const sessionId = ctx.sessionManager.getSessionId();

    ctx.ui.setFooter((tui, theme, footerData) => {
      const unsubscribe = footerData.onBranchChange(() => tui.requestRender());

      tracker?.dispose();
      tracker = new BackgroundJobTracker({
        events: pi.events,
        onChange: () => tui.requestRender(),
      });

      return {
        dispose: () => {
          unsubscribe();
          tracker?.dispose();
          tracker = undefined;
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

          const activeJobs = (tracker?.list(sessionId) ?? []).filter((job) => isSubagentActive(job));
          if (activeJobs.length > 0) {
            const running = activeJobs.filter((job) => job.run.status === "running").length;
            const queued = activeJobs.length - running;
            let segment = `sub ${running} run`;
            if (queued > 0) segment += `/${queued} q`;
            const now = Date.now();
            const oldestQuiet = Math.max(...activeJobs.map((job) => subagentInactivityMs(job, now)));
            if (oldestQuiet >= SUBAGENT_QUIET_MS) segment += ` idle ${formatSubagentDuration(oldestQuiet)}`;
            parts.push(segment);
          }

          const fullText = parts.join(" | ");
          return [truncateToWidth(theme.fg("dim", fullText), width, theme.fg("dim", "..."))];
        },
      };
    });
  });

  pi.on("session_shutdown", () => {
    tracker?.dispose();
    tracker = undefined;
  });
}
