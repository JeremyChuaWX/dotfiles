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
    opts = {
        automatic_enable = {
            exclude = {
                "jdtls",
            },
        },
    },
}

local mason_tools = {
    "WhoIsSethDaniel/mason-tool-installer.nvim",
    opts = {
        ensure_installed = vim.tbl_extend("force", LSP, TOOLS),
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
