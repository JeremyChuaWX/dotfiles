return {
    "nvim-treesitter/nvim-treesitter",
    build = ":TSUpdate",
    dependencies = {
        "nvim-treesitter/nvim-treesitter-textobjects",
    },
    config = function()
        local ts_move_keys = {
            f = { query = "@function.outer", desc = "goto function" },
        }

        local ts_goto_next_start = {}
        local ts_goto_next_end = {}
        local ts_goto_previous_start = {}
        local ts_goto_previous_end = {}

        for k, v in pairs(ts_move_keys) do
            ts_goto_next_start["]" .. k] = v
            ts_goto_next_end["]" .. string.upper(k)] = v
            ts_goto_previous_start["[" .. k] = v
            ts_goto_previous_end["[" .. string.upper(k)] = v
        end

        require("nvim-treesitter.configs").setup({
            ensure_installed = {
                "diff",
                "go",
                "javascript",
                "json",
                "lua",
                "markdown",
                "python",
                "typescript",
                "dockerfile",
            },
            auto_install = true,
            highlight = {
                enable = true,
                additional_vim_regex_highlighting = false,
            },
            indent = {
                enable = true,
            },
            textobjects = {
                move = {
                    enable = true,
                    set_jumps = true,
                    goto_next_start = ts_goto_next_start,
                    goto_next_end = ts_goto_next_end,
                    goto_previous_start = ts_goto_previous_start,
                    goto_previous_end = ts_goto_previous_end,
                },
                select = {
                    enable = true,
                    lookahead = true,
                    include_surrounding_whitespace = true,
                    keymaps = {
                        ["af"] = "@function.outer",
                        ["if"] = "@function.inner",
                    },
                },
            },
        })
    end,
}
