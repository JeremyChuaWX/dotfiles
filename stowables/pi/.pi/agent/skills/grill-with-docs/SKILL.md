---
name: grill-with-docs
description: Stress-test a plan against the existing domain model, sharpen terminology, and update CONTEXT.md or ADRs inline as decisions crystallize. Use manually when challenging a plan against project language and documented decisions.
disable-model-invocation: true
---

# Grill With Docs

## What To Do

Interview the user relentlessly about every aspect of the plan until you reach shared understanding. Walk down each branch of the design tree, resolving dependencies between decisions one by one.

Ask one question at a time, waiting for feedback on each question before continuing. Provide your recommended answer for each question.

If a question can be answered by exploring the codebase, explore directly with available read/search tools instead of asking.

## Domain Awareness

During codebase exploration, also look for existing documentation:

- Root `CONTEXT.md` for a single context.
- Root `CONTEXT-MAP.md` for multiple contexts.
- `docs/adr/` and context-local `docs/adr/` directories for architectural decisions.

Create files lazily. If no `CONTEXT.md` exists, create one only when the first term is resolved. If no `docs/adr/` exists, create it only when the first ADR is needed.

## During The Session

When the user uses a term that conflicts with existing language in `CONTEXT.md`, call it out immediately.

When the user uses vague or overloaded terms, propose a precise canonical term.

When domain relationships are being discussed, stress-test them with concrete scenarios that probe edge cases.

When the user states how something works, check whether the code agrees. Surface contradictions plainly.

Update `CONTEXT.md` inline only after the user confirms resolved terminology. Use [CONTEXT-FORMAT.md](./CONTEXT-FORMAT.md). Do not couple `CONTEXT.md` to implementation details.

Offer ADRs sparingly. Only offer one when all three are true:

1. Hard to reverse.
2. Surprising without context.
3. The result of a real trade-off.

Use [ADR-FORMAT.md](./ADR-FORMAT.md). Do not assume any code forge, remote tracker, or project tracker.
