return {
    {
        "bullets-vim/bullets.vim",
        init = function()
            vim.g.bullets_outline_levels = { "ROM", "ABC", "num", "abc", "rom", "std-" }
        end,
        config = function()
            vim.api.nvim_create_autocmd("FileType", {
                pattern = "markdown",
                callback = function(args)
                    vim.keymap.set("x", "<", "<Plug>(bullets-promote)gv", {
                        buffer = args.buf,
                        remap = true,
                    })
                    vim.keymap.set("x", ">", "<Plug>(bullets-demote)gv", {
                        buffer = args.buf,
                        remap = true,
                    })
                end,
            })
        end,
    },
    {
        "brianhuster/live-preview.nvim",
        opts = {
            picker = "snacks.picker",
        },
        config = function(_, opts)
            require("livepreview.config").set(opts)
        end,
    },
}
