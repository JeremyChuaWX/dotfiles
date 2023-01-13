" #---------#
" #-Options-#
" #---------#

" General
set nocompatible
syntax on
set clipboard+=unnamed,unnamedplus
set ttyfast
set lazyredraw
set updatetime=50
set timeoutlen=500
set mouse=a

" Vim files
set viminfo='100,<50,s10,h

" File type detection
filetype on
filetype plugin on
filetype indent on

" Tab completion
set wildmenu
set wildignore+=.git
set wildignore+=.DS_Store
set wildignorecase
set wildmode=list,longest

" Interface
set ruler
set number
set showcmd
set cmdheight=1
set display+=lastline
set visualbell
set scrolloff=8
set splitbelow
set splitright

" Statusline
set laststatus=2

set statusline+=\ 
set statusline+=%1n\:
set statusline+=\ 
set statusline+=%F
set statusline+=%{&modified?'[+]':''}
set statusline+=%=
set statusline+=%#Search#
set statusline+=\ %y\ 
set statusline+=%*
set statusline+=\ 
set statusline+=%l/%L
set statusline+=\ 

" Editor
set encoding=utf-8
set wrap
set linebreak
set comments=sr:/*,mb:*,el:*/,://,b:#,:%,:XCOMM,n:>,fb:-,n:\: 
set matchpairs+=<:> 
set whichwrap=b,s,<,>,[,]
set nojoinspaces
set backspace=indent,eol,start
set completeopt=menuone,noinsert,noselect,preview
set formatoptions-=tcro
set formatoptions+=j

" Buffer and tabs
set hidden
set autoread

" Indentation
set expandtab
set smarttab
set tabstop=4
set softtabstop=4
set shiftwidth=4
set autoindent
set smartindent

" Aesthetics
set cursorline

" True colours
if has('termguicolors')
  set termguicolors
endif

let &t_8f = "\<Esc>[38;2;%lu;%lu;%lum"
let &t_8b = "\<Esc>[48;2;%lu;%lu;%lum"

" Colourscheme
set background=dark
colorscheme gruvbox

" Change cursor on insert
" let &t_SI.="\e[6 q"
" let &t_SR.="\e[6 q"
" let &t_EI.="\e[2 q"

" Search
set ignorecase
set smartcase
set hlsearch
set incsearch
set wrapscan

" Netrw options
let g:netrw_banner=0
let g:netrw_liststyle=3
let g:netrw_list_hide=netrw_gitignore#Hide().",.*\.swp$".",.DS_Store"

" #----------#
" #-Keybinds-#
" #----------#

let mapleader=" "

" Open terminal
nnoremap <C-\> :below terminal<CR>

" Buffer keybinds
nnoremap <leader>d :bdelete<CR>
nnoremap <leader>n :bn<CR>
nnoremap <leader>m :bp<CR>

" Tab keybinds
nnoremap H :tabp<CR>
nnoremap L :tabn<CR>
nnoremap <leader>td :tabclose<CR>

" Faster scrolling
nnoremap <C-e> 3<C-e>
nnoremap <C-y> 3<C-y>

" Better splits navigation
nnoremap <C-h> <C-w>h
nnoremap <C-j> <C-w>j
nnoremap <C-k> <C-w>k
nnoremap <C-l> <C-w>l

" Yank to end
nnoremap Y y$

" #----------#
" #-Autocmds-#
" #----------#

" augroup cursorsedits
    " autocmd InsertEnter * set nocursorline
    " autocmd InsertLeave * set cursorline
" augroup end

" #---------------#
" #-Abbreviations-#
" #---------------#

iab psvm public static void main(String[] args)
