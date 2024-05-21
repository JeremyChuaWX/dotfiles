-------------
-- general --
-------------

vim.opt.compatible = false
vim.opt.ttyfast = true
vim.opt.updatetime = 50
vim.opt.timeoutlen = 500
vim.opt.mouse = "a"

----------------
-- temp files --
----------------

vim.opt.backup = false
vim.opt.swapfile = false
-- opt.undofile = true

--------------------
-- ":" completion --
--------------------

vim.opt.wildmenu = true
vim.opt.wildignore:append({ ".git", ".DS_Store" })
vim.opt.wildignorecase = true
vim.opt.wildmode = { "list:longest", "list:full" }

--------------------
-- tab completion --
--------------------

vim.opt.completeopt = { "menu", "menuone", "noselect" }
vim.opt.pumheight = 10

---------------------
-- split behaviour --
---------------------

vim.opt.splitbelow = true
vim.opt.splitright = true

---------------
-- interface --
---------------

-- anything outside the buffer

vim.opt.ruler = false
vim.opt.number = true
vim.opt.numberwidth = 3
vim.opt.showcmd = true
vim.opt.showmode = false
vim.opt.cmdheight = 1
vim.opt.laststatus = 3
vim.opt.showtabline = 0
vim.opt.visualbell = true
vim.opt.signcolumn = "yes:2"
vim.opt.shortmess:append("c")
vim.opt.fillchars:append({
    eob = " ",
    horiz = "━",
    horizup = "┻",
    horizdown = "┳",
    vert = "┃",
    vertleft = "┨",
    vertright = "┣",
    verthoriz = "╋",
})

------------
-- editor --
------------

-- anything inside the buffer

vim.opt.encoding = "utf-8"
vim.opt.wrap = false
vim.opt.linebreak = true
vim.opt.whichwrap = "b,s,<,>,[,]"
vim.opt.joinspaces = false
vim.opt.backspace = { "indent", "eol", "start" }
vim.opt.list = true
vim.opt.listchars = { tab = "  ", trail = "", eol = "󰌑" }
vim.opt.iskeyword:append("-")
vim.opt.cursorline = true
vim.opt.scrolloff = 10
vim.opt.sidescrolloff = 10
vim.opt.guicursor = ""
vim.opt.colorcolumn = "80"

-------------
-- folding --
-------------

vim.opt.foldcolumn = "1"
vim.opt.foldlevel = 99
vim.opt.foldlevelstart = 99
vim.opt.foldenable = true
vim.opt.fillchars:append("fold: ,foldsep: ,foldopen:,foldclose:")

---------------------
-- buffer and tabs --
---------------------

vim.opt.hidden = true
vim.opt.autoread = true

-----------------
-- indentation --
-----------------

vim.opt.expandtab = true
vim.opt.smarttab = true
vim.opt.shiftround = true
vim.opt.tabstop = 4
vim.opt.softtabstop = 4
vim.opt.shiftwidth = 4
vim.opt.autoindent = true
vim.opt.smartindent = true

----------------
-- appearance --
----------------

vim.opt.background = "dark"

------------
-- search --
------------

vim.opt.ignorecase = true
vim.opt.smartcase = true
vim.opt.hlsearch = true
vim.opt.incsearch = true
vim.opt.wrapscan = true
