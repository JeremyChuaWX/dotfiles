local M = {
    "stevearc/oil.nvim",
    tag = "v2.7.0",
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
