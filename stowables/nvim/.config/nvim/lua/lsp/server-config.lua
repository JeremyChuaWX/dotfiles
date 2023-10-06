local M = {}

local function format_buf(bufnr)
    local ft = vim.bo[bufnr].filetype
    local have_nls = #require("null-ls.sources").get_available(ft, "NULL_LS_FORMATTING") > 0

    vim.lsp.buf.format({
        bufnr = bufnr,
        filter = function(client)
            if have_nls then
                print("null-ls formatted")
                return client.name == "null-ls"
            end
            print("lsp formatted")
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

    set("n", "gr", function()
        require("telescope.builtin").lsp_references()
    end)

    set("n", "gd", function()
        require("telescope.builtin").lsp_definitions({
            jump_type = "never",
        })
    end)

    set("n", "gl", vim.diagnostic.open_float)
    set("n", "]d", vim.diagnostic.goto_next)
    set("n", "[d", vim.diagnostic.goto_prev)
    set("n", "ga", vim.lsp.buf.code_action)
    set("n", "K", vim.lsp.buf.hover)
    set("n", "gR", vim.lsp.buf.rename)

    set("n", "gf", function()
        format_buf(bufnr)
    end, { desc = "format buffer" })
end

M.on_attach = function(client, bufnr)
    lsp_keymaps(bufnr)

    vim.api.nvim_create_user_command("Format", function()
        print("lsp formatted")
        vim.lsp.buf.format({ bufnr = bufnr })
    end, {})
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
