#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOTFILES_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "applying macOS settings"
source "$SCRIPT_DIR/osx_settings.sh"

if ! command -v brew >/dev/null 2>&1; then
    echo "installing homebrew"
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    export PATH="/opt/homebrew/bin:$PATH"
else
    echo "homebrew installed"
fi

echo "installing brew bundle"
brew bundle --file="$SCRIPT_DIR/Brewfile"

if ! gh auth status >/dev/null 2>&1; then
    echo "logging in to github CLI"
    gh auth login
else
    echo "github CLI already authenticated"
fi

echo "initializing fnm and Node.js"
eval "$(fnm env --shell bash)"
fnm install --latest --use

echo "installing npm packages"
source "$SCRIPT_DIR/npm.sh"

echo "stowing configs"
"$DOTFILES_DIR/stowables/setup.sh"

PI_AGENT_DIR="$HOME/.pi/agent"
PI_SETTINGS="$PI_AGENT_DIR/settings.json"

echo "installing Pi extension dependencies"
(cd "$PI_AGENT_DIR" && npm ci --include=dev --ignore-scripts)

if [ ! -e "$PI_SETTINGS" ]; then
    echo "initializing Pi settings"
    mkdir -p "$PI_AGENT_DIR"
    (umask 077 && cp "$PI_AGENT_DIR/settings.template.json" "$PI_SETTINGS")
else
    echo "preserving existing Pi settings"
fi

echo "install tmux terminfo"
TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT
curl -fsSL https://invisible-island.net/datafiles/current/terminfo.src.gz -o "$TMPDIR/terminfo.src.gz"
gunzip -f "$TMPDIR/terminfo.src.gz"
/usr/bin/tic -xe tmux-256color "$TMPDIR/terminfo.src"

echo "link .env from icloud to home"
ICLOUD_ENV_DIR="$HOME/Library/Mobile Documents/com~apple~CloudDocs"
ICLOUD_ENV_FILE="$ICLOUD_ENV_DIR/.env"
HOME_ENV_FILE="$HOME/.env"

if [ -d "$ICLOUD_ENV_DIR" ]; then
    touch "$ICLOUD_ENV_FILE"
    if [ -e "$HOME_ENV_FILE" ] && [ ! -L "$HOME_ENV_FILE" ]; then
        echo "skipping ~/.env symlink: file already exists and is not a symlink"
    else
        ln -sfn "$ICLOUD_ENV_FILE" "$HOME_ENV_FILE"
        echo "linked ~/.env -> $ICLOUD_ENV_FILE"
    fi
else
    echo "skipping ~/.env symlink: iCloud Drive directory not found"
fi
