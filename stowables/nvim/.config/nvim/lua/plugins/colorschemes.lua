local kanagawa = {
    "rebelot/kanagawa.nvim",
    config = function()
        local overrides = function(colors)
            local theme = colors.theme

            return {
                -- borderless telescope UI
                TelescopeTitle = { fg = theme.ui.special, bold = true },
                TelescopePromptNormal = { bg = theme.ui.bg_p1 },
                TelescopePromptBorder = { fg = theme.ui.bg_p1, bg = theme.ui.bg_p1 },
                TelescopeResultsNormal = { fg = theme.ui.fg_dim, bg = theme.ui.bg_m1 },
                TelescopeResultsBorder = { fg = theme.ui.bg_m1, bg = theme.ui.bg_m1 },
                TelescopePreviewNormal = { bg = theme.ui.bg_dim },
                TelescopePreviewBorder = { bg = theme.ui.bg_dim, fg = theme.ui.bg_dim },

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
