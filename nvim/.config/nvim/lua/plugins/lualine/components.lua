local colors = require("plugins.lualine.theme").colors

return {
  mode = {
    "mode",
    padding = 0,
  },

  space = {
    function()
      return " "
    end,
    padding = 0,
  },

  diagnostics = {
    "diagnostics",
    padding = 0,
    sources = { "nvim_diagnostic" },
    sections = { "error", "warn" },
    update_in_insert = false,
    always_visible = true,
  },

  location = {
    "%l:%L",
    padding = 0,
  },

  filetype = {
    "filetype",
    padding = 0,
  },

  diff = {
    "diff",
    padding = 0,
    symbols = { added = " ", modified = "柳", removed = " " },
    diff_color = {
      added = { fg = colors.green },
      modified = { fg = colors.orange },
      removed = { fg = colors.red },
    },
  },

  branch = {
    "branch",
    padding = 0,
  },

  filename = {
    "filename",
    padding = 0,
    path = 3,
  },
}
