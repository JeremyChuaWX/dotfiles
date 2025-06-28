local function biome_config_available(ctx)
    return vim.fs.find(
        { ".biomerc.json", "biome.config.js", "biome.config.ts", "biome.toml" },
        { path = ctx.root, upward = true }
    ) ~= nil
end

return {
    "stevearc/conform.nvim",
    keys = {
        {
            "gf",
            function()
                require("conform").format()
            end,
            desc = "conform format",
        },
    },
    opts = {
        default_format_opts = {
            lsp_format = "fallback",
        },
        formatters = {
            forge_fmt = {
                command = "forge",
                args = { "fmt", "--raw", "-" },
                stdin = true,
            },
            prettier = {
                prepend_args = {
                    "--tab-width",
                    "4",
                    "--config-precedence",
                    "prefer-file",
                },
                condition = function(ctx)
                    return not biome_config_available(ctx)
                end,
            },
            stylua = {
                prepend_args = {
                    "--indent-type",
                    "Spaces",
                },
            },
            golines = {
                prepend_args = {
                    "-m",
                    "80",
                    "--base-formatter",
                    "gofumpt",
                    "--no-chain-split-dots",
                    "--no-reformat-tags",
                },
            },
            mdslw = {
                prepend_args = {
                    "--end-markers",
                    "",
                },
            },
            biome = {
                condition = biome_config_available,
            },
        },
        formatters_by_ft = {
            astro = { "prettier", "rustywind" },
            go = { "golines" },
            html = { "prettier", "rustywind" },
            javascript = { "biome", "prettier", "rustywind" },
            javascriptreact = { "biome", "prettier", "rustywind" },
            json = { "prettier" },
            jsonc = { "prettier" },
            lua = { "stylua" },
            markdown = { "markdownlint", "mdslw" },
            rust = { "rustfmt" },
            solidity = { "forge_fmt" },
            typescript = { "biome", "prettier", "rustywind" },
            typescriptreact = { "biome", "prettier", "rustywind" },
        },
    },
}
