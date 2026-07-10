#!/usr/bin/env python3
"""Validate and query the upstream skill manifest."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path, PurePosixPath
from typing import Any, Iterator

SCHEMA_VERSION = 1
UPSTREAM_NAME_RE = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*\Z")
SKILL_NAME_RE = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*\Z")
TARGET_ROOTS = {
    "pi": PurePosixPath("stowables/pi"),
    "opencode": PurePosixPath("stowables/opencode"),
}
SKILL_TARGET_ROOTS = {
    "pi": PurePosixPath("stowables/pi/.pi/agent/skills"),
    "opencode": PurePosixPath("stowables/opencode/.config/opencode/skills"),
}
PROTECTED_TARGETS = (
    PurePosixPath("stowables/pi/.pi/agent/skills/afk"),
    PurePosixPath("stowables/pi/.pi/agent/skills/sync-skills"),
)


class ManifestError(ValueError):
    pass


def _object_without_duplicate_keys(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise ManifestError(f"duplicate JSON key: {key!r}")
        result[key] = value
    return result


def _text(value: Any, location: str, *, allow_empty: bool = False) -> str:
    if not isinstance(value, str):
        raise ManifestError(f"{location} must be a string")
    if not allow_empty and not value.strip():
        raise ManifestError(f"{location} must not be empty")
    if any(character in value for character in ("\0", "\t", "\r", "\n")):
        raise ManifestError(f"{location} must not contain control characters")
    return value


def _relative_path(value: Any, location: str) -> PurePosixPath:
    text = _text(value, location)
    if "\\" in text:
        raise ManifestError(f"{location} must use forward slashes")
    path = PurePosixPath(text)
    if path.is_absolute() or path == PurePosixPath(".") or ".." in path.parts:
        raise ManifestError(f"{location} must be a safe relative path")
    return path


def _is_within(path: PurePosixPath, root: PurePosixPath) -> bool:
    return path == root or root in path.parents


def load_manifest(path: str | Path) -> dict[str, Any]:
    manifest_path = Path(path)
    try:
        with manifest_path.open(encoding="utf-8") as handle:
            manifest = json.load(handle, object_pairs_hook=_object_without_duplicate_keys)
    except ManifestError:
        raise
    except (OSError, json.JSONDecodeError) as error:
        raise ManifestError(str(error)) from error

    if not isinstance(manifest, dict):
        raise ManifestError("manifest root must be an object")
    if manifest.get("schemaVersion") != SCHEMA_VERSION:
        raise ManifestError(f"schemaVersion must be {SCHEMA_VERSION}")

    upstreams = manifest.get("upstreams")
    if not isinstance(upstreams, dict) or not upstreams:
        raise ManifestError("upstreams must be a non-empty object")

    seen_targets: dict[PurePosixPath, str] = {}
    total_entries = 0

    for upstream, config in upstreams.items():
        location = f"upstreams.{upstream}"
        if not isinstance(upstream, str) or not UPSTREAM_NAME_RE.fullmatch(upstream):
            raise ManifestError(f"invalid upstream name: {upstream!r}")
        if not isinstance(config, dict):
            raise ManifestError(f"{location} must be an object")
        _text(config.get("url"), f"{location}.url")

        upstream_entries = 0
        for section, kind in (("files", "file"), ("skills", "skill")):
            items = config.get(section, {})
            if not isinstance(items, dict):
                raise ManifestError(f"{location}.{section} must be an object")

            for name, item in items.items():
                item_location = f"{location}.{section}.{name}"
                if not isinstance(name, str) or not name:
                    raise ManifestError(f"invalid entry name at {location}.{section}")
                if kind == "skill" and not SKILL_NAME_RE.fullmatch(name):
                    raise ManifestError(f"invalid skill name: {name!r}")
                _text(name, f"{item_location} name")
                if not isinstance(item, dict):
                    raise ManifestError(f"{item_location} must be an object")

                _relative_path(item.get("sourcePath"), f"{item_location}.sourcePath")
                _text(item.get("adaptation"), f"{item_location}.adaptation")
                targets = item.get("targets")
                if not isinstance(targets, dict) or not targets:
                    raise ManifestError(f"{item_location}.targets must be a non-empty object")

                for harness, target_value in targets.items():
                    target_location = f"{item_location}.targets.{harness}"
                    if harness not in TARGET_ROOTS:
                        raise ManifestError(f"unsupported target harness at {target_location}")
                    target = _relative_path(target_value, target_location)
                    expected_root = SKILL_TARGET_ROOTS[harness] if kind == "skill" else TARGET_ROOTS[harness]
                    if not _is_within(target, expected_root):
                        raise ManifestError(f"{target_location} must be under {expected_root}")
                    if kind == "skill" and target.name != name:
                        raise ManifestError(f"{target_location} must end in the skill name {name!r}")
                    if any(_is_within(target, protected) for protected in PROTECTED_TARGETS):
                        raise ManifestError(f"{target_location} points into protected local skill {target}")
                    if target in seen_targets:
                        raise ManifestError(
                            f"duplicate target {target}: {seen_targets[target]} and {item_location}"
                        )
                    seen_targets[target] = item_location

                upstream_entries += 1
                total_entries += 1

        if upstream_entries == 0:
            raise ManifestError(f"{location} must contain at least one file or skill")

    if total_entries == 0:
        raise ManifestError("manifest must contain at least one file or skill")

    return manifest


def iter_upstreams(manifest: dict[str, Any]) -> Iterator[tuple[str, str]]:
    for name, config in manifest["upstreams"].items():
        yield name, config["url"]


def iter_entries(manifest: dict[str, Any]) -> Iterator[tuple[str, ...]]:
    for upstream, config in manifest["upstreams"].items():
        for section, kind in (("files", "file"), ("skills", "skill")):
            for name, item in config.get(section, {}).items():
                for harness, target in item["targets"].items():
                    yield (
                        upstream,
                        config["url"],
                        kind,
                        name,
                        item["sourcePath"],
                        harness,
                        target,
                        item["adaptation"],
                    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=("validate", "upstreams", "entries"))
    parser.add_argument("manifest")
    args = parser.parse_args()

    try:
        manifest = load_manifest(args.manifest)
    except ManifestError as error:
        print(f"error: invalid manifest {args.manifest}: {error}", file=sys.stderr)
        return 1

    if args.command == "upstreams":
        for fields in iter_upstreams(manifest):
            print("\t".join(fields))
    elif args.command == "entries":
        for fields in iter_entries(manifest):
            print("\t".join(fields))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
