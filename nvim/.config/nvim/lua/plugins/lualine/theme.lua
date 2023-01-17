local M = {
  colors = nil,
  theme = nil,
}

M.get_color = function(highlight_group, component)
  local color = vim.api.nvim_get_hl_by_name(highlight_group, true)[component] or nil

  if color then
    return string.format("%X", color)
  else
    return nil
  end
end

M.setup = function()
  local colors = {
    bg = M.get_color("Normal", "background"),
    bg_light = M.get_color("CursorLine", "background"),
    fg = M.get_color("Normal", "foreground"),
    green = "#009900",
    orange = "#ff9900",
    red = "#e63900",
  }

  local theme = {
    normal = {
      a = { fg = colors.fg, bg = colors.bg },
      b = { fg = colors.fg, bg = colors.bg },
      c = { fg = colors.fg, bg = colors.bg },
      x = { fg = colors.fg, bg = colors.bg },
      y = { fg = colors.fg, bg = colors.bg },
      z = { fg = colors.fg, bg = colors.bg },
    },
    inactive = {
      a = { fg = colors.fg, bg = colors.bg },
      b = { fg = colors.fg, bg = colors.bg },
      c = { fg = colors.fg, bg = colors.bg },
      x = { fg = colors.fg, bg = colors.bg },
      y = { fg = colors.fg, bg = colors.bg },
      z = { fg = colors.fg, bg = colors.bg },
    },
  }

  M.colors = colors
  M.theme = theme
end

return M
