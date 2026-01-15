return {
    "nvim-telescope/telescope.nvim",
    cmd = "Telescope",
    lazy = false,
    keys = {
        {
            "<leader>TT",
            ":Telescope<CR>",
            desc = "telescope pickers",
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
        {
            "<leader>tt",
            ":TodoTelescope<CR>",
            desc = "telescope todos",
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
        local action_set = require("telescope.actions.set")
        local themes = require("telescope.themes")
        local previewers = require("telescope.previewers")
        local pickers = require("telescope.pickers")
        local finders = require("telescope.finders")
        local sorters = require("telescope.sorters")

        local mappings = {
            ["<C-c>"] = actions.close,
            ["<C-f>"] = actions.preview_scrolling_down,
            ["<C-b>"] = actions.preview_scrolling_up,
            ["<C-e>"] = function(prompt_bufnr)
                action_set.scroll_results(prompt_bufnr, 3)
            end,
            ["<C-y>"] = function(prompt_bufnr)
                action_set.scroll_results(prompt_bufnr, -3)
            end,
            ["<c-s>"] = actions.to_fuzzy_refine,
            ["<c-j>"] = actions.move_selection_next,
            ["<c-k>"] = actions.move_selection_previous,
        }

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
                    i = mappings,
                    n = mappings,
                },
                file_ignore_patterns = {
                    "node_modules",
                    ".git",
                },
                initial_mode = "insert",
                results_title = false,
                prompt_title = false,
                sorting_strategy = "ascending",
                prompt_prefix = " ",
                path_display = { "truncate" },
                selection_caret = "  ",
                entry_prefix = "  ",
                vimgrep_arguments = {
                    "rg",
                    "--color=never",
                    "--no-heading",
                    "--with-filename",
                    "--line-number",
                    "--column",
                    "--smart-case",
                    "--trim",
                },
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

        vim.keymap.set("n", "<leader>tS", function()
            pickers
                .new({
                    prompt_title = "Search File Content",
                    sorter = sorters.get_generic_fuzzy_sorter(),
                    finder = finders.new_oneshot_job({
                        "rg",
                        "--line-number",
                        "--column",
                        "--no-heading",
                        "--color=never",
                        "--smart-case",
                        "--trim",
                        ".",
                    }, {}),
                    previewer = previewers.new_buffer_previewer({
                        title = "File Preview",
                        define_preview = function(self, entry)
                            -- Parse the ripgrep output
                            local parts = vim.split(entry.value, ":")
                            local file_path = parts[1]
                            local line_num = tonumber(parts[2])

                            -- Read the file content
                            local lines = vim.fn.readfile(file_path)
                            if not lines then
                                return
                            end

                            -- Calculate preview range (10 lines before and after the match)
                            local start_line = math.max(1, line_num - 10)
                            local end_line = math.min(#lines, line_num + 10)

                            -- Get the preview lines
                            local preview_lines = {}
                            for i = start_line, end_line do
                                local line = lines[i]
                                if i == line_num then
                                    -- Highlight the matching line
                                    preview_lines[#preview_lines + 1] = "> " .. line
                                else
                                    preview_lines[#preview_lines + 1] = "  " .. line
                                end
                            end

                            -- Set the preview content
                            vim.api.nvim_buf_set_lines(self.state.bufnr, 0, -1, false, preview_lines)

                            -- Apply syntax highlighting
                            local ft = vim.filetype.match({ filename = file_path })
                            if ft then
                                vim.bo[self.state.bufnr].filetype = ft
                            end
                        end,
                    }),
                    attach_mappings = function(prompt_bufnr)
                        actions.select_default:replace(function()
                            local selection = action_state.get_selected_entry()
                            actions.close(prompt_bufnr)

                            -- Extract file path, line number, and column from the selection
                            local parts = vim.split(selection.value, ":")
                            local file_path = parts[1]
                            local line_num = tonumber(parts[2])
                            local col_num = tonumber(parts[3])

                            -- Open the file at the specific location
                            vim.cmd("edit " .. file_path)
                            vim.api.nvim_win_set_cursor(0, { line_num, col_num - 1 })
                        end)

                        return true
                    end,
                }, {})
                :find()
        end)
    end,
}
