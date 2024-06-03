return {
    "lukas-reineke/indent-blankline.nvim",
    main = "ibl",
    opts = {
        indent = {
            char = "┃",
            tab_char = "┃",
        },
        whitespace = {
            remove_blankline_trail = true,
        },
        scope = {
            show_start = false,
            show_end = false,
            highlight = { "MatchParen" },
        },
    },
}
