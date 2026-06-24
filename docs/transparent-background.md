# Transparent Background

## Decision

Add a persistent `transparentBackground` setting that makes `dv` skip painting explicit panel/background colors, allowing the terminal's own background (including background images or opacity) to show through.

## Configuration

- **Config file:** `~/.config/dv/state.json` — set `"transparentBackground": true`
- **CLI flag:** `--transparent`
- **Runtime toggle:** `T` (shift + t)

The setting is stored alongside `themeName` and `italicsEnabled` in the existing Zustand/app store.

## Behavior

When enabled:

- The app root, sidebar, and diff panel do not set an explicit `backgroundColor`.
- Diff content still renders added/removed line backgrounds (those are semantic, not decorative).
- Directory tree hover/focus highlights remain; hover uses no panel fill, while active/focus states keep their primary-colored highlight.
- Scrollback ANSI output skips global background blending so the terminal default remains visible.

## Rationale

- Users who run terminals with background images, blur, or opacity requested a way for `dv` to blend in instead of drawing a solid theme rectangle.
- Re-using the existing state store keeps the UX consistent with theme and italics persistence and avoids introducing a new config file format.
- A runtime keybinding lets users preview the effect without editing JSON.

## Implementation Notes

- `src/store.ts` now persists `transparentBackground`.
- `src/cli.tsx` reads the setting, wires the `T` key, exposes `--transparent`, and passes the flag to `DirectoryTreeView` and `DiffView`.
- `src/components/diff-view.tsx` and `src/components/directory-tree-view.tsx` accept a `transparentBackground` prop and avoid decorative panel fills when it is true.
- `src/ansi-output.ts` accepts an optional `themeBg`; when omitted, span colors are not pre-blended against a theme background.
