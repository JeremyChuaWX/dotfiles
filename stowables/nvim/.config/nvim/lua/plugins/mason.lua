local mason = {
  "williamboman/mason.nvim",
  config = true,
}

local mason_lspconfig = {
  "williamboman/mason-lspconfig.nvim",
  opts = {
    ensure_installed = {
      "lua_ls",
      "tsserver",
      "jsonls",
      "tailwindcss",
      "prismals",
      "rust_analyzer",
    },
  },
}

local mason_tools = {
  "WhoIsSethDaniel/mason-tool-installer.nvim",
  opts = {
    ensure_installed = {
      "prettierd",
      "stylua",
      "actionlint",
      "markdownlint",
      "beautysh",
      "rustfmt",
      "rustywind",
    },
  },
}

M = {
  mason,
  mason_lspconfig,
  mason_tools,
}

return M