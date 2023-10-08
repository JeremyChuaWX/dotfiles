local M = {}

M.jsonls = require("lsp.servers.jsonls")
M.lua_ls = require("lsp.servers.lua_ls")
M.tailwindcss = require("lsp.servers.tailwindcss")
M.rust_analyzer = require("lsp.servers.rust_analyzer")
M.clangd = require("lsp.servers.clangd")

return M
