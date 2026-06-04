# Slice 6: Add `Tab` focus switching + visual focus indicator

## Summary

Implemented `Tab` key focus switching between diff pane and sidebar with visual border indicators.

## Changes

### Files modified

- `cli/src/cli.tsx`
  - Added `focusedPane` state (`"diff" | "sidebar"`, default: `"diff"`)
  - Added `tab` key handler in `useKeyboard` to toggle `focusedPane`
  - Added conditional border rendering on the focused pane:
    - Sidebar box gets border when `focusedPane === "sidebar"`
    - Diff wrapper box gets border when `focusedPane === "diff"`
  - Adjusted `DirectoryTreeView` width when sidebar is focused (`60 - 2 = 58`)
  - Updated footer to show `tab focus` hint

- `cli/src/cli-scroll.test.tsx`
  - Fixed existing test assertions to account for diff pane border in default state
  - Added new test: "toggles focus between diff and sidebar with tab key"
    - Verifies visual state changes when pressing `tab`
    - Asserts frames differ after each focus toggle

### New files

- `.changeset/sidebar-navigator-tab-focus.md`

## Validation

- `cd cli && bun run build` ✅
- `cd cli && bun test src/directory-tree.test.tsx src/cli-scroll.test.tsx` ✅ (20 pass, 0 fail)

## Key behaviors

1. **`tab` key** cycles focus between diff pane and sidebar
2. **Visual indicator**: focused pane renders a single-line border in the theme's text color
3. **Diff pane always receives keyboard scroll events**: `j/k`, `Ctrl+D/U`, `gg`, `G` always scroll the diff document regardless of visual focus state
4. **Sidebar remains passive**: no row selection or movement behavior yet
5. **Footer hint**: shows `tab focus` alongside existing hints

## Deferred

- Slice 7: focus-sensitive `j/k` + live coupling (when sidebar focused, `j/k` moves Focused Row)
- Review/web parity
