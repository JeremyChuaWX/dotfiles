local M = {}

local telescope_pickers = require("telescope.builtin")

local set = function(mode, lhs, rhs, bufnr)
    vim.keymap.set(mode, lhs, rhs, { buffer = bufnr })
end

M.on_attach = function(client, bufnr)
    -- keymaps
    set("n", "gr", function()
        telescope_pickers.lsp_references({
            jump_type = "never",
        })
    end, bufnr)
    set("n", "gd", function()
        telescope_pickers.lsp_definitions({
            jump_type = "never",
        })
    end, bufnr)
    set("n", "gs", function()
        telescope_pickers.lsp_document_symbols({
            symbols = {
                "object",
                "function",
            },
        })
    end, bufnr)
    set("n", "gl", vim.diagnostic.open_float, bufnr)
    set("n", "]d", vim.diagnostic.goto_next, bufnr)
    set("n", "[d", vim.diagnostic.goto_prev, bufnr)
    set("n", "ga", vim.lsp.buf.code_action, bufnr)
    set("n", "K", vim.lsp.buf.hover, bufnr)
    set("n", "gR", vim.lsp.buf.rename, bufnr)

    -- inlay hints
    if client.server_capabilities.inlayHintProvider then
        vim.lsp.inlay_hint.enable(bufnr, true)
    end
end

M.capabilities = require("cmp_nvim_lsp").default_capabilities()

M.get_server_opts = function(server_name)
    local opts = {
        capabilities = M.capabilities,
    }
    local ok, server_opts = pcall(require, "lsp.servers." .. server_name)
    if ok then
        return vim.tbl_deep_extend("keep", server_opts, opts)
    else
        return opts
    end
end

return M
