# Debian

## Setup

- mkdir `.config/zsh`, `.fnm`, `builds`, `dev`, `.local/bin`, `.local/share`

- run `./install-packages.sh` script

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
  wget https://go.dev/dl/go<version>.linux-amd64.tar.gz
  # move tarball from downloads to builds folder
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

- download ripgrep debian package and install

  ```bash
  wget https://github.com/BurntSushi/ripgrep/releases/download/<version>/<filename>.deb
  sudo dpkg -i <filename>.deb
  ```

- login to gh cli

- add `noatime` to `/etc/fstab`

- enable wireplumber in systemd

  ```bash
  systemctl --user --now enable wireplumber.service
  ```

- restart system
