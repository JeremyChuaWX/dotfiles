local M = {
    "hrsh7th/nvim-cmp",
    event = { "InsertEnter", "CmdlineEnter" },
    dependencies = {
        "tzachar/fuzzy.nvim",
        "tzachar/cmp-fuzzy-buffer",
        "hrsh7th/cmp-path",
        "hrsh7th/cmp-cmdline",
        "saadparwaiz1/cmp_luasnip",
        "hrsh7th/cmp-nvim-lsp",
        "onsails/lspkind.nvim",
        "L3MON4D3/LuaSnip",
    },
}

M.config = function()
    local cmp = require("cmp")
    local luasnip = require("luasnip")
    local lspkind = require("lspkind")

    cmp.setup({
        confirmation = {
            default_behavior = "replace",
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
            }),
        },
        mapping = cmp.mapping.preset.insert({
            ["<C-b>"] = cmp.mapping.scroll_docs(-1),
            ["<C-f>"] = cmp.mapping.scroll_docs(1),
            ["<C-y>"] = cmp.mapping.complete(),
            ["<C-e>"] = cmp.mapping.abort(),
            ["<CR>"] = cmp.mapping.confirm({ select = true }),
        }),
        performance = {
            max_view_entries = 50,
        },
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
            { name = "fuzzy_buffer", keyword_length = 10 },
            { name = "path" },
        }),
    })

    cmp.setup.filetype({ "markdown", "text" }, {
        enabled = false,
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
            { name = "path" },
        }),
    })
end

return M
