---
name: sync-skills
description: Temporarily clone latest matt-skills and patch selected shared Agent Skills with upstream prompt improvements while following Matt's local markdown issue-tracker conventions and preserving manual-only invocation. Use manually when updating this shared skills directory.
disable-model-invocation: true
---

# Sync Skills

Update this shared Agent Skills directory's adapted Matt Pocock skills while following Matt's **local markdown issue tracker** convention only.

This is a **local-first local-tracker adaptation patch** workflow: temporarily clone upstream Matt skills, pull in phrasing and prompt improvements, then patch the corresponding shared skills used by both Pi and OpenCode while preserving manual-only behavior and using Matt's `.scratch/` local issue tracker convention. Ignore GitHub, GitLab, Linear, Jira, and any other remote tracker workflow.

## Mapping

Use these source-to-destination mappings:

| Shared skill | Upstream Matt source | Adaptation rule |
| --- | --- | --- |
| `grill-me` | `skills/productivity/grill-me` | Preserve manual-only frontmatter. |
| `grill-with-docs` | `skills/engineering/grill-with-docs` | Preserve manual-only frontmatter and no tracker assumptions. |
| `handoff` | `skills/productivity/handoff` | Preserve manual-only frontmatter and local/no-remote tracker guardrails. |
| `improve-codebase-architecture` | `skills/engineering/improve-codebase-architecture` | Preserve manual-only frontmatter and adapt any subagent/tool wording to available Pi/OpenCode tools. |
| `prototype` | `skills/engineering/prototype` | Preserve manual-only frontmatter, throwaway-code guardrails, and local/no-remote tracker guardrails. |
| `to-prd` | `skills/engineering/to-prd` | Import phrasing and publish to Matt's local markdown issue tracker: `.scratch/<feature-slug>/PRD.md`. |
| `to-issues` | `skills/engineering/to-issues` | Follow upstream terminology and publish local markdown issues to `.scratch/<feature-slug>/issues/*.md`. |

Protected local skills with no upstream source:

- `afk` — do not overwrite from Matt skills.
- `sync-skills` — this skill; do not overwrite from Matt skills.

## Hard constraints

- Do not import new skills unless the user explicitly asks.
- Do not couple the workflow to GitHub, GitLab, Linear, Jira, or any other remote issue tracker.
- Do not create or publish remote issues.
- Preserve `disable-model-invocation: true` in every `SKILL.md` you touch.
- Follow Matt's local markdown issue tracker vocabulary:
  - **Local issue tracker**: markdown files under `.scratch/`.
  - **Feature directory**: `.scratch/<feature-slug>/`.
  - **PRD**: `.scratch/<feature-slug>/PRD.md`.
  - **Issue**: `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01`.
  - **Status**: a `Status:` line near the top of each issue file.
  - **Comments**: appended under a `## Comments` heading.
  - **Remote issue tracker**: external services such as GitHub/GitLab/Linear/Jira; never the workflow for this shared skills directory.
- Preserve explicit "Do not create remote tracker items" / "Do not use remote tracker CLIs" language in `to-prd` and `to-issues`.
- When running this skill's helper scripts, always use the absolute shared skills path under `$HOME/.agents/skills/sync-skills/scripts/`; never use `.pi/...`, `.opencode/...`, or `.agents/...` relative to the current project root and never hard-code a dotfiles/stowable checkout path.

## Process

### 1. Preflight

Run the helper script through the absolute shared skills path, not a project-relative `.agents/...` path:

```bash
"$HOME/.agents/skills/sync-skills/scripts/preflight.sh"
```

This clones `https://github.com/mattpocock/skills.git` into a temporary directory, validates mapped files exist, and prints the source/destination mapping. The temporary clone is removed when the script exits. Always call the script under `$HOME/.agents/skills`; do not call `.agents/skills/...` relative to the current project root, and do not hard-code a dotfiles/stowable checkout path.

If the script reports missing paths or clone failures, stop and ask the user how to proceed.

### 2. Review upstream diffs

Run the helper script through the absolute shared skills path:

```bash
"$HOME/.agents/skills/sync-skills/scripts/diff-targets.sh"
```

This clones `https://github.com/mattpocock/skills.git` into a temporary directory and prints diffs against the mapped shared skills. Read the diffs. Focus on upstream prompt improvements:

- clearer instructions
- stronger process sequencing
- better terminology
- new support files referenced by updated skills
- better examples/templates
- new guardrails that are compatible with local-first workflow

Ignore or rewrite upstream changes that assume:

- remote issue trackers
- remote tracker labels
- `gh`, `glab`, or other remote tracker CLIs
- publishing PRDs/issues remotely
- Claude-specific tools unavailable in Pi/OpenCode

Adopt upstream changes that assume a local markdown issue tracker, adapting paths to `.scratch/<feature-slug>/...` if needed.

### 3. Present an update plan

Before editing, summarize:

- Which mapped skills have meaningful upstream changes.
- Which upstream changes should be adopted as-is.
- Which upstream changes need local-first adaptation.
- Which upstream changes should be rejected.
- Any new support files to add under existing skill directories.

Ask for approval before writing.

### 4. Patch the skills

Patch only approved mapped destination skills.

For direct skills (`grill-me`, `grill-with-docs`, `handoff`, `improve-codebase-architecture`, `prototype`):

- Merge upstream wording and support files.
- Keep frontmatter manual-only.
- Adapt references to unavailable tools to current-session tools/workflows available in Pi or OpenCode.

For `to-prd` from upstream `to-prd`:

- Keep the upstream goal of synthesizing a PRD from current conversation/codebase context.
- Treat "publish to the project issue tracker" as writing to Matt's local markdown tracker.
- Output `.scratch/<feature-slug>/PRD.md`.
- Ask for approval before writing.
- Do not publish to a remote issue tracker.
- Do not use remote tracker CLIs.

For `to-issues` from upstream `to-issues`:

- Preserve tracer-bullet / vertical-slice issue planning ideas.
- Keep Matt's issue terminology instead of translating to "plan slices".
- Treat "publish issues" as writing `.scratch/<feature-slug>/issues/<NN>-<slug>.md`.
- Translate tracker labels into local `Status:` vocabulary where needed.
- Preserve HITL/AFK classification when useful.
- Preserve dependency/blocker structure using local file references.

### 5. Verify

Run the helper script through the absolute shared skills path:

```bash
"$HOME/.agents/skills/sync-skills/scripts/verify.sh"
```

Also inspect the resulting diff manually. Verify:

- No unapproved skill directories were added.
- All touched `SKILL.md` files still include `disable-model-invocation: true`.
- `to-prd` and `to-issues` remain local-first and use `.scratch/` local markdown tracker paths.
- `afk` was not overwritten.
- Support-file links resolve.

### 6. Commit only on request

Show `git status --short` and ask whether to commit.

If the user asks to commit, stage only the approved skill-sync changes. Do not stage unrelated files such as settings changes or unrelated context docs unless the user explicitly asks.
