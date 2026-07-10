#!/usr/bin/env python3
"""Verify vendored Pi and OpenCode skills and local policy guardrails."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from urllib.parse import unquote, urlsplit

sys.dont_write_bytecode = True

from manifest_tool import ManifestError, iter_entries, load_manifest

NAME_RE = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*\Z")
INLINE_LINK_RE = re.compile(r"!?\[[^\]]+\]\(([^)\s]+)(?:\s+[^)]*)?\)")
REFERENCE_LINK_RE = re.compile(r"^\s*\[[^\]]+\]:\s*(\S+)", re.MULTILINE)
LOCAL_TRACKER_SKILLS = ("to-spec", "to-tickets", "triage", "wayfinder", "afk")
PROTECTED_SKILLS = ("afk", "sync-skills")


class FrontmatterError(ValueError):
    pass


def _unquote_scalar(value: str) -> str:
    value = value.strip()
    if len(value) >= 2 and value[0] == value[-1] == '"':
        try:
            decoded = json.loads(value)
        except json.JSONDecodeError as error:
            raise FrontmatterError(f"invalid quoted scalar: {error}") from error
        if not isinstance(decoded, str):
            raise FrontmatterError("frontmatter scalar must be a string")
        return decoded
    if len(value) >= 2 and value[0] == value[-1] == "'":
        return value[1:-1].replace("''", "'")
    return value


def parse_frontmatter(path: Path) -> tuple[dict[str, str], str]:
    try:
        text = path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError) as error:
        raise FrontmatterError(str(error)) from error
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        raise FrontmatterError("missing opening --- delimiter")
    try:
        closing = next(index for index in range(1, len(lines)) if lines[index].strip() == "---")
    except StopIteration as error:
        raise FrontmatterError("missing closing --- delimiter") from error

    fields: dict[str, str] = {}
    index = 1
    nested_value_allowed = False
    while index < closing:
        line = lines[index]
        if not line.strip() or line.lstrip().startswith("#"):
            index += 1
            continue
        if line[:1].isspace():
            if not nested_value_allowed:
                raise FrontmatterError(f"unexpected indented content on line {index + 1}")
            index += 1
            continue
        if ":" not in line:
            raise FrontmatterError(f"invalid top-level field on line {index + 1}")
        key, raw_value = line.split(":", 1)
        key = key.strip()
        if not re.fullmatch(r"[A-Za-z0-9_-]+", key):
            raise FrontmatterError(f"invalid field name {key!r} on line {index + 1}")
        if key in fields:
            raise FrontmatterError(f"duplicate field {key!r}")

        value = raw_value.strip()
        if value in ("|", ">", "|-", ">-", "|+", ">+"):
            block: list[str] = []
            index += 1
            while index < closing and (not lines[index].strip() or lines[index][:1].isspace()):
                block.append(lines[index].strip())
                index += 1
            separator = "\n" if value.startswith("|") else " "
            fields[key] = separator.join(block).strip()
            nested_value_allowed = False
            continue

        fields[key] = _unquote_scalar(value)
        nested_value_allowed = not value
        index += 1

    return fields, "\n".join(lines[closing + 1 :])


def discover_pi_skills(root: Path) -> list[Path]:
    discovered = set(root.rglob("SKILL.md"))
    discovered.update(path for path in root.glob("*.md") if path.is_file())
    return sorted(discovered)


def discover_opencode_skills(root: Path) -> list[Path]:
    return sorted(root.rglob("SKILL.md"))


def _without_fenced_code(text: str) -> str:
    output: list[str] = []
    fence: str | None = None
    for line in text.splitlines():
        stripped = line.lstrip()
        marker = stripped[:3]
        if marker in ("```", "~~~"):
            if fence is None:
                fence = marker
            elif marker == fence:
                fence = None
            continue
        if fence is None:
            output.append(line)
    return "\n".join(output)


def broken_relative_links(skill_md: Path, body: str) -> list[str]:
    broken: list[str] = []
    markdown = _without_fenced_code(body)
    raw_targets = [match.group(1) for match in INLINE_LINK_RE.finditer(markdown)]
    raw_targets.extend(match.group(1) for match in REFERENCE_LINK_RE.finditer(markdown))
    for raw_target in raw_targets:
        if raw_target.startswith("#") or "<" in raw_target or ">" in raw_target:
            continue
        parsed = urlsplit(raw_target)
        if parsed.scheme or parsed.netloc or not parsed.path:
            continue
        relative_path = unquote(parsed.path)
        target = Path(relative_path)
        if target.is_absolute():
            continue
        if not (skill_md.parent / target).exists():
            broken.append(raw_target)
    return broken


def verify_frontmatter(path: Path, harness: str) -> tuple[str | None, str, list[str]]:
    errors: list[str] = []
    try:
        fields, body = parse_frontmatter(path)
    except FrontmatterError as error:
        return None, "", [f"invalid frontmatter: {error}"]

    name = fields.get("name")
    description = fields.get("description")
    if not name or len(name) > 64 or not NAME_RE.fullmatch(name):
        errors.append("name must be 1-64 lowercase letters/numbers/hyphens")
    if not description or len(description) > 1024:
        errors.append("description must be 1-1024 characters")
    if harness == "pi" and fields.get("disable-model-invocation") != "true":
        errors.append("Pi skill must have disable-model-invocation: true in frontmatter")
    if harness == "opencode" and "disable-model-invocation" in fields:
        errors.append("OpenCode skill must not have Pi-only disable-model-invocation frontmatter")

    for target in broken_relative_links(path, body):
        errors.append(f"broken relative Markdown link: {target}")
    return name, body, errors


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--dotfiles", required=True)
    parser.add_argument("--pi-skills", required=True)
    parser.add_argument("--opencode-skills", required=True)
    args = parser.parse_args()

    dotfiles = Path(args.dotfiles).resolve()
    pi_root = Path(args.pi_skills).resolve()
    opencode_root = Path(args.opencode_skills).resolve()
    failed = False

    for label, directory in (("dotfiles repo", dotfiles), ("Pi skills", pi_root), ("OpenCode skills", opencode_root)):
        if not directory.is_dir():
            print(f"error: {label} directory not found: {directory}", file=sys.stderr)
            return 1

    try:
        manifest = load_manifest(args.manifest)
    except ManifestError as error:
        print(f"error: invalid manifest {args.manifest}: {error}", file=sys.stderr)
        return 1

    print("== Manifest target check ==")
    entries = list(iter_entries(manifest))
    for _upstream, _url, kind, name, _source, harness, target, _adaptation in entries:
        destination = dotfiles / target
        check_path = destination / "SKILL.md" if kind == "skill" else destination
        if not check_path.exists():
            print(f"missing manifest target: {check_path}", file=sys.stderr)
            failed = True
            continue
        if kind == "skill":
            try:
                fields, _body = parse_frontmatter(check_path)
                if fields.get("name") != name:
                    print(
                        f"manifest skill name mismatch: {name} -> {check_path} has {fields.get('name')!r}",
                        file=sys.stderr,
                    )
                    failed = True
                    continue
            except FrontmatterError as error:
                print(f"invalid manifest target frontmatter: {check_path}: {error}", file=sys.stderr)
                failed = True
                continue
        print(f"ok: {name} -> {harness}:{target}")

    discovered: dict[str, dict[str, tuple[Path, str]]] = {"pi": {}, "opencode": {}}
    for harness, root, paths in (
        ("pi", pi_root, discover_pi_skills(pi_root)),
        ("opencode", opencode_root, discover_opencode_skills(opencode_root)),
    ):
        print()
        print(f"== {harness.title()} skill validation ==")
        if not paths:
            print(f"error: no {harness} skills found under {root}", file=sys.stderr)
            failed = True
            continue
        for skill_md in paths:
            name, body, errors = verify_frontmatter(skill_md, harness)
            if name and name in discovered[harness]:
                previous = discovered[harness][name][0]
                errors.append(f"duplicate skill name; already used by {previous}")
            if name:
                discovered[harness][name] = (skill_md, body)
            if errors:
                failed = True
                for error in errors:
                    print(f"error: {skill_md}: {error}", file=sys.stderr)
            else:
                print(f"ok: {name} ({skill_md.relative_to(root)})")

    print()
    print("== Manifest routing check ==")
    expected_harnesses: dict[str, set[str]] = {}
    for _upstream, _url, kind, name, _source, harness, _target, _adaptation in entries:
        if kind == "skill":
            expected_harnesses.setdefault(name, set()).add(harness)
    harness_roots = {"pi": pi_root, "opencode": opencode_root}
    for name, expected in sorted(expected_harnesses.items()):
        actual = {harness for harness in discovered if name in discovered[harness]}
        misplaced_directories = {
            harness
            for harness, root in harness_roots.items()
            if harness not in expected and (root / name).exists()
        }
        if actual == expected and not misplaced_directories:
            print(f"ok: {name} -> {', '.join(sorted(expected))}")
        else:
            detail = f"expected {sorted(expected)}, found names in {sorted(actual)}"
            if misplaced_directories:
                detail += f", misplaced directories in {sorted(misplaced_directories)}"
            print(f"routing mismatch for {name}: {detail}", file=sys.stderr)
            failed = True

    print()
    print("== Local markdown tracker guardrail check ==")
    for name in LOCAL_TRACKER_SKILLS:
        discovered_skill = discovered["pi"].get(name)
        if not discovered_skill:
            print(f"missing local tracker skill: {name}", file=sys.stderr)
            failed = True
            continue
        text = discovered_skill[1].lower()
        requirements = {
            ".scratch/ local tracker paths": ".scratch/" in text,
            "no remote tracker creation": "do not create remote tracker items" in text,
            "no remote tracker CLIs": "do not use remote tracker clis" in text,
        }
        missing = [label for label, present in requirements.items() if not present]
        if missing:
            print(f"error: {name} missing {', '.join(missing)}", file=sys.stderr)
            failed = True
        else:
            print(f"ok: {name}")

    print()
    print("== Protected local skill check ==")
    for name in PROTECTED_SKILLS:
        if name not in discovered["pi"]:
            print(f"missing protected skill: {name}", file=sys.stderr)
            failed = True
        elif name in discovered["opencode"] or (opencode_root / name).exists():
            print(f"protected Pi skill must not exist in OpenCode: {name}", file=sys.stderr)
            failed = True
        else:
            print(f"ok: protected skill exists only in Pi: {name}")

    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
