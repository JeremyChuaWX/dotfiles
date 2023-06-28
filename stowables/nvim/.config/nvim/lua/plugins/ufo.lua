local M = {
    "kevinhwang91/nvim-ufo",
    event = "BufReadPost",
    dependencies = {
        "kevinhwang91/promise-async",
        "luukvbaal/statuscol.nvim",
    },
}

M.config = function()
    vim.o.foldcolumn = "1"
    vim.o.foldlevel = 99
    vim.o.foldlevelstart = 99
    vim.o.foldenable = true
    vim.opt.fillchars:append("fold: ,foldsep: ,foldopen:,foldclose:")

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
