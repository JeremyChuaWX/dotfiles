--[[
normal_mode       = "n",
insert_mode       = "i",
visual_mode       = "v",
visual_block_mode = "x",
term_mode         = "t",
command_mode      = "c",
]]

vim.g.mapleader = " "
vim.g.maplocalleader = " "

local set = vim.keymap.set

set("", "<Space>", "<Nop>")

-- split navigation
set("n", "<C-h>", "<C-w>h")
set("n", "<C-j>", "<C-w>j")
set("n", "<C-k>", "<C-w>k")
set("n", "<C-l>", "<C-w>l")

-- tab management
set("n", "t<leader>", ":tabnew<CR>")
set("n", "tp", ":tabprevious<CR>")
set("n", "tn", ":tabnext<CR>")
set("n", "tc", ":tabclose<CR>")
set("n", "tC", ":tabonly<CR>")

-- faster scrolling
set("n", "<C-e>", "3<C-e>")
set("n", "<C-y>", "3<C-y>")

-- copy to end
set("n", "Y", "y$")

-- system register stuff
set({ "n", "x" }, "gy", '"*y')
set({ "n", "x" }, "gY", '"*Y')
set({ "n", "x" }, "gp", '"*p')
set({ "n", "x" }, "gP", '"*P')

-- easy toggle fold
set("n", "Z", "za")

-- stay in indent mode
set("v", "<", "<gv")
set("v", ">", ">gv")

-- no highlight
set("n", "<space><space>", ":noh<CR>")
