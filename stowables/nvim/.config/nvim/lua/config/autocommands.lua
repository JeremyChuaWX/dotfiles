local augroup = vim.api.nvim_create_augroup("user_autocmds", { clear = true })

vim.api.nvim_create_autocmd("BufWinEnter", {
    group = augroup,
    desc = "Remove format options",
    callback = function()
        vim.opt.formatoptions:remove({ "c", "r", "o" })
    end,
})

vim.api.nvim_create_autocmd("TextYankPost", {
    group = augroup,
    desc = "Highlight text after yanking",
    callback = function()
        vim.highlight.on_yank({
            higroup = "Visual",
            timeout = 200,
        })
    end,
})

vim.api.nvim_create_autocmd({ "InsertLeave", "WinEnter" }, {
    group = augroup,
    pattern = "*",
    callback = function()
        vim.opt.cursorline = true
    end,
})

vim.api.nvim_create_autocmd({ "InsertEnter", "WinLeave" }, {
    group = augroup,
    pattern = "*",
    callback = function()
        vim.opt.cursorline = false
    end,
})

local two = false
vim.api.nvim_create_user_command("ToggleIndent", function()
    if not two then
        vim.opt_local.shiftwidth = 2
        vim.opt_local.tabstop = 2
        vim.opt_local.softtabstop = 2
        Snacks.notify("indent: 2")
    else
        vim.opt_local.shiftwidth = 4
        vim.opt_local.tabstop = 4
        vim.opt_local.softtabstop = 4
        Snacks.notify("indent: 4")
    end
    two = not two
end, {})

local progress = vim.defaulttable()
vim.api.nvim_create_autocmd("LspProgress", {
    callback = function(ev)
        local client = vim.lsp.get_client_by_id(ev.data.client_id)
        local value = ev.data.params.value
        if not client or type(value) ~= "table" then
            return
        end
        local p = progress[client.id]

        for i = 1, #p + 1 do
            if i == #p + 1 or p[i].token == ev.data.params.token then
                p[i] = {
                    token = ev.data.params.token,
                    msg = ("[%3d%%] %s%s"):format(
                        value.kind == "end" and 100 or value.percentage or 100,
                        value.title or "",
                        value.message and (" **%s**"):format(value.message) or ""
                    ),
                    done = value.kind == "end",
                }
                break
            end
        end

        local msg = {}
        progress[client.id] = vim.tbl_filter(function(v)
            return table.insert(msg, v.msg) or not v.done
        end, p)

        local spinner = { "⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏" }
        vim.notify(table.concat(msg, "\n"), vim.log.levels.INFO, {
            id = "lsp_progress",
            title = client.name,
            opts = function(notif)
                notif.icon = #progress[client.id] == 0 and " "
                    or spinner[math.floor(vim.uv.hrtime() / (1e6 * 80)) % #spinner + 1]
            end,
        })
    end,
})
