#!/bin/zsh

# dnf options
echo 'fastestmirror=1' | sudo tee -a /etc/dnf/dnf.conf
echo 'max_parallel_downloads=10' | sudo tee -a /etc/dnf/dnf.conf
echo 'deltarpm=true' | sudo tee -a /etc/dnf/dnf.conf

# nvidia drivers
sudo dnf install -y akmod-nvidia
sudo dnf install -y xorg-x11-drv-nvidia-cuda
sudo dnf install -y xorg-x11-drv-nvidia-cuda-libs
sudo dnf install -y vdpauinfo libva-vdpau-driver libva-utils
sudo dnf install -y vulkan

# better fonts
sudo dnf copr enable dawid/better_fonts -y
sudo dnf install fontconfig-font-replacements -y --skip-broken
sudo dnf install fontconfig-enhanced-defaults -y --skip-broken

# stuff i use
zsh ./packages

# gnome extensions and tweaks
sudo dnf install -y gnome-extensions-app gnome-tweaks

# pop shell install
# sudo dnf install -y gnome-shell-extension-pop-shell
# then logout, login, activate in extensions