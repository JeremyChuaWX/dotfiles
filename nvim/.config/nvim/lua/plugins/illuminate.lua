local M = {
  "RRethy/vim-illuminate",
}

M.config = function()
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
end

return M
