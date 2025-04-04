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

local mason = {
    "williamboman/mason.nvim",
    config = true,
}

local mason_lspconfig = {
    "williamboman/mason-lspconfig.nvim",
    config = function()
        local mason_lspconfig = require("mason-lspconfig")
        local lspconfig = require("lspconfig")

        mason_lspconfig.setup({
            ensure_installed = LSP,
        })

        local capabilities = vim.tbl_deep_extend(
            "force",
            vim.lsp.protocol.make_client_capabilities(),
            require("cmp_nvim_lsp").default_capabilities()
        )

        mason_lspconfig.setup_handlers({
            function(server_name)
                local opts = {
                    capabilities = capabilities,
                }
                local ok, server_opts = pcall(require, "lsp-servers." .. server_name)
                if ok then
                    opts = vim.tbl_deep_extend("keep", server_opts, opts)
                end
                lspconfig[server_name].setup(opts)
            end,

            ["jdtls"] = function() end,

            ["tailwindcss"] = function() end,

            ["ts_ls"] = function()
                local ts_error_translator = require("ts-error-translator")
                require("typescript-tools").setup({
                    capabilities = capabilities,
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

return {
    mason,
    mason_lspconfig,
    mason_tools,
}
