local M = {
    "stevearc/dressing.nvim",
    lazy = true,
    opts = {
        input = {
            insert_only = false,
            border = "solid",
            relative = "win",
            win_options = {
                winblend = 0,
            },
        },
    },
}

return M
