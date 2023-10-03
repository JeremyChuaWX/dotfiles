local M = {
    settings = {
        Lua = {
            workspace = {
                checkThirdParty = false,
            },
            telemetry = {
                enable = false,
            },
            diagnostics = {
                disable = { "missing-fields" },
            },
        },
    },
}

return M
