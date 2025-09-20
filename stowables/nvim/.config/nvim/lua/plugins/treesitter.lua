return {
    {
        "nvim-treesitter/nvim-treesitter",
        branch = "main",
        init = function()
            vim.g.loaded_nvim_treesitter = 1
        end,
    },
    {
        "lewis6991/ts-install.nvim",
        opts = {
            ensure_install = {
                "diff",
                "dockerfile",
                "go",
                "javascript",
                "json",
                "jsonc",
                "jsx",
                "lua",
                "markdown",
                "python",
                "tsx",
                "typescript",
            },
            auto_install = true,
            install_dir = vim.fn.stdpath("data") .. "/site",
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
