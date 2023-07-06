local M = {
    colors = nil,
    theme = nil,
}

local get_color = function(highlight_group, component)
    local color = vim.api.nvim_get_hl(0, { name = highlight_group })[component] or nil

    if color then
        return string.format("%X", color)
    else
        return nil
    end
end

M.setup = function()
    local colors = {
        bg = get_color("Normal", "bg"),
        bg_light = get_color("CursorLine", "bg"),
        fg = get_color("Normal", "fg"),
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
