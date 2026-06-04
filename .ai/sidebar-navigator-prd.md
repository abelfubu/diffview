# PRD: Sidebar Navigator for the Diff TUI

## Problem Statement

Critique’s main diff TUI renders a Continuous Diff Document that is easy to scroll, but it lacks a persistent Sidebar Navigator for orienting within large diffs. Reviewers can jump with the File Picker, but they cannot continuously see where they are in Tree Order, which file is currently active, or quickly scan the changed-file structure the way they can in diffnav. This makes long reviews feel less navigable than they should, especially for keyboard-first terminal usage.

## Solution

Add a persistent left Sidebar Navigator to the main diff TUI only. The Sidebar Navigator will mirror the changed-file tree in Tree Order, stay synchronized with the Continuous Diff Document, highlight the Current File using the top-edge rule, and auto-reveal that Current File as the user scrolls. The sidebar will be passive in v1: explicit file jumps continue to use the File Picker, while the sidebar provides orientation, status scanability, and future groundwork for diffnav-like focused navigation. The sidebar will be fixed-width, show status colors and diff stats, support manual toggling with `e`, and participate in responsive layout decisions so the diff pane remains readable unless the user explicitly forces the sidebar open.

## User Stories

1. As a reviewer, I want a persistent Sidebar Navigator, so that I can orient myself within a long diff without relying on memory.
2. As a reviewer, I want the Sidebar Navigator on the left, so that the layout feels familiar and explorer-like.
3. As a reviewer, I want the main pane to remain a Continuous Diff Document, so that I can read changes as one scrollable review surface.
4. As a reviewer, I want the Sidebar Navigator and Continuous Diff Document to use the same Tree Order, so that navigation and reading order never disagree.
5. As a reviewer, I want the Current File highlighted in the Sidebar Navigator, so that I can immediately see where I am in the diff.
6. As a reviewer, I want the Current File to be determined by the file nearest the top edge of the viewport, so that the active file feels stable while reading top-to-bottom.
7. As a reviewer, I want the Sidebar Navigator to update as I scroll, so that the navigator reflects my real reading position.
8. As a reviewer, I want Sidebar Auto-Reveal, so that the active row stays visible even in very large diffs.
9. As a reviewer, I want Sidebar Auto-Reveal to be slightly debounced, so that fast scrolling does not make the sidebar feel twitchy.
10. As a reviewer, I want the Sidebar Navigator to keep showing path, status color, and diff stats, so that it remains useful as a triage surface instead of a plain index.
11. As a reviewer, I want Active Row Highlight to be additive, so that I still see file status even when a file is active.
12. As a reviewer, I want a fixed Sidebar Width, so that the diff pane layout does not jitter while I review.
13. As a reviewer, I want the Sidebar Width to be wide enough for my workflow, so that the tree feels closer to diffnav and not cramped.
14. As a reviewer, I want long paths truncated with Filename-Preserving Truncation, so that the filename remains visible.
15. As a reviewer, I want the tree to preserve Compressed Tree Path behavior, so that single-child chains do not waste vertical space.
16. As a reviewer, I want the sidebar to hide responsively when space is too tight, so that the diff stays readable.
17. As a reviewer, I want to manually toggle the sidebar with `e`, so that I can reclaim diff width on demand.
18. As a reviewer, I want manual sidebar toggling to remain respected after explicit file jumps, so that the app does not reopen the sidebar behind my back.
19. As a reviewer, I want manual sidebar visibility to reset each run, so that startup behavior stays predictable across terminals.
20. As a reviewer, I want to be able to force the sidebar open even when responsive rules would hide it, so that my explicit choice wins.
21. As a reviewer, I want forced-open sidebar state to recompute the diff view mode from the remaining main-pane width, so that the diff never renders as if it had more space than it actually does.
22. As a reviewer, I want the File Picker to remain available in v1, so that I still have an explicit keyboard-based jump mechanism.
23. As a reviewer, I want File Picker selection to jump to the chosen file and align its header to the top of the viewport, so that navigation is deterministic.
24. As a reviewer, I want File Picker selection to update the Current File, so that the sidebar and document remain synchronized.
25. As a reviewer, I want File Picker selection not to auto-reopen a manually hidden sidebar, so that my visibility preference is respected.
26. As a reviewer, I want the File Picker to stay as the existing top overlay in v1, so that sidebar implementation does not require a second UI redesign.
27. As a reviewer, I want `j/k` to keep meaning document scrolling in v1, so that the diff still feels like a document reader.
28. As a reviewer, I want keyboard-first behavior without needing the mouse, so that the tool stays true to terminal-centric usage.
29. As a reviewer, I want the sidebar to provide real value before it becomes focusable, so that v1 is useful even without full diffnav parity.
30. As a reviewer, I want future sidebar focus support, so that the navigation model can evolve toward diffnav-like behavior later.
31. As a future reviewer, I want `Tab` to switch focus between the diff and sidebar, so that keyboard navigation can move between browsing and reading modes.
32. As a future reviewer, I want the Focused Row to immediately become the Current File, so that there is no ambiguous pending selection state.
33. As a future reviewer, I want `j/k` in the sidebar to move the Focused Row, so that focus mode changes behavior in a natural way.
34. As a future reviewer, I want `Ctrl+P` to remain even after sidebar focus exists, so that fuzzy jump and tree navigation can coexist.
35. As a maintainer, I want the first implementation scoped only to the main diff TUI, so that the feature lands without coupling to review mode or web rendering.
36. As a maintainer, I want the new behavior to reuse existing tree and diff concepts where possible, so that the implementation stays incremental rather than rewriting the app’s reading model.
37. As a maintainer, I want the sidebar’s responsive logic to be derived from real diff readability, so that layout decisions remain consistent with existing view-mode behavior.
38. As a maintainer, I want the layout rules to remain understandable, so that future work on focusable sidebar navigation can build on a stable foundation.

