#!/usr/bin/env bash
set -euo pipefail

MATT_SKILLS_URL="https://github.com/mattpocock/skills.git"
PONYTAIL_URL="https://github.com/DietrichGebert/ponytail.git"
TMP_ROOT="$(mktemp -d -t sync-skills-XXXXXX)"
trap 'rm -rf "$TMP_ROOT"' EXIT
MATT_SKILLS_REPO="$TMP_ROOT/matt-skills"
PONYTAIL_REPO="$TMP_ROOT/ponytail"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
SCRIPT_SKILLS_DIR="$(cd "$SCRIPT_DIR/../.." && pwd -P)"

if [ -n "${AGENT_SKILLS_DIR:-}" ]; then
  SKILLS_DIR="${AGENT_SKILLS_DIR%/}"
elif [ -n "${HOME:-}" ] && [ -d "$HOME/.pi/agent/skills" ]; then
  SKILLS_DIR="$HOME/.pi/agent/skills"
else
  SKILLS_DIR="$SCRIPT_SKILLS_DIR"
fi

PI_AGENT_DIR="${PI_AGENT_DIR:-${HOME:-}/.pi/agent}"

[ -d "$SKILLS_DIR" ] || { echo "error: Pi skills dir not found at $SKILLS_DIR" >&2; exit 1; }
[ -d "$PI_AGENT_DIR" ] || { echo "error: Pi agent dir not found at $PI_AGENT_DIR" >&2; exit 1; }

cd "$SKILLS_DIR"
SKILLS_DIR="$(pwd -P)"

printf '== Cloning external sources into temporary directory ==\n' >&2
git clone --depth 1 "$MATT_SKILLS_URL" "$MATT_SKILLS_REPO" >&2
git clone --depth 1 "$PONYTAIL_URL" "$PONYTAIL_REPO" >&2

while IFS='|' read -r dest source note; do
  [ -n "$dest" ] || continue
  src_path="$MATT_SKILLS_REPO/$source"
  dest_path="$SKILLS_DIR/$dest"
  echo
  echo "================================================================================"
  echo "$dest <- $source${note:+ ($note)}"
  echo "================================================================================"
  if [ ! -d "$src_path" ] || [ ! -d "$dest_path" ]; then
    echo "missing source or destination" >&2
    continue
  fi
  diff -ru --exclude='.DS_Store' "$src_path" "$dest_path" || true
done <<'MAPS'
grill-me|skills/productivity/grill-me|
grill-with-docs|skills/engineering/grill-with-docs|
handoff|skills/productivity/handoff|preserve local/no-remote guardrails
improve-codebase-architecture|skills/engineering/improve-codebase-architecture|
prototype|skills/engineering/prototype|preserve throwaway-code and local/no-remote guardrails
to-prd|skills/engineering/to-prd|adapt publishing to local markdown tracker .scratch PRD
to-issues|skills/engineering/to-issues|adapt publishing to local markdown tracker issues
MAPS

echo
echo "================================================================================"
echo "global Ponytail AGENTS.md <- AGENTS.md (preserve always-on local policy)"
echo "================================================================================"
if [ -f "$PONYTAIL_REPO/AGENTS.md" ] && [ -f "$PI_AGENT_DIR/AGENTS.md" ]; then
  diff -u "$PONYTAIL_REPO/AGENTS.md" "$PI_AGENT_DIR/AGENTS.md" || true
else
  echo "missing Ponytail upstream AGENTS.md or local $PI_AGENT_DIR/AGENTS.md" >&2
fi

for skill in ponytail-review ponytail-audit ponytail-debt ponytail-help; do
  echo
  echo "================================================================================"
  echo "Ponytail helper skill: $skill <- skills/$skill (preserve manual-only frontmatter)"
  echo "================================================================================"
  if [ -d "$PONYTAIL_REPO/skills/$skill" ] && [ -d "$SKILLS_DIR/$skill" ]; then
    diff -ru --exclude='.DS_Store' "$PONYTAIL_REPO/skills/$skill" "$SKILLS_DIR/$skill" || true
  else
    echo "missing upstream or local Ponytail skill: $skill" >&2
  fi
done
