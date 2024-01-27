local M = {
    "mrcjkb/rustaceanvim",
    version = "^4",
    ft = { "rust" },
    config = function()
        vim.g.rustaceanvim = {
            server = {
                on_attach = require("lsp.server-config").on_attach,
                capabilities = require("lsp.server-config").capabilities,
                settings = require("lsp.servers.rust_analyzer").settings,
            },
        }
    end,
}

return M
