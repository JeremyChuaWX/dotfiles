---
name: sync-skills
description: Temporarily clone external skill/rule dependencies (matt-skills and ponytail), review upstream diffs, and patch this dotfiles setup while preserving local markdown tracker conventions, manual-only skills, and always-on global Ponytail. Use manually when updating Pi agent skills or global agent rules.
disable-model-invocation: true
---

# Sync Skills

Update this dotfiles-backed agent setup from external prompt dependencies without letting upstream repos own the local workflow.

This is a **clone, diff, plan, approve, patch** workflow. Helper scripts dynamically clone upstreams into temp dirs, print diffs, then the agent integrates only approved changes into the local files.

## External sources

| Source | Upstream | Local integration |
| --- | --- | --- |
| Matt skills | `https://github.com/mattpocock/skills.git` | Adapt selected skills under `$HOME/.pi/agent/skills/` for local markdown tracker usage. |
| Ponytail | `https://github.com/DietrichGebert/ponytail.git` | Adapt upstream `AGENTS.md` into `$HOME/.pi/agent/AGENTS.md` as always-on full-mode global Pi rules, and update approved helper skills under `$HOME/.pi/agent/skills/`. |

## Matt skill mapping

| Pi skill | Upstream Matt source | Adaptation rule |
| --- | --- | --- |
| `grill-me` | `skills/productivity/grill-me` | Preserve manual-only frontmatter. |
| `grill-with-docs` | `skills/engineering/grill-with-docs` | Preserve manual-only frontmatter and no tracker assumptions. |
| `handoff` | `skills/productivity/handoff` | Preserve manual-only frontmatter and local/no-remote tracker guardrails. |
| `improve-codebase-architecture` | `skills/engineering/improve-codebase-architecture` | Preserve manual-only frontmatter and adapt unavailable tool/subagent wording to Pi. |
| `prototype` | `skills/engineering/prototype` | Preserve manual-only frontmatter, throwaway-code guardrails, and local/no-remote tracker guardrails. |
| `to-prd` | `skills/engineering/to-prd` | Import phrasing and publish to local markdown tracker: `.scratch/<feature-slug>/PRD.md`. |
| `to-issues` | `skills/engineering/to-issues` | Follow upstream terminology and publish local issues to `.scratch/<feature-slug>/issues/*.md`. |

## Ponytail helper skill mapping

These are installed locally and should be updated from upstream while staying manual-only:

| Pi skill | Upstream Ponytail source | Adaptation rule |
| --- | --- | --- |
| `ponytail-review` | `skills/ponytail-review` | Preserve manual-only frontmatter. |
| `ponytail-audit` | `skills/ponytail-audit` | Preserve manual-only frontmatter. |
| `ponytail-debt` | `skills/ponytail-debt` | Preserve manual-only frontmatter. |
| `ponytail-help` | `skills/ponytail-help` | Preserve manual-only frontmatter and local default-mode wording if customized. |

Do not import by default:

- `ponytail` — redundant with global `$HOME/.pi/agent/AGENTS.md`.
- `ponytail-gain` — benchmark card, not useful day-to-day.

Protected local skills with no upstream source:

- `afk` — do not overwrite from Matt skills.
- `sync-skills` — this skill; do not overwrite from any upstream.

## Hard constraints

