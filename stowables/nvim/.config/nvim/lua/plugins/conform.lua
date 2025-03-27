return {
    "stevearc/conform.nvim",
    keys = {
        {
            "gf",
            function()
                require("conform").format()
            end,
            desc = "conform format",
        },
    },
    opts = {
        default_format_opts = {
            lsp_format = "fallback",
        },
        formatters = {
            forge_fmt = {
                command = "forge",
                args = { "fmt", "--raw", "-" },
                stdin = true,
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
            mdslw = {
                prepend_args = {
                    "--end-markers",
                    "",
                },
            },
        },
        formatters_by_ft = {
            astro = { "prettier", "rustywind" },
            bash = { "beautysh" },
            go = { "golines" },
            html = { "prettier", "rustywind" },
            javascript = { "prettier", "rustywind" },
            javascriptreact = { "prettier", "rustywind" },
            json = { "prettier" },
            jsonc = { "prettier" },
            lua = { "stylua" },
            markdown = { "markdownlint", "mdslw" },
            rust = { "rustfmt" },
            sh = { "beautysh" },
            solidity = { "forge_fmt" },
            typescript = { "prettier", "rustywind" },
            typescriptreact = { "prettier", "rustywind" },
            zsh = { "beautysh" },
        },
    },
}
