local function git_branch()
    local branch = vim.fn.system("git rev-parse --abbrev-ref HEAD 2>/dev/null | tr -d '\n'")
    if string.len(branch) > 0 then
        return branch
    else
        return ":"
    end
end

local function statusline()
    local branch = git_branch()
    local align = "%="
    local filename = "%F"
    local modified = "%m"
    local location = "%l:%L"
    local filetype = "%y"

    return string.format(" %s %s %s %s %s %s %s ", branch, align, filename, modified, align, filetype, location)
end

vim.opt.statusline = statusline()
