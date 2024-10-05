return {
    "mfussenegger/nvim-lint",
    config = function()
        require("lint").linters_by_ft = {
            go = { "golangcilint" },
            solidity = { "solhint" },
            javascript = { "eslint" },
            javascriptreact = { "eslint" },
            typescript = { "eslint" },
            typescriptreact = { "eslint" },
            markdown = { "markdownlint" },
        }
        vim.api.nvim_create_autocmd({ "BufWritePost", "BufEnter" }, {
            callback = function()
                require("lint").try_lint(nil, { ignore_errors = true })
            end,
        })
    end,
}
