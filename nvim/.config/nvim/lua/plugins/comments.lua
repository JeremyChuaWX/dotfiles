local M = {
  "numToStr/Comment.nvim",
  event = "InsertEnter",
  dependencies = {
    "JoosepAlviste/nvim-ts-context-commentstring",
  },
}

M.config = function()
  local comment = require("Comment")
  local commentstring = require("ts_context_commentstring.integrations.comment_nvim")

  comment.setup({
    pre_hook = commentstring.create_pre_hook(),
  })
end

return M
