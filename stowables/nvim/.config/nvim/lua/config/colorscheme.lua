return {
    set_cs = function(name)
        local cs_ok, _ = pcall(vim.cmd.colorscheme, name)
        if not cs_ok then
            vim.notify("colorscheme " .. name .. " not found!")
            return
        end
    end,
}
