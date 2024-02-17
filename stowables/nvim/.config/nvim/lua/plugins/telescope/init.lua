local M = {
    "nvim-telescope/telescope.nvim",
    cmd = "Telescope",
    keys = require("plugins.telescope.keys"),
    dependencies = {
        "DanielVolchek/tailiscope.nvim",
        { "nvim-telescope/telescope-fzf-native.nvim", build = "make" },
    },
    config = function()
        local telescope = require("telescope")
        local action_state = require("telescope.actions.state")
        local actions = require("telescope.actions")
        local bufdelete = require("bufdelete")

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
                                for _, selection in pairs(multi) do
                                    cmd = cmd .. "edit " .. selection[1] .. " | "
                                end
                            end
                            cmd = cmd .. " edit " .. single[1]
                            actions.close(prompt_bufnr)
                            vim.api.nvim_command(cmd)
                        end
                        actions.select_default:replace(open_buf)
                        return true
                    end,
                },
                buffers = {
                    attach_mappings = function(prompt_bufnr, map)
                        local del_buf = function()
                            local picker = action_state.get_current_picker(prompt_bufnr)
                            local multi_selections = picker:get_multi_selection()
                            if next(multi_selections) == nil then
                                local selection = action_state.get_selected_entry()
                                actions.close(prompt_bufnr)
                                bufdelete.bufdelete(selection.bufnr, true)
                            else
                                actions.close(prompt_bufnr)
                                for _, selection in ipairs(multi_selections) do
                                    bufdelete.bufdelete(selection.bufnr, true)
                                end
                            end
                        end
                        map({ "i", "n" }, "<c-x>", del_buf)
                        return true
                    end,
                },
            },

            extensions = {
                tailiscope = {
                    register = '"',
                    default = "classes",
                },
            },
        })

        telescope.load_extension("fzf")
    end,
}

return M
