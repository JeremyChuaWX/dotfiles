local mason_lspconfig = {
    "mason-org/mason-lspconfig.nvim",
    config = true,
}

local mason_tools = {
    "WhoIsSethDaniel/mason-tool-installer.nvim",
    opts = {
        ensure_installed = {
            -- lsp
            "gopls",
            "jsonls",
            "lua_ls",
            "ruff",
            "tailwindcss",
            "ts_ls",
            "ty",

            -- tools
            "gofumpt",
            "golangci-lint",
            "golines",
            "markdownlint",
            -- "mdslw",
            "rustywind",
            "stylua",
            "xmlformatter",
        },
    },
}

local mason = {
    "mason-org/mason.nvim",
    config = true,
}

return {
    mason,
    mason_lspconfig,
    mason_tools,
}
