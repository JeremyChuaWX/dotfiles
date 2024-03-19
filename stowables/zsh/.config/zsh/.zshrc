# history
setopt INC_APPEND_HISTORY
setopt HIST_IGNORE_DUPS
setopt EXTENDED_HISTORY

# some useful options (man zshoptions)
setopt autocd extendedglob nomatch menucomplete
setopt interactive_comments
stty stop undef		# Disable ctrl-s to freeze terminal.
zle_highlight=('paste:none')

# beeping is annoying
unsetopt BEEP

# vim-mode
bindkey -v
export KEYTIMEOUT=10

bindkey "^?" backward-delete-char

# colours
autoload -Uz colors && colors
export CLICOLOR=1
export LSCOLORS=gxBxhxDxfxhxhxhxhxcxcx

# imports
source "$ZDOTDIR/zsh-functions"
zsh_add_file "zsh-exports"
zsh_add_file "zsh-aliases"
zsh_add_file "zsh-keymaps"
zsh_add_file "zsh-prompt"
zsh_add_file "zsh-completion"
zsh_add_file "zsh-surround"

# plugins
zsh_add_plugin "Aloxaf/fzf-tab"
zsh_add_plugin "zsh-users/zsh-autosuggestions"
zsh_add_plugin "zsh-users/zsh-syntax-highlighting"
zsh_add_plugin "hlissner/zsh-autopair"

zstyle ':fzf-tab:*' fzf-flags '--height=70%'
zstyle ':fzf-tab:complete:cd:*' fzf-preview 'less ${(Q)realpath}'
# TODO: how to turn on for completion of files (not specific to any command)

# adhoc stuff
if [[ -f "$HOME/.profile" ]]; then
    source "$HOME/.profile"
fi
