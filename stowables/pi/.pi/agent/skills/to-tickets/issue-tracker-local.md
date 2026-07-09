# Issue tracker: Local Markdown

Issues, tickets, and specs for this repo live as markdown files in `.scratch/`.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`
- The spec is stored at `.scratch/<feature-slug>/PRD.md` for compatibility with the local AFK workflow
- Implementation tickets are `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01`
- Ticket state is recorded as a `Status:` line near the top of each ticket file
- Comments and conversation history append to the bottom of the file under a `## Comments` heading

## When a skill says "publish to the issue tracker"

Create a new file under `.scratch/<feature-slug>/` (creating the directory if needed).

Do not create remote tracker items. Do not use remote tracker CLIs.

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. The user will normally pass the path or the issue number directly.
