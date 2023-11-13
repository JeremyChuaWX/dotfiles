local M = {
    "stevearc/conform.nvim",
    keys = {
        {
            "gf",
            function()
                require("conform").format({
                    lsp_fallback = true,
                })
            end,
            desc = "conform format",
        },
    },
    opts = {
        formatters = {
            prettier = {
                prepend_args = {
                    "--tab-width",
                    "4",
                    "--config-precedence",
                    "prefer-file",
                },
            },
            stylua = {
                prepend_args = {
                    "--indent-type",
                    "Spaces",
                    "--indent-width",
                    "4",
                },
            },
            beautysh = {
                prepend_args = {
                    "--indent-size",
                    "4",
                },
            },
        },
        formatters_by_ft = {
            lua = { "stylua" },
            go = { "golines", "gofumpt" },
            javascript = { "rustywind", "prettier" },
            typescript = { "rustywind", "prettier" },
            javascriptreact = { "rustywind", "prettier" },
            typescriptreact = { "rustywind", "prettier" },
            python = { "black" },
            rust = { "rustfmt" },
            markdown = { "mdformat" },
            bash = { "beautysh" },
            sh = { "beautysh" },
            zsh = { "beautysh" },
        },
    },
}

return M
