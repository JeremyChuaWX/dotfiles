return {
    "saghen/blink.cmp",
    dependencies = {
        "rafamadriz/friendly-snippets",
    },
    version = "1.*",

    ---@module 'blink.cmp'
    ---@type blink.cmp.Config
    opts = {
        keymap = {
            preset = "none",
            ["<C-y>"] = { "show" },
            ["<C-e>"] = { "hide" },
            ["<C-b>"] = { "scroll_documentation_up" },
            ["<C-f>"] = { "scroll_documentation_down" },
            ["<C-p>"] = { "select_prev" },
            ["<C-n>"] = { "select_next" },
            ["<C-k>"] = { "snippet_backward" },
            ["<C-l>"] = { "snippet_forward" },
            ["<CR>"] = { "select_and_accept", "fallback" },
        },
        appearance = {
            nerd_font_variant = "mono",
        },
        completion = {
            documentation = {
                auto_show = false,
            },
        },
        sources = {
            default = { "lsp", "snippets", "path", "buffer" },
        },
        fuzzy = {
            implementation = "prefer_rust_with_warning",
        },
        cmdline = {
            keymap = {
                preset = "inherit",
                ["<CR>"] = { "accept_and_enter", "fallback" },
            },
            completion = {
                menu = {
                    auto_show = true,
                },
                list = {
                    selection = {
                        preselect = false,
                    },
                },
            },
        },
    },
    opts_extend = { "sources.default" },
}
