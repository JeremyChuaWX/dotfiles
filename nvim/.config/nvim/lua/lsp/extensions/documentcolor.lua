local document_color_ok, document_color = pcall(require, "document-color")
if not document_color_ok then
  return
end

document_color.setup({
  mode = "background",
})
