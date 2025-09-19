return {
    {
        "tronikelis/ts-autotag.nvim",
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
    {
        "nvim-treesitter/nvim-treesitter",
        branch = "main",
        build = ":TSUpdate",
        lazy = false,
        config = function()
            local treesitter = require("nvim-treesitter")
            treesitter.setup({
                auto_install = true,
                highlight = {
                    enable = true,
                    additional_vim_regex_highlighting = false,
                },
                indent = {
                    enable = true,
                },
            })
            treesitter.install({
                "diff",
                "dockerfile",
                "go",
                "javascript",
                "json",
                "jsx",
                "lua",
                "markdown",
                "python",
                "tsx",
                "typescript",
            })
        end,
    },
}
