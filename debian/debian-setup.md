# Packages to install

awesome
bat
fd-find
firefox-esr
fzf
git
neovim
ripgrep
stow
xinit
zsh

# Configs

## .xinitrc

```
xsetroot -solid black

# bell volume 20%
xset b 20

# screensaver off
xset s off

# key repeat rate
xset r rate 200 30

exec /usr/bin/awesome
```

## .zprofile

```
startx
```

# Notes

## Awesome WM

- after placing `.xinitrc`, use command `startx` to start awesome
