#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const mode = args.includes('--run') ? 'run' : 'plan';
const projectRoot = process.cwd();
const scriptDir = path.dirname(fileURLToPath(import.meta.url));

function usage() {
  console.error(`Usage: implement.mjs [--plan|--run] <feature-dir|issues-dir|issue-file...>

Examples:
  implement.mjs --plan .scratch/my-feature
  implement.mjs --run .scratch/my-feature/issues
  PI_WORKER_MODEL=openai/gpt-5.5 implement.mjs --run .scratch/my-feature
`);
}

function read(file) { return readFileSync(file, 'utf8'); }
function write(file, s) { mkdirSync(path.dirname(file), { recursive: true }); writeFileSync(file, s); }
function titleOf(md) { return md.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? '(untitled)'; }
function statusOf(md) { return md.match(/^Status:\s*(.+)$/m)?.[1]?.trim() ?? 'unknown'; }
function typeOf(md) { return md.match(/^Type:\s*(HITL|AFK)\s*$/mi)?.[1]?.toUpperCase() ?? 'unknown'; }

function section(md, heading) {
  const re = new RegExp(`^## ${heading}\\s*$([\\s\\S]*?)(?=^## |\\z)`, 'm');
  return md.match(re)?.[1]?.trim() ?? '';
}

function issueFilesFor(targets) {
  const out = [];
  for (const t of targets) {
    const p = path.resolve(projectRoot, t);
    if (!existsSync(p)) throw new Error(`Not found: ${t}`);
    const st = statSync(p);
    if (st.isFile()) out.push(p);
    else {
      const issuesDir = path.basename(p) === 'issues' ? p : path.join(p, 'issues');
      if (!existsSync(issuesDir)) throw new Error(`No issues directory: ${issuesDir}`);
      for (const f of readdirSync(issuesDir).sort()) {
        if (f.endsWith('.md')) out.push(path.join(issuesDir, f));
      }
    }
  }
  return [...new Set(out)];
}

function featureDirFor(issueFile) {
  const dir = path.dirname(issueFile);
  return path.basename(dir) === 'issues' ? path.dirname(dir) : dir;
}

function blockersOf(md) {
  const blocked = section(md, 'Blocked by');
  if (!blocked || /none/i.test(blocked)) return [];
  return [...blocked.matchAll(/\.scratch\/[^\s)]+\.md/g)].map(m => path.resolve(projectRoot, m[0]));
}

function replaceStatus(file, status) {
  const md = read(file);
  const next = md.match(/^Status:/m) ? md.replace(/^Status:\s*.*$/m, `Status: ${status}`) : `Status: ${status}\n\n${md}`;
  write(file, next);
}

