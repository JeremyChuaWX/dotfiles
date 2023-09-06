local M = {
    "famiu/bufdelete.nvim",
    event = "VeryLazy",
    keys = {
        {
            "<leader>w",
            function()
                require("bufdelete").bufdelete(0)
            end,
            desc = "smart bufdelete",
        },
    },
}

return M
