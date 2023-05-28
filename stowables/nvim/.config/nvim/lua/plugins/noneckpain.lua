local M = {
    "shortcuts/no-neck-pain.nvim",
    keys = {
        { "<leader>np", "<cmd>NoNeckPain<CR>", desc = "toggle noneckpain" },
    },
    opts = {
        width = 120,
        buffers = {
            bo = {
                modifiable = false,
            },
        },
    },
}

return M
