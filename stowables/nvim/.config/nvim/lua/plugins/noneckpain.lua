local M = {
    "shortcuts/no-neck-pain.nvim",
    lazy = false,
    opts = {
        autocmds = {
            enableOnVimEnter = true,
        },
        mappings = {
            enabled = true,
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
