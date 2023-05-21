local M = {
    "shortcuts/no-neck-pain.nvim",
    keys = {
        { "<leader>np", "<cmd>NoNeckPain<CR>", desc = { "Toggle no neck pain" } },
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
