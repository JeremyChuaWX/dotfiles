local M = {
    "stevearc/conform.nvim",
    keys = {
        {
            "gf",
            function()
                require("conform").format({
                    async = true,
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
                },
            },
            beautysh = {
                prepend_args = {
                    "--indent-size",
                    "4",
                },
            },
            golines = {
                prepend_args = {
                    "-m",
                    "80",
                    "--base-formatter",
                    "gofumpt",
                    "--no-chain-split-dots",
                    "--no-reformat-tags",
                },
            },
        },
        formatters_by_ft = {
            bash = { "beautysh" },
            go = { "golines" },
            html = { "rustywind", "prettier" },
            javascript = { "rustywind", "prettier" },
            javascriptreact = { "rustywind", "prettier" },
            json = { "prettier" },
            lua = { "stylua" },
            markdown = { "mdformat" },
            rust = { "rustfmt" },
            sh = { "beautysh" },
            typescript = { "rustywind", "prettier" },
            typescriptreact = { "rustywind", "prettier" },
            zsh = { "beautysh" },
        },
    },
}

return M
