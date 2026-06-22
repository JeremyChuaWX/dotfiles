#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=lib.sh
. "$SCRIPT_DIR/lib.sh"

MANIFEST="$(sync_manifest_path)"
DOTFILES_DIR="$(sync_dotfiles_dir)"
SESSION_DIR="$(sync_session_dir "${1:-}")"

[ -f "$MANIFEST" ] || { echo "error: manifest not found: $MANIFEST" >&2; exit 1; }

cat <<MAP
== External sync mapping ==
Dotfiles dir:       $DOTFILES_DIR
Manifest:           $MANIFEST
Session:            $SESSION_DIR
Upstreams dir:      $SESSION_DIR/upstreams
MAP

missing=0

echo
printf '== Validating upstream clones ==\n'
while IFS=$'\t' read -r upstream url; do
  [ -n "$upstream" ] || continue
  if [ -d "$SESSION_DIR/upstreams/$upstream/.git" ]; then
    echo "ok: $upstream <- $url"
  else
    echo "missing upstream clone: $SESSION_DIR/upstreams/$upstream" >&2
    missing=1
  fi
done < <(python3 -c "$sync_upstreams_py" "$MANIFEST")

echo
printf '== Validating mapped source and target paths ==\n'
while IFS=$'\t' read -r upstream _url kind name source target_name target adaptation; do
  [ -n "$upstream" ] || continue
  src_path="$SESSION_DIR/upstreams/$upstream/$source"
  dest_path="$DOTFILES_DIR/$target"

  if [ "$kind" = "skill" ]; then
    if [ ! -f "$src_path/SKILL.md" ]; then
      echo "missing source skill: $src_path/SKILL.md" >&2
      missing=1
      continue
    fi
    if [ ! -f "$dest_path/SKILL.md" ]; then
      echo "missing target skill: $dest_path/SKILL.md" >&2
      missing=1
      continue
    fi
  else
    if [ ! -f "$src_path" ]; then
      echo "missing source file: $src_path" >&2
      missing=1
      continue
    fi
    if [ ! -f "$dest_path" ]; then
      echo "missing target file: $dest_path" >&2
      missing=1
      continue
    fi
  fi

  printf 'ok: %s/%s -> %s:%s' "$upstream" "$name" "$target_name" "$target"
  [ -z "$adaptation" ] || printf ' (%s)' "$adaptation"
  printf '\n'
done < <(python3 -c "$sync_manifest_entries_py" "$MANIFEST")

[ "$missing" -eq 0 ] || exit 1

cat <<NEXT

Preflight passed. Review diffs with:
  "$SCRIPT_DIR/diff-targets.sh" "$SESSION_DIR"
NEXT
