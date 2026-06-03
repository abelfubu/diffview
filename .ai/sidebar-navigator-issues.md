# Sidebar Navigator issue breakdown

Source: `./.ai/sidebar-navigator-prd.md`

## Implemented ✅

1. **Render the Sidebar Navigator as a left pane** ✅
   - Left sidebar + right diff document layout
   - Tree Order, Compressed Tree Path, status colors, diff stats
   - Fixed ~60 col width, filename-preserving truncation
   - Removed old top-of-document tree

2. **Track and highlight the Current File in the sidebar** ✅
   - Top-edge rule for Current File tracking
   - Additive Active Row Highlight
   - Scroll sync between diff and sidebar

3. **Auto-reveal the Current File in a scrollable sidebar** ✅
   - Independent sidebar scrollable surface
   - Debounced auto-reveal (150ms)

4. **Make file jumps synchronize cleanly with the sidebar** ✅
   - File Picker scrolls to top, updates Current File
   - Respects manual sidebar visibility

5. **Add manual `b` toggle for sidebar visibility** ✅
   - `b` key toggles sidebar
   - No responsive auto-hide
   - Layout recomputation on toggle

## Future slices

### 6. Add `Tab` focus switching + visual focus indicator
   - **Type**: AFK
   - **Blocked by**: 3, 5
   - **User stories covered**: 30, 31, 32
   - **What to build**:
     - Pressing `Tab` switches focus between diff pane and sidebar.
     - Add a visual focus indicator so the user can see which pane is active.
     - `j/k` continue to scroll the diff regardless of focus (behavior does not change yet).
     - Sidebar remains passive: no row selection or movement, just focus indication.
   - **Acceptance criteria**:
     - [ ] Pressing `Tab` cycles focus between diff pane and sidebar.
     - [ ] The focused pane has a visible focus indicator.
     - [ ] `j/k` always scroll the diff document (no mode-sensitive behavior yet).
     - [ ] Sidebar does not introduce row selection or movement in this slice.

### 7. Add focus-sensitive `j/k` + live coupling
   - **Type**: AFK
   - **Blocked by**: 6
   - **User stories covered**: 31, 32, 33
   - **What to build**:
     - When sidebar has focus, `j/k` move the Focused Row up/down.
     - Focused Row immediately becomes the Current File (live coupling).
     - When diff pane has focus, `j/k` scroll the document as before.
     - The visual focus indicator from slice 6 carries the mode distinction.
   - **Acceptance criteria**:
     - [ ] `j/k` in sidebar moves the Focused Row and updates Current File immediately.
     - [ ] `j/k` in diff pane scrolls the document.
     - [ ] Focused Row and Current File are always the same (no pending selection state).
     - [ ] `Ctrl+P` File Picker continues to work from both focus contexts.

## Dependency graph

- 1 → 2 → 3
- 2 → 4
- 1 → 5
- 3, 5 → 6
- 6 → 7

## Notes

- Slice 6 validates the focus model visually before locking in mode-sensitive keys.
- Slice 7 is where the real diffnav-like interaction lives.
- Review/web parity remains out of scope.