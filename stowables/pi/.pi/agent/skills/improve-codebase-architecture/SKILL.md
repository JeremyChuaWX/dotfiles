---
name: improve-codebase-architecture
description: Find deepening opportunities in a codebase, informed by domain language in CONTEXT.md and decisions in docs/adr/. Use manually to improve architecture, find refactoring opportunities, consolidate tightly coupled modules, or make code more testable and AI-navigable.
disable-model-invocation: true
---

# Improve Codebase Architecture

Surface architectural friction and propose **deepening opportunities**: refactors that turn shallow modules into deep ones. The aim is testability and AI-navigability.

## Glossary

Use these terms exactly. Full definitions are in [LANGUAGE.md](LANGUAGE.md).

- **Module**: anything with an interface and an implementation.
- **Interface**: everything a caller must know to use the module.
- **Implementation**: the code inside.
- **Depth**: leverage at the interface.
- **Seam**: where an interface lives.
- **Adapter**: a concrete thing satisfying an interface at a seam.
- **Leverage**: what callers get from depth.
- **Locality**: what maintainers get from depth.

## Process

### 1. Explore

Read the project's domain glossary and any ADRs in the area first. Look for `CONTEXT.md`, `CONTEXT-MAP.md`, and `docs/adr/` when present.

Then explore the codebase directly with available Pi Coding Agent read/search tools. Explore organically and note where you experience friction:

- Where does understanding one concept require bouncing between many small modules?
- Where are modules **shallow**?
- Where have pure functions been extracted just for testability, but real bugs hide in how they are called?
- Where do tightly coupled modules leak across their seams?
- Which parts are untested or hard to test through their current interface?

Apply the **deletion test** to suspected shallow modules: would deleting it concentrate complexity, or just move it?

### 2. Present Candidates

Present deepening opportunities first. For each candidate include:

- **Files**: files/modules involved.
- **Problem**: why the architecture causes friction.
- **Solution**: plain English description of what would change.
- **Benefits**: locality, leverage, and test improvement.

Use `CONTEXT.md` vocabulary for the domain and [LANGUAGE.md](LANGUAGE.md) vocabulary for architecture.

If a candidate contradicts an ADR, surface it only when the friction is real enough to warrant revisiting that ADR.

Do not propose interfaces yet. Ask: "Which of these would you like to explore?"

### 3. Grilling Loop

Once the user picks a candidate, walk the design tree with them: constraints, dependencies, the deepened module shape, what sits behind the seam, and what tests survive.

Side effects happen inline as decisions crystallize:

- If naming a deepened module after a concept not in `CONTEXT.md`, add the term to `CONTEXT.md` after confirmation.
- If sharpening fuzzy language, update `CONTEXT.md` after confirmation.
- If the user rejects a candidate with a load-bearing reason, offer an ADR only when future architecture reviews would need that reason.
- If exploring alternative interfaces, use [INTERFACE-DESIGN.md](INTERFACE-DESIGN.md).
