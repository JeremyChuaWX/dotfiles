return {
    {
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
            win_options = {
                signcolumn = "yes:2",
            },
            float = {
                border = "none",
            },
        },
    },
    {
        "refractalize/oil-git-status.nvim",
        config = true,
    },
}
