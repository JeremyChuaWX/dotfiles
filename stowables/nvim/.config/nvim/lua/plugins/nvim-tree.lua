local M = {
    "nvim-tree/nvim-tree.lua",
    keys = {
        { "<leader>e", "<cmd>NvimTreeToggle<CR>", desc = "nvim-tree" },
    },
    opts = {
        renderer = {
            add_trailing = true,
            icons = {
                git_placement = "signcolumn",
            },
        },
        diagnostics = {
            enable = true,
            show_on_open_dirs = false,
        },
        git = {
            show_on_open_dirs = false,
        },
        modified = {
            enable = true,
            show_on_open_dirs = false,
        },
    },
}

return M
