return {
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
