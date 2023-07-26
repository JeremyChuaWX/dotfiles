local lspconfig_ok, lspconfig = pcall(require, "lspconfig")
if not lspconfig_ok then
    return
end

local mason_lspconifg_ok, mason_lspconfig = pcall(require, "mason-lspconfig")
if not mason_lspconifg_ok then
    return
end

local get_server_opts = require("lsp.server-config").get_server_opts

local function default_setup_function(server_name)
    local opts = get_server_opts(server_name)
    lspconfig[server_name].setup(opts)
end

mason_lspconfig.setup_handlers({
    default_setup_function,

    ["jdtls"] = function() end,

    ["denols"] = function() end,

    ["tsserver"] = function()
        local ts_tools_ok, ts_tools = pcall(require, "typescript-tools")
        if ts_tools_ok then
            ts_tools.setup({
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
        end
    end,

    ["rust_analyzer"] = function()
        local opts = get_server_opts("rust_analyzer")

        local rust_tools_ok, rust_tools = pcall(require, "rust-tools")
        if rust_tools_ok then
            rust_tools.setup({
                server = opts,
                tools = {
                    inlay_hints = {
                        max_len_align = true,
                    },
                },
            })
        end
    end,
})
