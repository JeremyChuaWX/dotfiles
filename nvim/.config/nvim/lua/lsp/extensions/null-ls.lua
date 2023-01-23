local status_ok, null_ls = pcall(require, "null-ls")
if not status_ok then
  return
end

local formatting = null_ls.builtins.formatting
local diagnostics = null_ls.builtins.diagnostics
local actions = null_ls.builtins.code_actions

null_ls.setup({
  debug = false,
  diagnostics_format = "[#{c}] #{m} (#{s})",
  update_in_insert = true,
  on_attach = require("lsp.client-config").on_attach,
  sources = {
    actions.gitsigns,

    formatting.prettierd,
    formatting.rustywind,
    formatting.google_java_format,
    formatting.rustfmt,
    formatting.gofumpt,
    formatting.stylua.with({
      extra_args = {
        "--indent-type",
        "Spaces",
        "--indent-width",
        "2",
      },
    }),
    formatting.beautysh.with({
      extra_args = {
        "--indent-size",
        "2",
      },
    }),

    diagnostics.actionlint,
    diagnostics.markdownlint,
  },
})
