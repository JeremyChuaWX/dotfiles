return {
    {
        "nvim-treesitter/nvim-treesitter",
        branch = "main",
        config = function()
            ---@class Pair
            ---@field filetype string
            ---@field parser string

            local installed_parsers = require("nvim-treesitter").get_installed()

            ---@type table<string,Pair>
            local filetype_map = {
                javascriptreact = {
                    filetype = "javascriptreact",
                    parser = "jsx",
                },
                typescriptreact = {
                    filetype = "typescriptreact",
                    parser = "tsx",
                },
            }

            for _, parser in ipairs(installed_parsers) do
                local pair = filetype_map[parser]
                if pair == nil then
                    filetype_map[parser] = {
                        filetype = parser,
                        parser = parser,
                    }
                end
            end

            ---@type string[]
            local filetypes = vim.tbl_keys(filetype_map)

            vim.api.nvim_create_autocmd("FileType", {
                pattern = filetypes,
                callback = function(args)
                    local pair = filetype_map[args.match]
                    vim.treesitter.start(args.buf, pair.parser)
                end,
            })
        end,
    },
    {
        "lewis6991/ts-install.nvim",
        dependencies = {
            "nvim-treesitter/nvim-treesitter",
        },
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
