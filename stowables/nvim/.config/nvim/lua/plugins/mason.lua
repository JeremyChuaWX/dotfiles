local LSP = {
    "basedpyright",
    "gopls",
    "jsonls",
    "lua_ls",
    "ruff",
    "tailwindcss",
    "ts_ls",
}

local TOOLS = {
    "gofumpt",
    "golangci-lint",
    "golines",
    "markdownlint",
    "mdslw",
    "prettier",
    "rustywind",
    "stylua",
}

local mason_lspconfig = {
    "williamboman/mason-lspconfig.nvim",
    config = function()
        local mason_lspconfig = require("mason-lspconfig")

        mason_lspconfig.setup({
            ensure_installed = LSP,
        })

        require("config.lsp").setup()

        mason_lspconfig.setup_handlers({
            function(server_name)
                vim.lsp.enable(server_name)
            end,

            ["jdtls"] = function() end,

            ["tailwindcss"] = function() end,

            ["ts_ls"] = function()
                local ts_error_translator = require("ts-error-translator")
                require("typescript-tools").setup({
                    capabilities = vim.lsp.config["*"].capabilities,
                    settings = {
                        expose_as_code_action = "all",
                        tsserver_file_preferences = {
                            providePrefixAndSuffixTextForRename = false,
                        },
                    },
                    handlers = {
                        ["textDocument/publishDiagnostics"] = function(...)
                            ts_error_translator.translate_diagnostics(...)
                            vim.lsp.diagnostic.on_publish_diagnostics(...)
                        end,
                    },
                })
            end,
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
    "williamboman/mason.nvim",
    config = true,
}

return {
    mason,
    mason_lspconfig,
    mason_tools,
}
