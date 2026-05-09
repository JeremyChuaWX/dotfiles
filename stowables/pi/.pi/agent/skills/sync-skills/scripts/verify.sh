#!/usr/bin/env bash
set -euo pipefail

if [ -n "${PI_CONFIG_ROOT:-}" ]; then
  PI_CONFIG_ROOT="$PI_CONFIG_ROOT"
elif [ -d "$PWD/.pi/agent/skills" ]; then
  PI_CONFIG_ROOT="$PWD"
else
  git_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
  if [ -d "$git_root/stowables/pi/.pi/agent/skills" ]; then
    PI_CONFIG_ROOT="$git_root/stowables/pi"
  else
    PI_CONFIG_ROOT="$git_root"
  fi
fi

PI_SKILLS_DIR="$PI_CONFIG_ROOT/.pi/agent/skills"

if [ ! -d "$PI_SKILLS_DIR" ]; then
  echo "error: Pi skills dir not found at $PI_SKILLS_DIR" >&2
  exit 1
fi

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
done < <(find "$PI_SKILLS_DIR" -mindepth 2 -maxdepth 2 -name SKILL.md | sort)

echo
echo "== Local-first guardrail check =="
for skill in to-prd to-plan; do
  path="$PI_SKILLS_DIR/$skill/SKILL.md"
  if [ ! -f "$path" ]; then
    echo "missing local-first skill: $path" >&2
    failed=1
    continue
  fi
  if grep -qiE 'Do not create remote tracker items|Do not use remote tracker CLIs|\.harness/' "$path"; then
    echo "ok: $skill mentions local-first/no-remote guardrails"
  else
    echo "warning: $skill may be missing local-first/no-remote guardrails" >&2
    failed=1
  fi
done

echo
echo "== Protected skill check =="
for skill in implement sync-skills; do
  if [ -f "$PI_SKILLS_DIR/$skill/SKILL.md" ]; then
    echo "ok: protected skill exists: $skill"
  else
    echo "missing protected skill: $skill" >&2
    failed=1
  fi
done

exit "$failed"
