return {
  -- better vim.ui
  {
    "stevearc/dressing.nvim",
    event = "VeryLazy",
    opts = {
      input = {
        insert_only = false,
        border = "solid",
        relative = "win",
        win_options = {
          winblend = 0,
        },
      },
      select = {
        enabled = true,
        backend = { "telescope" },
      },
    },
  },

  -- bufferline
  {
    "akinsho/bufferline.nvim",
    event = "VeryLazy",
    branch = "main",
    dependencies = {
      "famiu/bufdelete.nvim",
    },
    keys = {
      { "L", ":BufferLineCycleNext<CR>" },
      { "H", ":BufferLineCyclePrev<CR>" },
      { "<leader>L", ":BufferLineMoveNext<CR>" },
      { "<leader>H", ":BufferLineMovePrev<CR>" },
    },
    opts = {
      options = {
        numbers = "none",
        diagnostics = "nvim_lsp",
        diagnostics_indicator = function(_, _, diagnostics_dict, _) -- count, level, diagnostics_dict, context
          local s = " "
          for e, n in pairs(diagnostics_dict) do
            local sym = e == "error" and " " or (e == "warning" and " " or "")
            s = s .. n .. sym
          end
          return s
        end,

        offsets = {
          {
            filetype = "NvimTree",
            text = "",
            text_align = "center",
          },
          {
            filetype = "Outline",
            text = "",
            text_align = "center",
          },
        },

        close_command = function(bufnr)
          require("bufdelete").bufdelete(bufnr, true)
        end,

        right_mouse_command = function(bufnr)
          require("bufdelete").bufdelete(bufnr, true)
        end,
      },
    },
  },

  -- statusline
  {
    "nvim-lualine/lualine.nvim",
    event = "VeryLazy",
    opts = function()
      local get_color = function(highlight_group, component)
        return string.format("%X", vim.api.nvim_get_hl_by_name(highlight_group, true)[component])
      end

      local colors = {
        bg = get_color("Normal", "background"),
        bg_light = get_color("CursorLine", "background"),
        fg = get_color("Normal", "foreground"),
        green = "#009900",
        orange = "#ff9900",
        red = "#e63900",
      }

      local theme = {
        normal = {
          a = { fg = colors.fg, bg = colors.bg },
          b = { fg = colors.fg, bg = colors.bg },
          c = { fg = colors.fg, bg = colors.bg },
          x = { fg = colors.fg, bg = colors.bg },
          y = { fg = colors.fg, bg = colors.bg },
          z = { fg = colors.fg, bg = colors.bg },
        },
        inactive = {
          a = { fg = colors.fg, bg = colors.bg },
          b = { fg = colors.fg, bg = colors.bg },
          c = { fg = colors.fg, bg = colors.bg },
          x = { fg = colors.fg, bg = colors.bg },
          y = { fg = colors.fg, bg = colors.bg },
          z = { fg = colors.fg, bg = colors.bg },
        },
      }

      local components = {
        mode = {
          "mode",
          padding = 0,
        },

        space = {
          function()
            return " "
          end,
          padding = 0,
        },

        diagnostics = {
          "diagnostics",
          padding = 0,
          sources = { "nvim_diagnostic" },
          sections = { "error", "warn" },
          update_in_insert = false,
          always_visible = true,
        },

        location = {
          "%l:%L",
          padding = 0,
        },

        filetype = {
          "filetype",
          padding = 0,
        },

        diff = {
          "diff",
          padding = 0,
          symbols = { added = " ", modified = "柳", removed = " " },
          diff_color = {
            added = { fg = colors.green },
            modified = { fg = colors.orange },
            removed = { fg = colors.red },
          },
        },

        branch = {
          "branch",
          padding = 0,
        },

        filename = {
          "filename",
          padding = 0,
          path = 3,
        },
      }

      local status_left = {
        components.space,

        components.mode,

        components.space,

        components.diagnostics,

        components.space,

        components.filename,
      }

      local status_right = {
        components.diff,
        components.space,

        components.branch,
        components.space,

        components.filetype,

        components.space,

        components.location,

        components.space,
      }

      return {
        options = {
          globalstatus = true,
          icons_enabled = true,
          theme = theme,
          component_separators = "",
          section_separators = "",
          always_divide_middle = true,
        },

        sections = {
          lualine_a = {},
          lualine_b = {},
          lualine_c = status_left,
          lualine_x = status_right,
          lualine_y = {},
          lualine_z = {},
        },

        inactive_sections = {
          lualine_a = {},
          lualine_b = {},
          lualine_c = {},
          lualine_x = {},
          lualine_y = {},
          lualine_z = {},
        },
      }
    end,
  },

  -- indent guides
  {
    "lukas-reineke/indent-blankline.nvim",
    event = "BufReadPre",
    config = function()
      require("indent_blankline").setup({
        char = "┃",
        show_current_context = true,
        show_first_indent_level = true,
        show_trailing_blackline_indent = false,
        filetype_exclude = {
          "NvimTree",
          "help",
          "neogit",
          "terminal",
          "lspinfo",
          "markdown",
          "txt",
          "git",
          "gitcommit",
          "TelescopePrompt",
          "", -- for buffers without a file type
        },
        buftype_exclude = {
          "terminal",
          "nofile",
        },
      })

      vim.api.nvim_set_hl(0, "IndentBlanklineChar", { fg = "#30303e" })
      vim.api.nvim_set_hl(0, "IndentBlanklineContextChar", { fg = "#ffbf00" })
    end,
  },

  -- colorizer
  {
    "NvChad/nvim-colorizer.lua",
    event = "BufReadPre",
    opts = {
      user_default_options = {
        names = false,
      },
    },
  },

  -- icons
  "kyazdani42/nvim-web-devicons",
}
