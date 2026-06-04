# Slice 6 Fix: Remove visual focus indicator

## Changes

### cli/src/cli.tsx
- Kept `focusedPane` state and `Tab` key handler (for future slice 7)
- Removed border styling on sidebar box when focused
- Removed width adjustment for DirectoryTreeView when sidebar focused
- Removed border styling on diff wrapper box when focused
- Kept footer `tab focus` hint

### cli/src/cli-scroll.test.tsx
- Removed the tab focus test that asserted visual frame changes
- Added a comment noting that Tab focus switching is internal-only in v1

## Validation

- `cd cli && bun run build` ✅
- `cd cli && bun test src/directory-tree.test.tsx src/cli-scroll.test.tsx` ✅ (19 pass, 0 fail)

## Key behaviors

1. `Tab` still switches internal `focusedPane` state between `"diff"` and `"sidebar"`
2. No visual changes on screen — no borders, no layout shifts, no background tints
3. Sidebar width stays constant at `DEFAULT_SIDEBAR_WIDTH`
4. Footer still shows `tab focus` hint
