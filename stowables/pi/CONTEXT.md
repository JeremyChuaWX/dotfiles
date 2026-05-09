# Pi Dotfiles

This context describes custom Pi agent workflow behavior configured in this dotfiles package.

## Language

**Last assistant text response**:
The most recent assistant message's visible text, excluding thinking blocks, tool calls, and tool results.
_Avoid_: latest response from the agent, last agent output

**External prompt editor**:
The `$VISUAL` or `$EDITOR` program opened from Pi's input editor for composing a prompt.
_Avoid_: Neovim flow, editor window

**Response reference block**:
Read-only reference text inserted into the external prompt editor and stripped before returning text to Pi.
_Avoid_: prefill, template, quoted response

## Relationships

- An **External prompt editor** may include one **Response reference block**.
- A **Response reference block** contains exactly one **Last assistant text response**.
- Pi receives only the user-authored text after the **Response reference block** is stripped.
- An empty stripped response leaves Pi's existing input unchanged.

## Example dialogue

> **Dev:** "When I open the **External prompt editor**, should the **Last assistant text response** be sent back to Pi too?"
> **Domain expert:** "No — it is only a **Response reference block**; Pi should receive only what I write below it."

## Flagged ambiguities

- "latest response from the agent" was resolved as **Last assistant text response**: visible assistant text only, not thinking, tool calls, or tool results.
