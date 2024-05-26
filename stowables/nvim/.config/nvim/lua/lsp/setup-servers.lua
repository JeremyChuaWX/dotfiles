local lspconfig = require("lspconfig")
local mason_lspconfig = require("mason-lspconfig")
local server_config = require("lsp.server-config")
local lsp_signature = require("lsp_signature")

local augroup = vim.api.nvim_create_augroup("user_lsp_autocmds", { clear = true })
vim.api.nvim_create_autocmd("LspAttach", {
    group = augroup,
    callback = function(args)
        local bufnr = args.buf
        local client = vim.lsp.get_client_by_id(args.data.client_id)
        if client == nil then
            return
        end

        server_config.lsp_keymaps(bufnr)

        lsp_signature.on_attach({
            floating_window = false,
            hint_enable = true,
            hint_prefix = "",
            hint_scheme = "Comment",
        }, bufnr)
    end,
})

mason_lspconfig.setup_handlers({
    function(server_name)
        local opts = server_config.get_server_opts(server_name)
        lspconfig[server_name].setup(opts)
    end,

    ["jdtls"] = function() end,

    ["rust_analyzer"] = function()
        vim.g.rustaceanvim = {
            server = {
                capabilities = server_config.capabilities,
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
            capabilities = server_config.capabilities,
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
lspconfig.gleam.setup({
    capabilities = server_config.capabilities,
})
