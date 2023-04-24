#!/bin/zsh

# speed up dnf
echo 'fastestmirror=1' | sudo tee -a /etc/dnf/dnf.conf
echo 'max_parallel_downloads=10' | sudo tee -a /etc/dnf/dnf.conf

# better fonts
sudo dnf copr enable dawid/better_fonts -y
sudo dnf install fontconfig-font-replacements -y --skip-broken
sudo dnf install fontconfig-enhanced-defaults -y --skip-broken
