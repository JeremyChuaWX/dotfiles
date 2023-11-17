#!/bin/sh

set -ue

sudo -n true

apt-get install \
    awesome \
    bat \
    fd-find \
    firefox-esr \
    fzf \
    g++ \
    gh \
    libtree-sitter0 \
    luarocks \
    make \
    pamixer \
    pipewire-media-session- \
    python3-pip \
    python3-pynvim \
    python3-venv \
    stow \
    tmux \
    tree \
    wireplumber \
    x11-utils \
    xinit \
    zsh
