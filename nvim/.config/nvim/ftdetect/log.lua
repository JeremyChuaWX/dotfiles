vim.api.nvim_create_autocmd({ "BufNewFile", "BufRead" }, {
  desc = "Set filetype for *.log files",
  pattern = "*.log",
  command = "setf log",
})
