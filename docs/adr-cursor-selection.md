# ADR: Keyboard Cursor and Selection in the Diff Pane

## Status
Accepted / Implemented

## Context
`dv` is a keyboard-driven TUI diff viewer. Users review agent-generated changes file-by-file and often want to quote a specific block of code back to the agent. Today they can select text with the mouse, but there is no keyboard-driven way to mark a range of lines and copy them in a format ready to paste into an agent prompt.

## Decision
Add a vim-style line cursor to the diff pane:

- The cursor line appears when the diff pane is focused and disappears when focus moves to the sidebar or a dropdown.
- `j`/`k` move the cursor up/down one logical diff line and auto-scroll the viewport.
- `v` starts a line selection anchored at the cursor; moving the cursor extends the selection.
- `q`, `Esc`, and `Tab` stop the selection. When a selection is active they do **not** exit the app; when no selection is active `q`/`Esc` behave as before.
- `y` copies the file path/filename and the selected **new content** (context + added lines, skipping removed lines) as a fenced markdown code block.

## Consequences
- Users can quickly quote code from a diff without reaching for the mouse.
- Line-level selection is simple and matches the existing `highlightLines` API of the underlying `DiffRenderable`.
- Wrapped display lines are treated as one logical line during selection, which is acceptable for the target workflow.
- Folder view is left in plain scroll mode; cursor/selection only works when a single file is rendered.

## Domain glossary additions

**Cursor line**  
The currently highlighted logical line in the diff pane. Visible only when the diff pane has focus.

**Selection anchor**  
The logical line where a selection started (set by `v`). The selection extends from the anchor to the current cursor line.

**New content**  
The code as it will exist after the change: context lines and added lines from a diff. Removed lines are excluded when copying.
