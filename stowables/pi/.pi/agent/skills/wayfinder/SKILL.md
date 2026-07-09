---
name: wayfinder
description: Plan a huge chunk of work — more than one agent session can hold — as a local markdown map of investigation tickets, then resolve them one at a time until the way to the destination is clear.
disable-model-invocation: true
---

# Wayfinder

A loose idea has arrived — too big for one agent session, and wrapped in fog: the way from here to the **destination** isn't visible yet. Wayfinding is about finding that way, not charging at the destination. This skill charts the way as a **local markdown map**, then works its tickets one at a time until the route is clear.

Use the local markdown tracker only:

- Map: `.scratch/<feature-slug>/WAYFINDER.md`
- Tickets: `.scratch/<feature-slug>/issues/<NN>-<slug>.md`
- State: `Status:` near the top (`ready-for-agent`, `in-progress`, `blocked`, `done`, `wontfix`)
- Type: `Type:` near the top (`research`, `prototype`, `grilling`, `task`)
- Claim: `Assignee:` near the top when a session claims a ticket

Do not create remote tracker items. Do not use remote tracker CLIs. Ignore GitHub, GitLab, Linear, Jira, and any other remote issue tracker.

## Plan, don't do

Wayfinder is **planning** by default: each ticket resolves a decision, and the map is done when the way is clear — nothing left to decide before someone goes and does the thing. An effort can override this in **Notes**, but absent that, produce decisions, not deliverables.

## The map

The map is an **index**, not a store. It lists the decisions made and points at the tickets that hold their detail; a decision lives in exactly one place — its ticket — so the map never restates it, only gists it and links.

```markdown
# Wayfinder: <short name>

## Destination

<what reaching the end of this map looks like — the spec, decision, or change this effort is finding its way to. One or two lines.>

## Notes

<domain; skills every session should consult; standing preferences for this effort>

## Decisions so far

- [<closed ticket title>](issues/NN-slug.md) — <one-line gist of the answer>

## Not yet specified

<in-scope fog you can't ticket yet; graduate it as the frontier advances>

## Out of scope

<work ruled beyond the destination; closed, never graduating>
```

## Tickets

Each ticket is a local markdown file sized to one fresh agent session:

```markdown
Status: ready-for-agent
Type: research | prototype | grilling | task
Assignee:

# <Ticket title>

## Question

<the decision or investigation this ticket resolves>

## Blocked by

- A reference to each blocking local ticket path, or "None — can start immediately".

## Resolution

<filled when done; link assets instead of pasting them wholesale>

## Comments
```

A ticket is **unblocked** when every referenced blocker is `done`. The **frontier** is open, unblocked, unclaimed tickets. Claim a ticket by writing `Assignee: <name>` before work starts; clear or update it if you stop.

## Ticket types

Every ticket is either **HITL** — human in the loop, worked *with* a human who speaks for themselves — or **AFK**, driven by the agent alone. A HITL ticket only resolves through that live exchange; the agent never stands in for the human's side of it.

- **Research** (AFK): Reading documentation, source code, specs, first-party APIs, or local resources. Creates a cited markdown summary as a linked asset.
- **Prototype** (HITL): Raise discussion fidelity with a cheap, rough artifact via `/skill:prototype`. Links the prototype as an asset.
- **Grilling** (HITL): Conversation via `/skill:grilling` and `/skill:domain-modeling`, one question at a time. The default case.
- **Task** (HITL or AFK): Manual work that must happen before a decision can be made. It earns its place by unblocking a decision, not by delivering the destination.

## Invocation

Two modes. Either way, **never resolve more than one ticket per session.**

### Chart the map

User invokes with a loose idea.

1. **Name the destination.** Run a grilling/domain-modeling conversation to pin down what this map is finding its way to. The destination fixes the scope, so it's settled first.
2. **Map the frontier.** Grill breadth-first: fan out across the space rather than deep on one thread, surfacing open decisions and first steps takeable now. If this surfaces no fog, stop and ask how the user wants to proceed instead of creating a map.
3. **Create the map** at `.scratch/<feature-slug>/WAYFINDER.md`: Destination and Notes filled in, Decisions-so-far empty, the fog sketched into **Not yet specified**.
4. **Create the tickets you can specify now** under `.scratch/<feature-slug>/issues/`, then wire blocking edges in a second pass using local file paths. Everything you can't yet specify stays in **Not yet specified**.
5. Stop — charting the map is one session's work; do not also resolve tickets.

### Work through the map

User invokes with a map path. A ticket is optional — without one, pick the next frontier ticket.

1. Load the map — the low-resolution view, not every ticket body.
2. Choose the ticket. If the user named one, use it. Otherwise take the first frontier ticket in dependency order. Claim it before any work.
3. Resolve it — zoom as needed: read related or closed tickets on demand; invoke the skills named in Notes. If in doubt, use `/skill:grilling` and `/skill:domain-modeling`.
4. Record the resolution in the ticket, set `Status: done`, and append a context pointer to the map's Decisions-so-far.
5. Add newly surfaced tickets and graduate any fog the answer made specifiable. If a ticket is beyond the destination, set `Status: wontfix` and add one Out of scope line linking it.
