---
name: to-spec
description: Turn the current conversation context, a tech doc, or one spec candidate into a spec published to the local markdown issue tracker. Use manually when creating a spec from current context or /skill:tech-doc output.
disable-model-invocation: true
---

# To Spec

This skill takes the current conversation context, a tech doc, or one spec candidate and produces one spec (you may know this document as a PRD). Do NOT interview the user for requirements — just synthesize what you already know.

If the input is a tech doc with multiple **PRD Breakdown** rows and the user did not specify which one to expand, ask that one selection question. Do not loop over rows and do not flatten the whole tech doc into one spec unless the user explicitly asks.

The project issue tracker is Matt's **Local Markdown** tracker only:

- One feature per directory: `.scratch/<feature-slug>/`
- The spec is stored at `.scratch/<feature-slug>/PRD.md` for compatibility with the local AFK workflow
- Implementation tickets are `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01`
- Ticket state is recorded as a `Status:` line near the top of each ticket file
- Comments and conversation history append to the bottom of the file under a `## Comments` heading

Do not create remote tracker items. Do not use remote tracker CLIs. Ignore GitHub, GitLab, Linear, Jira, and any other remote issue tracker.

## Process

1. If the user passed a tech doc path, spec candidate name, or `.scratch/` path, read it first. If it is a tech doc with a **PRD Breakdown** table, extract only the requested row. If no row was requested, ask which single spec to create.

2. Explore the repo to understand the current state of the codebase, if you haven't already. Use the project's domain glossary vocabulary throughout the spec, and respect any ADRs in the area you're touching.

3. Sketch out the seams at which you're going to test the feature. Existing seams should be preferred to new ones. Use the highest seam possible. If new seams are needed, propose them at the highest point you can. The fewer seams across the codebase, the better — the ideal number is one.

Check with the user that these seams match their expectations.

4. Draft the spec using the template below. If it came from a tech doc, link the parent tech doc in Further Notes and keep the spec scoped to its single breakdown row.

5. Ask for approval before writing.

6. After approval, publish the spec to `.scratch/<feature-slug>/PRD.md`. Do not overwrite an existing spec without explicit approval.

<spec-template>

## Problem Statement

The problem that the user is facing, from the user's perspective.

## Solution

The solution to the problem, from the user's perspective.

## User Stories

A LONG, numbered list of user stories. Each user story should be in the format of:

1. As an <actor>, I want a <feature>, so that <benefit>

<user-story-example>
1. As a mobile bank customer, I want to see balance on my accounts, so that I can make better informed decisions about my spending
</user-story-example>

This list of user stories should be extremely extensive and cover all aspects of the feature.

## Implementation Decisions

A list of implementation decisions that were made. This can include:

- The modules that will be built/modified
- The interfaces of those modules that will be modified
- Technical clarifications from the developer
- Architectural decisions
- Schema changes
- API contracts
- Specific interactions

Do NOT include specific file paths or code snippets. They may end up being outdated very quickly.

Exception: if a prototype produced a snippet that encodes a decision more precisely than prose can (state machine, reducer, schema, type shape), inline it within the relevant decision and note briefly that it came from a prototype. Trim to the decision-rich parts — not a working demo, just the important bits.

## Testing Decisions

A list of testing decisions that were made. Include:

- A description of what makes a good test (only test external behavior, not implementation details)
- Which modules will be tested
- Prior art for the tests (i.e. similar types of tests in the codebase)

## Out of Scope

A description of the things that are out of scope for this spec.

## Further Notes

Any further notes about the feature.

</spec-template>
