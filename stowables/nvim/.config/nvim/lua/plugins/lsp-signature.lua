local M = {
  "ray-x/lsp_signature.nvim",
  opts = {
    doc_lines = 0, -- will show two lines of comment/doc(if there are more than two lines in doc, will be truncated);
    floating_window = false, -- show hint in a floating window, set to false for virtual text only mode
    hint_prefix = "",
    hint_scheme = "Comment",
    extra_trigger_chars = { "(", "," }, -- Array of extra characters that will trigger signature completion, e.g., {"(", ","}
  },
}

return M
