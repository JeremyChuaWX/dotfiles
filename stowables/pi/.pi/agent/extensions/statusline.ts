import * as os from "node:os";
import type { AssistantMessage } from "@earendil-works/pi-ai";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { truncateToWidth } from "@earendil-works/pi-tui";

function compactPath(cwd: string): string {
  const home = process.env.HOME || os.homedir();
  if (home && cwd.startsWith(home)) return `~${cwd.slice(home.length)}`;
  return cwd;
}

function formatTokens(count: number): string {
  if (count === 0) return "0.0k";
  if (count < 1000) return count.toString();
  if (count < 1000000) return `${(count / 1000).toFixed(1)}k`;
  return `${(count / 1000000).toFixed(1)}M`;
}

function fallbackTokenCount(ctx: ExtensionContext): number {
  let total = 0;
  for (const entry of ctx.sessionManager.getEntries()) {
    if (entry.type !== "message" || entry.message.role !== "assistant") continue;
    const message = entry.message as AssistantMessage;
    total += message.usage.input + message.usage.output;
  }
  return total;
}

export default function statusline(pi: ExtensionAPI) {
  pi.on("session_start", (_event, ctx) => {
    ctx.ui.setFooter((tui, theme, footerData) => {
      const unsubscribe = footerData.onBranchChange(() => tui.requestRender());

      return {
        dispose: unsubscribe,
        invalidate() {},
        render(width: number): string[] {
          const cwd = compactPath(ctx.sessionManager.getCwd());
          const branch = footerData.getGitBranch();
          const contextTokens = ctx.getContextUsage()?.tokens;
          const tokens = contextTokens ?? fallbackTokenCount(ctx);
          const context = formatTokens(tokens);

          const model = ctx.model;
          const modelName = model?.id || "no-model";
          const thinking = model?.reasoning ? pi.getThinkingLevel() : "";
          const parts = [cwd, ...(branch ? [branch] : []), context, `${modelName}${thinking ? ` ${thinking}` : ""}`];
          const fullText = parts.join(" | ");

          return [truncateToWidth(theme.fg("dim", fullText), width, theme.fg("dim", "..."))];
        },
      };
    });
  });
}
