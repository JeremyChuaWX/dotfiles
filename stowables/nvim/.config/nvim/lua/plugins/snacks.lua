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
            scope = {
                animate = {
                    enabled = false,
                },
                char = "┃",
                hl = "SnacksIndent3",
            },
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
            notification = {
                wo = { wrap = true },
            },
        },
    },
}
