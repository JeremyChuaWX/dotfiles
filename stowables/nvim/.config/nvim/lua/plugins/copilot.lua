local copilot = {
    "zbirenbaum/copilot.lua",
    cmd = "Copilot",
    event = "InsertEnter",
    opts = {
        suggestion = { enabled = false },
        panel = { enabled = false },
    },
}

local copilot_cmp = {
    "zbirenbaum/copilot-cmp",
    main = "copilot_cmp",
    config = true,
}

local M = {
    copilot,
    copilot_cmp,
}

return M
