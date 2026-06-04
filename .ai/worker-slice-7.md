# Slice 7: Add focus-sensitive `j/k` + live coupling

## Summary

Implemented focus-sensitive `j/k` keyboard navigation and live coupling between sidebar Focused Row and Current File.

## Changes

### Files modified

- `cli/src/cli.tsx`
  - Added `fileNodeIndices` and `activeFileNodePosition` memoized values for sidebar file navigation.
  - Added `j`/`k` keyboard handling with focus-sensitive behavior:
    - When sidebar is focused: `j` moves to next file, `k` moves to previous file.
    - When diff pane is focused: `j`/`k` scroll the document by one step.
  - Sidebar file navigation immediately updates `currentFileIndex` and calls `scrollToFile` for live coupling.
  - Existing `g`, `G`, `Ctrl+D`, `Ctrl+U` scroll behavior preserved.

- `cli/src/cli-scroll.test.tsx`
  - Added test: "navigates files with j/k when sidebar is focused"
  - Added test: "scrolls diff with j/k when diff pane is focused"
  - Added test: "file picker works after tab focus switch"

### New files

- `.changeset/sidebar-navigator-focus-sensitive-jk.md`

## Validation

- `cd cli && bun run build` ✅
- `cd cli && bun test src/directory-tree.test.tsx src/cli-scroll.test.tsx` ✅ (22 pass, 0 fail)

## Key behaviors

1. **Sidebar focused + `j`/`k`**: navigates to next/previous file in Tree Order, immediately updates Current File, and scrolls diff to match.
2. **Diff focused + `j`/`k`**: scrolls the Continuous Diff Document line-by-line.
3. **Live coupling**: Focused Row and Current File are always the same; no pending selection state.
4. **File Picker** (`p` / `Ctrl+P`) works from both focus contexts.
5. **No visual focus indicator**: `Tab` switches internal focus state only (no border/layout jitter).

## Acceptance criteria verification

- [x] `j/k` in sidebar moves the Focused Row and updates Current File immediately.
- [x] `j/k` in diff pane scrolls the document.
- [x] Focused Row and Current File are always the same (no pending selection state).
- [x] `Ctrl+P` File Picker continues to work from both focus contexts.
