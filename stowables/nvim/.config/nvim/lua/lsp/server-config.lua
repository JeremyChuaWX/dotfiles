local M = {}

local telescope_pickers = require("telescope.builtin")

local set = function(mode, lhs, rhs, bufnr)
    vim.keymap.set(mode, lhs, rhs, { buffer = bufnr })
end

M.lsp_keymaps = function(bufnr)
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
            ignore_symbols = {
                "constant",
                "property",
                "variable",
            },
        })
    end, bufnr)
    set("n", "gl", vim.diagnostic.open_float, bufnr)
    set("n", "ga", vim.lsp.buf.code_action, bufnr)
    set("n", "gR", vim.lsp.buf.rename, bufnr)
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
