#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=lib.sh
. "$SCRIPT_DIR/lib.sh"

MANIFEST="$(sync_manifest_path)"
DOTFILES_DIR="$(sync_dotfiles_dir)"
[ -f "$MANIFEST" ] || { echo "error: manifest not found: $MANIFEST" >&2; exit 1; }
sync_validate_manifest "$MANIFEST"
UPSTREAM_RECORDS="$(sync_manifest_upstreams "$MANIFEST")"

TMP_ROOT="$(sync_session_tool create "$DOTFILES_DIR" "$MANIFEST")"

cleanup_failed_start() {
  local status=$?
  trap - EXIT
  if [ "$status" -ne 0 ] && [ -n "${TMP_ROOT:-}" ]; then
    echo "cleaning failed sync session: $TMP_ROOT" >&2
    sync_session_tool remove "$TMP_ROOT" "$DOTFILES_DIR" >/dev/null 2>&1 || true
  fi
  exit "$status"
}
trap cleanup_failed_start EXIT

printf '== Sync skills session ==\n'
printf 'Manifest: %s\n' "$MANIFEST"
printf 'Session:  %s\n\n' "$TMP_ROOT"

printf '== Cloning latest upstreams ==\n' >&2
while IFS=$'\t' read -r upstream url; do
  [ -n "$upstream" ] || continue
  clone_path="$TMP_ROOT/upstreams/$upstream"
  printf '%s <- %s\n' "$upstream" "$url"
  git clone --depth 1 "$url" "$clone_path" >&2
  revision="$(sync_session_tool record-upstream "$TMP_ROOT" "$DOTFILES_DIR" "$upstream" "$url" "$clone_path")"
  printf 'revision: %s\n' "$revision"
done <<< "$UPSTREAM_RECORDS"

trap - EXIT
cat <<NEXT

Run these next:

  export SYNC_SKILLS_SESSION="$TMP_ROOT"
  "$SCRIPT_DIR/preflight.sh" "$TMP_ROOT"
  "$SCRIPT_DIR/diff-targets.sh" "$TMP_ROOT"

When approved updates are applied and verified:

  "$SCRIPT_DIR/finish-session.sh" "$TMP_ROOT"

To abandon the session without applying updates:

  "$SCRIPT_DIR/abort-session.sh" "$TMP_ROOT"
NEXT
