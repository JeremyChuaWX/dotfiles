#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
SCRIPT_SKILLS_DIR="$(cd "$SCRIPT_DIR/../.." && pwd -P)"

if [ -n "${AGENT_SKILLS_DIR:-}" ]; then
  SKILLS_DIR="${AGENT_SKILLS_DIR%/}"
elif [ -n "${HOME:-}" ] && [ -d "$HOME/.agents/skills" ]; then
  SKILLS_DIR="$HOME/.agents/skills"
elif [ -d "$SCRIPT_SKILLS_DIR" ]; then
  SKILLS_DIR="$SCRIPT_SKILLS_DIR"
else
  SKILLS_DIR="$SCRIPT_SKILLS_DIR"
fi

if [ ! -d "$SKILLS_DIR" ]; then
  echo "error: shared skills dir not found at $SKILLS_DIR" >&2
  exit 1
fi

cd "$SKILLS_DIR"
SKILLS_DIR="$(pwd -P)"

echo "== Manual-only check =="
failed=0
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
echo "== Local markdown tracker guardrail check =="
for skill in to-prd to-issues; do
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
for skill in implement sync-skills; do
  if [ -f "$SKILLS_DIR/$skill/SKILL.md" ]; then
    echo "ok: protected skill exists: $skill"
  else
    echo "missing protected skill: $skill" >&2
    failed=1
  fi
done

exit "$failed"
