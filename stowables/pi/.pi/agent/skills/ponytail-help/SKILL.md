---
name: ponytail-help
description: >
  Quick-reference card for this local Ponytail setup: always-on full mode via
  global AGENTS.md plus manual helper skills. One-shot display, not a
  persistent mode. Trigger with /skill:ponytail-help, "ponytail help", "what
  ponytail commands", or "how do I use ponytail".
disable-model-invocation: true
---

# Ponytail Help

Display this reference card when invoked. One-shot, do NOT change mode, write flag files, or persist anything.

## Local setup

Ponytail is always on in **full** mode through global Pi context:

```text
~/.pi/agent/AGENTS.md
```

Full mode enforces the ladder: YAGNI → stdlib → native platform → existing dependency → one line → minimum custom code.

## Manual helper skills

| Skill | Trigger | What it does |
|-------|---------|--------------|
| **ponytail-review** | `/skill:ponytail-review` | Over-engineering diff review: `L42: yagni: factory, one product. Inline.` |
| **ponytail-audit** | `/skill:ponytail-audit` | Repo-wide bloat audit: what to delete, simplify, or replace. |
| **ponytail-debt** | `/skill:ponytail-debt` | Collect `ponytail:` shortcut comments into a ledger. |
| **ponytail-help** | `/skill:ponytail-help` | This card. |

## Mode choice

Default: **full**. Use ultra only by asking in plain English for a specific task, e.g. "go ultra ponytail on this cleanup".

## Deactivate

Say "stop ponytail" or "normal mode". Resume with "ponytail" or "lazy mode".

## Update

Run the local sync workflow:

```text
/skill:sync-skills
```

It clones upstream Ponytail and Matt skills, shows diffs, and patches only approved local changes.
