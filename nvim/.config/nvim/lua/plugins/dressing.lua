local M = {
  "stevearc/dressing.nvim",
  event = "VeryLazy",
  opts = {
    input = {
      insert_only = false,
      border = "solid",
      relative = "win",
      win_options = {
        winblend = 0,
      },
    },
    select = {
      enabled = true,
      backend = { "telescope" },
    },
  },
}

return M
