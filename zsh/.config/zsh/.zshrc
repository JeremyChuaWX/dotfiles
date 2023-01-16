#---------#
#-imports-#
#---------#

source "$ZDOTDIR/zsh-functions"
zsh_add_file "zsh-exports"
zsh_add_file "zsh-aliases"
zsh_add_file "zsh-prompt"

#---------#
#-options-#
#---------#

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

#----------#
#-vim-mode-#
#----------#

bindkey -v
export KEYTIMEOUT=1

bindkey "^?" backward-delete-char

#-------------#
#-completions-#
#-------------#

autoload -Uz compinit; compinit
zstyle ':completion:*' menu select
zstyle ":completion:*" matcher-list "" "m:{a-zA-Z}={A-Za-z}"
zmodload zsh/complist
_comp_options+=(globdots) # Include hidden files.

autoload -U up-line-or-beginning-search
autoload -U down-line-or-beginning-search
zle -N up-line-or-beginning-search
zle -N down-line-or-beginning-searchs

#---------#
#-colours-#
#---------#

autoload -Uz colors && colors
export CLICOLOR=1
export LSCOLORS=gxBxhxDxfxhxhxhxhxcxcx

#---------#
#-plugins-#
#---------#

zsh_add_plugin "zsh-users/zsh-autosuggestions"
zsh_add_plugin "zsh-users/zsh-syntax-highlighting"
zsh_add_plugin "hlissner/zsh-autopair"

#----------#
#-keybinds-#
#----------#

# menu selection
bindkey -M menuselect "${terminfo[kcbt]}" reverse-menu-complete # s-tab to go backwards in compselect
bindkey -M menuselect 'l' vi-forward-char
bindkey -M menuselect 'j' vi-down-line-or-history
bindkey -M menuselect 'h' vi-backward-char
bindkey -M menuselect 'k' vi-up-line-or-history
