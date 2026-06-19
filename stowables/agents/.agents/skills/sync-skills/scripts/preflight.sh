#!/usr/bin/env bash
set -euo pipefail

MATT_SKILLS_URL="https://github.com/mattpocock/skills.git"
TMP_ROOT="$(mktemp -d -t sync-skills-XXXXXX)"
trap 'rm -rf "$TMP_ROOT"' EXIT
MATT_SKILLS_REPO="$TMP_ROOT/matt-skills"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
SCRIPT_SKILLS_DIR="$(cd "$SCRIPT_DIR/../.." && pwd -P)"

if [ -n "${AGENT_SKILLS_DIR:-}" ]; then
  SKILLS_DIR="${AGENT_SKILLS_DIR%/}"
elif [ -n "${HOME:-}" ] && [ -d "$HOME/.agents/skills" ]; then
  SKILLS_DIR="$HOME/.agents/skills"
elif [ -d "$SCRIPT_SKILLS_DIR" ]; then
  SKILLS_DIR="$SCRIPT_SKILLS_DIR"
else
  SKILLS_DIR="$SCRIPT_SKILLS_DIR"
fi

if [ ! -d "$SKILLS_DIR" ]; then
  echo "error: shared skills dir not found at $SKILLS_DIR" >&2
  echo "Set AGENT_SKILLS_DIR to the shared skills directory, or run the symlinked script under \$HOME/.agents/skills." >&2
  exit 1
fi

cd "$SKILLS_DIR"
SKILLS_DIR="$(pwd -P)"

echo "== Cloning matt-skills into temporary directory =="
git clone --depth 1 "$MATT_SKILLS_URL" "$MATT_SKILLS_REPO" >&2

echo
echo "== Skill sync mapping =="
cat <<MAP
Shared skills dir:    $SKILLS_DIR
Temporary upstream:   $MATT_SKILLS_REPO
Upstream URL:         $MATT_SKILLS_URL

grill-me                      <- skills/productivity/grill-me
grill-with-docs               <- skills/engineering/grill-with-docs
handoff                       <- skills/productivity/handoff
improve-codebase-architecture <- skills/engineering/improve-codebase-architecture
prototype                     <- skills/engineering/prototype
to-prd                        <- skills/engineering/to-prd (local markdown tracker)
to-issues                     <- skills/engineering/to-issues (local markdown tracker)
MAP

echo
echo "== Validating mapped paths =="
missing=0
while IFS='|' read -r dest source; do
  [ -n "$dest" ] || continue
  src_path="$MATT_SKILLS_REPO/$source"
  dest_path="$SKILLS_DIR/$dest"
  if [ ! -f "$src_path/SKILL.md" ]; then
    echo "missing source: $src_path/SKILL.md" >&2
    missing=1
  fi
  if [ ! -f "$dest_path/SKILL.md" ]; then
    echo "missing destination: $dest_path/SKILL.md" >&2
    missing=1
  fi
  if [ -f "$src_path/SKILL.md" ] && [ -f "$dest_path/SKILL.md" ]; then
    echo "ok: $dest <- $source"
  fi
done <<'MAPS'
grill-me|skills/productivity/grill-me
grill-with-docs|skills/engineering/grill-with-docs
handoff|skills/productivity/handoff
improve-codebase-architecture|skills/engineering/improve-codebase-architecture
prototype|skills/engineering/prototype
to-prd|skills/engineering/to-prd
to-issues|skills/engineering/to-issues
MAPS

if [ "$missing" -ne 0 ]; then
  exit 1
fi

echo
echo "Temporary upstream clone is removed when this script exits."
echo "Run diff-targets.sh separately when you are ready to review upstream diffs."
