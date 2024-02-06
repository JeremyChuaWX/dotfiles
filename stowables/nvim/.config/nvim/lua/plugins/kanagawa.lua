local M = {
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
                StatusLine = { fg = theme.ui.fg, bg = theme.ui.bg },

                -- new treesitter highlight captures
                ["@string.regexp"] = { link = "@string.regex" },
                ["@variable.parameter"] = { link = "@parameter" },
                ["@exception"] = { link = "@exception" },
                ["@string.special.symbol"] = { link = "@symbol" },
                ["@markup.strong"] = { link = "@text.strong" },
                ["@markup.italic"] = { link = "@text.emphasis" },
                ["@markup.heading"] = { link = "@text.title" },
                ["@markup.raw"] = { link = "@text.literal" },
                ["@markup.quote"] = { link = "@text.quote" },
                ["@markup.math"] = { link = "@text.math" },
                ["@markup.environment"] = { link = "@text.environment" },
                ["@markup.environment.name"] = { link = "@text.environment.name" },
                ["@markup.link.url"] = { link = "Special" },
                ["@markup.link.label"] = { link = "Identifier" },
                ["@comment.note"] = { link = "@text.note" },
                ["@comment.warning"] = { link = "@text.warning" },
                ["@comment.danger"] = { link = "@text.danger" },
                ["@comment.todo"] = { link = "@text.todo" },
                ["@diff.plus"] = { link = "@text.diff.add" },
                ["@diff.minus"] = { link = "@text.diff.delete" },
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

return M
