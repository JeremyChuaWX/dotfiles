return {
    "stevearc/conform.nvim",
    keys = {
        {
            "gf",
            function()
                require("conform").format({
                    async = true,
                    lsp_format = "fallback",
                })
            end,
            desc = "conform format",
        },
    },
    opts = {
        formatters = {
            forge_fmt = {
                command = "forge",
                args = { "fmt", "--check", "--raw", "-" },
                stdin = true,
                exit_codes = { 0, 1 },
            },
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
            html = { "prettier", "rustywind" },
            javascript = { "prettier", "rustywind" },
            javascriptreact = { "prettier", "rustywind" },
            json = { "prettier" },
            lua = { "stylua" },
            markdown = { "prettier" },
            rust = { "rustfmt" },
            sh = { "beautysh" },
            solidity = { "forge_fmt" },
            typescript = { "prettier", "rustywind" },
            typescriptreact = { "prettier", "rustywind" },
            zsh = { "beautysh" },
        },
    },
}
