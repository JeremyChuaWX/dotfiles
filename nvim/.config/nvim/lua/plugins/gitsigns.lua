local M = {
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
}

return M
