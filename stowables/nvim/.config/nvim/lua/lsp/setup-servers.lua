local mason_lspconifg_ok, mason_lspconfig = pcall(require, "mason-lspconfig")
if not mason_lspconifg_ok then
    return
end

local get_server_opts = require("lsp.server-config").get_server_opts

local function default_setup_function(server_name)
    local opts = get_server_opts(server_name)
    require("lspconfig")[server_name].setup(opts)
end

mason_lspconfig.setup_handlers({
    default_setup_function,

    ["jdtls"] = function() end,

    ["rust_analyzer"] = function()
        vim.g.rustaceanvim = {
            server = {
                on_attach = require("lsp.server-config").on_attach,
                capabilities = require("lsp.server-config").capabilities,
                -- settings = {
                --     ["rust-analyzer"] = {
                --         check = {
                --             command = "clippy",
                --             extraArgs = { "--", "-W", "clippy::all" },
                --         },
                --     },
                -- },
            },
        }
    end,

    ["tsserver"] = function()
        require("typescript-tools").setup({
            on_attach = function(client, bufnr)
                require("lsp.server-config").on_attach(client, bufnr)
                -- require("workspace-diagnostics").populate_workspace_diagnostics(client, bufnr)
            end,
            capabilities = require("lsp.server-config").capabilities,
            settings = {
                expose_as_code_action = "all",
                tsserver_file_preferences = {
                    providePrefixAndSuffixTextForRename = false,
                },
            },
            handlers = {
                ["textDocument/publishDiagnostics"] = function(...)
                    require("ts-error-translator").translate_diagnostics(...)
                    vim.lsp.diagnostic.on_publish_diagnostics(...)
                end,
            },
        })
        require("tsc").setup({
            auto_focus_qflist = true,
        })
    end,
})
-- gleam

local config = require("lsp.server-config")
require("lspconfig").gleam.setup({
    on_attach = config.on_attach,
    capabilities = config.capabilities,
})
