#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=lib.sh
. "$SCRIPT_DIR/lib.sh"

SESSION_DIR="$(sync_session_dir "${1:-}")"

"$SCRIPT_DIR/verify.sh"

echo
echo "== Git status =="
git -C "$(sync_dotfiles_dir)" status --short

echo
echo "== Removing sync session =="
rm -rf "$SESSION_DIR"
echo "removed: $SESSION_DIR"
