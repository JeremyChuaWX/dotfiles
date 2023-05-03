local M = {
    "famiu/bufdelete.nvim",
    event = "VeryLazy",
    keys = {
        { "<C-w>", "<cmd>Bdelete<CR>", desc = "smart bufdelete" },
    },
}

return M
