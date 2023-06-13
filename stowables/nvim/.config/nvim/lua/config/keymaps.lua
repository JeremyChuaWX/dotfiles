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

-- buffer management
set("n", "H", ":bprevious<CR>")
set("n", "L", ":bnext<CR>")

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

-- stay in indent mode
set("v", "<", "<gv")
set("v", ">", ">gv")

-- no highlight
set("n", "<space><space>", ":noh<CR>")

-- quickfix list
set("n", "<space>co", "<cmd>copen<CR>")
set("n", "<space>cc", "<cmd>cclose<CR>")

-- move lines
set("n", "<A-j>", ":m .+1<CR>==")
set("n", "<A-k>", ":m .-2<CR>==")
set("i", "<A-j>", "<ESC>:m .+1<CR>==gi")
set("i", "<A-k>", "<ESC>:m .-2<CR>==gi")
set("v", "<A-j>", ":m '>+1<CR>gv==gv")
set("v", "<A-k>", ":m '<-2<CR>gv==gv")
