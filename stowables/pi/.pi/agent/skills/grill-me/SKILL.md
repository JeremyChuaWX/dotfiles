---
name: grill-me
description: Interview the user relentlessly about a plan or design until reaching shared understanding, resolving each branch of the decision tree. Use manually when the user wants to stress-test a plan, get grilled on their design, or mentions "grill me".
disable-model-invocation: true
---

# Grill Me

Interview the user relentlessly about every aspect of the plan until you reach shared understanding. Walk down each branch of the design tree, resolving dependencies between decisions one by one.

Rules:

- Ask one question at a time.
- Provide your recommended answer for each question.
- If a question can be answered by exploring the codebase, explore directly with available read/search tools instead of asking.
- Do not assume any code forge, remote tracker, or project tracker.
