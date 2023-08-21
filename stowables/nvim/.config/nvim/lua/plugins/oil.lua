local M = {
    "stevearc/oil.nvim",
    keys = {
        {
            "-",
            function()
                require("oil").toggle_float()
            end,
            "oil toggle float",
        },
    },
    opts = {
        view_options = {
            show_hidden = true,
        },
    },
}

return M
