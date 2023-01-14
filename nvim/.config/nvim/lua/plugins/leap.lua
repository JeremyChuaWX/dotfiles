local M = {
  "ggandor/leap.nvim",
}

M.config = function()
  require("leap").add_default_mappings()
end

return M
