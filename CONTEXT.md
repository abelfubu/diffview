# Diffview (dv) — Domain Glossary

## Terms

**Diff**  
A textual representation of changes between two states of a file or set of files. In `dv`, diffs are always produced by or in the shape of `git diff` output.

**Hunk**  
A contiguous block of changes within a diff, bounded by `@@` header lines. The smallest unit of diff navigation in the TUI.

**Patch**  
The formatted text of a diff that can be parsed and applied. In `dv`, patches are parsed via the `diff` npm package's `parsePatch`.

**Tracked change**  
A modification to a file already known to git — modified, staged, deleted, or renamed.

**Untracked file**  
A file present in the working tree but not yet tracked by git. `dv` displays untracked files via a **synthetic diff** so they appear alongside tracked changes without mutating the git index.

**Synthetic diff**  
A diff block constructed programmatically (not produced by `git diff`) to display content that git does not natively include in its diff output. Used for untracked files to avoid modifying the git index.

**Transparent background**  
A rendering mode where `dv` does not paint explicit background colors, letting the terminal's own background show through. Useful for terminal emulators with background images or semi-transparent windows. Configurable via `~/.config/dv/state.json` (`transparentBackground`) or the `--transparent` CLI flag, and toggled at runtime with `T`.

**Working tree**  
The current state of files on disk, including tracked modifications and untracked files.

**Index**  
The git staging area. `dv` never modifies the index.

**Submodule**  
A nested git repository referenced by the parent repo. Dirty submodules are shown inline rather than as ref changes.

**Git reference**  
A commit hash, branch name, tag, or range expression (e.g., `HEAD~1`, `main...feature`). Used as positional arguments to scope the diff.

**Context lines**  
Unchanged lines shown around each hunk for readability. Configurable via `--context`.

**Unified view**  
Diff rendering mode where old and new content are interleaved (preceded by `-` and `+`).

**Split view**  
Diff rendering mode where old and new content are shown side by side. Used when terminal width exceeds the split threshold.

**Cursor line**  
The currently highlighted logical line in the diff pane. Visible only when the diff pane has focus.

**Selection anchor**  
The logical line where a keyboard selection started (set by pressing `v`). The selection extends from the anchor to the current cursor line.

**Selected diff content**  
The exact diff lines included in the current selection, preserving `+`/`-` prefixes and `@@` hunk headers. What is highlighted on screen is what gets copied with `y`.

**Scrollback mode**  
Non-interactive output written directly to the terminal scrollback, used when stdout is not a TTY or when `--scrollback` is passed.
