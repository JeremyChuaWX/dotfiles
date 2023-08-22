local M = {
    "JeremyChuaWX/lsp_signature.nvim",
    opts = {
        floating_window = false,
        hint_enable = true,
        hint_prefix = "",
        hint_scheme = "Comment",
        hint_inline = function()
            return false
        end,
    },
}

return M
