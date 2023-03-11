local M = {
  "ggandor/leap.nvim",
  event = "InsertEnter",
}

M.config = function()
  require("leap").add_default_mappings()
end

return M
