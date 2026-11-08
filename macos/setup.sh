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
brew bundle --file="$SCRIPT_DIR/brewfile"

if ! gh auth status >/dev/null 2>&1; then
    echo "logging in to github CLI"
    gh auth login
else
    echo "github CLI already authenticated"
fi

echo "initializing fnm and Node.js"
eval "$(fnm env --shell bash)"
fnm install --latest --use
# Pi's development dependencies link through this stable global npm prefix.
fnm default "$(node --version)"

echo "installing npm packages"
source "$SCRIPT_DIR/npm.sh"

echo "stowing configs"
"$DOTFILES_DIR/stowables/setup.sh"

echo "applying rex settings"
"$HOME/.config/rex/apply-settings"

echo "installing zsh plugins"
"$HOME/.config/zsh/install-plugins"

PI_AGENT_DIR="$HOME/.pi/agent"
PI_SETTINGS="$PI_AGENT_DIR/settings.json"

echo "installing Pi extension development dependencies in the dotfiles checkout"
(cd "$DOTFILES_DIR/stowables/pi/.pi/agent" && npm ci --include=dev --ignore-scripts)

if [ ! -e "$PI_SETTINGS" ]; then
    echo "initializing Pi settings"
    mkdir -p "$PI_AGENT_DIR"
    node --input-type=module - "$PI_AGENT_DIR" <<'NODE'
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const agentDir = process.argv[2];
const settings = JSON.parse(readFileSync(join(agentDir, "settings.template.json"), "utf8"));
settings.externalEditor = join(agentDir, "bin", "pi-prompt-editor-wrapper.mjs");
writeFileSync(join(agentDir, "settings.json"), JSON.stringify(settings, null, 2) + "\n", { mode: 0o600 });
NODE
else
    echo "preserving existing Pi settings"
fi

echo "install tmux terminfo"
TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT
curl -fsSL https://invisible-island.net/datafiles/current/terminfo.src.gz -o "$TMPDIR/terminfo.src.gz"
gunzip -f "$TMPDIR/terminfo.src.gz"
/usr/bin/tic -xe tmux-256color "$TMPDIR/terminfo.src"

echo "install rex terminfo"
# rex isn't on PATH outside rex terminals; its cli ships with the server the app installs on first launch
REX_BIN="$HOME/Library/Application Support/com.superlogical.rex/RexServer/Versions/Current/Rex Server.app/Contents/MacOS/rex"
if [ -x "$REX_BIN" ]; then
    # installs xterm-rex into ~/.terminfo and adds an ssh guard Include to ~/.ssh/config
    "$REX_BIN" terminfo setup
else
    echo "skipping rex terminfo: launch Rex once, then run 'rex terminfo setup'"
fi

echo "pull .env from icloud"
# a local copy, not a symlink: shells reading iCloud at startup can hang
"$HOME/.local/bin/env-pull" || echo "skipping ~/.env: env-pull failed"
