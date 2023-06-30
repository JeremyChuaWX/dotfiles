#!/bin/sh

echo "Applying OSX settings"
zsh osx_settings

echo "Installing homebrew"
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

echo "Add homebrew to path"
export PATH=/opt/homebrew/bin:$PATH

echo "Installing brew bundle"
brew bundle --file="./brewfile"

echo "Logging in with github"
gh auth login

echo "Installing npm packages"
./npmfile

echo "Install JetBrains Font"
cp $HOME/.dotfiles/stowables/fonts/* $HOME/Library/Fonts

echo "Stowing configs"
cd $HOME/.dotfiles/stowables
stow -vR */ -t ~

echo "Install tmux terminfo"
cd $HOME
curl -LO https://invisible-island.net/datafiles/current/terminfo.src.gz && gunzip terminfo.src.gz
/usr/bin/tic -xe tmux-256color terminfo.src
