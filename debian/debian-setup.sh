#!/bin/sh

# TODO: check if stow installed, else prompt to install packages

# directories
DOTFILES="$HOME"/.dotfiles

echo "create directories"
mkdir -p \
    "$HOME"/.config/zsh \
    "$HOME"/.fnm \
    "$HOME"/.local/bin \
    "$HOME"/.local/share \
    "$HOME"/builds \
    "$HOME"/dev

echo "install fnm and symlink"
curl -fsSL https://fnm.vercel.app/install | bash -s -- --install-dir "$HOME/.fnm" --skip-shell
ln -s $HOME/.fnm/fnm $HOME/.local/bin

echo "download neovim tar, extract and symlink"
wget https://github.com/neovim/neovim/releases/download/stable/nvim-linux64.tar.gz
mv nvim-linux64.tar.gz $HOME/builds/
tar xzvf $HOME/builds/nvim-linux64.tar.gz
ln -s $HOME/builds/nvim-linux64/bin/nvim $HOME/.local/bin

echo "stow global stowables"
cd $DOTFILES/stowables
stow -vR -t $HOME \
    alacritty \
    awesome \
    fonts \
    git \
    nvim \
    tmux \
    vim \
    wallpapers \
    zsh

echo "stow debian stowables"
cd "$DOTFILES"/debian
stow -vR -t $HOME stowables
