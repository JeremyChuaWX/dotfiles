local M = {
    "shortcuts/no-neck-pain.nvim",
    opts = {
        autocmds = {
            enableOnVimEnter = true,
        },
        mappings = {
            enable = true,
            scratchPad = false,
        },
        buffers = {
            bo = {
                modifiable = false,
            },
        },
    },
}

return M
