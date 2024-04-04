local M = {
    "ThePrimeagen/harpoon",
    branch = "harpoon2",
    config = function()
        local harpoon = require("harpoon")
        harpoon:setup({
            settings = {
                save_on_toggle = true,
                sync_on_ui_close = true,
            },
        })
        vim.keymap.set("n", "<leader>hh", function()
            harpoon.ui:toggle_quick_menu(harpoon:list())
        end)
        vim.keymap.set("n", "<leader>ha", function()
            harpoon:list():add()
        end)
        for i = 1, 9 do
            vim.keymap.set("n", "<leader>h" .. i, function()
                harpoon:list():select(i)
            end)
        end
    end,
}

return M
