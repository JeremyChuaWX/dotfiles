return {
    {
        "<leader>tt",
        ":Telescope<CR>",
        desc = "telescope main menu",
    },
    {
        "<leader>tf",
        function()
            require("telescope.builtin").find_files({ hidden = true })
        end,
        desc = "telescope find files",
    },
    {
        "<leader>tF",
        function()
            require("telescope.builtin").git_files()
        end,
        desc = "telescope find in git files",
    },
    {
        "<leader>tg",
        function()
            require("telescope.builtin").live_grep()
        end,
        desc = "telescope live grep",
    },
    {
        "<leader>th",
        function()
            require("telescope.builtin").help_tags()
        end,
        desc = "telescope help tags",
    },
    {
        "<leader>tb",
        function()
            require("telescope.builtin").buffers()
        end,
        desc = "telescope buffers",
    },
    {
        "<leader>td",
        function()
            require("telescope.builtin").diagnostics()
        end,
        desc = "telescope diagnostics",
    },
}
