#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const MARKER = "# ------------------------ >8 ------------------------";
const INSTRUCTION = "# Everything above is reference only and will be ignored.";

function splitCommand(command) {
  // Mirrors pi's built-in external editor splitting behavior well enough for
  // common values like "nvim", "vim", or "code --wait".
  return command.split(" ").filter(Boolean);
}

function stripReferenceBlock(text) {
  const normalized = text.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const markerIndex = lines.findIndex((line) => line.trimEnd() === MARKER);
  if (markerIndex === -1) return text;

  let start = markerIndex + 1;
  if ((lines[start] ?? "").trimEnd() === INSTRUCTION) start += 1;
  if ((lines[start] ?? "") === "") start += 1;
  return lines.slice(start).join("\n");
}

function readStateText(path) {
  if (!path || !existsSync(path)) return "";
  try {
    return readFileSync(path, "utf8").trimEnd();
  } catch {
    return "";
  }
}

function buildEditorBuffer(reference, draft) {
  if (!reference.trim()) return draft;
  return `${reference.trimEnd()}\n\n${MARKER}\n${INSTRUCTION}\n\n${draft}`;
}

const realEditor = process.env.PI_PROMPT_EDITOR_REAL_EDITOR;
if (!realEditor) {
  console.error("pi prompt editor wrapper: PI_PROMPT_EDITOR_REAL_EDITOR is not set");
  process.exit(1);
}

const args = process.argv.slice(2);
const file = args[args.length - 1];
if (!file) {
  console.error("pi prompt editor wrapper: expected pi temp file path");
  process.exit(1);
}

let originalDraft = "";
try {
  originalDraft = readFileSync(file, "utf8");
} catch (error) {
  console.error(`pi prompt editor wrapper: failed to read ${file}: ${error.message}`);
  process.exit(1);
}

originalDraft = stripReferenceBlock(originalDraft);
const reference = readStateText(process.env.PI_PROMPT_EDITOR_LAST_ASSISTANT_FILE);

try {
  writeFileSync(file, buildEditorBuffer(reference, originalDraft), "utf8");
} catch (error) {
  console.error(`pi prompt editor wrapper: failed to prepare ${file}: ${error.message}`);
  process.exit(1);
}

const [editor, ...editorArgs] = splitCommand(realEditor);
const result = spawnSync(editor, [...editorArgs, ...args], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

let edited = "";
try {
  edited = readFileSync(file, "utf8");
} catch (error) {
  console.error(`pi prompt editor wrapper: failed to read edited file: ${error.message}`);
  process.exit(1);
}

const cleaned = stripReferenceBlock(edited).replace(/\n$/, "");
if (!cleaned.trim()) {
  writeFileSync(file, originalDraft.replace(/\n$/, ""), "utf8");
  console.error("pi prompt editor wrapper: empty response; keeping previous pi input unchanged");
  process.exit(0);
}

writeFileSync(file, cleaned, "utf8");
process.exit(0);
