local M = {
    "L3MON4D3/LuaSnip",
    dependencies = {
        "rafamadriz/friendly-snippets",
    },
    version = "v2.1.1",
    build = "make install_jsregexp",
    config = function()
        local types = require("luasnip.util.types")
        local luasnip = require("luasnip")
        local snippets_folder = vim.fn.stdpath("config") .. "/lua/snippets/"

        require("luasnip.loaders.from_vscode").lazy_load()
        require("luasnip.loaders.from_lua").lazy_load({ paths = snippets_folder })

        luasnip.setup({
            ext_opts = {
                [types.choiceNode] = {
                    active = {
                        virt_text = { { "● - choice node", "ErrorMsg" } },
                    },
                },
                [types.snippet] = {
                    active = {
                        virt_text = { { " - snippet active", "Comment" } },
                    },
                },
            },
        })

        vim.keymap.set({ "i", "s" }, "<C-u>", function()
            if luasnip.choice_active() then
                luasnip.change_choice(1)
            end
        end)

        vim.keymap.set({ "i", "s" }, "<C-k>", function()
            luasnip.expand()
        end)

        vim.keymap.set({ "i", "s" }, "<C-j>", function()
            if luasnip.jumpable(-1) then
                luasnip.jump(-1)
            end
        end)

        vim.keymap.set({ "i", "s" }, "<C-l>", function()
            if luasnip.jumpable(1) then
                luasnip.jump(1)
            end
        end)
    end,
}

return M
