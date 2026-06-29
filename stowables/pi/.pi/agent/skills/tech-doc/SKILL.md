---
name: tech-doc
description: Convert a completed grill-me or grill-with-docs conversation into a technical design doc, then identify PRD-sized scopes for the local markdown tracker. Use manually after /skill:grill-me or /skill:grill-with-docs when design choices are complex, risky, cross-team, or costly to reverse.
disable-model-invocation: true
---

# Tech Doc

Turn a converged grilling session into a technical design doc, then outline the PRDs that should be split from it. Do not restart the interview; ask only blocking questions.

Use this after `/skill:grill-me` or `/skill:grill-with-docs` and before `/skill:to-prd` / `/skill:to-issues`.

## Design-doc bar

Before drafting, decide whether a tech doc is worth it. It usually is when any of these are true, and almost always is when two or more are true:

- Multiple people or teams must coordinate implementation.
- The work is large enough that a wrong direction would waste meaningful time.
- The system will run in production for years.
- Goals, requirements, or ownership boundaries are ambiguous.
- A bad decision could create security, privacy, legal, data-loss, or operations risk.

If none apply, say the tech doc is probably overkill and offer to go straight to `/skill:to-prd`. If the user insists, keep the doc to one page.

## What belongs

Use the penalty-for-being-wrong filter. Include decisions that are expensive, risky, or hard to reverse:

- Architecture and ownership boundaries
- Interfaces, API semantics, file formats, or CLI contracts
- Storage, data model, infrastructure, and deployment choices
- SLOs, monitoring, alerting, logging, and operational failure modes
- Security, privacy, legal, compliance, and trust-boundary decisions
- Serious alternatives rejected and why

Exclude cheap, reversible implementation details. Leave those for PRDs/issues.

## Process

1. Gather source material from the current conversation. If the user passed a transcript, file path, or `.scratch/<feature-slug>/TECH-DOC.md`, read it.
2. Explore the repo only as needed. Prefer existing helpers, seams, domain vocabulary, `CONTEXT.md`, `CONTEXT-MAP.md`, and ADRs. With `grill-with-docs`, treat `CONTEXT.md` and ADRs as sources of truth; link them instead of duplicating them.
3. Synthesize the tech doc. Preserve uncertainty as **Open Issues** with the next action; do not invent certainty.
4. Add a **PRD Breakdown** section with PRD-sized scopes. Each row is a separate future PRD, not a section of one large PRD.
5. Ask for approval before writing.
6. After approval, publish the tech doc to `.scratch/<initiative-slug>/TECH-DOC.md`. Create directories as needed. Do not create remote tracker items or use remote tracker CLIs.
7. To generate PRDs, call `/skill:to-prd <TECH-DOC.md path> <PRD name>` once per row in **PRD Breakdown**. The caller loops over rows; `to-prd` creates exactly one PRD per invocation.

## Tech doc template

```md
# <Short distinctive title>

Author: <name or TBD>
Status: draft
Created: <YYYY-MM-DD>
Authoritative path: .scratch/<initiative-slug>/TECH-DOC.md
Source: <grill-me/grill-with-docs conversation, transcript, or related docs>

## Objective

<One sentence: what this project accomplishes and for whom.>

## Background

<Why this exists, what problem it solves, previous attempts, and enough context to make the first page understandable without the conversation.>

## Related Documents

- <CONTEXT.md / ADRs / PRDs / prototypes / research links>

## Goals

- <Outcome, not implementation detail>

## Non-goals

- <Likely misconception that is explicitly out of scope>

## Scenarios

1. <Concrete end-to-end scenario that proves the design vocabulary and boundaries.>

## Design

<Architecture and data/control flow. Include a small Mermaid diagram only if it clarifies the hard part.>

## Interfaces

<APIs, UI semantics, CLI semantics, file formats, or integration contracts.>

## Dependencies / Infrastructure

<Languages, storage, services, runtime, deployment, and hard-to-reverse dependency choices.>

## Constraints

<Budget, platform, compatibility, data, dependency, rollout, or organizational constraints.>

## SLOs and Operations

<Measurable availability/latency/scale goals, monitoring, alerting, logging, and failure handling. Omit if not relevant.>

## Security / Privacy / Legal

<Threats considered, trust boundaries, sensitive data, retention/access, compliance or license concerns. Omit irrelevant subsections explicitly.>

## Timeline / Milestones

<Milestones that create useful reviewable artifacts, not fake precision.>

## Alternatives Considered

- <Alternative>: <why rejected>

## Open Issues

- <Question>: <options, owner/next action>

## Resolved Issues

- <Decision>: <rationale>

## PRD Breakdown

| PRD | Local path | Scope | Depends on | Out of scope |
| --- | --- | --- | --- | --- |
| <Name> | `.scratch/<prd-slug>/PRD.md` | <user-visible slice> | <other PRD or none> | <what not to include> |
```
