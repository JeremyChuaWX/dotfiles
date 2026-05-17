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
  echo "Run from the pi dotfiles repo or set PI_CONFIG_ROOT." >&2
  exit 1
fi

echo "== Cloning matt-skills into temporary directory =="
git clone --depth 1 "$MATT_SKILLS_URL" "$MATT_SKILLS_REPO" >&2

echo
echo "== Skill sync mapping =="
cat <<MAP
Pi config root:       $PI_CONFIG_ROOT
Pi skills dir:        $PI_SKILLS_DIR
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
  dest_path="$PI_SKILLS_DIR/$dest"
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
