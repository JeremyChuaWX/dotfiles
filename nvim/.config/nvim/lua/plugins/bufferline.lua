local M = {
  "akinsho/bufferline.nvim",
  event = "VeryLazy",
  branch = "main",
}

M.config = function()
  require("bufferline").setup({
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
  })

  vim.keymap.set("n", "L", ":BufferLineCycleNext<CR>")
  vim.keymap.set("n", "H", ":BufferLineCyclePrev<CR>")
  vim.keymap.set("n", "<leader>L", ":BufferLineMoveNext<CR>")
  vim.keymap.set("n", "<leader>H", ":BufferLineMovePrev<CR>")
end

return M
