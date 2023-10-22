local M = {
    "nvim-treesitter/nvim-treesitter",
    build = ":TSUpdate",
    dependencies = {
        "nvim-treesitter/nvim-treesitter-textobjects",
    },
}

M.config = function()
    local ts_move_keys = {
        f = { query = "@function.outer", desc = "goto function" },
        a = { query = "@attribute.inner", desc = "goto attribute" },
        c = { query = "@class.outer", desc = "goto class" },
        x = { query = "@comment.outer", desc = "goto comment" },
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
        ensure_installed = "all",
        ignore_install = { "phpdoc", "beancount" },
        highlight = {
            enable = true,
            additional_vim_regex_highlighting = false,
        },
        indent = {
            enable = true,
        },
        autopairs = {
            enable = true,
        },
        autotag = {
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
            swap = {
                enable = true,
                swap_next = {
                    ["<leader>s"] = "@parameter.inner",
                },
                swap_previous = {
                    ["<leader>S"] = "@parameter.inner",
                },
            },
            select = {
                enable = true,
                lookahead = true,
                keymaps = {
                    ["af"] = "@function.outer",
                    ["if"] = "@function.inner",
                },
            },
        },
    })
end

return M
