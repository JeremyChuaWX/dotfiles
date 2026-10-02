const { readFileSync } = require("node:fs");
const { execFileSync } = require("node:child_process");
const { homedir } = require("node:os");
const { sep } = require("node:path");

function formatTokens(count) {
  if (count === 0) return "0.0k";
  if (count < 1000) return String(count);
  if (count < 1000000) return `${(count / 1000).toFixed(1)}k`;
  return `${(count / 1000000).toFixed(1)}M`;
}

let data;
try {
  data = JSON.parse(readFileSync(0, "utf8")) || {};
} catch {
  process.exit(0);
}

const cwd = data.workspace?.current_dir || data.cwd || process.cwd();
const home = process.env.HOME || homedir();
const directory = cwd === home ? "~"
  : cwd.startsWith(`${home}${sep}`) ? `~${cwd.slice(home.length)}` : cwd;
let branch = "";
try {
  branch = execFileSync("git", ["-C", cwd, "symbolic-ref", "--quiet", "--short", "HEAD"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    timeout: 1000,
  }).trim();
} catch {
  // No branch in non-repositories or detached HEADs.
}

// Context occupancy, not cumulative session token usage.
const usage = data.context_window?.current_usage;
const tokens = (usage?.input_tokens || 0)
  + (usage?.cache_creation_input_tokens || 0)
  + (usage?.cache_read_input_tokens || 0);
const model = data.model?.id || data.model?.display_name || "no-model";
const effort = data.effort?.level;
const parts = [directory, ...(branch ? [branch] : []), formatTokens(tokens),
  `${model}${effort ? ` ${effort}` : ""}`];
// Prevent paths or payload fields from injecting terminal control sequences.
const line = parts.join(" | ").replace(/[\x00-\x1f\x7f-\x9f]/g, "");
process.stdout.write(`\x1b[2m${line}\x1b[0m\n`);
