# Debian

## Packages to install

- awesome
- bat
- fd-find
- firefox-esr
- fzf
- g++
- gh
- git
- make
- neovim
- ripgrep
- stow
- tmux
- tree
- xinit
- zsh

## Setup

- mkdir `.config/zsh`, `.fnm`, `builds`, `dev`
- run .fnm install script and symlink

  ```bash
  curl -fsSL https://fnm.vercel.app/install | bash -s -- --install-dir "./.fnm" --skip-shell
  ln -s ~/.fnm/fnm ~/.local/bin
  ```

- stow global stowables first, then debian stowables
- install neovim from github
- login to gh cli
