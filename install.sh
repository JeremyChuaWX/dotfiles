#!/bin/zsh

echo "Installing homebrew"
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

brew install gh
echo "Logging in with github"
gh auth login

echo "Installing brew bundle"
brew bundle --file="./brewfile"

echo "Installing npm packages"
zsh npmfile

echo "Stowing configs"
stow -vR */

echo "Applying OSX settings"
zsh osx_settings
