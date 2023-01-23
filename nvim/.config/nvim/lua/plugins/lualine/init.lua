local M = {
  "nvim-lualine/lualine.nvim",
  -- event = "VeryLazy",
  opts = function()
    require("plugins.lualine.theme").setup()
    local theme = require("plugins.lualine.theme").theme
    local components = require("plugins.lualine.components")

    local status_left = {
      components.space,
      components.mode,
      components.space,
      components.diagnostics,
      components.space,
      components.divider,
      components.filename,
    }

    local status_right = {
      components.diff,
      components.space,
      components.branch,
      components.space,
      components.filetype,
      components.space,
      components.location,
      components.space,
    }

    return {
      options = {
        globalstatus = true,
        theme = theme,
        component_separators = "",
        section_separators = "",
      },

      sections = {
        lualine_a = {},
        lualine_b = {},
        lualine_c = status_left,
        lualine_x = status_right,
        lualine_y = {},
        lualine_z = {},
      },

      inactive_sections = {
        lualine_a = {},
        lualine_b = {},
        lualine_c = {},
        lualine_x = {},
        lualine_y = {},
        lualine_z = {},
      },
    }
  end,
}

return M
