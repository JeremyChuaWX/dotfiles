local M = {
  "kyazdani42/nvim-tree.lua",
  keys = {
    { "<leader>e", ":NvimTreeToggle<CR>" },
  },
  opts = {
    renderer = {
      add_trailing = true,
      icons = {
        webdev_colors = true,
        git_placement = "signcolumn",
      },
    },
    filters = {
      custom = { "^\\.git$", "^node_modules$", "^\\.DS_Store" },
    },
    git = {
      show_on_open_dirs = false,
    },
    modified = {
      enable = true,
      show_on_open_dirs = false,
    },
    actions = {
      change_dir = {
        enable = true,
        global = false,
        restrict_above_cwd = false,
      },
    },
  },
}

return M
