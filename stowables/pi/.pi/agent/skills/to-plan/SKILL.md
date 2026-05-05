---
name: to-plan
description: Break a plan, spec, or PRD into local markdown plan slices using tracer-bullet vertical slices. Use manually when the user wants an implementation plan without creating remote tracker items.
disable-model-invocation: true
---

# To Plan

Break a plan into independently grabbable local plan slices using vertical slices: tracer bullets.

Do not create remote tracker items. Do not use remote tracker CLIs.

## Process

### 1. Gather Context

Work from the current conversation context. If the user passes a local path, read it. If needed, explore the codebase to understand current state, domain vocabulary, and ADRs.

### 2. Draft Vertical Slices

Each plan slice is a thin vertical slice that cuts through all integration layers end to end, not a horizontal slice of one layer.

Slices may be `HITL` or `AFK`. Prefer `AFK` where possible.

Rules:

- Each slice delivers a narrow but complete path.
- A completed slice is demoable or verifiable on its own.
- Prefer many thin slices over few thick ones.

### 3. Quiz The User

Present the proposed breakdown as a numbered list. For each slice, show:

- **Title**: short descriptive name.
- **Type**: HITL or AFK.
- **Blocked by**: local slice references or paths.
- **User stories covered**: if source material has them.

Ask whether granularity, dependencies, and HITL/AFK markings are right. Iterate until approved.

### 4. Write Local Plan Slices

Ask approval before writing. After approval, write to `.harness/<feature-slug>/plan/<NN>-<slug>.md`.

Each plan slice body must use this shape:

```md
Status: needs-triage

# <Title>

## What to build

...

## Acceptance criteria

- [ ] ...

## Blocked by

...
```

Use local references and paths for blockers. Use `needs-triage` only as local status vocabulary.
