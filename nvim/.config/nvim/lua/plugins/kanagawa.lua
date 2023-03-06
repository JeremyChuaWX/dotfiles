local M = {
  "rebelot/kanagawa.nvim",
}

M.config = function()
  local getOverrides = function(colors)
    local bg = colors.palette.sumiInk0
    local prompt_bg = colors.palette.sumiInk2
    local prompt_title_fg = colors.palette.sumiInk2
    local prompt_title_bg = colors.palette.autumnYellow

    return {
      TelescopeBorder = { bg = bg, fg = bg },
      TelescopeNormal = { bg = bg },
      TelescopePromptTitle = { bg = prompt_title_bg, fg = prompt_title_fg },
      TelescopePromptBorder = { bg = prompt_bg, fg = prompt_bg },
      TelescopePromptNormal = { bg = prompt_bg },
      TelescopePreviewTitle = { bg = bg, fg = bg },
      TelescopeResultsTitle = { bg = bg, fg = bg },
    }
  end

  require("kanagawa").setup({
    compile = true,
    globalStatus = true,
    overrides = getOverrides,
  })
end

return M
