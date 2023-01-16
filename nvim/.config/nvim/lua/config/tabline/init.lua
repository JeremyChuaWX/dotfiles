local M = {}

M.separator = function(index)
  return (index < vim.fn.tabpagenr("$") and "%#TabLine#" or "")
end

M.cell = function(index)
  local isSelected = vim.fn.tabpagenr() == index
  local hl = (isSelected and "%#TabLineSel#" or "%#TabLine#")

  return hl .. "%" .. index .. "T" .. " " .. index .. " " .. "%T" .. M.separator(index)
end

M.tabline = function()
  local line = "%="
  for i = 1, vim.fn.tabpagenr("$"), 1 do
    line = line .. M.cell(i)
  end
  line = line .. "%#TabLineFill#"
  if vim.fn.tabpagenr("$") > 1 then
    line = line .. "%#TabLine#%999XX"
  end
  return line
end

M.setup = function()
  vim.opt.tabline = "%!v:lua.require'config.tabline'.tabline()"
end

return M
