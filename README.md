# `dv` — Diffview

A fast, keyboard-driven diff viewer for the terminal. Pipe any `git diff` into it and navigate changes with a TUI, copy selections, switch themes, and more.

![license](https://img.shields.io/npm/l/@abelfubu/dv)

## Install

```bash
bun install -g @abelfubu/dv
```

Requires [Bun](https://bun.sh/).

## Usage

```bash
# Pipe git diff output
git diff | dv

# Diff specific refs
git diff main...feature | dv

# Show working tree changes (default when stdin is empty)
dv

# Scrollback mode for non-TTY output
git diff | dv --scrollback

# Transparent background
dv --transparent

# Watch for changes
dv --watch
```

## Features

- **Interactive TUI** built with [`@opentuah/react`](https://github.com/opentuah/opentuah)
- **Unified and split view** modes (auto-switches based on terminal width)
- **Directory tree** sidebar for jumping between files
- **Keyboard selection** and **clipboard copy** of diff text
- **Syntax highlighting** via Tree-sitter parsers
- **Themes** — switch at runtime
- **Transparent background** mode
- **Scrollback output** when stdout isn't a TTY
- **Watch mode** for live diff updates
- **Submodule support** — dirty submodules shown inline
- **Untracked files** displayed via synthetic diffs

## Keybindings

| Key | Action |
| --- | --- |
| `↑` / `↓` or `k` / `j` | Move cursor |
| `←` / `→` or `h` / `l` | Switch focus (tree / diff) |
| `Enter` | Jump to file under cursor |
| `Tab` | Toggle focus between tree and diff |
| `u` | Toggle unified / split view |
| `v` | Set selection anchor |
| `y` | Copy selected diff content |
| `t` | Cycle themes |
| `T` | Toggle transparent background |
| `c` | Change context lines |
| `r` | Refresh diff |
| `q` / `Esc` | Quit |

## Development

```bash
# Install dependencies
bun install

# Run in development
bun run cli

# Watch mode
bun run cli:watch

# Build
cd /Users/abelfubu/dev/diffview && bun run build

# Run tests
bun test
```

## Project Structure

```
.
├── src/
│   ├── cli.tsx              # CLI entrypoint
│   ├── components/          # React/TUI components
│   ├── diff-*.ts            # Diff parsing, cursor, copy utilities
│   ├── themes.ts            # Theme definitions
│   ├── store.ts             # Persistent state
│   └── parsers/             # Tree-sitter syntax parsers
├── docs/                    # ADRs and feature docs
├── dist/                    # Compiled output
└── package.json
```

## Docs

- [`docs/adr-cursor-selection.md`](docs/adr-cursor-selection.md)
- [`docs/transparent-background.md`](docs/transparent-background.md)
- [`CONTEXT.md`](CONTEXT.md) — domain glossary

## License

MIT
