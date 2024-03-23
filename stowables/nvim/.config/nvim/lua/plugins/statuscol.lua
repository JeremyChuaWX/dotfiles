local M = {
    "luukvbaal/statuscol.nvim",
    config = function()
        local builtin = require("statuscol.builtin")
        require("statuscol").setup({
            relculright = true,
            segments = {
                {
                    text = { builtin.foldfunc, " " },
                    click = "v:lua.ScFa",
                },
                {
                    sign = { namespace = { "diagnostic" }, maxwidth = 1 },
                    click = "v:lua.ScSa",
                },
                {
                    text = { builtin.lnumfunc, " " },
                    click = "v:lua.ScLa",
                },
                {
                    sign = { namespace = { "gitsigns" }, colwidth = 1, wrap = true },
                    click = "v:lua.ScSa",
                },
            },
        })
    end,
}

return M
