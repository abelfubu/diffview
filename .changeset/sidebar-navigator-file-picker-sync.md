---
"critique": patch
---

Sidebar Navigator: File Picker selection synchronizes with sidebar

- File Picker (`Ctrl+P`) selection scrolls to the chosen file and immediately updates the Current File highlight in the sidebar.
- Manual sidebar visibility is respected after file picker jumps (hidden sidebar stays hidden).
- Added integration test verifying file picker selection does not reopen a manually hidden sidebar.
