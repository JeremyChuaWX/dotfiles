# Interface Design

When the user wants to explore alternative interfaces for a chosen deepening candidate, design it more than once. Your first idea is unlikely to be the best.

Use vocabulary from [LANGUAGE.md](LANGUAGE.md): **module**, **interface**, **seam**, **adapter**, **leverage**, **locality**.

## Process

### 1. Frame The Problem Space

Write a user-facing explanation of the candidate:

- Constraints any new interface must satisfy.
- Dependencies it would rely on.
- A rough illustrative code sketch to ground constraints, not a proposal.

### 2. Explore Alternatives

Explore alternatives directly with available Pi Coding Agent read/search tools. If separate Pi Coding Agent sessions or extensions are available, they may be used to independently explore radically different designs.

Produce at least three different interface alternatives:

- Minimize the interface: aim for 1-3 entry points max.
- Maximize flexibility: support many use cases and extension.
- Optimize for the most common caller: make the default case trivial.
- If applicable, design around adapters for cross-seam dependencies.

Each alternative should include:

1. Interface: types, methods, params, invariants, ordering, and error modes.
2. Usage example.
3. What the implementation hides behind the seam.
4. Dependency strategy and adapters.
5. Trade-offs: where leverage is high and where it is thin.

### 3. Present And Compare

Present designs sequentially, then compare them by **depth**, **locality**, and **seam placement**. Give a strong recommendation and propose a hybrid if useful.
