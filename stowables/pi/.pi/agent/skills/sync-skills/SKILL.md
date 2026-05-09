---
name: sync-skills
description: Temporarily clone latest matt-skills and patch selected Pi skills with upstream prompt improvements while preserving local-first .harness workflows and manual-only invocation. Use manually when updating this Pi config's adapted skills.
disable-model-invocation: true
---

# Sync Skills

Update this Pi config's adapted Matt Pocock skills without adopting Matt's remote issue-tracker workflow.

This is a **local-first adaptation patch** workflow: temporarily clone upstream Matt skills, pull in phrasing and prompt improvements, then patch the corresponding Pi skills while preserving local `.harness/` artifacts and manual-only behavior.

## Mapping

Use these source-to-destination mappings:

| Pi skill | Upstream Matt source | Adaptation rule |
| --- | --- | --- |
| `grill-me` | `skills/productivity/grill-me` | Preserve Pi manual-only frontmatter. |
| `grill-with-docs` | `skills/engineering/grill-with-docs` | Preserve Pi manual-only frontmatter and no tracker assumptions. |
| `improve-codebase-architecture` | `skills/engineering/improve-codebase-architecture` | Preserve Pi manual-only frontmatter and adapt any subagent/tool wording to available Pi tools. |
| `to-prd` | `skills/engineering/to-prd` | Import phrasing, but keep local `.harness/<feature-slug>/PRD.md`; do not publish to an issue tracker. |
| `to-plan` | `skills/engineering/to-issues` | Treat upstream `to-issues` as the conceptual source, but output local `.harness/<feature-slug>/plan/*.md` plan slices, not tracker issues. |

Protected Pi-local skills with no upstream source:

- `implement` — do not overwrite from Matt skills.
- `sync-skills` — this skill; do not overwrite from Matt skills.

## Hard constraints

- Do not import new skills unless the user explicitly asks.
- Do not couple the workflow to GitHub, GitLab, Linear, Jira, or any other remote issue tracker.
- Do not create or publish remote issues.
- Preserve `disable-model-invocation: true` in every Pi `SKILL.md` you touch.
- Preserve local-first vocabulary:
  - **Local work artifacts**: `.harness/<feature-slug>/PRD.md`, `.harness/<feature-slug>/plan/*.md`, `.harness/<feature-slug>/IMPLEMENTATION.md`
  - **Plan slice**: a local markdown file under `.harness/<feature-slug>/plan/`
  - **Remote issue tracker**: external services such as GitHub/GitLab/Linear/Jira; not the default workflow
- Preserve explicit "Do not create remote tracker items" / "Do not use remote tracker CLIs" language in `to-prd` and `to-plan`.

## Process

### 1. Preflight

Run:

```bash
.pi/agent/skills/sync-skills/scripts/preflight.sh
```

This clones `https://github.com/mattpocock/skills.git` into a temporary directory, validates mapped files exist, and prints the source/destination mapping. The temporary clone is removed when the script exits.

If the script reports missing paths or clone failures, stop and ask the user how to proceed.

### 2. Review upstream diffs

Run:

```bash
.pi/agent/skills/sync-skills/scripts/diff-targets.sh
```

This clones `https://github.com/mattpocock/skills.git` into a temporary directory and prints diffs against the mapped Pi skills. Read the diffs. Focus on upstream prompt improvements:

- clearer instructions
- stronger process sequencing
- better terminology
- new support files referenced by updated skills
- better examples/templates
- new guardrails that are compatible with local-first workflow

Ignore or rewrite upstream changes that assume:

- issue trackers
- tracker labels
- `gh`, `glab`, or other remote tracker CLIs
- publishing PRDs/issues remotely
- Claude-specific tools unavailable in Pi

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

For direct skills (`grill-me`, `grill-with-docs`, `improve-codebase-architecture`):

- Merge upstream wording and support files.
- Keep Pi frontmatter manual-only.
- Adapt references to unavailable tools to Pi read/search/bash/edit workflows or current-session alternatives.

For `to-prd` from upstream `to-prd`:

- Keep the upstream goal of synthesizing a PRD from current conversation/codebase context.
- Keep Pi's local output: `.harness/<feature-slug>/PRD.md`.
- Ask for approval before writing.
- Do not publish to an issue tracker.
- Do not use remote tracker CLIs.

For `to-plan` from upstream `to-issues`:

- Preserve tracer-bullet / vertical-slice planning ideas.
- Translate "issues" into local **Plan slices**.
- Translate "publish issues" into writing `.harness/<feature-slug>/plan/<NN>-<slug>.md`.
- Translate tracker labels into local status vocabulary.
- Preserve HITL/AFK classification when useful.
- Preserve dependency/blocker structure using local file references.

### 5. Verify

Run:

```bash
.pi/agent/skills/sync-skills/scripts/verify.sh
```

Also inspect the resulting diff manually. Verify:

- No unapproved skill directories were added.
- All touched `SKILL.md` files still include `disable-model-invocation: true`.
- `to-prd` and `to-plan` remain local-first.
- `implement` was not overwritten.
- Support-file links resolve.

### 6. Commit only on request

Show `git status --short` and ask whether to commit.

If the user asks to commit, stage only the approved skill-sync changes. Do not stage unrelated files such as settings changes or unrelated context docs unless the user explicitly asks.
