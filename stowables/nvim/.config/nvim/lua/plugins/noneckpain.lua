local M = {
    "shortcuts/no-neck-pain.nvim",
    keys = {
        { "<leader>np", "<cmd>NoNeckPain<CR>", desc = "toggle noneckpain" },
    },
    opts = {
        buffers = {
            bo = {
                modifiable = false,
            },
        },
    },
}

return M
