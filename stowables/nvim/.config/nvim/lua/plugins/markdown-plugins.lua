return {
    {
        "bullets-vim/bullets.vim",
        init = function()
            vim.g.bullets_outline_levels = { "ROM", "ABC", "num", "abc", "rom", "std-" }
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
