#!/usr/bin/env bash

sync_script_dir() {
  cd "$(dirname "${BASH_SOURCE[1]}")" && pwd -P
}

sync_dotfiles_dir() {
  local script_dir dotfiles_dir fallback
  script_dir="$(sync_script_dir)"
  dotfiles_dir="${DOTFILES_DIR:-}"
  if [ -z "$dotfiles_dir" ]; then
    dotfiles_dir="$(git -C "$script_dir" rev-parse --show-toplevel 2>/dev/null || true)"
  fi
  if [ -z "$dotfiles_dir" ]; then
    fallback="$script_dir/../../../../../../.."
    dotfiles_dir="$(cd "$fallback" && pwd -P)"
  fi
  printf '%s\n' "$dotfiles_dir"
}

sync_manifest_path() {
  printf '%s\n' "${SYNC_SKILLS_MANIFEST:-$(sync_dotfiles_dir)/stowables/ai-skills/manifest.json}"
}

sync_session_dir() {
  local session="${1:-${SYNC_SKILLS_SESSION:-}}"
  [ -n "$session" ] || { echo "error: pass session dir or set SYNC_SKILLS_SESSION" >&2; exit 1; }
  [ -d "$session" ] || { echo "error: session dir not found: $session" >&2; exit 1; }
  session="$(cd "$session" && pwd -P)"
  [ -f "$session/.sync-skills-session" ] || { echo "error: not a sync-skills session: $session" >&2; exit 1; }
  printf '%s\n' "$session"
}

sync_manifest_entries_py='import json, sys
manifest = json.load(open(sys.argv[1]))
for upstream, cfg in manifest.get("upstreams", {}).items():
    for section, kind in (("files", "file"), ("skills", "skill")):
        for name, item in cfg.get(section, {}).items():
            for target_name, target_path in item.get("targets", {}).items():
                print("\t".join([
                    upstream,
                    cfg["url"],
                    kind,
                    name,
                    item["sourcePath"],
                    target_name,
                    target_path,
                    item.get("adaptation", ""),
                ]))'

sync_upstreams_py='import json, sys
manifest = json.load(open(sys.argv[1]))
for name, cfg in manifest.get("upstreams", {}).items():
    print("\t".join([name, cfg["url"]]))'
