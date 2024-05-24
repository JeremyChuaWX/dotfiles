local M = {
    "shortcuts/no-neck-pain.nvim",
    keys = {
        {
            "<leader>np",
            function()
                require("no-neck-pain").toggle()
            end,
            desc = "no neck pain toggle",
        },
    },
    opts = {
        buffers = {
            bo = {
                modifiable = false,
            },
            wo = {
                winfixbuf = true,
            },
        },
    },
}

return M
