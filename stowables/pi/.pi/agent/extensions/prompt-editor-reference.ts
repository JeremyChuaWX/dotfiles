import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
const STATE_DIR = path.join(os.tmpdir(), "pi-prompt-editor-reference");
const STATE_FILE = path.join(STATE_DIR, `last-assistant-${process.pid}.md`);

let previousStateFile: string | undefined;

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

function writeAssistantText(text: string): void {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(STATE_FILE, text, "utf8");
}

function writeLastAssistantText(ctx: ExtensionContext): void {
  writeAssistantText(getLastAssistantText(ctx));
}

export default function promptEditorReference(pi: ExtensionAPI) {
  pi.on("session_start", (_event, ctx) => {
    // Pi's externalEditor setting selects the wrapper. Only pass its reference
    // file here; leave EDITOR and VISUAL untouched for Git and other children.
    previousStateFile = process.env.PI_PROMPT_EDITOR_LAST_ASSISTANT_FILE;
    process.env.PI_PROMPT_EDITOR_LAST_ASSISTANT_FILE = STATE_FILE;
    writeLastAssistantText(ctx);
  });

  pi.on("message_end", (event, _ctx) => {
    if (event.message.role === "assistant") {
      // At message_end, the session tree may not yet include the just-finished
      // assistant message. Use the event payload directly so the editor sees
      // the latest reply rather than the previous assistant reply.
      writeAssistantText(textFromContent(event.message.content).trimEnd());
    }
  });

  pi.on("session_tree", (_event, ctx) => {
    writeLastAssistantText(ctx);
  });

  pi.on("session_shutdown", () => {
    if (previousStateFile === undefined) delete process.env.PI_PROMPT_EDITOR_LAST_ASSISTANT_FILE;
    else process.env.PI_PROMPT_EDITOR_LAST_ASSISTANT_FILE = previousStateFile;
    fs.rmSync(STATE_FILE, { force: true });
  });
}
