local lspconfig = {
    "neovim/nvim-lspconfig",
    config = function()
        vim.diagnostic.config({
            virtual_text = false,
            update_in_insert = true,
            severity_sort = true,
            float = {
                style = "minimal",
                border = "solid",
                source = true,
                header = "",
                prefix = "",
            },
            signs = {
                text = {
                    [vim.diagnostic.severity.ERROR] = "",
                    [vim.diagnostic.severity.WARN] = "",
                    [vim.diagnostic.severity.INFO] = "",
                    [vim.diagnostic.severity.HINT] = "",
                },
                numhl = {
                    [vim.diagnostic.severity.ERROR] = "DiagnosticSignError",
                    [vim.diagnostic.severity.WARN] = "DiagnosticSignWarn",
                    [vim.diagnostic.severity.INFO] = "DiagnosticSignInfo",
                    [vim.diagnostic.severity.HINT] = "DiagnosticSignHint",
                },
            },
        })

        local telescope_pickers = require("telescope.builtin")
        vim.lsp.handlers["textDocument/references"] = vim.lsp.with(function()
            telescope_pickers.lsp_references({
                jump_type = "never",
            })
        end, {})
        vim.lsp.handlers["textDocument/definition"] = vim.lsp.with(function()
            telescope_pickers.lsp_definitions({
                jump_type = "never",
            })
        end, {})
        vim.lsp.handlers["textDocument/documentSymbol"] = vim.lsp.with(function()
            telescope_pickers.lsp_document_symbols({
                ignore_symbols = {
                    "constant",
                    "property",
                    "variable",
                },
            })
        end, {})

        local augroup = vim.api.nvim_create_augroup("user_lsp_autocmds", { clear = true })
        vim.api.nvim_create_autocmd("LspAttach", {
            group = augroup,
            callback = function(args)
                local bufnr = args.buf
                local client = vim.lsp.get_client_by_id(args.data.client_id)
                if client == nil then
                    return
                end

                vim.keymap.set("n", "gd", vim.lsp.buf.definition, { buffer = bufnr })
                vim.keymap.set("n", "gs", vim.lsp.buf.document_symbol, { buffer = bufnr })
                vim.keymap.set("n", "gl", vim.diagnostic.open_float, { buffer = bufnr })

                require("lsp_signature").on_attach({
                    floating_window = false,
                    hint_enable = true,
                    hint_prefix = "",
                    hint_scheme = "Comment",
                }, bufnr)
            end,
        })
    end,
}

local mason = {
    "williamboman/mason.nvim",
    config = true,
}

local mason_lspconfig = {
    "williamboman/mason-lspconfig.nvim",
    config = function()
        local mason_lspconfig = require("mason-lspconfig")

        mason_lspconfig.setup({
            ensure_installed = {
                "lua_ls",
                "tsserver",
                "jsonls",
                "tailwindcss",
                "gopls",
                "ruff",
                "pyright",
            },
        })

        local _lspconfig = require("lspconfig")
        local capabilities = require("cmp_nvim_lsp").default_capabilities()

        mason_lspconfig.setup_handlers({
            function(server_name)
                local opts = {
                    capabilities = capabilities,
                }
                local ok, server_opts = pcall(require, "lsp-servers." .. server_name)
                if ok then
                    opts = vim.tbl_deep_extend("keep", server_opts, opts)
                end
                _lspconfig[server_name].setup(opts)
            end,

            ["jdtls"] = function() end,

            ["rust_analyzer"] = function()
                vim.g.rustaceanvim = {
                    server = {
                        capabilities = capabilities,
                    },
                }
            end,

            ["tsserver"] = function()
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
                            require("ts-error-translator").translate_diagnostics(...)
                            vim.lsp.diagnostic.on_publish_diagnostics(...)
                        end,
                    },
                })
                require("tsc").setup({
                    auto_focus_qflist = true,
                })
            end,
        })
    end,
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
    lspconfig,
    mason,
    mason_lspconfig,
    mason_tools,
}

return M