- Do not import new skills unless the user explicitly asks.
- Do update installed Ponytail helper skills: `ponytail-review`, `ponytail-audit`, `ponytail-debt`, `ponytail-help`.
- Do not install the Ponytail Pi package unless the user explicitly asks; global `AGENTS.md` is the always-on integration.
- Do not couple the workflow to GitHub, GitLab, Linear, Jira, or any other remote issue tracker.
- Do not create or publish remote issues.
- Preserve `disable-model-invocation: true` in every Pi `SKILL.md` touched or imported.
- Preserve Ponytail as always-on full mode in `$HOME/.pi/agent/AGENTS.md`; do not turn it into an on-demand-only skill.
- Preserve explicit `stop ponytail` / `normal mode` deactivation and `ponytail` / `lazy mode` resume language in global Ponytail rules.
- Follow Matt's local markdown issue tracker vocabulary:
  - **Local issue tracker**: markdown files under `.scratch/`.
  - **Feature directory**: `.scratch/<feature-slug>/`.
  - **PRD**: `.scratch/<feature-slug>/PRD.md`.
  - **Issue**: `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01`.
  - **Status**: a `Status:` line near the top of each issue file.
  - **Comments**: appended under a `## Comments` heading.
  - **Remote issue tracker**: external services such as GitHub/GitLab/Linear/Jira; never the workflow for this Pi skills directory.
- Preserve explicit "Do not create remote tracker items" / "Do not use remote tracker CLIs" language in `to-prd`, `to-issues`, and `afk`.
- Run helper scripts through `$HOME/.pi/agent/skills/sync-skills/scripts/`; never use project-relative `.agents/...` paths.

## Process

### 1. Preflight

Run:

```bash
"$HOME/.pi/agent/skills/sync-skills/scripts/preflight.sh"
```

This clones Matt skills and Ponytail into a temp dir and validates mapped upstream/local files, including installed Ponytail helper skills. If it reports missing paths or clone failures, stop and ask how to proceed.

### 2. Review upstream diffs

Run:

```bash
"$HOME/.pi/agent/skills/sync-skills/scripts/diff-targets.sh"
```

Read the diffs. Focus on upstream prompt improvements:

- clearer instructions
- stronger process sequencing
- better terminology
- new support files referenced by updated skills
- better examples/templates
- new guardrails compatible with local-first workflow
- Ponytail ladder/rule wording that improves the global always-on `AGENTS.md`

Ignore or rewrite upstream changes that assume:

- remote issue trackers
- remote tracker labels
- `gh`, `glab`, or other remote tracker CLIs
- publishing PRDs/issues remotely
- unavailable host-specific tools
- installing or enabling extensions/packages without user approval

### 3. Present an update plan

Before editing, summarize:

- Which external sources have meaningful upstream changes.
- Which changes should be adopted as-is.
- Which changes need local adaptation.
- Which changes should be rejected.
- Any new support files to add.

Ask for approval before writing.

### 4. Patch approved changes only

For Matt skills:

- Merge upstream wording and support files.
- Keep frontmatter manual-only.
- Adapt tracker/tool wording to local markdown tracker and available Pi tools.

For Ponytail global rules:

- Patch `$HOME/.pi/agent/AGENTS.md` or its symlink target.
- Keep it compact enough for always-on context.
- Preserve local additions: always-on wording, output style, safety exceptions, runnable-check rule, deactivate/resume language.
- Preserve full-mode wording.

For Ponytail helper skills:

- Merge upstream changes for `ponytail-review`, `ponytail-audit`, `ponytail-debt`, and `ponytail-help`.
- Preserve `disable-model-invocation: true`.
- Do not import the core `ponytail` skill unless the user wants a manual `/skill:ponytail` command in addition to global `AGENTS.md`.
- Do not import `ponytail-gain` unless the user explicitly asks for the benchmark card.

### 5. Verify

Run:

```bash
"$HOME/.pi/agent/skills/sync-skills/scripts/verify.sh"
```

Also inspect the resulting diff manually. Verify:

- No unapproved skill directories were added.
- All Pi `SKILL.md` files include `disable-model-invocation: true`.
- `to-prd`, `to-issues`, and `afk` remain local-first and use `.scratch/` tracker paths.
- `afk` was not overwritten.
- Global Ponytail still exists at `$HOME/.pi/agent/AGENTS.md` and says Ponytail is always on in full mode.
- Support-file links resolve.

### 6. Commit only on request

Show `git status --short` and ask whether to commit.

If the user asks to commit, stage only approved sync changes. Do not stage unrelated files unless explicitly asked.
