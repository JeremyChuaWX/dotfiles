#!/bin/bash
set -e

STOW_DIR="$(cd "$(dirname "$0")" && pwd)"
TARGET_DIR="$HOME"

echo "Dotfiles setup"
echo "=============="
echo "Source: $STOW_DIR"
echo "Target: $TARGET_DIR"

if ! command -v stow &> /dev/null; then
    echo "error: stow not found"
    exit 1
fi

cd "$STOW_DIR"
for pkg in */; do
    [ -f "$pkg/.stow-package" ] || continue
    echo "stowing ${pkg%/} ..."
    for dir in "$pkg"*/; do
        [ -d "$dir" ] && mkdir -p "$TARGET_DIR/${dir#"$pkg"}"
    done
    stow --ignore='\.stow-package' --ignore='node_modules' "$pkg" -t "$TARGET_DIR"
done

echo
echo "done!"
