local M = {
    "echasnovski/mini.files",
    keys = {
        {
            "-",
            function()
                require("mini.files").open()
            end,
            desc = "mini-files open",
        },
    },
    version = false,
    config = true,
}

return M
