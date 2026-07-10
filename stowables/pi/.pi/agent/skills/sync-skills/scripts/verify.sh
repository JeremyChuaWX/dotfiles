#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=lib.sh
. "$SCRIPT_DIR/lib.sh"

MANIFEST="$(sync_manifest_path)"
DOTFILES_DIR="$(sync_dotfiles_dir)"
REPO_PI_SKILLS_DIR="$DOTFILES_DIR/stowables/pi/.pi/agent/skills"
REPO_OPENCODE_SKILLS_DIR="$DOTFILES_DIR/stowables/opencode/.config/opencode/skills"
PI_SKILLS_DIR="${AGENT_SKILLS_DIR:-$REPO_PI_SKILLS_DIR}"
OPENCODE_DIR="${OPENCODE_SKILLS_DIR:-$REPO_OPENCODE_SKILLS_DIR}"

[ -f "$MANIFEST" ] || { echo "error: manifest not found: $MANIFEST" >&2; exit 1; }
sync_validate_manifest "$MANIFEST"

PYTHONDONTWRITEBYTECODE=1 python3 "$SCRIPT_DIR/verify_tool.py" \
  --manifest "$MANIFEST" \
  --dotfiles "$DOTFILES_DIR" \
  --pi-skills "$PI_SKILLS_DIR" \
  --opencode-skills "$OPENCODE_DIR"
