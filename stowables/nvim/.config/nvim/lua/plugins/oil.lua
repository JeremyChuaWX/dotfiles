local M = {
    "stevearc/oil.nvim",
    keys = {
        {
            "-",
            function()
                require("oil").open()
            end,
            desc = "oil: open parent directory",
        },
    },
    opts = {
        view_options = {
            show_hidden = true,
        },
    },
}

return M
