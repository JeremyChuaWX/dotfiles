local M = {
  "j-hui/fidget.nvim",
  opts = {
    text = {
      spinner = "dots_negative",
      done = "✔",
    },
    sources = {
      ["null-ls"] = {
        ignore = true,
      },
    },
  },
}

return M
