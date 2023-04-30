#!/bin/zsh

echo "Installing homebrew"
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

echo "Installing brew bundle"
brew bundle --file="./brewfile"

echo "Logging in with github"
gh auth login

echo "Installing npm packages"
zsh npmfile

echo "Stowing configs"
cd $HOME/.dotfiles/stowables
stow -vR */ -t ~
cd $HOME/.dotfiles/macos

echo "Applying OSX settings"
zsh osx_settings
