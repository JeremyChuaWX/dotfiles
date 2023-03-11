local status_ok, fidget = pcall(require, "fidget")
if not status_ok then
  return
end

fidget.setup({
  text = {
    spinner = "dots_negative", -- animation shown when tasks are ongoing
    done = "✔", -- character shown when all tasks are complete
  },
  sources = {
    ["null-ls"] = {
      ignore = true,
    },
  },
})
