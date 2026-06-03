# Slice 4: Make file jumps synchronize cleanly with the sidebar

## Summary

Verified and enhanced file picker synchronization with the Sidebar Navigator in the main diff TUI.

## What was already in place from earlier slices

- `handleFileSelect` in `cli/src/cli.tsx` already calls `setCurrentFileIndex(index)` to immediately sync the active file highlight when a file is selected from the File Picker.
- `scrollToFile(index)` aligns the chosen file header to the top of the viewport.
- `handleFileSelect` does not touch `showSidebar` state, so manual sidebar visibility is already respected.

## Changes made

### Files modified

- `cli/src/cli-scroll.test.tsx`
  - Added new test: "does not reopen sidebar when file picker selects a file"
    - Hides sidebar with `b`
    - Opens file picker with `p`
    - Selects a file with `return`
    - Asserts sidebar stays hidden and dropdown closes

### New files

- `.changeset/sidebar-navigator-file-picker-sync.md`

## Validation

- `cd cli && bun run build` ✅
- `cd cli && bun test src/directory-tree.test.tsx src/cli-scroll.test.tsx` ✅ (19 pass, 0 fail)

## Acceptance criteria verification

- [x] File Picker selection scrolls the chosen file header to the top of the viewport. (via `scrollToFile`)
- [x] File Picker selection updates Current File and sidebar highlight. (via `setCurrentFileIndex`)
- [x] Selecting a file does not auto-reopen a manually hidden sidebar. (verified by new test)
- [x] The File Picker continues to appear as the existing top overlay. (unchanged)

## Deferred

- Focusable sidebar / `Tab` switching
- Review/web parity
