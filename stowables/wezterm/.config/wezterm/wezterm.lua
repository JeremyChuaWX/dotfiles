local wezterm = require("wezterm")
local config = wezterm.config_builder()

config.font_size = 18.0
config.font = wezterm.font_with_fallback({ "JetBrainsMono Nerd Font Mono" })
config.harfbuzz_features = { "calt=0", "clig=0", "liga=0" }

config.colors = {
    foreground = "#B3B1AD",
    background = "#0A0E14",

    ansi = {
        "#01060E",
        "#EA6C73",
        "#91B362",
        "#F9AF4F",
        "#53BDFA",
        "#FAE994",
        "#90E1C6",
        "#C7C7C7",
    },
    brights = {
        "#686868",
        "#F07178",
        "#C2D94C",
        "#FFB454",
        "#59C2FF",
        "#FFEE99",
        "#95E6CB",
        "#FFFFFF",
    },
}

return config
