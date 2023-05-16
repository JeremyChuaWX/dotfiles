local M = {}

local function format_buf(bufnr)
    local ft = vim.bo[bufnr].filetype
    local have_nls = #require("null-ls.sources").get_available(ft, "NULL_LS_FORMATTING") > 0

    vim.lsp.buf.format({
        bufnr = bufnr,
        filter = function(client)
            if have_nls then
                return client.name == "null-ls"
            end
            return client.name ~= "null-ls"
        end,
    })
end

local function lsp_keymaps(bufnr)
    local set = function(mode, lhs, rhs, opts)
        local final_opts = opts or {}
        final_opts = vim.tbl_deep_extend("keep", { buffer = bufnr }, final_opts)
        vim.keymap.set(mode, lhs, rhs, final_opts)
    end

    if vim.fn.exists(":Telescope") then
        set("n", "gr", "<cmd>Telescope lsp_references<CR>")

        set("n", "gd", function()
            require("telescope.builtin").lsp_definitions({
                jump_type = "never",
            })
        end)
    else
        set("n", "gr", "<cmd>lua vim.lsp.buf.references()<CR>")
        set("n", "gd", "<cmd>lua vim.lsp.buf.definition()<CR>")
    end

    set("n", "gl", "<cmd>lua vim.diagnostic.open_float()<CR>")
    set("n", "]d", "<cmd>lua vim.diagnostic.goto_next()<CR>")
    set("n", "[d", "<cmd>lua vim.diagnostic.goto_prev()<CR>")
    set("n", "ga", "<cmd>lua vim.lsp.buf.code_action()<CR>")
    set("n", "K", "<cmd>lua vim.lsp.buf.hover()<CR>")
    set("n", "gR", "<cmd>lua vim.lsp.buf.rename()<CR>")

    set("n", "gf", function()
        format_buf(bufnr)
    end, { desc = "format buffer" })
end

M.on_attach = function(client, bufnr)
    lsp_keymaps(bufnr)
end

M.capabilities = require("cmp_nvim_lsp").default_capabilities()

M.get_server_opts = function(server_name)
    local opts = {
        on_attach = M.on_attach,
        capabilities = M.capabilities,
    }
    local server_opts = require("lsp.servers")[server_name] or {}

    return vim.tbl_deep_extend("keep", server_opts, opts)
end

return M
