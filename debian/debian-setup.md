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
- libtree-sitter0
- luarocks
- make
- neovim
- python3-pip
- python3-pynvim
- python3-venv
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

- install global node packages

  ```bash
  npm -g i neovim typescript
  ```

- install go from website and run command

  ```bash
   rm -rf /usr/local/go && tar -C /usr/local -xzf "<go tarball here>"
  ```

- install neovim from github
- stow global stowables first, then debian stowables
- login to gh cli
