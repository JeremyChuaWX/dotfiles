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
    config = true,
}

return M
