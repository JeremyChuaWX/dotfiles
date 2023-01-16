local M = {
  "L3MON4D3/LuaSnip",
  dependencies = {
    "rafamadriz/friendly-snippets",
  },
}

M.config = function()
  local types = require("luasnip.util.types")
  local luasnip = require("luasnip")

  luasnip.config.set_config({
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

  require("luasnip.loaders.from_vscode").lazy_load()

  local set = vim.keymap.set

  set({ "i", "s" }, "<C-u>", function()
    if luasnip.choice_active() then
      luasnip.change_choice(1)
    end
  end)

  set({ "i", "s" }, "<C-k>", function()
    if luasnip.expand_or_jumpable() then
      luasnip.expand_or_jump()
    end
  end)

  set({ "i", "s" }, "<C-j>", function()
    if luasnip.jumpable(-1) then
      luasnip.jump(-1)
    end
  end)
end

return M
