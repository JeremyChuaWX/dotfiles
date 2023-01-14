local get_color = function(highlight_group, component)
  return string.format("%X", vim.api.nvim_get_hl_by_name(highlight_group, true)[component])
end

local colors = {
  bg = get_color("Normal", "background"),
  bg_light = get_color("CursorLine", "background"),
  fg = get_color("Normal", "foreground"),
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

return {
  colors = colors,
  theme = theme,
}
