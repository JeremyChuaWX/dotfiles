local augroup = vim.api.nvim_create_augroup("user_autocmds", { clear = true })

-- format options
vim.api.nvim_create_autocmd("BufWinEnter", {
    group = augroup,
    desc = "Remove format options",
    callback = function()
        vim.opt.formatoptions:remove({ "c", "r", "o" })
    end,
})

-- highlight on yank
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

-- use q to quit
vim.api.nvim_create_autocmd("FileType", {
    group = augroup,
    pattern = { "help", "man" },
    desc = "Use q to close the window",
    command = "nnoremap <buffer> q <cmd>quit<cr>",
})

vim.api.nvim_create_autocmd("FileType", {
    group = augroup,
    pattern = { "log" },
    desc = "Use q to delete buffer",
    command = "nnoremap <buffer> q <cmd>bdelete<cr>",
})

-- disable cursorline on insert
vim.api.nvim_create_autocmd({ "InsertLeave", "WinEnter" }, {
    pattern = "*",
    command = "set cursorline",
    group = augroup,
})

vim.api.nvim_create_autocmd(
    { "InsertEnter", "WinLeave" },
    { pattern = "*", command = "set nocursorline", group = augroup }
)
