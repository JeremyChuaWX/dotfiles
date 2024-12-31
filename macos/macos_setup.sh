#!/bin/sh

echo "applying OSX settings"
source osx_settings

if [[ $(command -v brew) == "" ]]; then
    echo "installing homebrew"
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    export PATH=/opt/homebrew/bin:$PATH
else
    echo "homebrew installed"
fi

echo "installing brew bundle"
brew bundle --file="./brewfile"

echo "logging in to github CLI"
gh auth login

echo "installing npm packages"
source npmfile

echo "stowing configs"
cd $HOME/.dotfiles/stowables
stow -vR */ -t ~

echo "install tmux terminfo"
cd $HOME
curl -LO https://invisible-island.net/datafiles/current/terminfo.src.gz && gunzip terminfo.src.gz
/usr/bin/tic -xe tmux-256color terminfo.src

echo "link .profile from icloud to home"
ln -s "$HOME/Library/Mobile Documents/com~apple~CloudDocs/.profile" "$HOME/.profile"
