#!/bin/sh

# directories
dotf="$HOME"/.dotfiles

echo "make directories to prepare for stowing"
mkdir \
    "$HOME"/.config \
    "$HOME"/.fnm \
    "$HOME"/.local/bin \
    "$HOME"/.local/share \
    "$HOME"/builds \
    "$HOME"/dev

echo "install fnm and symlink"
curl -fsSL https://fnm.vercel.app/install | bash -s -- --install-dir "~/.fnm" --skip-shell
ln -s ~/.fnm/fnm ~/.local/bin

echo "download neovim from github, extract and symlink"
# curl ...
tar xzvf ~/builds/nvim-linux64/bin/nvim ~/.local/bin

echo "stowing global stowables"
cd "$dotf"/stowables
stow -vR \
    alacritty \
    awesome \
    fonts \
    git \
    nvim \
    tmux \
    vim \
    zsh
