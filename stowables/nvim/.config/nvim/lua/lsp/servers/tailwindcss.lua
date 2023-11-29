return {
    on_attach = function(client, bufnr)
        require("lsp.server-config").on_attach(client, bufnr)
        require("telescope").load_extension("tailiscope")
    end,
    root_dir = require("lspconfig.util").root_pattern(
        "tailwind.config.js",
        "tailwind.config.cjs",
        "tailwind.config.mjs",
        "tailwind.config.ts",
        "postcss.config.js",
        "postcss.config.cjs",
        "postcss.config.mjs",
        "postcss.config.ts"
    ),
}
