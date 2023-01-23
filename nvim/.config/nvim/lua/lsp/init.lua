local status_ok, _ = pcall(require, "lspconfig")
if not status_ok then
  return
end

require("lsp.diagnostics-config").setup()
require("lsp.extensions")
require("lsp.setup-servers")
