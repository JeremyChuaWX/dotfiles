return {
    "nvim-treesitter/nvim-treesitter-context",
    config = function()
        require("treesitter-context").setup({
            max_lines = 2,
        })
        vim.keymap.set("n", "[c", function()
            require("treesitter-context").go_to_context()
        end)
    end,
}
