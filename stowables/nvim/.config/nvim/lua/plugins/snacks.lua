return {
    "folke/snacks.nvim",
    lazy = false,
    priority = 1000,
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
            "<leader>TT",
            function()
                Snacks.picker.pickers()
            end,
            desc = "pickers",
        },
        {
            "<leader>tf",
            function()
                Snacks.picker.files({ hidden = true })
            end,
            desc = "find files",
        },
        {
            "<leader>tF",
            function()
                Snacks.picker.git_files()
            end,
            desc = "find git files",
        },
        {
            "<leader>tg",
            function()
                Snacks.picker.git_status()
            end,
            desc = "git status",
        },
        {
            "<leader>ts",
            function()
                Snacks.picker.grep()
            end,
            desc = "live grep",
        },
        {
            "<leader>tS",
            function()
                Snacks.picker.grep({ need_search = false })
            end,
            desc = "search file content",
        },
        {
            "<leader>th",
            function()
                Snacks.picker.help()
            end,
            desc = "help tags",
        },
        {
            "<leader>tb",
            function()
                Snacks.picker.buffers()
            end,
            desc = "buffers",
        },
        {
            "<leader>td",
            function()
                Snacks.picker.diagnostics()
            end,
            desc = "diagnostics",
        },
        {
            "<leader>tt",
            function()
                Snacks.picker.todo_comments()
            end,
            desc = "todos",
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
        input = {
            enabled = true,
        },
        picker = {
            enabled = true,
            ui_select = true,
            layout = {
                preset = "user_telescope",
            },
            layouts = {
                user_telescope = {
                    layout = {
                        box = "horizontal",
                        backdrop = false,
                        width = 0.80,
                        height = 0.85,
                        border = "none",
                        {
                            box = "vertical",
                            width = 0.45,
                            { win = "input", height = 1, border = true, title = "{title} {live}", title_pos = "center" },
                            { win = "list", border = true },
                        },
                        {
                            win = "preview",
                            width = 0.55,
                            border = true,
                            title = "{preview:Preview}",
                            title_pos = "center",
                        },
                    },
                },
            },
            win = {
                input = {
                    keys = {
                        ["<C-c>"] = { "cancel", mode = { "i", "n" } },
                        ["<C-f>"] = { "preview_scroll_down", mode = { "i", "n" } },
                        ["<C-b>"] = { "preview_scroll_up", mode = { "i", "n" } },
                        ["<C-e>"] = { "list_scroll_down", mode = { "i", "n" } },
                        ["<C-y>"] = { "list_scroll_up", mode = { "i", "n" } },
                        ["<C-j>"] = { "list_down", mode = { "i", "n" } },
                        ["<C-k>"] = { "list_up", mode = { "i", "n" } },
                    },
                },
            },
            sources = {
                files = {
                    hidden = true,
                    ignored = false,
                    exclude = { "node_modules", ".git" },
                },
                grep = {
                    hidden = true,
                    ignored = false,
                    exclude = { "node_modules", ".git" },
                    args = { "--smart-case", "--trim" },
                },
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
