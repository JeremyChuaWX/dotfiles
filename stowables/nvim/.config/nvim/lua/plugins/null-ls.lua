local M = {
    "jose-elias-alvarez/null-ls.nvim",
}

M.config = function()
    local null_ls = require("null-ls")
    local formatting = null_ls.builtins.formatting
    local diagnostics = null_ls.builtins.diagnostics
    local actions = null_ls.builtins.code_actions

    null_ls.setup({
        debug = false,
        diagnostics_format = "[#{c}] #{m} (#{s})",
        update_in_insert = true,
        on_attach = require("lsp.server-config").on_attach,
        sources = {
            actions.gitsigns,

            formatting.rustywind,
            formatting.rustfmt,
            formatting.gofumpt,
            formatting.prettier.with({
                prefer_local = "node_modules/.bin",
                extra_filetypes = { "toml", "svelte" },
                extra_args = { "--tab-width", "4" },
            }),
            formatting.stylua.with({
                extra_args = {
                    "--indent-type",
                    "Spaces",
                    "--indent-width",
                    "4",
                },
            }),
            formatting.beautysh.with({
                extra_args = { "--indent-size", "4" },
            }),

            diagnostics.actionlint,
            diagnostics.markdownlint,
        },
    })
end

return M
