return {
    on_attach = function(client, bufnr)
        require("telescope").load_extension("tailiscope")
    end,
}
