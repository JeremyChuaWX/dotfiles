-- TODO: transfer remaining telescope stuff
return {
    "ibhagwan/fzf-lua",
    dependencies = { "nvim-tree/nvim-web-devicons" },
    keys = {
        {
            "<leader>ff",
            function()
                require("fzf-lua").files()
            end,
            desc = "fzf-lua files",
        },
        {
            "<leader>fg",
            function()
                require("fzf-lua").grep_project()
            end,
            desc = "fzf-lua live grep",
        },
        {
            "<leader>fb",
            function()
                require("fzf-lua").buffers()
            end,
            desc = "fzf-lua buffers",
        },
    },
    opts = { "borderless" },
}