## Implementation Decisions

- The feature targets the main diff TUI only. Review mode and web rendering are explicitly out of scope for this PRD.
- The main reading model remains a Continuous Diff Document. The sidebar is a navigator and orientation surface, not a switch to single-file rendering.
- The system will use the following glossary consistently: Sidebar Navigator, Continuous Diff Document, Current File, Focused Row, Responsive Sidebar, Tree Order, Keyboard-First Navigation, File Selection, File Picker, Sidebar Width, Active Row Highlight, Sidebar Auto-Reveal, Filename-Preserving Truncation, Compressed Tree Path, Sidebar Toggle, and Manual Sidebar Visibility.
- Current File is determined by the file section whose header is nearest the top edge of the main viewport.
- File Selection aligns the chosen file header to the top of the viewport.
- The sidebar remains passive in v1. It reflects document state but is not yet the primary interactive focus target.
- Explicit file jumps continue to use the File Picker in v1.
- Tree Order remains alphabetical as derived from the directory tree. The feature does not restore raw git diff order.
- The tree rendering keeps compressed single-child directory chains.
- File rows keep path, status color, and diff stats.
- Active Row Highlight adds emphasis to the Current File without replacing status color semantics.
- Sidebar Width is fixed at roughly 60 columns for the initial implementation.
- Long path rendering uses Filename-Preserving Truncation.
- The sidebar should be implemented as its own scrollable surface that can auto-reveal the Current File while the main diff remains the primary scroll surface.
- Sidebar Auto-Reveal should be slightly debounced during fast scrolling to avoid visual jitter.
- Sidebar visibility has three effective states that matter to layout: auto-shown, auto-hidden due to space, and manually forced visible/hidden.
- Responsive Sidebar behavior is driven by whether the remaining main-pane width would still keep the diff comfortably readable.
- Manual Sidebar Visibility is reset each run rather than persisted across sessions.
- The manual Sidebar Toggle is bound to `e`, following diffnav muscle memory.
- Pressing `e` may force the sidebar open even when responsive auto-hide would normally hide it.
- When sidebar visibility changes, diff presentation should be recomputed from the actual remaining width of the main pane, including view-mode selection between split and unified diff.
- File Picker selection must not auto-reopen a manually hidden sidebar.
- The existing top overlay presentation of the File Picker remains unchanged in v1.
- Future focusable-sidebar work should use live coupling: when the sidebar has focus, moving the Focused Row immediately changes the Current File.
- Future focusable-sidebar work should use focus-sensitive key semantics: `j/k` scroll in the diff when diff-focused and move the Focused Row when sidebar-focused.
- The implementation should favor deep modules over spreading logic through the view layer. The likely deep modules are:
  - a layout decision module that computes sidebar visibility, forced visibility, effective pane widths, and resulting diff mode
  - a viewport tracking module that resolves Current File from section positions and scroll state
  - a sidebar state module that derives visible rows, active row, truncation, and auto-reveal target from document and layout state
- The sidebar should reuse the existing tree-building semantics rather than fork a second source of truth for ordering.
- The README/doc behavior mismatch around file navigation should not drive a new v1 navigation model; in v1 there is still no standalone previous/next-file stepping, only File Picker-based explicit selection plus scroll-synchronized sidebar state.

## Testing Decisions

- Good tests should verify externally observable behavior: rendered sidebar content, active-row synchronization, effective visibility/toggle outcomes, and diff mode changes from layout constraints. They should avoid asserting internal implementation details like exact hook structure or local state shape.
- The layout decision module should be tested thoroughly because it encodes the most important reversible behavior: responsive visibility, forced visibility, and pane-width consequences.
- The viewport tracking module should be tested with concrete section-position scenarios, especially around file boundaries, top-edge Current File selection, and debounced auto-reveal behavior.
- The sidebar rendering module should be tested for row content, active styling layering, fixed-width truncation expectations, and preservation of Tree Order and Compressed Tree Path behavior.
- The integration between File Picker selection and sidebar synchronization should be tested from the user-visible outcome: jump target aligned to top, Current File updated, manual sidebar visibility respected.
- Prior art already exists in the codebase for this style of testing:
  - visual and structural tests around directory-tree building and rendering
  - component tests for diff rendering behavior
  - tests around dropdown behavior and keyboard-driven UI interactions
- Where possible, extracted non-React decision logic should be tested in isolation first, with only a thin layer of component integration tests on top.

## Out of Scope

- Review mode sidebar parity
- Web rendering parity
- Making the sidebar focusable in v1
- Manual directory expand/collapse state
- Mouse-first interactions or click-driven design
- Persisting sidebar visibility across launches
- Replacing the File Picker with sidebar selection in v1
- Introducing previous/next file stepping in v1
- Reordering the document back to git diff order
- Fully expanding single-child directory chains
- Redesigning the File Picker as an in-sidebar search experience
- Configurability of sidebar width in v1

## Further Notes

- The desired direction is explicitly diffnav-like, but v1 is intentionally staged: first land a passive, synchronized Sidebar Navigator in the main diff TUI, then later add focus transfer with `Tab` and focus-sensitive `j/k` semantics.
- The user’s diffnav configuration indicates strong preference for a wide file tree, visible diff stats, colored filenames, and open-by-default folder structure. Critique should borrow the behavior that improves keyboard-first review while still respecting its own existing Continuous Diff Document model.
- No ADR is needed yet. The decisions here are meaningful but still easy to revisit after the first implementation is exercised in the terminal.
