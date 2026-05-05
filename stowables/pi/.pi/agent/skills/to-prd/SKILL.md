---
name: to-prd
description: Turn the current conversation and codebase context into a local PRD draft. Use manually when the user wants to create a PRD from current context without publishing remote tracker items.
disable-model-invocation: true
---

# To PRD

This skill takes the current conversation context and codebase understanding and produces a PRD. Do not publish it immediately.

## Process

1. Explore the repo if needed. Use project domain vocabulary and respect ADRs in the relevant area.
2. Sketch the major modules to build or modify. Look for deep modules that can be tested in isolation.
3. Check with the user that these modules match expectations and which modules need tests.
4. Draft the PRD using the template below.
5. Ask for approval before writing.
6. After approval, write to `.harness/<feature-slug>/PRD.md`.

Do not create remote tracker items. Do not use remote tracker CLIs.

## PRD Template

```md
## Problem Statement

The problem that the user is facing, from the user's perspective.

## Solution

The solution to the problem, from the user's perspective.

## User Stories

1. As an <actor>, I want a <feature>, so that <benefit>

## Implementation Decisions

- Modules that will be built or modified
- Interfaces that will be modified
- Technical clarifications
- Architectural decisions
- Schema changes
- Specific interactions

Do not include specific file paths or code snippets.

## Testing Decisions

- What makes a good test
- Which modules will be tested
- Similar tests already in the codebase

## Out of Scope

The things out of scope for this PRD.

## Further Notes

Any further notes about the feature.
```
