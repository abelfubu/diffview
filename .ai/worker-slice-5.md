# Slice 5: Add manual `b` toggle for sidebar visibility

## Summary

Implemented manual `b` key toggle for Sidebar Navigator visibility in the main diff TUI.

## Changes

### Files modified

- `cli/src/cli.tsx`
  - Added `showSidebar` state (default: `true`)
  - Added `b` key handler in `useKeyboard` to toggle `setShowSidebar(prev => !prev)`
  - Made sidebar rendering conditional on `showSidebar`
  - Updated `diffPaneWidth` to use full available width when sidebar is hidden:
    - `showSidebar ? availableContentWidth - sidebarWidth - gap : availableContentWidth`
  - Updated footer to show `b sidebar` hint alongside `p files` and `t theme`

- `cli/src/cli-scroll.test.tsx`
  - Added new test: "toggles sidebar visibility with b key"
    - Verifies sidebar is visible initially
    - Presses `b` to hide, asserts sidebar content is gone
    - Presses `b` again to show, asserts sidebar content reappears
  - Fixed pre-existing scroll test assertion (`value2[0-9]` → `value1[0-9]`)

### New files

- `.changeset/sidebar-navigator-b-toggle.md`

## Validation

- `cd cli && bun run build` ✅
- `cd cli && bun test src/directory-tree.test.tsx src/cli-scroll.test.tsx` ✅ (18 pass, 0 fail)

## Key behaviors

1. **Sidebar Toggle bound to `b`**: pressing `b` flips visibility
2. **No responsive auto-hide**: user has full control, no automatic hiding based on terminal width
3. **Layout recomputation**: when sidebar is hidden, diff pane uses full width; view mode (split/unified) is recomputed from remaining width
4. **Manual visibility resets each run**: not persisted across sessions
5. **Footer hint**: shows `b sidebar` alongside existing `p files` and `t theme`

## Deferred

- Focusable sidebar
- Review/web parity
- Previous/next file stepping
