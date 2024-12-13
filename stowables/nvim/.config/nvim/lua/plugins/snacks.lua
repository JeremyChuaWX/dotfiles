return {
    "folke/snacks.nvim",
    lazy = false,
    keys = {
        {
            "<leader>sn",
            function()
                Snacks.notifier.hide()
            end,
            desc = "Dismiss All Notifications",
        },
        {
            "<leader>w",
            function()
                Snacks.bufdelete()
            end,
            desc = "Delete Buffer",
        },
        {
            "<leader>sg",
            function()
                Snacks.gitbrowse()
            end,
            desc = "Git Browse",
        },
        {
            "]]",
            function()
                Snacks.words.jump(vim.v.count1, true)
            end,
            desc = "Next Reference",
        },
        {
            "[[",
            function()
                Snacks.words.jump(-vim.v.count1, true)
            end,
            desc = "Prev Reference",
        },
    },
    opts = {
        indent = {
            animate = {
                enabled = false,
            },
            scope = {
                char = "┃",
                hl = "SnacksIndent3",
            },
        },
        input = {
            enabled = true,
        },
        notifier = {
            timeout = 2000,
        },
        statuscolumn = {
            enabled = true,
        },
        words = {
            enabled = true,
        },
        styles = {
            input = {
                keys = {
                    i_esc = { "<esc>", "stopinsert", mode = "i" },
                    n_esc = { "<esc>", "cancel", mode = "n" },
                },
            },
            notification = {
                wo = { wrap = true },
            },
        },
    },
}
