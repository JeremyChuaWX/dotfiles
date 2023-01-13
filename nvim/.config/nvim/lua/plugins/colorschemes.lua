return {
  {
    "rebelot/kanagawa.nvim",
    lazy = true,
    config = function()
      local default_colors = require("kanagawa.colors").setup()
      local bg = default_colors.sumiInk0
      local prompt_bg = default_colors.sumiInk2
      local prompt_title_fg = default_colors.sumiInk2
      local prompt_title_bg = default_colors.autumnYellow

      local overrides = {
        TelescopeBorder = { bg = bg, fg = bg },
        TelescopeNormal = { bg = bg },
        TelescopePromptTitle = { bg = prompt_title_bg, fg = prompt_title_fg },
        TelescopePromptBorder = { bg = prompt_bg, fg = prompt_bg },
        TelescopePromptNormal = { bg = prompt_bg },
        TelescopePreviewTitle = { bg = bg, fg = bg },
        TelescopeResultsTitle = { bg = bg, fg = bg },
      }

      require("kanagawa").setup({
        globalStatus = true,
        overrides = overrides,
      })
    end,
  },
}
