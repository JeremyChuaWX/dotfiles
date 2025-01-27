return {
    "nvim-telescope/telescope.nvim",
    cmd = "Telescope",
    keys = {
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
                require("telescope.builtin").git_status()
            end,
            desc = "telescope git status",
        },
        {
            "<leader>ts",
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
    },
    dependencies = {
        { "nvim-telescope/telescope-fzf-native.nvim", build = "make" },
        "nvim-telescope/telescope-ui-select.nvim",
    },
    config = function()
        local telescope = require("telescope")
        local action_state = require("telescope.actions.state")
        local actions = require("telescope.actions")
        local themes = require("telescope.themes")

        telescope.setup({
            defaults = {
                layout_config = {
                    prompt_position = "top",
                    horizontal = {
                        preview_width = 0.55,
                        results_width = 0.8,
                    },
                    vertical = {
                        mirror = false,
                    },
                    width = 0.80,
                    height = 0.85,
                    scroll_speed = 3,
                },
                mappings = {
                    i = {
                        ["<C-c>"] = "close",
                        ["<C-f>"] = "preview_scrolling_down",
                        ["<C-b>"] = "preview_scrolling_up",
                        ["<C-e>"] = "results_scrolling_down",
                        ["<C-y>"] = "results_scrolling_up",
                    },
                    n = {
                        ["<C-c>"] = "close",
                        ["<C-f>"] = "preview_scrolling_down",
                        ["<C-b>"] = "preview_scrolling_up",
                        ["<C-e>"] = "results_scrolling_down",
                        ["<C-y>"] = "results_scrolling_up",
                    },
                },
                file_ignore_patterns = {
                    "node_modules",
                    ".git/",
                },
                initial_mode = "insert",
                results_title = false,
                prompt_title = false,
                sorting_strategy = "ascending",
                prompt_prefix = " ",
                path_display = { "truncate" },
                file_sorter = require("telescope.sorters").get_fuzzy_file,
                generic_sorter = require("telescope.sorters").get_generic_fuzzy_sorter,
                selection_caret = "  ",
                entry_prefix = "  ",
            },
            pickers = {
                find_files = {
                    hidden = true,
                    attach_mappings = function(prompt_bufnr, map)
                        local open_buf = function(prompt_bufnr)
                            local picker = action_state.get_current_picker(prompt_bufnr)
                            local multi = picker:get_multi_selection()
                            local single = action_state.get_selected_entry()
                            local cmd = ""
                            if #multi > 0 then
                                local cmds = {}
                                for _, selection in pairs(multi) do
                                    table.insert(cmds, "edit " .. selection[1])
                                end
                                cmd = table.concat(cmds, " | ")
                            else
                                cmd = "edit " .. single[1]
                            end
                            actions.close(prompt_bufnr)
                            vim.api.nvim_command(cmd)
                        end
                        actions.select_default:replace(open_buf)
                        return true
                    end,
                },
                buffers = {
                    mappings = {
                        i = {
                            ["<c-w>"] = actions.delete_buffer + actions.move_to_top,
                        },
                        n = {
                            ["<c-w>"] = actions.delete_buffer + actions.move_to_top,
                        },
                    },
                },
            },
            extensions = {
                ["ui-select"] = {
                    themes.get_dropdown({
                        layout_config = {
                            width = 0.4,
                            height = 0.4,
                            scroll_speed = 3,
                        },
                    }),
                },
            },
        })
        telescope.load_extension("fzf")
        telescope.load_extension("ui-select")
    end,
}
