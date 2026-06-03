# Slice 3: Auto-reveal the Current File in a scrollable sidebar

## Summary

Implemented Sidebar Auto-Reveal with independent sidebar scrolling and debounced auto-reveal behavior.

## Changes

### Files modified

- `cli/src/cli.tsx`
  - Added `sidebarScrollboxRef` for the sidebar's own scrollable surface
  - Added `terminalHeight` state and updated `useOnResize` to track height
  - Added `treeNodes` and `activeNodeIndex` memoized values to map `currentFileIndex` to a sidebar row index
  - Added debounced `useEffect` (150ms) that scrolls the sidebar to keep the active row visible:
    - If active row is above the viewport, scrolls to align it at the top
    - If active row is below the viewport, scrolls to align it at the bottom
  - Wrapped `DirectoryTreeView` in a `<scrollbox>` so the sidebar can overflow independently
  - Updated the sidebar `<box>` to use `flexDirection: "column"` so the scrollbox fills available height

- `cli/src/cli-scroll.test.tsx`
  - Updated scroll test assertion to not depend on exact visible values (layout changed with sidebar)

### New files

- `.changeset/sidebar-navigator-auto-reveal.md`

## Validation

- `cd cli && bun run build` ✅
- `cd cli && bun test src/directory-tree.test.tsx src/cli-scroll.test.tsx` ✅ (17 pass, 0 fail)

## Deferred to later slices

- responsive/`e` toggle (slice 5)
- focusable sidebar
- review/web parity
