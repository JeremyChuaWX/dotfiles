return {
  on_attach = function(client, bufnr)
    require("lsp.client-config").on_attach(client, bufnr)

    local document_color_ok, document_color = pcall(require, "document-color")
    if document_color_ok then
      document_color.buf_attach(bufnr)
    end

    local telescope_ok, telescope = pcall(require, "telescope")
    if telescope_ok then
      telescope.load_extension("tailiscope")
    end
  end,

  filetypes = { "javascriptreact", "typescriptreact", "html" },

  root_dir = require("lspconfig").util.root_pattern("tailwind.config.js", "tailwind.config.cjs", "tailwind.config.ts"),

  settings = {
    tailwindCSS = {
      validate = true,
      lint = {
        cssConflict = "warning",
        invalidApply = "error",
        invalidConfigPath = "error",
        invalidScreen = "error",
        invalidTailwindDirective = "error",
        invalidVariant = "error",
        recommendedVariantOrder = "warning",
      },
    },
  },
}
