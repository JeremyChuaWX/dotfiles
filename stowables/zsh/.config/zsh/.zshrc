setopt autocd
setopt extendedglob
setopt nomatch
setopt menucomplete
setopt interactive_comments

[[ -t 0 ]] && stty stop undef	# Disable ctrl-s to freeze terminal.

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
source "$ZDOTDIR/zsh-plugins"

# plugins needed before completion initialization
zsh_add_plugin "${ZSH_PLUGINS_BEFORE_COMPINIT[@]}"

# configs
zsh_add_file "zsh-exports"
zsh_add_file "zsh-history"
zsh_add_file "zsh-completion"
zsh_add_file "zsh-prompt"
zsh_add_file "zsh-aliases"
zsh_add_file "zsh-keymaps"
zsh_add_file "zsh-surround"

# autosuggestions
ZSH_AUTOSUGGEST_BUFFER_MAX_SIZE=20
ZSH_AUTOSUGGEST_STRATEGY=(history completion)
ZSH_AUTOSUGGEST_HISTORY_IGNORE='(cd *|ls|ll|la)'

# plugins loaded after completion initialization
zsh_add_plugin "${ZSH_PLUGINS_AFTER_COMPINIT[@]}"

# adhoc stuff (kept outside this dotfiles repo for secrets/dotenv vars)
ZSH_ADHOC_ENV_FILE="$HOME/.env"
if [[ -f "$ZSH_ADHOC_ENV_FILE" ]]; then
    set -a
    source "$ZSH_ADHOC_ENV_FILE"
    set +a
fi
