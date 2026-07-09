---
name: sync-skills
description: Temporarily clone external skill dependencies, review upstream diffs, and patch this dotfiles setup while preserving local adaptations, Pi/OpenCode routing, and manual-only Pi skills. Use manually when updating vendored agent skills.
disable-model-invocation: true
---

# Sync Skills

Update this dotfiles-backed agent setup from external prompt dependencies without letting upstream repos own the local workflow.

This is a **session, clone, validate, diff, plan, approve, patch, verify, cleanup** workflow. Helper scripts clone latest upstreams into one temporary session dir so the agent can discuss diffs over multiple turns, then delete the temp dir when finished. The agent integrates only approved changes into vendored local files.

## Source of truth

The sync/routing manifest lives at:

```text
stowables/ai-skills/manifest.json
```

It is organized by upstream and records only:

- upstream URL
- upstream source path
- local vendored target path(s)
- short adaptation notes

Do not encode universal policy in the manifest. Keep harness rules here and in `verify.sh`.

Live skill directories stay separate and vendored:

- Pi skills: `stowables/pi/.pi/agent/skills/` -> `$HOME/.pi/agent/skills/`
- OpenCode skills: `stowables/opencode/.config/opencode/skills/` -> `$HOME/.config/opencode/skills/`

## External sources

| Source | Upstream | Local integration |
| --- | --- | --- |
| Matt skills | `https://github.com/mattpocock/skills.git` | Adapt selected skills into Pi or OpenCode target dirs from the manifest. |

## Current routing

Read `stowables/ai-skills/manifest.json` before syncing. Current intent:

- OpenCode owns general-use `teach`.
- Pi owns coding/config-maintenance skills.

Protected local skills with no upstream source:

- `afk` — do not overwrite from Matt skills.
- `sync-skills` — this skill; do not overwrite from any upstream.

## Hard constraints

- Do not import new skills unless the user explicitly asks.
- Do not couple the workflow to GitHub, GitLab, Linear, Jira, or any other remote issue tracker.
- Do not create or publish remote issues.
- Preserve `disable-model-invocation: true` in every Pi `SKILL.md` touched or imported.
- Do not add Pi-only frontmatter such as `disable-model-invocation` to OpenCode skills.
- Follow Matt's local markdown issue tracker vocabulary:
  - **Local issue tracker**: markdown files under `.scratch/`.
  - **Feature directory**: `.scratch/<feature-slug>/`.
  - **PRD**: `.scratch/<feature-slug>/PRD.md`.
  - **Issue**: `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01`.
  - **Status**: a `Status:` line near the top of each issue file.
  - **Comments**: appended under a `## Comments` heading.
  - **Remote issue tracker**: external services such as GitHub/GitLab/Linear/Jira; never the workflow for this Pi skills directory.
- Preserve explicit "Do not create remote tracker items" / "Do not use remote tracker CLIs" language in `to-spec`, `to-tickets`, `triage`, `wayfinder`, and `afk`.
- Run helper scripts through `$HOME/.pi/agent/skills/sync-skills/scripts/`; never use project-relative `.agents/...` paths.

## Process

### 1. Start a temp sync session

Run:

```bash
"$HOME/.pi/agent/skills/sync-skills/scripts/start-session.sh"
```

This clones latest upstreams into a temp dir and prints `SYNC_SKILLS_SESSION`. Keep that session dir for the whole agent conversation. Do not cache upstreams between sessions.

### 2. Validate mappings

Run the command printed by `start-session.sh`, or:

```bash
"$HOME/.pi/agent/skills/sync-skills/scripts/preflight.sh" "$SYNC_SKILLS_SESSION"
```

This validates cloned upstreams, manifest source paths, and local vendored target paths. If it reports missing paths or clone failures, stop and ask how to proceed.

### 3. Review upstream diffs

Run:

```bash
"$HOME/.pi/agent/skills/sync-skills/scripts/diff-targets.sh" "$SYNC_SKILLS_SESSION"
```

Read the diffs. Focus on upstream prompt improvements:

- clearer instructions
- stronger process sequencing
- better terminology
- new support files referenced by updated skills
- better examples/templates
- new guardrails compatible with local-first workflow

Ignore or rewrite upstream changes that assume:

- remote issue trackers
- remote tracker labels
- `gh`, `glab`, or other remote tracker CLIs
- publishing PRDs/issues remotely
- unavailable host-specific tools
- installing or enabling extensions/packages without user approval
- Pi-only metadata in OpenCode skills

### 4. Present an update plan

Before editing, summarize:

- Which external sources have meaningful upstream changes.
- Which changes should be adopted as-is.
- Which changes need local adaptation.
- Which changes should be rejected.
- Any new support files to add.

Ask for approval before writing.

### 5. Patch approved changes only

For Matt skills:

- Merge upstream wording and support files.
- Keep Pi frontmatter manual-only.
- Keep OpenCode frontmatter OpenCode-compatible.
- Adapt tracker/tool wording to local markdown tracker and available Pi/OpenCode tools.

### 6. Verify

Run:

```bash
"$HOME/.pi/agent/skills/sync-skills/scripts/verify.sh"
```

Also inspect the resulting diff manually. Verify:

- No unapproved skill directories were added.
- All Pi `SKILL.md` files include `disable-model-invocation: true`.
- OpenCode skills do not include Pi-only frontmatter.
- Pi does not contain `teach`, and OpenCode does contain `teach`.
- `to-spec`, `to-tickets`, `triage`, `wayfinder`, and `afk` remain local-first and use `.scratch/` tracker paths.
- `afk` was not overwritten.
- Support-file links resolve.

### 7. Finish session and commit only on request

After approved updates pass verification, run:

```bash
"$HOME/.pi/agent/skills/sync-skills/scripts/finish-session.sh" "$SYNC_SKILLS_SESSION"
```

This runs `verify.sh`, shows `git status --short`, and deletes the temp session dir.

Ask whether to commit. If the user asks to commit, stage only approved sync changes. Do not stage unrelated files unless explicitly asked.
