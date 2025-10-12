local LSP = {
    "gopls",
    "jsonls",
    "lua_ls",
    "ruff",
    "tailwindcss",
    "ts_ls",
    "ty",
}

local TOOLS = {
    "gofumpt",
    "golangci-lint",
    "golines",
    "markdownlint",
    "mdslw",
    "rustywind",
    "stylua",
}

local mason_lspconfig = {
    "mason-org/mason-lspconfig.nvim",
    config = function()
        require("config.lsp").setup()
        require("mason-lspconfig").setup({
            ensure_installed = LSP,
            automatic_enable = {
                exclude = {
                    "jdtls",
                },
            },
        })
    end,
}

local mason_tools = {
    "WhoIsSethDaniel/mason-tool-installer.nvim",
    opts = {
        ensure_installed = TOOLS,
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
