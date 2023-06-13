local M = {
    "j-hui/fidget.nvim",
    tag = "legacy",
    opts = {
        text = {
            spinner = "dots_negative",
            done = "✔",
        },
        sources = {
            ["null-ls"] = {
                ignore = true,
            },
        },
    },
}

return M
