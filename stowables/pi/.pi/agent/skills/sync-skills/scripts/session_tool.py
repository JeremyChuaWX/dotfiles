#!/usr/bin/env python3
"""Create, validate, compare, and safely remove sync-skills sessions."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import stat
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

sys.dont_write_bytecode = True

from manifest_tool import ManifestError, iter_entries, load_manifest

SESSION_VERSION = 1
MARKER_NAME = ".sync-skills-session.json"
SNAPSHOT_ROOTS = (".",)
PROTECTED_ROOTS = (
    "stowables/pi/.pi/agent/skills/afk",
    "stowables/pi/.pi/agent/skills/sync-skills",
)


class SessionError(ValueError):
    pass


def _resolved_directory(path: str | Path, label: str) -> Path:
    resolved = Path(path).expanduser().resolve()
    if not resolved.is_dir():
        raise SessionError(f"{label} not found: {resolved}")
    return resolved


def _relative_to_root(path: Path, root: Path, label: str) -> str:
    try:
        return path.resolve().relative_to(root).as_posix()
    except ValueError as error:
        raise SessionError(f"{label} must be inside dotfiles repo: {path}") from error


def _file_state(path: Path) -> dict[str, Any]:
    path_stat = path.lstat()
    mode = stat.S_IMODE(path_stat.st_mode)
    if path.is_symlink():
        return {"kind": "symlink", "mode": mode, "target": os.readlink(path)}
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    return {"kind": "file", "mode": mode, "sha256": digest}


def _git_visible_paths(dotfiles: Path) -> list[Path] | None:
    result = subprocess.run(
        ["git", "-C", str(dotfiles), "ls-files", "-z", "--cached", "--others", "--exclude-standard"],
        check=False,
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
    )
    if result.returncode != 0:
        return None
    return [dotfiles / os.fsdecode(raw) for raw in result.stdout.split(b"\0") if raw]


def _snapshot(dotfiles: Path, roots: Iterable[str]) -> dict[str, dict[str, Any]]:
    snapshot: dict[str, dict[str, Any]] = {}
    roots = tuple(roots)
    git_paths = _git_visible_paths(dotfiles) if roots == SNAPSHOT_ROOTS else None
    if git_paths is not None:
        for file_path in git_paths:
            if not file_path.exists() and not file_path.is_symlink():
                continue
            if file_path.is_dir() and not file_path.is_symlink():
                continue
            relative = file_path.relative_to(dotfiles).as_posix()
            snapshot[relative] = _file_state(file_path)
        return snapshot

    for relative_root in roots:
        root = dotfiles / relative_root
        if root.is_symlink() or root.is_file():
            snapshot[relative_root] = _file_state(root)
            continue
        if not root.exists():
            continue

        for directory, child_directories, filenames in os.walk(root, followlinks=False):
            directory_path = Path(directory)
            child_directories[:] = [child for child in child_directories if child != ".git"]
            for child in list(child_directories):
                child_path = directory_path / child
                if child_path.is_symlink():
                    relative = child_path.relative_to(dotfiles).as_posix()
                    snapshot[relative] = _file_state(child_path)
                    child_directories.remove(child)
            for filename in filenames:
                file_path = directory_path / filename
                relative = file_path.relative_to(dotfiles).as_posix()
                snapshot[relative] = _file_state(file_path)
    return snapshot


def _git_head(dotfiles: Path) -> str | None:
    result = subprocess.run(
        ["git", "-C", str(dotfiles), "rev-parse", "HEAD"],
        check=False,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
    )
    return result.stdout.strip() if result.returncode == 0 else None


def _write_metadata(session: Path, metadata: dict[str, Any]) -> None:
    marker = session / MARKER_NAME
    temporary = session / f"{MARKER_NAME}.tmp"
    temporary.write_text(json.dumps(metadata, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    temporary.replace(marker)


def _safe_session_path(path: str | Path) -> Path:
    supplied = Path(path).expanduser()
    if supplied.is_symlink():
        raise SessionError(f"refusing symlinked sync session path: {supplied}")
    session = supplied.resolve()
    temp_root = Path(tempfile.gettempdir()).resolve()
    if session.parent != temp_root or not session.name.startswith("sync-skills-"):
        raise SessionError(f"refusing non-temporary sync session path: {session}")
    if not session.is_dir():
        raise SessionError(f"session directory not found: {session}")
    return session


def _metadata_path(metadata: dict[str, Any], key: str) -> Path:
    value = metadata.get(key)
    if not isinstance(value, str) or not value:
        raise SessionError(f"invalid session metadata field: {key}")
    return Path(value).resolve()


def _load_session(path: str | Path, expected_dotfiles: str | Path | None = None) -> tuple[Path, dict[str, Any]]:
    session = _safe_session_path(path)
    marker = session / MARKER_NAME
    if not marker.is_file() or marker.is_symlink():
        raise SessionError(f"not a sync-skills session: {session}")
    try:
        metadata = json.loads(marker.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise SessionError(f"invalid session metadata: {error}") from error
    if not isinstance(metadata, dict) or metadata.get("version") != SESSION_VERSION:
        raise SessionError("unsupported session metadata version")
    if _metadata_path(metadata, "sessionDir") != session:
        raise SessionError("session metadata path does not match session directory")
    if not isinstance(metadata.get("snapshot"), dict) or not isinstance(metadata.get("snapshotRoots"), list):
        raise SessionError("session metadata is missing its baseline snapshot")
    if not isinstance(metadata.get("targetRoots"), list) or not isinstance(metadata.get("upstreams"), dict):
        raise SessionError("session metadata is missing target or upstream data")
    if expected_dotfiles is not None:
        expected = Path(expected_dotfiles).expanduser().resolve()
        if _metadata_path(metadata, "dotfilesDir") != expected:
            raise SessionError(f"session belongs to a different dotfiles repo: {metadata.get('dotfilesDir')}")
    _metadata_path(metadata, "manifestPath")
    if not isinstance(metadata.get("manifestRelativePath"), str):
        raise SessionError("session metadata is missing its manifest path")
    return session, metadata


def create_session(dotfiles_arg: str, manifest_arg: str) -> Path:
    dotfiles = _resolved_directory(dotfiles_arg, "dotfiles repo")
    manifest_path = Path(manifest_arg).expanduser().resolve()
    try:
        manifest = load_manifest(manifest_path)
    except ManifestError as error:
        raise SessionError(f"invalid manifest: {error}") from error

    manifest_relative = _relative_to_root(manifest_path, dotfiles, "manifest")
    target_roots = sorted({entry[6] for entry in iter_entries(manifest)})
    snapshot_roots = list(SNAPSHOT_ROOTS)
    session = Path(tempfile.mkdtemp(prefix="sync-skills-"))

    try:
        (session / "upstreams").mkdir()
        metadata = {
            "version": SESSION_VERSION,
            "sessionDir": str(session.resolve()),
            "dotfilesDir": str(dotfiles),
            "manifestPath": str(manifest_path),
            "manifestRelativePath": manifest_relative,
            "startedAt": datetime.now(timezone.utc).isoformat(),
            "gitHead": _git_head(dotfiles),
            "targetRoots": target_roots,
            "snapshotRoots": snapshot_roots,
            "snapshot": _snapshot(dotfiles, snapshot_roots),
            "upstreams": {},
        }
        _write_metadata(session, metadata)
    except Exception:
        shutil.rmtree(session, ignore_errors=True)
        raise

    return session.resolve()


def validate_session(path: str, dotfiles: str, manifest: str | None) -> Path:
    session, metadata = _load_session(path, dotfiles)
    if manifest is not None:
        expected_manifest = Path(manifest).expanduser().resolve()
        if Path(metadata["manifestPath"]).resolve() != expected_manifest:
            raise SessionError(f"session uses a different manifest: {metadata['manifestPath']}")
    return session


def record_upstream(path: str, dotfiles: str, name: str, url: str, clone_arg: str) -> str:
    session, metadata = _load_session(path, dotfiles)
    clone = Path(clone_arg).expanduser().resolve()
    expected_clone = (session / "upstreams" / name).resolve()
    if clone != expected_clone or not (clone / ".git").is_dir():
        raise SessionError(f"invalid upstream clone path: {clone}")
    result = subprocess.run(
        ["git", "-C", str(clone), "rev-parse", "HEAD"],
        check=False,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    if result.returncode != 0:
        raise SessionError(f"cannot resolve upstream revision for {name}: {result.stderr.strip()}")
    revision = result.stdout.strip()
    metadata["upstreams"][name] = {"url": url, "revision": revision}
    _write_metadata(session, metadata)
    return revision


def _is_within(relative: str, root: str) -> bool:
    return relative == root or relative.startswith(root.rstrip("/") + "/")


def report_changes(path: str, dotfiles_arg: str, manifest_arg: str) -> bool:
    _session, metadata = _load_session(path, dotfiles_arg)
    dotfiles = Path(metadata["dotfilesDir"])
    manifest_path = Path(manifest_arg).expanduser().resolve()
    if manifest_path != Path(metadata["manifestPath"]).resolve():
        raise SessionError(f"session uses a different manifest: {metadata['manifestPath']}")
    try:
        current_manifest = load_manifest(manifest_path)
    except ManifestError as error:
        raise SessionError(f"invalid current manifest: {error}") from error

    before = metadata["snapshot"]
    after = _snapshot(dotfiles, metadata["snapshotRoots"])
    changed: list[tuple[str, str]] = []
    for relative in sorted(set(before) | set(after)):
        if relative not in before:
            changed.append(("added", relative))
        elif relative not in after:
            changed.append(("deleted", relative))
        elif before[relative] != after[relative]:
            changed.append(("modified", relative))

    current_targets = {entry[6] for entry in iter_entries(current_manifest)}
    allowed_roots = set(metadata["targetRoots"]) | current_targets
    allowed_files = {metadata["manifestRelativePath"]}
    outside_targets = [
        (change, relative)
        for change, relative in changed
        if relative not in allowed_files and not any(_is_within(relative, root) for root in allowed_roots)
    ]
    protected = [
        (change, relative)
        for change, relative in changed
        if any(_is_within(relative, root) for root in PROTECTED_ROOTS)
    ]

    print("== Changes since sync session started ==")
    if changed:
        for change, relative in changed:
            print(f"{change:8} {relative}")
    else:
        print("ok: no skill-sync files changed")

    failed = False
    if outside_targets:
        print("error: changes outside manifest targets:", file=sys.stderr)
        for change, relative in outside_targets:
            print(f"  {change:8} {relative}", file=sys.stderr)
        failed = True
    if protected:
        print("error: protected local skill changed:", file=sys.stderr)
        for change, relative in protected:
            print(f"  {change:8} {relative}", file=sys.stderr)
        failed = True
    if changed and not failed:
        print("ok: changes are confined to the manifest and mapped targets")

    return not failed


def remove_session(path: str, dotfiles: str) -> Path:
    session, _metadata = _load_session(path, dotfiles)
    shutil.rmtree(session)
    return session


def main() -> int:
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)

    create = subparsers.add_parser("create")
    create.add_argument("dotfiles")
    create.add_argument("manifest")

    validate = subparsers.add_parser("validate")
    validate.add_argument("session")
    validate.add_argument("dotfiles")
    validate.add_argument("manifest", nargs="?")

    record = subparsers.add_parser("record-upstream")
    record.add_argument("session")
    record.add_argument("dotfiles")
    record.add_argument("name")
    record.add_argument("url")
    record.add_argument("clone")

    report = subparsers.add_parser("report")
    report.add_argument("session")
    report.add_argument("dotfiles")
    report.add_argument("manifest")

    remove = subparsers.add_parser("remove")
    remove.add_argument("session")
    remove.add_argument("dotfiles")

    args = parser.parse_args()
    try:
        if args.command == "create":
            print(create_session(args.dotfiles, args.manifest))
        elif args.command == "validate":
            print(validate_session(args.session, args.dotfiles, args.manifest))
        elif args.command == "record-upstream":
            print(record_upstream(args.session, args.dotfiles, args.name, args.url, args.clone))
        elif args.command == "report":
            return 0 if report_changes(args.session, args.dotfiles, args.manifest) else 1
        elif args.command == "remove":
            print(remove_session(args.session, args.dotfiles))
    except SessionError as error:
        print(f"error: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
