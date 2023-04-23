return {
  settings = {
    ["rust-analyzer"] = {
      check = {
        command = "clippy",
        extraArgs = { "--workspace", "--", "-W", "clippy::all" },
      },
    },
  },
}
