return {
    {
        "bullets-vim/bullets.vim",
        config = function()
            vim.g.bullets_outline_levels = { "ROM", "ABC", "num", "abc", "rom", "std-" }
        end,
    },
    {
        "brianhuster/live-preview.nvim",
        config = true,
    },
}
