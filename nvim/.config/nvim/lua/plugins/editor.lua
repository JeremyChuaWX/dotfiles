return {
  -- file explorer
  {
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
  },

  -- fuzzy finder
  "DanielVolchek/tailiscope.nvim",
  {
    "nvim-telescope/telescope.nvim",
    dependencies = {
      { "nvim-telescope/telescope-fzf-native.nvim", build = "make" },
    },
    cmd = "Telescope",
    keys = {
      { "tt", ":Telescope<CR>", desc = "telescope main menu" },
      {
        "tf",
        function()
          require("telescope.builtin").find_files()
        end,
        desc = "telescope find files",
      },
      {
        "tF",
        function()
          require("telescope.builtin").git_files()
        end,
        desc = "telescope find in git files",
      },
      {
        "tg",
        function()
          require("telescope.builtin").live_grep()
        end,
        desc = "telescope live grep",
      },
      {
        "th",
        function()
          require("telescope.builtin").help_tags()
        end,
        desc = "telescope help tags",
      },
      {
        "tB",
        function()
          require("telescope.builtin").current_buffer_fuzzy_find()
        end,
        desc = "telescope fuzzy find current buffer",
      },
      {
        "tb",
        function()
          require("telescope.builtin").buffers(require("telescope.themes").get_dropdown({ previewer = false }))
        end,
        desc = "telescope buffers",
      },
      {
        "td",
        function()
          require("telescope.builtin").diagnostics()
        end,
        desc = "telescope diagnostics",
      },
    },
    config = function()
      local telescope = require("telescope")

      telescope.setup({
        defaults = {
          layout_config = {
            prompt_position = "top",
            horizontal = {
              preview_width = 0.55,
              results_width = 0.8,
            },
            vertical = {
              mirror = false,
            },
            width = 0.80,
            height = 0.85,
          },

          mappings = {
            i = {
              ["<esc>"] = "close",
              ["<Tab>"] = "move_selection_next",
              ["<S-Tab>"] = "move_selection_previous",
            },
            n = {
              ["<esc>"] = "close",
              ["<Tab>"] = "move_selection_next",
              ["<S-Tab>"] = "move_selection_previous",
            },
          },

          file_ignore_patterns = {
            "node_modules",
            ".git/",
          },

          initial_mode = "insert",
          results_title = false,
          prompt_title = false,
          sorting_strategy = "ascending",
          prompt_prefix = " ",
          path_display = { "truncate" },
          file_sorter = require("telescope.sorters").get_fuzzy_file,
          generic_sorter = require("telescope.sorters").get_generic_fuzzy_sorter,
          selection_caret = "  ",
          entry_prefix = "  ",
        },

        extensions = {
          fzf = {
            fuzzy = true, -- false will only do exact matching
            override_generic_sorter = true, -- override the generic sorter
            override_file_sorter = true, -- override the file sorter
            case_mode = "smart_case", -- or "ignore_case" or "respect_case", default is "smart_case"
          },
          tailiscope = {
            register = '"',
            default = "classes",
          },
        },
      })

      telescope.load_extension("fzf")
    end,
  },

  -- leaping through files
  {
    "ggandor/leap.nvim",
    config = function()
      require("leap").add_default_mappings()
    end,
  },

  -- git signs
  {
    "lewis6991/gitsigns.nvim",
    opts = {
      signs = {
        add = { hl = "GitSignsAdd", text = "│", numhl = "GitSignsAddNr", linehl = "GitSignsAddLn" },
        change = { hl = "GitSignsChange", text = "│", numhl = "GitSignsChangeNr", linehl = "GitSignsChangeLn" },
        delete = { hl = "GitSignsDelete", text = "_", numhl = "GitSignsDeleteNr", linehl = "GitSignsDeleteLn" },
        topdelete = { hl = "GitSignsDelete", text = "‾", numhl = "GitSignsDeleteNr", linehl = "GitSignsDeleteLn" },
        changedelete = { hl = "GitSignsChange", text = "~", numhl = "GitSignsChangeNr", linehl = "GitSignsChangeLn" },
      },
      on_attach = function(bufnr)
        local gs = package.loaded.gitsigns

        local function map(mode, l, r, opts)
          opts = opts or {}
          opts.buffer = bufnr
          vim.keymap.set(mode, l, r, opts)
        end

        -- Navigation
        map("n", "]g", function()
          if vim.wo.diff then
            return "]g"
          end
          vim.schedule(function()
            gs.next_hunk()
          end)
          return "<Ignore>"
        end, { desc = "gitsigns next hunk", expr = true })

        map("n", "[g", function()
          if vim.wo.diff then
            return "[g"
          end
          vim.schedule(function()
            gs.prev_hunk()
          end)
          return "<Ignore>"
        end, { desc = "gitsigns prev hunk", expr = true })

        -- Actions
        map("n", "gip", gs.preview_hunk, { desc = "gitsigns preview hunk" })
        map("n", "gis", gs.stage_hunk, { desc = "gitsigns stage hunk" })
        map("n", "giS", gs.stage_buffer, { desc = "gitsigns stage buffer" })
        map("n", "gir", gs.reset_hunk, { desc = "gitsigns reset hunk" })
        map("n", "giR", gs.reset_buffer, { desc = "gitsigns reset buffer" })
      end,
    },
  },

  -- references
  {
    "RRethy/vim-illuminate",
    config = function()
      vim.keymap.set("n", "'", function()
        require("illuminate").goto_next_reference()
      end, {
        desc = "next reference",
      })
      vim.keymap.set("n", '"', function()
        require("illuminate").goto_prev_reference()
      end, {
        desc = "prev reference",
      })
    end,
  },

  -- buffer delete
  {
    "famiu/bufdelete.nvim",
    config = function()
      vim.keymap.set("n", "<leader>d", function()
        require("bufdelete").bufdelete(0, true)
      end, {
        desc = "delete buffer",
      })
    end,
  },

  -- smaller view
  {
    "shortcuts/no-neck-pain.nvim",
    keys = { "<leader>n" },
    opts = {
      width = 120,
      toggleMapping = "<leader>n",
    },
  },
}
