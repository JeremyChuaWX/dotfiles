# ADR Format

ADRs live in `docs/adr/` and use sequential numbering: `0001-slug.md`, `0002-slug.md`, etc.

Create `docs/adr/` lazily only when the first ADR is needed.

## Template

```md
# {Short title of the decision}

{1-3 sentences: what is the context, what did we decide, and why.}
```

That can be enough. The value is recording that a decision was made and why.

## Optional Sections

Only include these when they add genuine value:

- Status frontmatter: `proposed`, `accepted`, `deprecated`, or `superseded by ADR-NNNN`.
- Considered Options.
- Consequences.

## When To Offer An ADR

All three must be true:

1. Hard to reverse.
2. Surprising without context.
3. The result of a real trade-off.
