#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=lib.sh
. "$SCRIPT_DIR/lib.sh"

MANIFEST="$(sync_manifest_path)"
DOTFILES_DIR="$(sync_dotfiles_dir)"
SESSION_DIR="$(sync_session_dir "${1:-}")"

[ -f "$MANIFEST" ] || { echo "error: manifest not found: $MANIFEST" >&2; exit 1; }
sync_validate_manifest "$MANIFEST"
ENTRY_RECORDS="$(sync_manifest_entries "$MANIFEST")"
failed=0

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
    if [ ! -d "$src_path" ] || [ ! -d "$dest_path" ]; then
      echo "missing source or target skill dir" >&2
      failed=1
      continue
    fi
    if diff -ru --exclude='.DS_Store' "$src_path" "$dest_path"; then
      :
    else
      status=$?
      if [ "$status" -gt 1 ]; then
        echo "error: diff failed for $upstream/$name (exit $status)" >&2
        failed=1
      fi
    fi
  else
    if [ ! -f "$src_path" ] || [ ! -f "$dest_path" ]; then
      echo "missing source or target file" >&2
      failed=1
      continue
    fi
    if diff -u "$src_path" "$dest_path"; then
      :
    else
      status=$?
      if [ "$status" -gt 1 ]; then
        echo "error: diff failed for $upstream/$name (exit $status)" >&2
        failed=1
      fi
    fi
  fi
done <<< "$ENTRY_RECORDS"

exit "$failed"
