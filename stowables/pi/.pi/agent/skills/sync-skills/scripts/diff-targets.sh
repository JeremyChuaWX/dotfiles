#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=lib.sh
. "$SCRIPT_DIR/lib.sh"

MANIFEST="$(sync_manifest_path)"
DOTFILES_DIR="$(sync_dotfiles_dir)"
SESSION_DIR="$(sync_session_dir "${1:-}")"

[ -f "$MANIFEST" ] || { echo "error: manifest not found: $MANIFEST" >&2; exit 1; }

while IFS=$'\t' read -r upstream _url kind name source target_name target adaptation; do
  [ -n "$upstream" ] || continue
  src_path="$SESSION_DIR/upstreams/$upstream/$source"
  dest_path="$DOTFILES_DIR/$target"

  echo
  echo "================================================================================"
  echo "$upstream/$name -> $target_name:$target"
  [ -z "$adaptation" ] || echo "Adaptation: $adaptation"
  echo "================================================================================"

  if [ "$kind" = "skill" ]; then
    if [ -d "$src_path" ] && [ -d "$dest_path" ]; then
      diff -ru --exclude='.DS_Store' "$src_path" "$dest_path" || true
    else
      echo "missing source or target skill dir" >&2
    fi
  else
    if [ -f "$src_path" ] && [ -f "$dest_path" ]; then
      diff -u "$src_path" "$dest_path" || true
    else
      echo "missing source or target file" >&2
    fi
  fi
done < <(python3 -c "$sync_manifest_entries_py" "$MANIFEST")
