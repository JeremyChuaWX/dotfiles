return {
    "mfussenegger/nvim-lint",
    config = function()
        require("lint").linters_by_ft = {
            go = { "golangcilint" },
            solidity = { "solhint" },
            javascript = { "eslint", "biomejs" },
            javascriptreact = { "eslint", "biomejs" },
            typescript = { "eslint", "biomejs" },
            typescriptreact = { "eslint", "biomejs" },
        }
        vim.api.nvim_create_autocmd({ "BufWritePost", "BufEnter" }, {
            callback = function()
                require("lint").try_lint(nil, { ignore_errors = true })
            end,
        })
    end,
}
