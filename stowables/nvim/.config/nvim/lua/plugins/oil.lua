local M = {
    "stevearc/oil.nvim",
    keys = {
        {
            "-",
            function()
                require("oil").open_float()
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
        float = {
            border = "none",
        },
    },
}

return M
