---
"critique": minor
---

Add focus-sensitive `j/k` navigation and live coupling in the sidebar navigator (slice 7).

- When sidebar is focused (via `Tab`), `j`/`k` move between files in the sidebar tree.
- Focused Row immediately becomes the Current File, scrolling the diff to match.
- When diff pane is focused, `j`/`k` scroll the document line-by-line.
- `Ctrl+P` File Picker continues to work from both focus contexts.
