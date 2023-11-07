local M = {
    "stevearc/conform.nvim",
    keys = {
        {
            "gF",
            function()
                require("conform").format()
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
        },
        formatters_by_ft = {
            lua = { "stylua" },
            go = { "gofumpt" },
            javascript = { "rustywind", "prettier" },
            python = { "black" },
            rust = { "rustfmt" },
            markdown = { "mdformat" },
        },
    },
}

return M
