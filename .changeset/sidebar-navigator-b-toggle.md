---
"critique": minor
---

Add manual `b` toggle for sidebar visibility

- Press `b` to hide/show the Sidebar Navigator in the main diff TUI
- No responsive auto-hide; the user controls visibility manually
- Diff view mode recomputes from remaining width when toggled
- Manual visibility resets each run (not persisted)
- Footer now shows `b` sidebar hint alongside `p` files and `t` theme
