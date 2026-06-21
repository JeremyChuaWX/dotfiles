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
elif [ -n "${HOME:-}" ] && [ -d "$HOME/.agents/skills" ]; then
  SKILLS_DIR="$HOME/.agents/skills"
else
  SKILLS_DIR="$SCRIPT_SKILLS_DIR"
fi

PI_AGENT_DIR="${PI_AGENT_DIR:-${HOME:-}/.pi/agent}"

[ -d "$SKILLS_DIR" ] || { echo "error: shared skills dir not found at $SKILLS_DIR" >&2; exit 1; }
[ -d "$PI_AGENT_DIR" ] || { echo "error: Pi agent dir not found at $PI_AGENT_DIR" >&2; exit 1; }

cd "$SKILLS_DIR"
SKILLS_DIR="$(pwd -P)"

printf '== Cloning external sources into temporary directory ==\n' >&2
git clone --depth 1 "$MATT_SKILLS_URL" "$MATT_SKILLS_REPO" >&2
git clone --depth 1 "$PONYTAIL_URL" "$PONYTAIL_REPO" >&2

cat <<MAP

== External sync mapping ==
Shared skills dir:    $SKILLS_DIR
Pi agent dir:         $PI_AGENT_DIR
Temporary root:       $TMP_ROOT
Matt upstream:        $MATT_SKILLS_URL
Ponytail upstream:    $PONYTAIL_URL

Matt skills:
grill-me                      <- skills/productivity/grill-me
grill-with-docs               <- skills/engineering/grill-with-docs
handoff                       <- skills/productivity/handoff
improve-codebase-architecture <- skills/engineering/improve-codebase-architecture
prototype                     <- skills/engineering/prototype
to-prd                        <- skills/engineering/to-prd (local markdown tracker)
to-issues                     <- skills/engineering/to-issues (local markdown tracker)

Ponytail:
$PI_AGENT_DIR/AGENTS.md        <- AGENTS.md (always-on full-mode global Pi rules)
ponytail-review                <- skills/ponytail-review
ponytail-audit                 <- skills/ponytail-audit
ponytail-debt                  <- skills/ponytail-debt
ponytail-help                  <- skills/ponytail-help
MAP

echo
printf '== Validating Matt skill paths ==\n'
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

echo
printf '== Validating Ponytail paths ==\n'
if [ -f "$PONYTAIL_REPO/AGENTS.md" ]; then
  echo "ok: ponytail upstream AGENTS.md"
else
  echo "missing source: $PONYTAIL_REPO/AGENTS.md" >&2
  missing=1
fi
if [ -f "$PI_AGENT_DIR/AGENTS.md" ]; then
  echo "ok: local global AGENTS.md"
else
  echo "missing destination: $PI_AGENT_DIR/AGENTS.md" >&2
  missing=1
fi

echo
printf '== Validating Ponytail helper skills ==\n'
for skill in ponytail-review ponytail-audit ponytail-debt ponytail-help; do
  if [ ! -f "$PONYTAIL_REPO/skills/$skill/SKILL.md" ]; then
    echo "missing source: $PONYTAIL_REPO/skills/$skill/SKILL.md" >&2
    missing=1
  fi
  if [ ! -f "$SKILLS_DIR/$skill/SKILL.md" ]; then
    echo "missing destination: $SKILLS_DIR/$skill/SKILL.md" >&2
    missing=1
  fi
  if [ -f "$PONYTAIL_REPO/skills/$skill/SKILL.md" ] && [ -f "$SKILLS_DIR/$skill/SKILL.md" ]; then
    echo "ok: $skill <- skills/$skill"
  fi
done

[ "$missing" -eq 0 ] || exit 1

echo
echo "Temporary clones are removed when this script exits."
echo "Run diff-targets.sh separately when you are ready to review upstream diffs."
