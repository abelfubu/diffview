---
"critique": minor
---

Add `o` key to open current file in $EDITOR

- Press `o` to open the currently selected file in your `$EDITOR`
- Uses `renderer.suspend()` / `renderer.resume()` to properly hand over the terminal
- Falls back to `vi` if `$EDITOR` is not set
- Supports editors with arguments (e.g. `code --wait`)
