import * as os from "node:os";
import type { AssistantMessage } from "@earendil-works/pi-ai";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

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
          const leftText = `${cwd}${branch ? `:${branch}` : ""} • ${formatTokens(tokens)}`;

          const model = ctx.model;
          const modelName = model?.id || "no-model";
          let rightText = modelName;
          if (model?.reasoning) {
            const thinkingLevel = pi.getThinkingLevel();
            rightText = thinkingLevel === "off" ? `${modelName} • thinking off` : `${modelName} • ${thinkingLevel}`;
          }
          if (footerData.getAvailableProviderCount() > 1 && model) {
            const withProvider = `(${model.provider}) ${rightText}`;
            if (visibleWidth(leftText) + 2 + visibleWidth(withProvider) <= width) {
              rightText = withProvider;
            }
          }

          const left = theme.fg("dim", leftText);
          const right = theme.fg("dim", rightText);
          const leftWidth = visibleWidth(left);
          const rightWidth = visibleWidth(right);

          if (leftWidth + 2 + rightWidth <= width) {
            return [left + " ".repeat(width - leftWidth - rightWidth) + right];
          }

          const availableForLeft = Math.max(0, width - rightWidth - 2);
          if (availableForLeft > 0) {
            const truncatedLeft = truncateToWidth(left, availableForLeft, theme.fg("dim", "..."));
            const padding = " ".repeat(Math.max(2, width - visibleWidth(truncatedLeft) - rightWidth));
            return [truncatedLeft + padding + right];
          }

          return [truncateToWidth(left, width, theme.fg("dim", "..."))];
        },
      };
    });
  });
}
