local M = {
    "nvim-telescope/telescope.nvim",
    cmd = "Telescope",
    keys = require("plugins.telescope.keys"),
    dependencies = {
        "DanielVolchek/tailiscope.nvim",
        { "nvim-telescope/telescope-fzf-native.nvim", build = "make" },
    },
}

M.config = function()
    local telescope = require("telescope")

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
            },

            mappings = {
                i = {
                    ["<esc>"] = "close",
                    ["<Tab>"] = "move_selection_next",
                    ["<S-Tab>"] = "move_selection_previous",
                    ["<C-f>"] = "preview_scrolling_down",
                    ["<C-b>"] = "preview_scrolling_up",
                },
                n = {
                    ["<esc>"] = "close",
                    ["<Tab>"] = "move_selection_next",
                    ["<S-Tab>"] = "move_selection_previous",
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
            },
        },

        extensions = {
            fzf = {
                fuzzy = true, -- false will only do exact matching
                override_generic_sorter = true, -- override the generic sorter
                override_file_sorter = true, -- override the file sorter
                case_mode = "smart_case", -- or "ignore_case" or "respect_case", default is "smart_case"
            },

            tailiscope = {
                register = '"',
                default = "classes",
            },
        },
    })

    telescope.load_extension("fzf")
end

return M
