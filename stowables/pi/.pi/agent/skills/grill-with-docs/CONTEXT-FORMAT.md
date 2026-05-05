# CONTEXT.md Format

## Structure

```md
# {Context Name}

{One or two sentence description of what this context is and why it exists.}

## Language

**Order**:
{A concise description of the term}
_Avoid_: Purchase, transaction

## Relationships

- An **Order** produces one or more **Invoices**

## Example dialogue

> **Dev:** "When a **Customer** places an **Order**, do we create the **Invoice** immediately?"
> **Domain expert:** "No, an **Invoice** is only generated once **Fulfillment** is confirmed."

## Flagged ambiguities

- "account" was used to mean both **Customer** and **User**. Resolved: these are distinct concepts.
```

## Rules

- Be opinionated. Pick the best word and list aliases to avoid.
- Flag conflicts explicitly.
- Keep definitions tight: one sentence max.
- Show relationships with bold term names and cardinality where obvious.
- Only include terms specific to this project's context.
- Group terms under subheadings when natural clusters emerge.
- Write example dialogue that demonstrates boundaries between related concepts.

## Single vs Multi-Context Repos

Single context: one `CONTEXT.md` at the repo root.

Multiple contexts: a root `CONTEXT-MAP.md` lists contexts, locations, and relationships.

If no context file exists, create a root `CONTEXT.md` lazily when the first term is resolved.
