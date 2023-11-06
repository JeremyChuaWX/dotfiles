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
- pamixer
- pipewire-media-session-
- python3-pip
- python3-pynvim
- python3-venv
- ripgrep
- stow
- tmux
- tree
- wireplumber
- xinit
- zsh

## Setup

- mkdir `.config/zsh`, `.fnm`, `builds`, `dev`, `.local/bin`, `.local/share`

- install packages

- stow global stowables first, then debian stowables

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
  tar xzvf "<go tarball here>"
  ln -s ~/builds/"<go tarball here>"/bin/go ~/.local/bin
  ln -s ~/builds/"<go tarball here>"/bin/gofmt ~/.local/bin
  ```

- download neovim from github, extract and symlink neovim binary to path

  ```bash
  wget https://github.com/neovim/neovim/releases/download/stable/nvim-linux64.tar.gz
  # move tarball from downloads to builds folder
  tar xzvf nvim-linux64.tar.gz
  ln -s ~/builds/nvim-linux64/bin/nvim ~/.local/bin
  ```

- login to gh cli

- enable wireplumber in systemd and restart

  ```bash
  systemctl --user --now enable wireplumber.service
  ```

- add `noatime` to `/etc/fstab`
