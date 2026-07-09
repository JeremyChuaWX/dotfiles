---
name: grill-me
description: Interview the user relentlessly about a plan or design until reaching shared understanding, resolving each branch of the decision tree. Use manually when the user wants to stress-test a plan, get grilled on their design, or mentions "grill me".
disable-model-invocation: true
---

# Grill Me

Interview the user relentlessly about every aspect of the plan until you reach shared understanding. Walk down each branch of the design tree, resolving dependencies between decisions one by one. For each question, provide your recommended answer.

Ask the questions one at a time, waiting for feedback on each question before continuing. Asking multiple questions at once is bewildering.

If a *fact* can be found by exploring the codebase, look it up rather than asking. The *decisions*, though, are the user's — put each one to them and wait for their answer.

Do not enact the plan until the user confirms you have reached shared understanding.

Do not assume any code forge, remote tracker, or project tracker.
