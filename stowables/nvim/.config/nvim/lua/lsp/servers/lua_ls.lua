local M = {
    settings = {
        Lua = {
            workspace = {
                checkThirdParty = "Disable",
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
