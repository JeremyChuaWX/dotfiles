local lspconfig_ok, lspconfig = pcall(require, "lspconfig")
if not lspconfig_ok then
  return
end

local mason_ok, mason = pcall(require, "mason")
if not mason_ok then
  return
end

local mason_lspconifg_ok, mason_lspconfig = pcall(require, "mason-lspconfig")
if not mason_lspconifg_ok then
  return
end

local mason_tool_installer_ok, mason_tool_installer = pcall(require, "mason-tool-installer")
if not mason_tool_installer_ok then
  return
end

local ENSURE_INSTALLED_LSP = {
  "sumneko_lua",
  "tsserver",
  "jsonls",
  "jdtls",
  "tailwindcss",
  "prismals",
  "rust_analyzer",
  "gopls",
}

local ENSURE_INSTALLED_TOOLS = {
  "prettierd",
  "stylua",
  "actionlint",
  "markdownlint",
  "beautysh",
  "rustfmt",
  "gofumpt",
  "rustywind",
}

mason.setup()

mason_lspconfig.setup({
  ensure_installed = ENSURE_INSTALLED_LSP,
})

mason_tool_installer.setup({
  ensure_installed = ENSURE_INSTALLED_TOOLS,
})

local get_server_opts = require("lsp.client-config").get_server_opts

local function default_setup_function(server_name)
  local opts = get_server_opts(server_name)
  lspconfig[server_name].setup(opts)
end

mason_lspconfig.setup_handlers({
  default_setup_function,

  ["jdtls"] = function() end,

  ["tsserver"] = function()
    local opts = get_server_opts("tsserver")

    local typescript_ok, typescript = pcall(require, "typescript")
    if typescript_ok then
      typescript.setup({
        server = opts,
      })
    end
  end,

  ["rust_analyzer"] = function()
    local opts = get_server_opts("rust_analyzer")

    local rust_tools_ok, rust_tools = pcall(require, "rust-tools")
    if rust_tools_ok then
      rust_tools.setup({
        server = opts,
      })
    end
  end,
})
