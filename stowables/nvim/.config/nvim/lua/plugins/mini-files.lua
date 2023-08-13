local M = {
    "echasnovski/mini.files",
    keys = {
        {
            "-",
            function()
                if not require("mini.files").close() then
                    require("mini.files").open()
                end
            end,
            desc = "mini-files open",
        },
    },
    version = false,
    config = true,
}

return M
