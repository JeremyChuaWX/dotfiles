return {
    "folke/snacks.nvim",
    lazy = false,
    keys = {
        {
            "<leader>sn",
            function()
                Snacks.notifier.hide()
            end,
            desc = "dismiss all notifications",
        },
        {
            "<leader>w",
            function()
                Snacks.bufdelete()
            end,
            desc = "delete buffer",
        },
        {
            "]]",
            function()
                Snacks.words.jump(vim.v.count1, true)
            end,
            desc = "next reference",
        },
        {
            "[[",
            function()
                Snacks.words.jump(-vim.v.count1, true)
            end,
            desc = "prev reference",
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
        notifier = {
            timeout = 2000,
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
