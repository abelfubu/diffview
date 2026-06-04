---
"critique": patch
---

Fix scroll sync issues in Sidebar Navigator

- Prevent scrollbox from double-handling `j`/`k` keys by calling `key.preventDefault()`
- Fix top-edge rule for Current File tracking to use "largest y <= viewportTop" instead of min absolute distance
- Add cleanup for stale fileRefs on unmount
