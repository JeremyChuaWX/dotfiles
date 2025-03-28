setopt autocd
setopt extendedglob
setopt nomatch
setopt menucomplete
setopt interactive_comments

stty stop undef	# Disable ctrl-s to freeze terminal.

zle_highlight=('paste:none')

# beeping is annoying
unsetopt BEEP

# vim-mode
bindkey -v
export KEYTIMEOUT=10

# colours
autoload -Uz colors && colors
export CLICOLOR=1
export LSCOLORS=gxBxhxDxfxhxhxhxhxcxcx

source "$ZDOTDIR/zsh-functions"

# plugins
zsh_add_plugin "zsh-users/zsh-completions"

# configs
zsh_add_file "zsh-exports"
zsh_add_file "zsh-history"
zsh_add_file "zsh-completion"
zsh_add_file "zsh-prompt"
zsh_add_file "zsh-aliases"
zsh_add_file "zsh-keymaps"
zsh_add_file "zsh-surround"

# plugins
zsh_add_plugin "Aloxaf/fzf-tab"
zsh_add_plugin "hlissner/zsh-autopair"
zsh_add_plugin "zsh-users/zsh-syntax-highlighting"
zsh_add_plugin "zsh-users/zsh-autosuggestions"

# adhoc stuff
if [[ -f "$HOME/.profile" ]]; then
    source "$HOME/.profile"
fi
