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
            stylua = {
                prepend_args = {
                    "--indent-type",
                    "Spaces",
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
            astro = { "oxfmt" },
            go = { "golines" },
            html = { "oxfmt" },
            javascript = { "oxfmt" },
            javascriptreact = { "oxfmt" },
            json = { "oxfmt" },
            jsonc = { "oxfmt" },
            lua = { "stylua" },
            markdown = { "oxfmt" },
            rust = { "rustfmt" },
            typescript = { "oxfmt" },
            typescriptreact = { "oxfmt" },
        },
    },
}
