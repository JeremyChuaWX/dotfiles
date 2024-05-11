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
            "eslint",
            "jsonls",
            "tailwindcss",
            "gopls",
            "ruff_lsp",
            "pyright",
        },
    },
}

local mason_tools = {
    "WhoIsSethDaniel/mason-tool-installer.nvim",
    opts = {
        ensure_installed = {
            "prettier",
            "mdformat",
            "stylua",
            "beautysh",
            "rustywind",
            "gofumpt",
            "golines",
            "golangci-lint",
        },
    },
}

local M = {
    mason,
    mason_lspconfig,
    mason_tools,
}

return M
