# Dotfiles

macOS dotfiles managed with Homebrew and GNU Stow.

## Setup

```sh
git clone <repo> ~/.dotfiles
cd ~/.dotfiles
./macos/setup.sh
```

Dotfiles are installed from `stowables/` via `stowables/setup.sh`.

Pi skills live in `stowables/pi/.pi/agent/skills/`, which stows to `~/.pi/agent/skills/`. OpenCode stays skill-free for general use.
