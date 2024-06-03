return {
    "famiu/bufdelete.nvim",
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
