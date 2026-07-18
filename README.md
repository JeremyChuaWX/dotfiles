# Dotfiles

macOS dotfiles managed with Homebrew and GNU Stow.

## Setup

```sh
git clone <repo> ~/.dotfiles
cd ~/.dotfiles
./macos/setup.sh
```

Dotfiles are installed from `stowables/` via `stowables/setup.sh`.

Pi is the sole AI harness. Its static configuration is managed from `stowables/pi/.pi/agent/`; mutable runtime files remain local to `~/.pi/agent/`. Global skills are not managed by these dotfiles.
