# ADR: Keyboard Cursor and Selection in the Diff Pane

## Status
Accepted / Superseded in part (see Amendment 2024-06-26)

## Context
`dv` is a keyboard-driven TUI diff viewer. Users review agent-generated changes file-by-file and often want to quote a specific block of code back to the agent. Today they can select text with the mouse, but there is no keyboard-driven way to mark a range of lines and copy them in a format ready to paste into an agent prompt.

## Decision
Add a vim-style line cursor to the diff pane:

- The cursor line appears when the diff pane is focused and disappears when focus moves to the sidebar or a dropdown.
- `j`/`k` move the cursor up/down one logical diff line and auto-scroll the viewport.
- `v` starts a line selection anchored at the cursor; moving the cursor extends the selection.
- `q`, `Esc`, and `Tab` stop the selection. When a selection is active they do **not** exit the app; when no selection is active `q`/`Esc` behave as before.
- `y` copies the selected rows as rendered by `DiffRenderable`, wrapped in a fenced markdown code block with a `// path:line` header. The copied text is the exact content shown on screen, not a reconstructed patch.
- The diff pane stays in whatever view mode the terminal width and change count select (`split` or `unified`). Forcing unified view while focused was tried and reverted because it degraded normal review.

## Consequences
- Users can quickly quote code from a diff without reaching for the mouse.
- The copied text is WYSIWYG: what is highlighted on screen is what lands in the clipboard, making it reliable to paste into an agent prompt.
- Line-level selection is simple and matches the existing `highlightLines` API of the underlying `DiffRenderable`.
- Wrapped display lines are treated as one logical line during selection, which is acceptable for the target workflow.
- Folder view is left in plain scroll mode; cursor/selection only works when a single file is rendered.

## Amendment 2024-06-26: Surface-copy selection

The original ADR required the diff pane to switch to unified view while focused. This was implemented and then reverted: users found losing split view during review worse than the selection/copy accuracy problem. A new approach was adopted:

- Copy is captured from the rendered surface of `DiffRenderable` rather than reconstructed from `file.rawDiff`.
- The cursor/selection indices still refer to logical rows as used by `highlightLines`, but the actual text comes from the underlying `CodeRenderable` content.
- In split view the new (right-hand) side is copied by default, because that is the code the agent needs to review or modify after the change.
- The `balanceDelimiters` mutation is accepted as part of the copied text, since it matches what the user sees.
- If the renderable cannot be reached (folder view, parse errors, etc.), `y` does nothing and logs a message instead of falling back to the old reconstruction path, so users do not get silently inconsistent output.
- Clipboard failures are logged rather than swallowed.

## Domain glossary additions

**Cursor line**  
The currently highlighted logical line in the diff pane. Visible only when the diff pane has focus.

**Selection anchor**  
The logical line where a selection started (set by `v`). The selection extends from the anchor to the current cursor line.

**Selected diff content**  
The exact text shown on screen for the currently selected logical rows. In split view this means the new-side code; in unified view it means the rendered diff rows. What is highlighted is what gets copied.
