#!/usr/bin/env bash

SYNC_SKILLS_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"

sync_script_dir() {
  printf '%s\n' "$SYNC_SKILLS_LIB_DIR"
}

sync_dotfiles_dir() {
  local dotfiles_dir
  dotfiles_dir="${DOTFILES_DIR:-}"
  if [ -n "$dotfiles_dir" ]; then
    [ -d "$dotfiles_dir" ] || { echo "error: DOTFILES_DIR not found: $dotfiles_dir" >&2; return 1; }
    (cd "$dotfiles_dir" && pwd -P)
    return
  fi

  dotfiles_dir="$(git -C "$SYNC_SKILLS_LIB_DIR" rev-parse --show-toplevel 2>/dev/null || true)"
  [ -n "$dotfiles_dir" ] || {
    echo "error: could not find dotfiles git root; set DOTFILES_DIR" >&2
    return 1
  }
  printf '%s\n' "$dotfiles_dir"
}

sync_manifest_path() {
  local dotfiles_dir
  if [ -n "${SYNC_SKILLS_MANIFEST:-}" ]; then
    printf '%s\n' "$SYNC_SKILLS_MANIFEST"
    return
  fi
  dotfiles_dir="$(sync_dotfiles_dir)" || return 1
  printf '%s\n' "$dotfiles_dir/stowables/ai-skills/manifest.json"
}

sync_manifest_tool() {
  PYTHONDONTWRITEBYTECODE=1 python3 "$SYNC_SKILLS_LIB_DIR/manifest_tool.py" "$@"
}

sync_validate_manifest() {
  sync_manifest_tool validate "$1"
}

sync_manifest_upstreams() {
  sync_manifest_tool upstreams "$1"
}

sync_manifest_entries() {
  sync_manifest_tool entries "$1"
}

sync_session_tool() {
  PYTHONDONTWRITEBYTECODE=1 python3 "$SYNC_SKILLS_LIB_DIR/session_tool.py" "$@"
}

sync_session_dir() {
  local session="${1:-${SYNC_SKILLS_SESSION:-}}" dotfiles_dir manifest
  [ -n "$session" ] || { echo "error: pass session dir or set SYNC_SKILLS_SESSION" >&2; return 1; }
  dotfiles_dir="$(sync_dotfiles_dir)" || return 1
  manifest="$(sync_manifest_path)" || return 1
  sync_session_tool validate "$session" "$dotfiles_dir" "$manifest"
}
