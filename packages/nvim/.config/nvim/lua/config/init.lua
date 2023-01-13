require("config.options")

vim.api.nvim_create_autocmd("User", {
  group = vim.api.nvim_create_augroup("user_config", { clear = true }),
  pattern = "VeryLazy",
  callback = function()
    require("config.keymaps")
    require("config.autocommands")
  end,
})

local colorscheme = "kanagawa"

local cs_ok, _ = pcall(vim.cmd.colorscheme, colorscheme)
if not cs_ok then
  vim.notify("colorscheme " .. colorscheme .. " not found!")
  return
end
