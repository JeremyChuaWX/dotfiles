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
            "rust_analyzer",
            "denols",
            "gopls",
        },
    },
}

local mason_tools = {
    "WhoIsSethDaniel/mason-tool-installer.nvim",
    opts = {
        ensure_installed = {
            "stylua",
            "actionlint",
            "markdownlint",
            "beautysh",
            "rustfmt",
            "rustywind",
            "gofumpt",
        },
    },
}

M = {
    mason,
    mason_lspconfig,
    mason_tools,
}

return M
