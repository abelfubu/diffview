Implemented slice 1: render the Sidebar Navigator as a left pane in the main diff TUI.

Changed files:
- cli/src/cli.tsx
- cli/src/components/directory-tree-view.tsx
- cli/src/components/index.ts
- cli/src/cli-scroll.test.tsx
- cli/src/directory-tree.test.tsx
- .changeset/sidebar-navigator-left-pane.md

Behavior implemented:
- Replaced the old top-of-document tree in the main diff TUI with a persistent left Sidebar Navigator and right Continuous Diff Document.
- Kept Tree Order and Compressed Tree Path behavior by continuing to use the existing directory tree builder.
- Kept sidebar row content as path + status color + diff stats.
- Added fixed-width sidebar rendering (~60 cols) with filename-preserving truncation in DirectoryTreeView.
- Kept the existing File Picker logic untouched; no sidebar focus, current-file highlighting, auto-reveal, responsive hide/show, or review/web parity work was added.
- Updated diff view-mode width calculation in the main TUI to use the remaining right-pane width after reserving sidebar space.

Validation:
- `bun install` ✅ (repo had no local install yet)
- `bun run build:comments-server` ✅ (needed so `@critique.work/server` exists for cli type-checking)
- `cd cli && bun run build` ✅
- `cd cli && bun test src/directory-tree.test.tsx src/cli-scroll.test.tsx` ✅

Deferred to later slices:
- Current File tracking/highlighting
- Sidebar auto-reveal / independent sidebar scrolling behavior
- Responsive sidebar hide/show and `e` toggle
- Focusable sidebar / keyboard selection in sidebar
- Review mode and web parity
