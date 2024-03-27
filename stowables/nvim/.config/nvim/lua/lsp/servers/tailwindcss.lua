return {
    on_attach = function(client, bufnr)
        require("telescope").load_extension("tailiscope")
        require("tailwind-tools").setup({
            document_color = {
                kind = "background",
            },
        })
    end,
    filetypes = {
        "astro",
        "astro-markdown",
        "gohtml",
        "gohtmltmpl",
        "handlebars",
        "html",
        "mdx",
        "css",
        "postcss",
        "sass",
        "scss",
        "javascriptreact",
        "typescriptreact",
        "vue",
        "svelte",
        "templ",
    },
}
