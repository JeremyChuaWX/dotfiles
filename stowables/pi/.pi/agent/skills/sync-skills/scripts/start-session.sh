#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=lib.sh
. "$SCRIPT_DIR/lib.sh"

MANIFEST="$(sync_manifest_path)"
[ -f "$MANIFEST" ] || { echo "error: manifest not found: $MANIFEST" >&2; exit 1; }

TMP_ROOT="$(mktemp -d -t sync-skills-XXXXXX)"
mkdir -p "$TMP_ROOT/upstreams"
printf 'sync-skills session\n' > "$TMP_ROOT/.sync-skills-session"

printf '== Sync skills session ==\n'
printf 'Manifest: %s\n' "$MANIFEST"
printf 'Session:  %s\n\n' "$TMP_ROOT"

printf '== Cloning latest upstreams ==\n' >&2
while IFS=$'\t' read -r upstream url; do
  [ -n "$upstream" ] || continue
  printf '%s <- %s\n' "$upstream" "$url"
  git clone --depth 1 "$url" "$TMP_ROOT/upstreams/$upstream" >&2
done < <(python3 -c "$sync_upstreams_py" "$MANIFEST")

cat <<NEXT

Run these next:

  export SYNC_SKILLS_SESSION="$TMP_ROOT"
  "$SCRIPT_DIR/preflight.sh" "$TMP_ROOT"
  "$SCRIPT_DIR/diff-targets.sh" "$TMP_ROOT"

When approved updates are applied and verified:

  "$SCRIPT_DIR/finish-session.sh" "$TMP_ROOT"
NEXT
