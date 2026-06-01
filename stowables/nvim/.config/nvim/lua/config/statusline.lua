function _G.UserStatusline()
    local branch = vim.b.gitsigns_head or ""
    local align = "%="
    local filename = "%F"
    local modified = "%m"
    local location = "%l:%L"
    local filetype = "%y"

    return string.format(" %s %s %s %s %s %s %s ", branch, align, filename, modified, align, filetype, location)
end

vim.opt.statusline = "%!v:lua.UserStatusline()"
