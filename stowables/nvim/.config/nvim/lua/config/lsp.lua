return {
    setup = function()
        vim.diagnostic.config({
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

        vim.lsp.config("*", {
            capabilities = vim.tbl_deep_extend(
                "force",
                vim.lsp.protocol.make_client_capabilities(),
                require("cmp_nvim_lsp").default_capabilities()
            ),
        })

        local show_virtual_lines = false
        local function toggle_virtual_lines()
            show_virtual_lines = not show_virtual_lines
            vim.diagnostic.config({
                virtual_lines = show_virtual_lines,
            })
        end

        local augroup = vim.api.nvim_create_augroup("user_lsp_autocmds", { clear = true })

        vim.api.nvim_create_autocmd("LspAttach", {
            group = augroup,
            callback = function(args)
                local bufnr = args.buf
                local client = vim.lsp.get_client_by_id(args.data.client_id)
                if client == nil then
                    return
                end

                local telescope_pickers = require("telescope.builtin")

                vim.keymap.set("n", "grr", function()
                    telescope_pickers.lsp_references({
                        jump_type = "never",
                    })
                end, { buffer = bufnr })

                vim.keymap.set("n", "gd", function()
                    telescope_pickers.lsp_definitions({
                        jump_type = "never",
                    })
                end, { buffer = bufnr })

                vim.keymap.set("n", "gs", function()
                    telescope_pickers.lsp_document_symbols({
                        ignore_symbols = {
                            "constant",
                            "property",
                            "variable",
                        },
                    })
                end, { buffer = bufnr })

                vim.keymap.set("n", "gl", vim.diagnostic.open_float, { buffer = bufnr })

                vim.keymap.set("n", "gL", toggle_virtual_lines, { buffer = bufnr })

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
