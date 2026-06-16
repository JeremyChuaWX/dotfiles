---
name: handoff
description: Compact the current conversation into a handoff document for another agent to pick up. Use manually when the user wants to continue work in a fresh session.
argument-hint: "What will the next session be used for?"
disable-model-invocation: true
---

# Handoff

Write a handoff document summarizing the current conversation so a fresh agent can continue the work. Save it to a path produced by `mktemp -t handoff-XXXXXX.md`. Read the generated file path before writing to it.

Include a "Suggested skills" section listing skills the next session should invoke, if any.

Do not duplicate content already captured in other artifacts (PRDs, plans, ADRs, local tracker issues, commits, diffs). Reference them by path or URL instead.

Redact any sensitive information, such as API keys, passwords, or personally identifiable information.

If the user passed arguments, treat them as a description of what the next session will focus on and tailor the document accordingly.

Do not create remote tracker items. Do not use remote tracker CLIs.