function appendComment(file, text) {
  const md = read(file);
  const stamp = new Date().toISOString();
  const note = `\n- ${stamp}: ${text.trim()}\n`;
  const next = md.match(/^## Comments\s*$/m) ? md.replace(/^## Comments\s*$/m, `## Comments\n${note}`) : `${md.trim()}\n\n## Comments\n${note}`;
  write(file, next);
}

function ensureLog(featureDir) {
  const log = path.join(featureDir, 'IMPLEMENTATION.md');
  if (!existsSync(log)) write(log, '# Implementation Log\n\n## Current state\n\n## Cross-issue decisions\n\n## Issue notes\n\n## Verification history\n');
  return log;
}

function appendLog(log, text) {
  write(log, `${read(log).trim()}\n\n${text.trim()}\n`);
}

function makePacket(issueFile, logFile) {
  const featureDir = featureDirFor(issueFile);
  const md = read(issueFile);
  const base = path.basename(issueFile, '.md');
  const packet = path.join(featureDir, 'worker-packets', `${base}.packet.md`);
  const prd = path.join(featureDir, 'PRD.md');
  const packetMd = `# Implementation worker packet

## Assignment
- Issue: ${path.relative(projectRoot, issueFile)}
- Worker boundary: implement only this issue
- Orchestrator-owned files: issue status/comments and IMPLEMENTATION.md final updates
- Do not mark the issue done. Do not append issue comments.

## Issue contents

${md}

## Parent context

${existsSync(prd) ? read(prd) : '(No PRD.md found)'}

## Shared implementation log

${read(logFile)}

## Verification expectations

Derive verification from the acceptance criteria above. Run only commands that are explicit in the issue, PRD, package scripts, or project docs.
`;
  write(packet, packetMd);
  return packet;
}

function runWorker(packet, report) {
  const runner = path.join(scriptDir, 'run-worker.mjs');
  return new Promise(resolve => {
    const child = spawn(process.execPath, [runner, packet, report, projectRoot], { cwd: projectRoot, stdio: 'inherit' });
    child.on('close', code => resolve(code ?? 1));
  });
}

function topo(issues) {
  const byFile = new Map(issues.map(i => [i.file, i]));
  const done = new Set(issues.filter(i => i.status === 'done').map(i => i.file));
  const pending = new Map(issues.filter(i => ['ready-for-agent', 'blocked'].includes(i.status)).map(i => [i.file, i]));
  const order = [];
  let changed = true;
  while (pending.size && changed) {
    changed = false;
    for (const [file, i] of [...pending]) {
      const unresolved = i.blockers.filter(b => !done.has(b) && byFile.get(b)?.status !== 'done');
      if (unresolved.length === 0) { order.push(i); pending.delete(file); done.add(file); changed = true; }
    }
  }
  return { order, blocked: [...pending.values()] };
}

async function main() {
  const targets = args.filter(a => !a.startsWith('--'));
  if (!targets.length) { usage(); process.exit(2); }
  const files = issueFilesFor(targets);
  const issues = files.map(file => { const md = read(file); return { file, title: titleOf(md), status: statusOf(md), type: typeOf(md), blockers: blockersOf(md) }; });
  const workable = issues.filter(i => i.status !== 'done');
  const { order, blocked } = topo(workable);

  console.log(`Implement ${mode === 'run' ? 'run' : 'plan'}:`);
  for (const [n, i] of order.entries()) console.log(`${n + 1}. ${i.title}\n   ${path.relative(projectRoot, i.file)}\n   status=${i.status} type=${i.type} worker=headless-pi`);
  if (blocked.length) console.log(`\nBlocked/unordered:\n${blocked.map(i => `- ${path.relative(projectRoot, i.file)}`).join('\n')}`);
  if (mode !== 'run') { console.log('\nRe-run with --run to execute.'); return; }

  for (const i of order) {
    if (i.type === 'HITL') { console.log(`Skipping HITL issue: ${i.title}`); continue; }
    const featureDir = featureDirFor(i.file);
    const log = ensureLog(featureDir);
    replaceStatus(i.file, 'in-progress');
    const packet = makePacket(i.file, log);
    const report = path.join(featureDir, 'worker-reports', `${path.basename(i.file, '.md')}.report.md`);
    console.log(`\n=== Worker: ${i.title} ===\npacket=${path.relative(projectRoot, packet)}\nreport=${path.relative(projectRoot, report)}\n`);
    const code = await runWorker(packet, report);
    const reportText = read(report).trim();
    if (code === 0) {
      replaceStatus(i.file, 'done');
      appendComment(i.file, `Implemented by headless pi worker. Report: ${path.relative(projectRoot, report)}`);
      appendLog(log, `## ${new Date().toISOString()} ${path.relative(projectRoot, i.file)}\n\nWorker exited 0. Report: ${path.relative(projectRoot, report)}\n\n${reportText.slice(0, 2000)}`);
    } else {
      replaceStatus(i.file, 'blocked');
      appendComment(i.file, `Worker failed with exit code ${code}. Report: ${path.relative(projectRoot, report)}`);
      appendLog(log, `## ${new Date().toISOString()} ${path.relative(projectRoot, i.file)} failed\n\nExit code ${code}. Report: ${path.relative(projectRoot, report)}`);
      process.exit(code ?? 1);
    }
  }
}

main().catch(e => { console.error(e.stack || e.message); process.exit(1); });
