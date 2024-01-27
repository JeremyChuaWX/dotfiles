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

    ["rust_analyzer"] = function() end,

    ["tsserver"] = function()
        require("typescript-tools").setup({
            on_attach = require("lsp.server-config").on_attach,
            capabilities = require("lsp.server-config").capabilities,
            settings = {
                tsserver_file_preferences = {
                    providePrefixAndSuffixTextForRename = false,
                    includeInlayParameterNameHints = "all",
                    includeInlayParameterNameHintsWhenArgumentMatchesName = true,
                    includeInlayFunctionParameterTypeHints = true,
                    includeInlayVariableTypeHints = true,
                    includeInlayVariableTypeHintsWhenTypeMatchesName = true,
                    includeInlayPropertyDeclarationTypeHints = true,
                    includeInlayFunctionLikeReturnTypeHints = true,
                    includeInlayEnumMemberValueHints = true,
                },
            },
        })
        require("tsc").setup({
            auto_open_qflist = false,
            auto_close_qflist = true,
        })
    end,
})
