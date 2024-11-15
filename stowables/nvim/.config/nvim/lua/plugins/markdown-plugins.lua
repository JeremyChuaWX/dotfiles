return {
    {
        "bullets-vim/bullets.vim",
        init = function()
            vim.g.bullets_outline_levels = { "ROM", "ABC", "num", "abc", "rom", "std-" }
        end,
    },
    {
        "brianhuster/live-preview.nvim",
        config = true,
    },
}
