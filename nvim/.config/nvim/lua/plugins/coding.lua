return {
  -- snippets
  {
    "rafamadriz/friendly-snippets",
    config = function()
      require("luasnip.loaders.from_vscode").lazy_load()
    end,
  },
  {
    "L3MON4D3/LuaSnip",
    config = function()
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
    end,
  },

  -- auto-complete
  {
    "hrsh7th/nvim-cmp",
    dependencies = {
      "onsails/lspkind.nvim",
      "hrsh7th/cmp-buffer",
      "hrsh7th/cmp-path",
      "hrsh7th/cmp-cmdline",
      "saadparwaiz1/cmp_luasnip",
      "hrsh7th/cmp-nvim-lsp",
    },
    config = function()
      local cmp = require("cmp")
      local luasnip = require("luasnip")
      local lspkind = require("lspkind")

      cmp.setup({
        formatting = {
          format = lspkind.cmp_format({
            mode = "symbol_text",
            menu = {
              nvim_lsp = "[LSP]",
              luasnip = "[snip]",
              buffer = "[buf]",
              path = "[path]",
            },
          }),
        },
        snippet = {
          expand = function(args)
            luasnip.lsp_expand(args.body)
          end,
        },
        mapping = cmp.mapping.preset.insert({
          ["<C-b>"] = cmp.mapping.scroll_docs(-1),
          ["<C-f>"] = cmp.mapping.scroll_docs(1),
          ["<C-Space>"] = cmp.mapping.complete(),
          ["<C-e>"] = cmp.mapping.abort(),
          ["<CR>"] = cmp.mapping.confirm({
            select = true,
            behavior = "replace",
          }),
        }),
        sources = cmp.config.sources({
          { name = "nvim_lsp" },
          { name = "luasnip" },
          { name = "buffer" },
          { name = "path" },
        }),
      })

      cmp.setup.filetype({ "markdown", "text" }, {
        enabled = false,
      })

      cmp.setup.cmdline({ "/", "?" }, {
        mapping = cmp.mapping.preset.cmdline(),
        sources = cmp.config.sources({
          { name = "buffer" },
        }),
      })

      cmp.setup.cmdline(":", {
        mapping = cmp.mapping.preset.cmdline(),
        sources = cmp.config.sources({
          { name = "cmdline" },
          { name = "path" },
        }),
      })
    end,
  },

  -- auto pairs
  {
    "windwp/nvim-autopairs",
    config = function()
      local npairs = require("nvim-autopairs")
      local cmp_autopairs = require("nvim-autopairs.completion.cmp")
      local cmp = require("cmp")

      npairs.setup({
        check_ts = true,
        ts_config = {},
        diasble_filetype = {
          "TelescopePrompt",
          "guihua",
        },
      })

      cmp.event:on("confirm_done", cmp_autopairs.on_confirm_done())
    end,
  },

  -- surround
  {
    "kylechui/nvim-surround",
    config = function()
      require("nvim-surround").setup()
    end,
  },

  -- comments
  "JoosepAlviste/nvim-ts-context-commentstring",
  {
    "numToStr/Comment.nvim",
    config = function()
      local comment = require("Comment")
      local commentstring = require("ts_context_commentstring.integrations.comment_nvim")

      comment.setup({
        pre_hook = commentstring.create_pre_hook(),
      })
    end,
  },
}
