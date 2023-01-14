local M = {
  "famiu/bufdelete.nvim",
}

M.config = function()
  vim.keymap.set("n", "<leader>d", function()
    require("bufdelete").bufdelete(0, true)
  end, {
    desc = "delete buffer",
  })
end

return M
