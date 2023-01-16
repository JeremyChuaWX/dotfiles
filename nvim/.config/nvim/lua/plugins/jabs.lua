local function toggleJABS()
  local j = require("jabs")
  if j.main_buf then
    j.close()
  else
    j.open()
  end
end

local M = {
  "matbme/JABS.nvim",
  keys = {
    {
      "<leader>b",
      function()
        toggleJABS()
      end,
      desc = "toggle JABS window",
    },
  },
  opts = {
    position = { "center", "center" },
    border = "none",
    preview = {
      border = "none",
    },
  },
}

return M
