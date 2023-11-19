local M = {
    "windwp/nvim-autopairs",
}

M.config = function()
    local npairs = require("nvim-autopairs")
    local cmp_autopairs = require("nvim-autopairs.completion.cmp")
    local cmp = require("cmp")

    npairs.setup({
        check_ts = true,
        diasble_filetype = {
            "TelescopePrompt",
            "guihua",
        },
    })

    cmp.event:on("confirm_done", cmp_autopairs.on_confirm_done())
end

return M
