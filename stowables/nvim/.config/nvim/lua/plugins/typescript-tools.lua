return {
    "pmizio/typescript-tools.nvim",
    ft = { "typescript", "typescriptreact", "javascript", "javascriptreact" },
    dependencies = {
        "dmmulroy/ts-error-translator.nvim",
    },
    opts = {
        capabilities = vim.lsp.config["*"].capabilities,
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
    },
}
