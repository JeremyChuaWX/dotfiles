return {
    {
        "romus204/tree-sitter-manager.nvim",
        opts = {
            ensure_installed = {
                "diff",
                "dockerfile",
                "go",
                "java",
                "javascript",
                "json",
                "jsx",
                "lua",
                "markdown",
                "python",
                "tsx",
                "typescript",
            },
            auto_install = true,
            highlight = {},
        },
    },
    {
        "windwp/nvim-ts-autotag",
        config = true,
    },
    {
        "nvim-treesitter/nvim-treesitter-context",
        config = function()
            require("treesitter-context").setup({
                max_lines = 2,
            })
            vim.keymap.set("n", "[c", function()
                require("treesitter-context").go_to_context()
            end)
        end,
    },
}
