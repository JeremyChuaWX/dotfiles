return {
    on_attach = function(client, bufnr)
        require("lsp.server-config").on_attach(client, bufnr)

        local telescope_ok, telescope = pcall(require, "telescope")
        if telescope_ok then
            telescope.load_extension("tailiscope")
        end
    end,
}
