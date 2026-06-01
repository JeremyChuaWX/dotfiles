local kanagawa = {
    "rebelot/kanagawa.nvim",
    config = function()
        local overrides = function(colors)
            local theme = colors.theme

            return {
                -- borderless snacks picker UI
                SnacksPickerTitle = { fg = theme.ui.special, bold = true },
                SnacksPickerBorder = { fg = theme.ui.bg_m1, bg = theme.ui.bg_m1 },
                SnacksPickerBoxBorder = { fg = theme.ui.bg_m1, bg = theme.ui.bg_m1 },
                SnacksPickerInput = { bg = theme.ui.bg_p1 },
                SnacksPickerInputBorder = { fg = theme.ui.bg_p1, bg = theme.ui.bg_p1 },
                SnacksPickerInputTitle = { fg = theme.ui.special, bg = theme.ui.bg_p1, bold = true },
                SnacksPickerList = { fg = theme.ui.fg_dim, bg = theme.ui.bg_m1 },
                SnacksPickerListBorder = { fg = theme.ui.bg_m1, bg = theme.ui.bg_m1 },
                SnacksPickerListTitle = { fg = theme.ui.special, bg = theme.ui.bg_m1, bold = true },
                SnacksPickerPreview = { bg = theme.ui.bg_dim },
                SnacksPickerPreviewBorder = { fg = theme.ui.bg_dim, bg = theme.ui.bg_dim },
                SnacksPickerPreviewTitle = { fg = theme.ui.special, bg = theme.ui.bg_dim, bold = true },

                -- dark popup menu
                Pmenu = { fg = theme.ui.shade0, bg = theme.ui.bg_p1 },
                PmenuSel = { fg = "NONE", bg = theme.ui.bg_p2 },
                PmenuSbar = { bg = theme.ui.bg_m1 },
                PmenuThumb = { bg = theme.ui.bg_p2 },

                -- status line
                StatusLine = { fg = theme.ui.fg, bg = "none" },
                StatusLineNC = { fg = theme.ui.fg_dim, bg = "none" },

                -- window separator
                WinSeparator = { fg = theme.ui.special, bold = true },
            }
        end

        require("kanagawa").setup({
            compile = true,
            globalStatus = true,
            overrides = overrides,
            colors = {
                theme = {
                    all = {
                        ui = {
                            bg_gutter = "none",
                        },
                    },
                },
            },
        })
    end,
}

local M = {
    kanagawa,
}

return M
