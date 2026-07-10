#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=lib.sh
. "$SCRIPT_DIR/lib.sh"

DOTFILES_DIR="$(sync_dotfiles_dir)"
SESSION_DIR="$(sync_session_dir "${1:-}")"
removed="$(sync_session_tool remove "$SESSION_DIR" "$DOTFILES_DIR")"
echo "removed: $removed"
