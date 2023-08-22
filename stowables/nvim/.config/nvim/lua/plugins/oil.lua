local M = {
    "stevearc/oil.nvim",
    keys = {
        {
            "-",
            function()
                require("oil").open()
            end,
            "oil open",
        },
    },
    opts = {
        keymaps = {
            ["q"] = "actions.close",
        },
        view_options = {
            show_hidden = true,
        },
    },
}

return M
