#!/usr/bin/env bash
set -euo pipefail

MATT_SKILLS_URL="https://github.com/mattpocock/skills.git"
TMP_ROOT="$(mktemp -d -t sync-skills-XXXXXX)"
trap 'rm -rf "$TMP_ROOT"' EXIT
MATT_SKILLS_REPO="$TMP_ROOT/matt-skills"

if [ -n "${PI_CONFIG_ROOT:-}" ]; then
  PI_CONFIG_ROOT="$PI_CONFIG_ROOT"
elif [ -d "$PWD/.pi/agent/skills" ]; then
  PI_CONFIG_ROOT="$PWD"
else
  git_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
  if [ -d "$git_root/stowables/pi/.pi/agent/skills" ]; then
    PI_CONFIG_ROOT="$git_root/stowables/pi"
  else
    PI_CONFIG_ROOT="$git_root"
  fi
fi

PI_SKILLS_DIR="$PI_CONFIG_ROOT/.pi/agent/skills"

if [ ! -d "$PI_SKILLS_DIR" ]; then
  echo "error: Pi skills dir not found at $PI_SKILLS_DIR" >&2
  exit 1
fi

echo "== Cloning matt-skills into temporary directory ==" >&2
git clone --depth 1 "$MATT_SKILLS_URL" "$MATT_SKILLS_REPO" >&2

while IFS='|' read -r dest source note; do
  [ -n "$dest" ] || continue
  src_path="$MATT_SKILLS_REPO/$source"
  dest_path="$PI_SKILLS_DIR/$dest"
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
improve-codebase-architecture|skills/engineering/improve-codebase-architecture|
to-prd|skills/engineering/to-prd|adapt remote publishing to local .harness PRD
to-plan|skills/engineering/to-issues|adapt tracker issues to local plan slices
MAPS
