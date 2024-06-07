local augroup = vim.api.nvim_create_augroup("user_autocmds", { clear = true })

vim.api.nvim_create_autocmd("BufWinEnter", {
    group = augroup,
    desc = "Remove format options",
    callback = function()
        vim.opt.formatoptions:remove({ "c", "r", "o" })
    end,
})

vim.api.nvim_create_autocmd("TextYankPost", {
    group = augroup,
    desc = "Highlight text after yanking",
    callback = function()
        vim.highlight.on_yank({
            higroup = "Visual",
            timeout = 200,
        })
    end,
})

vim.api.nvim_create_autocmd({ "InsertLeave", "WinEnter" }, {
    group = augroup,
    pattern = "*",
    command = "set cursorline",
})

vim.api.nvim_create_autocmd({ "InsertEnter", "WinLeave" }, {
    group = augroup,
    pattern = "*",
    command = "set nocursorline",
})

local two = false
vim.api.nvim_create_user_command("ToggleIndent", function()
    if not two then
        vim.opt_local.shiftwidth = 2
        vim.opt_local.tabstop = 2
        vim.opt_local.softtabstop = 2
        vim.print("indent: 2")
    else
        vim.opt_local.shiftwidth = 4
        vim.opt_local.tabstop = 4
        vim.opt_local.softtabstop = 4
        vim.print("indent: 4")
    end
    two = not two
end, {})
