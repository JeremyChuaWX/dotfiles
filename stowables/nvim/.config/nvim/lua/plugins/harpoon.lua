local M = {
    "ThePrimeagen/harpoon",
    keys = {
        {
            "<leader>ha",
            function()
                require("harpoon.mark").add_file()
                print("harpoon marked this file!")
            end,
            desc = "harpoon add file",
        },
        {
            "<leader>hh",
            function()
                require("harpoon.ui").toggle_quick_menu()
            end,
            desc = "harpoon toggle menu",
        },
        {
            "<leader>hj",
            function()
                require("harpoon.ui").nav_next()
            end,
            desc = "harpoon next",
        },
        {
            "<leader>hk",
            function()
                require("harpoon.ui").nav_prev()
            end,
            desc = "harpoon prev",
        },
        {
            "<leader>1",
            function()
                require("harpoon.ui").nav_file(1)
            end,
            desc = "harpoon navigate file 1",
        },
        {
            "<leader>2",
            function()
                require("harpoon.ui").nav_file(2)
            end,
            desc = "harpoon navigate file 2",
        },
        {
            "<leader>3",
            function()
                require("harpoon.ui").nav_file(3)
            end,
            desc = "harpoon navigate file 3",
        },
        {
            "<leader>4",
            function()
                require("harpoon.ui").nav_file(4)
            end,
            desc = "harpoon navigate file 4",
        },
    },
}

return M
