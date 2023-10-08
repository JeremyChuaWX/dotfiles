local M = {
    "kevinhwang91/nvim-ufo",
    dependencies = {
        "kevinhwang91/promise-async",
        "luukvbaal/statuscol.nvim",
    },
}

M.config = function()
    vim.keymap.set("n", "zR", function()
        require("ufo").openAllFolds()
    end)

    vim.keymap.set("n", "zM", function()
        require("ufo").closeAllFolds()
    end)

    require("ufo").setup({
        provider_selector = function(bufnr, filetype, buftype)
            return { "treesitter", "indent" }
        end,
    })
end

return M
