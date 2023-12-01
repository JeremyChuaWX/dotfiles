local M = {
    "nvim-treesitter/nvim-treesitter-context",
    config = function()
        require("treesitter-context").setup({
            max_lines = 2,
            trim_scope = "inner",
        })
        vim.keymap.set("n", "[c", function()
            require("treesitter-context").go_to_context()
        end)
    end,
}

return M
