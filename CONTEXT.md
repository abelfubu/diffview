# Critique

Critique is a terminal and web diff review tool for inspecting changed files and hunks. Its language focuses on how reviewers navigate and consume code changes.

## Language

**Sidebar Navigator**:
A persistent left-hand tree of changed files used to move between file sections in the diff viewer.
_Avoid_: file tree navigator, explorer, top tree

**Continuous Diff Document**:
A single vertically scrollable diff surface that renders all changed files in order and lets navigation jump between file sections.
_Avoid_: per-file view, tabbed diff, single-file pane

**Current File**:
The file section considered active because its header is nearest the top edge of the viewport within the Continuous Diff Document and it is highlighted in the Sidebar Navigator.
_Avoid_: selected file, open file, focused tab

**Focused Row**:
The sidebar row currently targeted by keyboard navigation, which immediately becomes the Current File when sidebar focus is enabled.
_Avoid_: pending selection, buffered cursor

**Responsive Sidebar**:
A Sidebar Navigator that automatically hides when showing it would make the Continuous Diff Document too narrow to remain comfortably readable, unless the user explicitly forces it open.
_Avoid_: always-on sidebar, collapsed mini-sidebar

**Tree Order**:
The alphabetical file ordering derived from the directory tree, used consistently by both the Sidebar Navigator and the Continuous Diff Document.
_Avoid_: git diff order, patch order

**Keyboard-First Navigation**:
A navigation model where moving between files and sections is optimized for terminal keybindings rather than mouse interaction.
_Avoid_: click-to-jump, mouse-first navigation

**File Selection**:
Selecting a file jumps to that file in Tree Order, aligns its header to the top of the viewport, and updates the Current File.
_Avoid_: previous-next file stepping, manual scrolling only

**File Picker**:
A searchable command used to explicitly jump to a file when direct selection in the Sidebar Navigator is not available.
_Avoid_: explorer selection, mouse click

**Sidebar Width**:
A fixed column width of about 60 columns reserved for the Sidebar Navigator so the Continuous Diff Document layout remains stable.
_Avoid_: content-driven width, auto-growing sidebar

**Active Row Highlight**:
A visual treatment added to the Current File row without replacing the file's status color or change counts.
_Avoid_: status color override, active-state-only styling

**Sidebar Auto-Reveal**:
The behavior where the Sidebar Navigator scrolls just enough to keep the Current File visible while the main diff remains the primary scroll surface, with slight debouncing during fast scrolling.
_Avoid_: static sidebar, manual reveal only

**Filename-Preserving Truncation**:
A path truncation style that keeps the end of the path visible so the filename remains readable within the fixed Sidebar Width.
_Avoid_: prefix-preserving truncation

**Compressed Tree Path**:
A tree rendering style that collapses single-child directory chains into a single displayed path segment to preserve vertical space.
_Avoid_: fully expanded single-child chains

**Sidebar Toggle**:
A manual command, bound to `b`, that hides or shows the Sidebar Navigator. The user decides visibility; there is no automatic responsive hiding.
_Avoid_: always visible, auto-hide, responsive hiding

**Manual Sidebar Visibility**:
The user-chosen shown or hidden state of the Sidebar Navigator, which remains respected after explicit file jumps and resets each run.
_Avoid_: auto-reopen on selection, persisted visibility
