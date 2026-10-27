-- rex config: https://www.superlogical.com/rex/docs/customize/config
-- apply changes with `rex config reload` (or cmd+r / prefix ctrl+r)
--
-- font, colours, cursor etc. are app settings, not part of this file

local prefix = "ctrl+space"

local function bind(key, action, args)
  rex.bind(prefix .. ">" .. key, action, args)
end

-- ghostty: super+r=reload_config
rex.bind("cmd+r", "client.config.reload")

-- colours: re-import the ghostty theme (from the command palette, "Import Ghostty Theme")
rex.action{
  name  = "import_ghostty_theme",
  title = "Import Ghostty Theme",
  run   = function(ctx, args)
    rex.client.queue("client.theme.import", {
      path = os.getenv("HOME") .. "/.config/ghostty/themes/theme",
    })
  end,
}

-- tmux: prefix C-Space, press twice to send it through
bind("ctrl+space", "pane.send_key", { key = "ctrl+space" })

bind("ctrl+r", "client.config.reload")

-- tmux windows -> rex tabs
bind("c", "client.tab.new")
bind(",", "client.tab.rename")
bind("p", "client.tab.previous")
bind("n", "client.tab.next")
bind("shift+,", "client.tab.move.backward") -- <
bind("shift+.", "client.tab.move.forward")  -- >
bind("shift+7", "client.tab.close")         -- & (no confirmation)
for i = 1, 9 do
  bind(tostring(i), "client.tab.goto", { index = i })
end

-- tmux sessions -> rex sessions
bind("shift+0", "session.previous") -- )
bind("shift+9", "session.next")     -- (
bind("shift+4", "session.rename")   -- $
bind("w", "session.switch")

-- panes
bind("v", "pane.split", { direction = "right" })
bind("s", "pane.split", { direction = "down" })
bind("h", "pane.focus.left")
bind("j", "pane.focus.down")
bind("k", "pane.focus.up")
bind("l", "pane.focus.right")
bind("o", "pane.focus_next")
bind("z", "pane.zoom")
bind("x", "pane.close") -- no confirmation
bind("space", "pane.balance")

-- tmux join-pane / break-pane
bind("shift+v", "pane.move_to_tab")
bind("shift+s", "pane.move_to_tab")
bind("shift+w", "pane.move_to_new_tab")
