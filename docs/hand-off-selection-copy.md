# Hand-off: Accurate cursor/selection-to-clipboard in diff view

## Context

`dv` has a keyboard-driven cursor/selection in the diff pane:

- `j`/`k` move a cursor line over logical diff rows.
- `v` starts/stops a selection anchored at the cursor.
- `y` copies the selected rows to the clipboard as a markdown code block.

There is a known accuracy problem: what the user selects is not always what lands in the clipboard.

## Current implementation

### Files involved

- `src/cli.tsx`
  - `cursorLine` / `selectionAnchor` state.
  - `copySelectionToClipboard()` runs on `y`.
  - `logicalLinesRef` is rebuilt from `file.rawDiff` whenever the current file changes.
  - `<DiffView>` is rendered with `view={viewMode}`, where `viewMode` may be `split` or `unified` depending on terminal width and change counts.

- `src/diff-cursor-utils.ts`
  - `buildUnifiedLogicalLines(rawDiff)` parses a git patch and returns one logical row per unified-view line.
  - `extractSelectedDiffLines(lines, start, end)` returns the raw diff lines (`+`/`-`/` `/`@@`) for the selected range.

- `src/components/diff-view.tsx`
  - Wraps opentui's `DiffRenderable`.
  - Passes `cursorLine` and `selection` props down.
  - Calls `DiffRenderable.highlightLines(start, end, color)` to render the selection.

- `src/balance-delimiters.ts`
  - Mutates the diff before it reaches `DiffRenderable` for syntax highlighting.

## Why it is inaccurate today

There are at least two sources of drift:

1. **Split view logical mismatch**
   - The cursor/selection model assumes one rendered row = one logical diff row.
   - In **split view**, one rendered row can contain both an old (removed) line and a new (added) line.
   - So `cursorLine`/`selection` indices, which are based on unified-view logical lines, do not map correctly to split-view rows.
   - Result: the highlighted rows and the copied rows diverge.

2. **Balanced diff mismatch**
   - `DiffRenderable` receives `balanceDelimiters(diff, filetype)` for syntax highlighting.
   - The logical-line model is currently built from `file.rawDiff`.
   - Even if indices are right, the text on screen may differ from the text copied.

## What has been tried and reverted

A change forced `<DiffView view="unified">` whenever the diff pane was focused.
This made selection/copy correct but sacrificed split view during review.
It was reverted after user feedback.

## Direction to investigate: option 4 — copy from the rendered surface

Instead of reconstructing what *should* be on screen, copy what *is* on screen.

### Goal

Implement a new copy path that captures the exact text of the currently selected rows from the underlying `DiffRenderable`, regardless of whether the view is split or unified.

### Why this is promising

- It removes the need for a parallel logical-line model (`logicalLinesRef`).
- It works in split view and unified view.
- It is immune to `balanceDelimiters` drift.
- It gives true WYSIWYG copy.

### Open questions

1. **Can `DiffRenderable` expose row text?**
   - The public API has `setLineColor`, `clearLineColor`, `highlightLines`, `clearHighlightLines`.
   - There is no obvious `getLineText(row)` or `getSelectedText()`.
   - Investigate whether the underlying `CodeRenderable` (or `LineNumberRenderable`) exposes content or selection APIs.
   - `src/web-utils.tsx` already walks the renderer tree looking for `DiffRenderable` instances. That pattern may help reach internal renderables.

2. **How does selection currently work at the opentui level?**
   - `DiffView` uses `highlightLines(start, end, color)` to paint selection.
   - Is there a way to get the text that corresponds to those highlighted logical rows?
   - In split view, `highlightLines` operates on which side? Both sides? Does the index map to left or right content?

3. **What should the copied format be?**
   - For the agent workflow, the user wants the exact selected content.
   - In unified view, copy raw diff lines with `+`/`-`/` ` prefixes and `@@` headers.
   - In split view, we need to decide whether to copy old side, new side, or both.
   - User preference should be confirmed; a reasonable default is to copy the **new side** content in split view (what the code will be after the change), while preserving the ability to copy old side if selection is on the left.

4. **Can we avoid the `y`-key silent failure?**
   - Today `copySelectionToClipboard` silently catches clipboard errors.
   - Consider adding a transient status message or log entry when copy succeeds/fails, especially if the new surface-copy path is used.

5. **Should we keep the unified-only fallback?**
   - If surface copy cannot be made to work for split view, a softer fallback is to only enable `y` when the view is unified, or to temporarily switch to unified while `v` selection is active.
   - This preserves split view for normal review.

### Suggested approach

1. Inspect `@opentuah/core/renderables/Diff.d.ts` and the implementation in `node_modules/@opentuah/core`.
   - Find the private fields: `leftCodeRenderable`, `rightCodeRenderable`, `leftSide`, `rightSide`.
   - See if any public getters exist or if we can safely access these internals.

2. Look at `CodeRenderable` and `LineNumberRenderable` APIs for line/selection access.

3. Prototype a helper, e.g. `captureSelectedDiffText(diffRenderable, selection)`, that returns the text of the highlighted rows.

4. Wire the new helper into `copySelectionToClipboard` in `src/cli.tsx`.
   - Keep the existing `extractSelectedDiffLines` path as a fallback for cases where the renderable cannot be reached (e.g. folder view, parse errors).

5. Add tests:
   - Unit tests for the new helper using `testRender` from `@opentuah/react/test-utils`.
   - Coverage for unified and split views.
   - Coverage for selecting context, added, removed, and mixed ranges.

### Non-goals

- Do not change the existing `v`/`j`/`k` cursor model unless necessary.
- Do not force the user into unified view during normal review.

## Acceptance criteria

- [x] Pressing `y` copies exactly the lines highlighted by the selection in unified view.
- [x] Pressing `y` copies exactly the lines highlighted by the selection in split view (new/right-hand side by default).
- [x] The copied content matches the rendered text, not a reconstructed patch.
- [x] No regression in existing cursor/selection navigation tests.
- [x] Document the final behavior in `docs/adr-cursor-selection.md` and update `CONTEXT.md` if terminology changes.

## Implementation notes

- Added `src/diff-surface-copy.ts` with `captureSelectedDiffText`, which reads from the private `leftCodeRenderable`/`rightCodeRenderable` fields of `DiffRenderable`.
- Wired the helper into `copySelectionToClipboard` in `src/cli.tsx` via a forwarded ref on `<DiffView>`.
- Removed the old `extractSelectedDiffLines`/`extractSelectedNewContent` reconstruction path; `y` now only works when the renderable is reachable, logging a message otherwise.
- Updated `buildUnifiedLogicalLines` to match opentuah's change-block grouping so cursor/selection indices align with rendered rows.
- Added tests in `src/diff-surface-copy.test.tsx` covering unified/split views, line numbers, single-line selection, and out-of-bounds indices.
- Clipboard failures are now logged instead of swallowed.
