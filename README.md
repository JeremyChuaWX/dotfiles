# Dotfiles

macOS dotfiles managed with Homebrew and GNU Stow.

## Setup

```sh
git clone <repo> ~/.dotfiles
cd ~/.dotfiles
./macos/setup.sh
```

Dotfiles are installed from `stowables/` via `stowables/setup.sh`.

Agent Skills shared by Pi and OpenCode live in `stowables/agents/.agents/skills/`, which stows to `~/.agents/skills/`.
