local M = {
    "mfussenegger/nvim-lint",
    config = function()
        require("lint").linters_by_ft = {
            javascript = { "eslint_d" },
            typescript = { "eslint_d" },
            javascriptreact = { "eslint_d" },
            typescriptreact = { "eslint_d" },
        }
        vim.api.nvim_create_autocmd({ "InsertLeave", "BufEnter", "TextChanged" }, {
            callback = function()
                require("lint").try_lint()
            end,
        })
        vim.api.nvim_create_user_command("LintInfo", function()
            local linters = require("lint").get_running()
            print("inspect: ", vim.inspect(linters))
            print("concat: ", table.concat(linters, ", "))
            vim.notify("linters: " .. table.concat(linters, ", "))
        end, {})
    end,
}

return M
