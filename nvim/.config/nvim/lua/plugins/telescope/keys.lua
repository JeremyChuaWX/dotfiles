return {
  { "tt", ":Telescope<CR>", desc = "telescope main menu" },
  {
    "tf",
    function()
      require("telescope.builtin").find_files()
    end,
    desc = "telescope find files",
  },
  {
    "tF",
    function()
      require("telescope.builtin").git_files()
    end,
    desc = "telescope find in git files",
  },
  {
    "tg",
    function()
      require("telescope.builtin").live_grep()
    end,
    desc = "telescope live grep",
  },
  {
    "th",
    function()
      require("telescope.builtin").help_tags()
    end,
    desc = "telescope help tags",
  },
  {
    "tb",
    function()
      require("telescope.builtin").current_buffer_fuzzy_find()
    end,
    desc = "telescope fuzzy find current buffer",
  },
  {
    "td",
    function()
      require("telescope.builtin").diagnostics()
    end,
    desc = "telescope diagnostics",
  },
}
