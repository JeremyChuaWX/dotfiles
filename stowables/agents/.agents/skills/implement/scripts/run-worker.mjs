#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);

function usage() {
  console.error(`Usage: run-worker.mjs <issue-packet.md> <report-output.md> [project-root]

Runs one headless pi Implementation worker for one issue packet.

Environment:
  PI_WORKER_MODEL       Optional model pattern, e.g. openai/gpt-5.5
  PI_WORKER_PROVIDER    Optional provider name, e.g. openai-codex
  PI_WORKER_THINKING    Optional thinking level, e.g. low|medium|high
  PI_WORKER_EXTRA_ARGS  Optional extra pi args, split on whitespace
`);
}

function read(file) { return readFileSync(file, 'utf8'); }
function write(file, s) { mkdirSync(path.dirname(file), { recursive: true }); writeFileSync(file, s); }

async function runPiWorker(packet, report, projectRoot) {
  const systemPrompt = 'You are an Implementation worker in an orchestrator-worker workflow. Implement exactly the assigned local markdown issue from the packet. Do brief preflight exploration, make only necessary edits, run only verification that is explicit in the packet or project configuration, and produce a concise final report with: files changed, acceptance criteria status, verification performed, decisions/insights for IMPLEMENTATION.md, and follow-ups/blockers. Do not mark the issue done; the orchestrator owns issue status and comments.';
  const piArgs = ['--print', '--mode', 'text', '--no-session', '--no-skills', '--append-system-prompt', systemPrompt];
  if (process.env.PI_WORKER_PROVIDER) piArgs.push('--provider', process.env.PI_WORKER_PROVIDER);
  if (process.env.PI_WORKER_MODEL) piArgs.push('--model', process.env.PI_WORKER_MODEL);
  if (process.env.PI_WORKER_THINKING) piArgs.push('--thinking', process.env.PI_WORKER_THINKING);
  if (process.env.PI_WORKER_EXTRA_ARGS) piArgs.push(...process.env.PI_WORKER_EXTRA_ARGS.split(/\s+/).filter(Boolean));
  piArgs.push(`Read this issue packet and act as the Implementation worker.\n\n${read(packet)}`);

  return await new Promise(resolve => {
    const child = spawn('pi', piArgs, { cwd: projectRoot, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', d => { process.stdout.write(d); output += d; });
    child.stderr.on('data', d => { process.stderr.write(d); output += d; });
    child.on('close', code => { write(report, output); resolve(code ?? 1); });
  });
}

async function main() {
  if (args.length < 2 || args.length > 3) { usage(); process.exit(2); }
  const [packetArg, reportArg, rootArg] = args;
  const projectRoot = path.resolve(rootArg ?? process.cwd());
  const packet = path.resolve(projectRoot, packetArg);
  const report = path.resolve(projectRoot, reportArg);
  const code = await runPiWorker(packet, report, projectRoot);
  process.exit(code);
}

main().catch(e => { console.error(e.stack || e.message); process.exit(1); });
