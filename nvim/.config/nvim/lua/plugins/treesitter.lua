local M = {
  "nvim-treesitter/nvim-treesitter",
  build = ":TSUpdate",
}

M.config = function()
  require("nvim-treesitter.configs").setup({
    ensure_installed = "all",
    ignore_install = { "phpdoc", "beancount" },
    highlight = {
      enable = true,
      additional_vim_regex_highlighting = false,
    },
    indent = {
      enable = true,
    },
    autopairs = {
      enable = true,
    },
    autotag = {
      enable = true,
    },
    context_commentstring = {
      enable = true,
      enable_autocmd = false,
    },
  })

  vim.opt.foldmethod = "expr"
  vim.opt.foldexpr = "nvim_treesitter#foldexpr()"
end

return M
