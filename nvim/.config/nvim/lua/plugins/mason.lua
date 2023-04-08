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
      "jdtls",
      "tailwindcss",
      "prismals",
      "rust_analyzer",
      "gopls",
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
      "gofumpt",
      "rustywind",
      "google-java-format",
    },
  },
}

M = {
  mason,
  mason_lspconfig,
  mason_tools,
}

return M
