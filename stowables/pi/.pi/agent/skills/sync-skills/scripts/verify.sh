#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=lib.sh
. "$SCRIPT_DIR/lib.sh"

MANIFEST="$(sync_manifest_path)"
DOTFILES_DIR="$(sync_dotfiles_dir)"
SCRIPT_SKILLS_DIR="$(cd "$SCRIPT_DIR/../.." && pwd -P)"
SCRIPT_OPENCODE_SKILLS_DIR="$DOTFILES_DIR/stowables/opencode/.config/opencode/skills"

if [ -n "${AGENT_SKILLS_DIR:-}" ]; then
  SKILLS_DIR="${AGENT_SKILLS_DIR%/}"
elif [ -n "${HOME:-}" ] && [ -d "$HOME/.pi/agent/skills" ]; then
  SKILLS_DIR="$HOME/.pi/agent/skills"
else
  SKILLS_DIR="$SCRIPT_SKILLS_DIR"
fi

if [ -n "${OPENCODE_SKILLS_DIR:-}" ]; then
  OPENCODE_DIR="${OPENCODE_SKILLS_DIR%/}"
elif [ -n "${HOME:-}" ] && [ -d "$HOME/.config/opencode/skills" ]; then
  OPENCODE_DIR="$HOME/.config/opencode/skills"
else
  OPENCODE_DIR="$SCRIPT_OPENCODE_SKILLS_DIR"
fi

[ -d "$SKILLS_DIR" ] || { echo "error: Pi skills dir not found at $SKILLS_DIR" >&2; exit 1; }
[ -d "$OPENCODE_DIR" ] || { echo "error: OpenCode skills dir not found at $OPENCODE_DIR" >&2; exit 1; }
[ -f "$MANIFEST" ] || { echo "error: manifest not found: $MANIFEST" >&2; exit 1; }

cd "$SKILLS_DIR"
SKILLS_DIR="$(pwd -P)"
OPENCODE_DIR="$(cd "$OPENCODE_DIR" && pwd -P)"
failed=0

echo "== Manifest target check =="
while IFS=$'\t' read -r _upstream _url kind name _source target_name target _adaptation; do
  [ -n "$name" ] || continue
  dest_path="$DOTFILES_DIR/$target"
  if [ "$kind" = "skill" ]; then
    check_path="$dest_path/SKILL.md"
  else
    check_path="$dest_path"
  fi
  if [ -e "$check_path" ]; then
    echo "ok: $name -> $target_name:$target"
  else
    echo "missing manifest target: $check_path" >&2
    failed=1
  fi
done < <(python3 -c "$sync_manifest_entries_py" "$MANIFEST")

echo
echo "== Manual-only Pi skill check =="
while IFS= read -r skill_md; do
  skill_name="$(basename "$(dirname "$skill_md")")"
  if grep -q '^disable-model-invocation: true$' "$skill_md"; then
    echo "ok: $skill_name"
  else
    echo "missing disable-model-invocation: true: $skill_md" >&2
    failed=1
  fi
done < <(find -H "$SKILLS_DIR" -mindepth 2 -maxdepth 2 -name SKILL.md | sort)

echo
echo "== OpenCode skill frontmatter check =="
while IFS= read -r skill_md; do
  skill_name="$(basename "$(dirname "$skill_md")")"
  if grep -q '^disable-model-invocation:' "$skill_md"; then
    echo "Pi-only frontmatter found in OpenCode skill: $skill_md" >&2
    failed=1
  else
    echo "ok: $skill_name"
  fi
done < <(find -H "$OPENCODE_DIR" -mindepth 2 -maxdepth 2 -name SKILL.md | sort)

echo
echo "== Pi/OpenCode routing check =="
if [ -e "$SKILLS_DIR/teach" ]; then
  echo "Pi should not contain teach: $SKILLS_DIR/teach" >&2
  failed=1
else
  echo "ok: Pi does not contain teach"
fi
if [ -f "$OPENCODE_DIR/teach/SKILL.md" ]; then
  echo "ok: OpenCode contains teach"
else
  echo "missing OpenCode teach skill: $OPENCODE_DIR/teach/SKILL.md" >&2
  failed=1
fi

echo
echo "== Local markdown tracker guardrail check =="
for skill in to-spec to-tickets triage wayfinder afk; do
  path="$SKILLS_DIR/$skill/SKILL.md"
  if [ ! -f "$path" ]; then
    echo "missing local tracker skill: $path" >&2
    failed=1
    continue
  fi
  if grep -qiE 'Do not create remote tracker items|Do not use remote tracker CLIs|\.scratch/' "$path"; then
    echo "ok: $skill mentions local tracker/no-remote guardrails"
  else
    echo "warning: $skill may be missing local tracker/no-remote guardrails" >&2
    failed=1
  fi
done

echo
echo "== Protected skill check =="
for skill in afk sync-skills; do
  if [ -f "$SKILLS_DIR/$skill/SKILL.md" ]; then
    echo "ok: protected skill exists: $skill"
  else
    echo "missing protected skill: $skill" >&2
    failed=1
  fi
done

exit "$failed"
