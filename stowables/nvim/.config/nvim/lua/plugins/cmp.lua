return {
    "iguanacucumber/magazine.nvim",
    name = "nvim-cmp",
    event = { "InsertEnter", "CmdlineEnter" },
    dependencies = {
        "tzachar/fuzzy.nvim",
        "tzachar/cmp-fuzzy-buffer",
        "https://codeberg.org/FelipeLema/cmp-async-path",
        "saadparwaiz1/cmp_luasnip",
        "onsails/lspkind.nvim",
        "L3MON4D3/LuaSnip",
        { "iguanacucumber/mag-nvim-lsp", name = "cmp-nvim-lsp", opts = {} },
        { "iguanacucumber/mag-cmdline", name = "cmp-cmdline", commit = "bc85ff5" },
    },
    config = function()
        local cmp = require("cmp")
        local types = require("cmp.types")
        local luasnip = require("luasnip")
        local lspkind = require("lspkind")
        local tailwind_tools = require("tailwind-tools.cmp")

        cmp.setup({
            confirmation = {
                default_behavior = types.cmp.ConfirmBehavior.Replace,
            },
            formatting = {
                format = lspkind.cmp_format({
                    mode = "symbol_text",
                    menu = {
                        nvim_lsp = "[LSP]",
                        luasnip = "[snip]",
                        fuzzy_buffer = "[buf]",
                        path = "[path]",
                    },
                    symbol_map = { Copilot = "" },
                    before = tailwind_tools.lspkind_format,
                }),
            },
            mapping = cmp.mapping.preset.insert({
                ["<C-b>"] = cmp.mapping.scroll_docs(-1),
                ["<C-f>"] = cmp.mapping.scroll_docs(1),
                ["<C-y>"] = cmp.mapping.complete(),
                ["<C-e>"] = cmp.mapping.abort(),
                ["<CR>"] = cmp.mapping.confirm({ select = true }),
            }),
            snippet = {
                expand = function(args)
                    luasnip.lsp_expand(args.body)
                end,
            },
            sources = cmp.config.sources({
                {
                    name = "nvim_lsp",
                    entry_filter = function(entry)
                        return entry:get_kind() ~= cmp.lsp.CompletionItemKind.Text
                    end,
                },
                { name = "luasnip" },
            }, {
                { name = "async_path" },
            }),
        })

        cmp.setup.filetype({ "markdown", "text" }, {
            sources = cmp.config.sources({
                { name = "async_path" },
            }),
        })

        cmp.setup.cmdline({ "/", "?" }, {
            mapping = cmp.mapping.preset.cmdline(),
            sources = cmp.config.sources({
                { name = "fuzzy_buffer" },
            }),
        })

        cmp.setup.cmdline(":", {
            mapping = cmp.mapping.preset.cmdline(),
            sources = cmp.config.sources({
                { name = "cmdline" },
                { name = "async_path" },
            }),
        })
    end,
}
