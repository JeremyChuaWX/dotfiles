local lazypath = vim.fn.stdpath("data") .. "/lazy/lazy.nvim"
if not vim.loop.fs_stat(lazypath) then
  vim.fn.system({
    "git",
    "clone",
    "--filter=blob:none",
    "https://github.com/folke/lazy.nvim.git",
    "--branch=stable", -- latest stable release
    lazypath,
  })
end

vim.opt.rtp:prepend(lazypath)

require("config.options")
require("config.keymaps")
require("config.autocommands")

require("lazy").setup({
  spec = {
    { import = "plugins" },
  },
  performance = {
    rtp = {
      disabled_plugins = {
        "gzip",
        "matchit",
        "matchparen",
        "netrwPlugin",
        "tarPlugin",
        "tohtml",
        "tutor",
        "zipPlugin",
      },
    },
  },
})

local colorscheme = "kanagawa"

local cs_ok, _ = pcall(vim.cmd.colorscheme, colorscheme)
if not cs_ok then
  vim.notify("colorscheme " .. colorscheme .. " not found!")
  return
end

require("lsp")
