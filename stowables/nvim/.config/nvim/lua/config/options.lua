local opt = vim.opt

-------------
-- general --
-------------

opt.compatible = false
opt.ttyfast = true
opt.updatetime = 50
opt.timeoutlen = 500
opt.mouse = "a"

----------------
-- temp files --
----------------

opt.backup = false
opt.swapfile = false
-- opt.undofile = true

--------------------
-- ":" completion --
--------------------

opt.wildmenu = true
opt.wildignore:append({ ".git", ".DS_Store" })
opt.wildignorecase = true
opt.wildmode = { "list:longest", "list:full" }

--------------------
-- tab completion --
--------------------

opt.completeopt = { "menu", "menuone", "noselect" }
opt.pumheight = 10

---------------------
-- split behaviour --
---------------------

opt.splitbelow = true
opt.splitright = true

---------------
-- interface --
---------------

-- anything outside the buffer

opt.ruler = false
opt.number = true
opt.numberwidth = 3
opt.showcmd = true
opt.showmode = false
opt.cmdheight = 1
opt.laststatus = 3
opt.showtabline = 0
opt.visualbell = true
opt.signcolumn = "yes"
opt.shortmess:append("c")
opt.fillchars:append({
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

opt.encoding = "utf-8"
opt.wrap = false
opt.linebreak = true
opt.whichwrap = "b,s,<,>,[,]"
opt.joinspaces = false
opt.backspace = { "indent", "eol", "start" }
opt.list = true
opt.listchars = { tab = "  ", trail = "", eol = "" }
opt.iskeyword:append("-")
opt.cursorline = true
opt.scrolloff = 10
opt.sidescrolloff = 10
opt.guicursor = ""

-------------
-- folding --
-------------

-- opt.foldlevelstart = 99
-- opt.foldcolumn = "1"
-- opt.foldmethod = "expr"
-- opt.foldexpr = "nvim_treesitter#foldexpr()"
-- vim.opt.fillchars:append("foldopen:,foldclose:,foldsep: ")

---------------------
-- buffer and tabs --
---------------------

opt.hidden = true
opt.autoread = true

-----------------
-- indentation --
-----------------

opt.expandtab = true
opt.smarttab = true
opt.tabstop = 4
opt.softtabstop = 4
opt.shiftwidth = 4
opt.autoindent = true
opt.smartindent = true

----------------
-- appearance --
----------------

opt.background = "dark"
opt.termguicolors = true

------------
-- search --
------------

opt.ignorecase = true
opt.smartcase = true
opt.hlsearch = true
opt.incsearch = true
opt.wrapscan = true
