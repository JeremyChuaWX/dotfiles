local M = {
    "lukas-reineke/indent-blankline.nvim",
    event = "VeryLazy",
}

M.config = function()
    require("indent_blankline").setup({
        char = "┃",
        show_current_context = true,
        show_first_indent_level = true,
        show_trailing_blackline_indent = false,
        filetype_exclude = {
            "NvimTree",
            "help",
            "neogit",
            "terminal",
            "lspinfo",
            "markdown",
            "txt",
            "git",
            "gitcommit",
            "TelescopePrompt",
            "", -- for buffers without a file type
        },
        buftype_exclude = {
            "terminal",
            "nofile",
        },
    })

    vim.api.nvim_set_hl(0, "IndentBlanklineChar", { fg = "#30303e" })
    vim.api.nvim_set_hl(0, "IndentBlanklineContextChar", { fg = "#ffbf00" })
end

return M
