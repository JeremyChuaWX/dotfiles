return {
    "folke/snacks.nvim",
    lazy = false,
    keys = {
        {
            "<leader>sn",
            function()
                Snacks.notifier.hide()
            end,
            desc = "Dismiss All Notifications",
        },
        {
            "<leader>w",
            function()
                Snacks.bufdelete()
            end,
            desc = "Delete Buffer",
        },
        {
            "<leader>sg",
            function()
                Snacks.gitbrowse()
            end,
            desc = "Git Browse",
        },
        {
            "]]",
            function()
                Snacks.words.jump(vim.v.count1, true)
            end,
            desc = "Next Reference",
        },
        {
            "[[",
            function()
                Snacks.words.jump(-vim.v.count1, true)
            end,
            desc = "Prev Reference",
        },
    },
    opts = {
        notifier = {
            timeout = 1500,
        },
        styles = {
            notification = {
                wo = { wrap = true },
            },
        },
    },
    config = function(opts)
        Snacks.setup(opts)

        -- lsp progress notification
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
    end,
}
