vim.api.nvim_create_autocmd({ "BufNewFile", "BufRead" }, {
    desc = "Set filetype for *.sol files",
    pattern = "*.sol",
    command = "setf solidity",
})
