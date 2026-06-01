return {
    "folke/todo-comments.nvim",
    config = function()
        require("todo-comments").setup({
            signs = false,
        })
        vim.keymap.set("n", "]t", function()
            require("todo-comments").jump_next()
        end, { desc = "next TODO comment" })
        vim.keymap.set("n", "[t", function()
            require("todo-comments").jump_prev()
        end, { desc = "next TODO comment" })
    end,
}
