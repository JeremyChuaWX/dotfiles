#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOTFILES_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "applying OSX settings"
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

echo "logging in to github CLI"
gh auth login

echo "installing npm packages"
source "$SCRIPT_DIR/npm.sh"

echo "stowing configs"
"$DOTFILES_DIR/stowables/setup.sh"

echo "install tmux terminfo"
cd "$HOME"
curl -LO https://invisible-island.net/datafiles/current/terminfo.src.gz && gunzip -f terminfo.src.gz
/usr/bin/tic -xe tmux-256color terminfo.src

echo "link .profile from icloud to home"
ln -sfn "$HOME/Library/Mobile Documents/com~apple~CloudDocs/.profile" "$HOME/.profile"
