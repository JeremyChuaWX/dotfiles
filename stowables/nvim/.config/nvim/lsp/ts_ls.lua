return {
    init_options = {
        preferences = {
            preferTypeOnlyAutoImports = true,
            providePrefixAndSuffixTextForRename = false,
        },
    },
    handlers = {
        ["textDocument/publishDiagnostics"] = function(...)
            require("ts-error-translator").translate_diagnostics(...)
            vim.lsp.diagnostic.on_publish_diagnostics(...)
        end,
    },
}
