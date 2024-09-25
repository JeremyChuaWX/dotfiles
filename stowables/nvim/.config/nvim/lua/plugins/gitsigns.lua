return {
    "lewis6991/gitsigns.nvim",
    opts = {
        on_attach = function(bufnr)
            local gitsigns = require("gitsigns")

            local function map(mode, l, r, opts)
                opts = opts or {}
                opts.buffer = bufnr
                vim.keymap.set(mode, l, r, opts)
            end

            map("n", "]g", function()
                if vim.wo.diff then
                    vim.cmd.normal({ "]g", bang = true })
                else
                    gitsigns.nav_hunk("next")
                end
            end, { desc = "gitsigns next hunk" })

            map("n", "[g", function()
                if vim.wo.diff then
                    vim.cmd.normal({ "]g", bang = true })
                else
                    gitsigns.nav_hunk("prev")
                end
            end, { desc = "gitsigns prev hunk" })

            map("n", "<leader>gp", gitsigns.preview_hunk, { desc = "gitsigns preview hunk" })
            map("n", "<leader>gs", gitsigns.stage_hunk, { desc = "gitsigns stage hunk" })
            map("v", "<leader>gs", function()
                gitsigns.stage_hunk({ vim.fn.line("."), vim.fn.line("v") })
            end, { desc = "visual gitsigns stage hunk" })
            map("n", "<leader>gS", gitsigns.stage_buffer, { desc = "gitsigns stage buffer" })
            map("n", "<leader>gr", gitsigns.reset_hunk, { desc = "gitsigns reset hunk" })
            map("v", "<leader>gr", function()
                gitsigns.reset_hunk({ vim.fn.line("."), vim.fn.line("v") })
            end, { desc = "visual gitsigns stage hunk" })
            map("n", "<leader>gR", gitsigns.reset_buffer, { desc = "gitsigns reset buffer" })
        end,
        preview_config = {
            border = "single",
            style = "minimal",
        },
    },
}
