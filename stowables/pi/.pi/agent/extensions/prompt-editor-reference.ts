import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

const WRAPPER_PATH = path.resolve(
  process.env.HOME ?? os.homedir(),
  ".pi/agent/bin/pi-prompt-editor-wrapper.mjs",
);
const STATE_DIR = path.join(os.tmpdir(), "pi-prompt-editor-reference");
const STATE_FILE = path.join(STATE_DIR, `last-assistant-${process.pid}.md`);

function textFromContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";

  return content
    .filter((block): block is { type: string; text?: string } =>
      typeof block === "object" && block !== null && "type" in block,
    )
    .filter((block) => block.type === "text" && typeof block.text === "string")
    .map((block) => block.text)
    .join("\n");
}

function getLastAssistantText(ctx: ExtensionContext): string {
  const branch = ctx.sessionManager.getBranch();
  for (let i = branch.length - 1; i >= 0; i -= 1) {
    const entry = branch[i];
    if (entry.type !== "message") continue;

    const message = entry.message;
    if (message?.role !== "assistant") continue;

    const text = textFromContent(message.content).trimEnd();
    if (text.trim()) return text;
  }
  return "";
}

function writeLastAssistantText(ctx: ExtensionContext): void {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(STATE_FILE, getLastAssistantText(ctx), "utf8");
}

function installEditorWrapper(): boolean {
  const realEditor = process.env.PI_PROMPT_EDITOR_REAL_EDITOR || process.env.VISUAL || process.env.EDITOR;
  if (!realEditor) return false;

  process.env.PI_PROMPT_EDITOR_REAL_EDITOR = realEditor;
  process.env.PI_PROMPT_EDITOR_LAST_ASSISTANT_FILE = STATE_FILE;

  // Pi prefers VISUAL over EDITOR. Set both so the built-in external editor
  // always invokes the wrapper, while the wrapper invokes the original editor.
  process.env.VISUAL = WRAPPER_PATH;
  process.env.EDITOR = WRAPPER_PATH;
  return true;
}

export default function promptEditorReference(pi: ExtensionAPI) {
  pi.on("session_start", (_event, ctx) => {
    const installed = installEditorWrapper();
    writeLastAssistantText(ctx);
    if (!installed) {
      ctx.ui.notify("No $VISUAL or $EDITOR configured for prompt editor reference wrapper.", "warning");
    }
  });

  pi.on("message_end", (event, ctx) => {
    if (event.message.role === "assistant") {
      writeLastAssistantText(ctx);
    }
  });

  pi.on("session_tree", (_event, ctx) => {
    writeLastAssistantText(ctx);
  });

  pi.on("session_shutdown", () => {
    try {
      fs.unlinkSync(STATE_FILE);
    } catch {
      // Ignore cleanup errors.
    }
  });
}
