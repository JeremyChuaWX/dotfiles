local M = {
    "luukvbaal/statuscol.nvim",
}

M.config = function()
    local builtin = require("statuscol.builtin")
    require("statuscol").setup({
        relculright = true,
        segments = {
            { text = { builtin.foldfunc, " " }, click = "v:lua.ScFa" },
            {
                sign = { name = { "Diagnostic" }, maxwidth = 1 },
                click = "v:lua.ScSa",
            },
            { text = { builtin.lnumfunc, " " }, click = "v:lua.ScLa" },
            {
                sign = { name = { ".*" }, maxwidth = 2, colwidth = 1, wrap = true },
                click = "v:lua.ScSa",
            },
        },
    })
end

return M
