return {
    on_attach = function(client, bufnr)
        require("telescope").load_extension("tailiscope")
        require("tailwind-tools").setup({
            document_color = {
                kind = "background",
            },
        })
    end,
}
