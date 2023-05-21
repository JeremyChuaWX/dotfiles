local M = {
    "shortcuts/no-neck-pain.nvim",
    opts = {
        autocmds = {
            enableOnVimEnter = true,
        },
        buffers = {
            bo = {
                modifiable = false,
            },
        },
    },
}

return M
