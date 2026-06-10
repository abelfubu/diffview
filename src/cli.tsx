#!/usr/bin/env bun
// CLI entrypoint for the dv diff viewer.
// Provides TUI diff viewing with piped stdin support.
// Usage: git diff | dv

// Must be first import: patches process.stdout.columns/rows for Bun compiled binaries
// where they incorrectly return 0 instead of actual terminal dimensions.
import "./patch-terminal-dimensions.js";

import { goke, wrapJsonSchema } from "goke";
import {
  createRoot,
  flushSync,
  useKeyboard,
  useOnResize,
  useRenderer,
  useTerminalDimensions,
} from "@opentuah/react";
import { useCopySelection } from "./hooks/use-copy-selection.js";
import * as React from "react";
import { exec, execSync, spawnSync } from "child_process";
import { promisify } from "util";
import {
  createCliRenderer,
  MacOSScrollAccel,
  ScrollBoxRenderable,
  addDefaultParsers,
} from "@opentuah/core";
import parsersConfig from "./parsers-config.js";

// Register custom syntax highlighting parsers
addDefaultParsers(parsersConfig.parsers);
import stripAnsi from "strip-ansi";
import fs from "fs";
import { join } from "path";
import Dropdown from "./dropdown.js";
import { debounce } from "./utils.js";
import { DiffView, DirectoryTreeView, DEFAULT_SIDEBAR_WIDTH, type DirectoryTreeViewRef } from "./components/index.js";
// buildDirectoryTree no longer needed — DirectoryTreeView manages its own tree
import { logger } from "./logger.js";
import {
  buildGitCommand,
  ensureGitRepo,
  filterParsedFilesByPatterns,
  getFileName,
  getFileStatus,
  getOldFileName,
  getGitRepoRoot,
  countChanges,
  getViewMode,
  processFiles,
  detectFiletype,
  stripSubmoduleHeaders,
  parseGitDiffFiles,
  getDirtySubmodulePaths,
  buildSubmoduleDiffCommand,
  getUntrackedFilePaths,
  buildUntrackedFileDiff,
  getFilterPatterns,
  IGNORED_FILES,
  type ParsedFile,
  type GitCommandOptions,
} from "./diff-utils.js";
import type { TreeFileInfo } from "./directory-tree.js";
import packageJson from "../package.json" assert { type: "json" };


// Lazy-load watcher only when --watch is used
let watcherModule: typeof import("@parcel/watcher") | null = null;
async function getWatcher() {
  if (!watcherModule) {
    watcherModule = await import("@parcel/watcher");
  }
  return watcherModule;
}
import {
  getSyntaxTheme,
  getResolvedTheme,
  themeNames,
  defaultThemeName,
  rgbaToHex,
} from "./themes.js";
import {
  useAppStore,
  persistedState,
} from "./store.js";

// Scrollback mode handler - outputs ANSI to stdout instead of interactive TUI
interface ScrollbackModeOptions {
  cols?: number;
  theme?: string;
}

async function runScrollbackMode(
  diffContent: string,
  options: ScrollbackModeOptions
) {
  const { renderDiffToFrame } = await import("./web-utils.js");
  const { frameToAnsi } = await import("./ansi-output.js");
  const { getResolvedTheme } = await import("./themes.js");

  const themeName = options.theme && themeNames.includes(options.theme)
    ? options.theme
    : persistedState.themeName ?? defaultThemeName;

  const cols = options.cols || process.stdout.columns || 120;

  try {
    const frame = await renderDiffToFrame(diffContent, {
      cols,
      maxRows: 10000,
      themeName,
    });

    const theme = getResolvedTheme(themeName);
    const ansi = frameToAnsi(frame, theme.background);

    process.stdout.write(ansi + "\n");
    process.exit(0);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Failed to render scrollback:", message);
    process.exit(1);
  }
}

// Error boundary component
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false, error: null };
  declare props: ErrorBoundaryProps;

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch = (error: Error, errorInfo: React.ErrorInfo): void => {
    logger.log("Error caught by boundary:", error);
    logger.log("Component stack:", errorInfo.componentStack);
  };

  override render(): React.ReactNode {
    if (this.state.hasError && this.state.error) {
      return (
        <box style={{ flexDirection: "column", padding: 2 }}>
          <text fg="red">Error: {this.state.error.message}</text>
          <text fg="brightBlack">{this.state.error.stack}</text>
        </box>
      );
    }
    return this.props.children;
  }
}

const execAsync = promisify(exec);

async function filterCombinedDiffByPatterns(
  diffContent: string,
  options: Pick<GitCommandOptions, "filter" | "positionalFilters">,
): Promise<string> {
  if (!diffContent.trim()) return diffContent;
  if (getFilterPatterns(options).length === 0) return diffContent;

  const { parsePatch, formatPatch } = await import("diff");
  const parsedFiles = parseGitDiffFiles(stripSubmoduleHeaders(diffContent), parsePatch);
  const filteredFiles = filterParsedFilesByPatterns(parsedFiles, options);

  if (filteredFiles.length === 0) return "";

  return filteredFiles.map((file) => formatPatch(file)).join("\n");
}

const cli = goke("dv");

class ScrollAcceleration {
  public multiplier: number = 1;
  private macosAccel: MacOSScrollAccel;
  constructor() {
    this.macosAccel = new MacOSScrollAccel({ A: 1.5, maxMultiplier: 10 });
  }
  tick(delta: number) {
    return this.macosAccel.tick(delta) * this.multiplier;
  }
  reset() {
    this.macosAccel.reset();
    // this.multiplier = 1;
  }
}

export interface AppProps {
  parsedFiles: ParsedFile[];
}

const SIDEBAR_GAP = 2;
const APP_HORIZONTAL_PADDING = 2;

export function App({ parsedFiles }: AppProps): React.ReactNode {
  const { width: initialWidth, height: initialHeight } = useTerminalDimensions();
  const [width, setWidth] = React.useState(initialWidth);
  const [terminalHeight, setTerminalHeight] = React.useState(initialHeight);
  const [scrollAcceleration] = React.useState(() => new ScrollAcceleration());
  const themeName = useAppStore((s) => s.themeName);
  const italicsEnabled = useAppStore((s) => s.italicsEnabled);
  const [showDropdown, setShowDropdown] = React.useState(false);
  const [showThemePicker, setShowThemePicker] = React.useState(false);
  const [previewTheme, setPreviewTheme] = React.useState<string | null>(null);
  const [currentFileIndex, setCurrentFileIndex] = React.useState<number | undefined>(0);
  const [currentFolderPath, setCurrentFolderPath] = React.useState<string | undefined>(undefined);
  const [showSidebar, setShowSidebar] = React.useState(true);
  const [focusedPane, setFocusedPane] = React.useState<"diff" | "sidebar">("sidebar");

  // Refs for scroll functionality
  const scrollboxRef = React.useRef<ScrollBoxRenderable | null>(null);
  const sidebarScrollboxRef = React.useRef<ScrollBoxRenderable | null>(null);
  const sidebarRef = React.useRef<DirectoryTreeViewRef | null>(null);

  // Ref for double-tap detection (gg)
  const lastKeyRef = React.useRef<{ key: string; time: number } | null>(null);

  // Copy selection to clipboard on mouse release
  const { onMouseUp } = useCopySelection();

  useOnResize(
    React.useCallback((newWidth: number, newHeight: number) => {
      setWidth(newWidth);
      setTerminalHeight(newHeight);
    }, []),
  );

  const renderer = useRenderer();

  useKeyboard((key) => {
    if (showDropdown || showThemePicker) {
      if (key.name === "escape") {
        setShowDropdown(false);
        setShowThemePicker(false);
        setPreviewTheme(null);
      }
      return;
    }

    if (key.name === "escape" || key.name === "q") {
      renderer.destroy();
      return;
    }

    if (key.name === "p") {
      setShowDropdown(true);
      return;
    }

    if (key.name === "t") {
      setShowThemePicker(true);
      return;
    }

    if (key.name === "b") {
      setShowSidebar((prev) => !prev);
      return;
    }

    if (key.name === "i") {
      useAppStore.setState({ italicsEnabled: !italicsEnabled });
      return;
    }

    if (key.name === "o") {
      const file = currentFileIndex !== undefined ? parsedFiles[currentFileIndex] : undefined;
      if (file) {
        const editor = process.env.EDITOR || "vi";
        const relativePath = getFileName(file).replace(/^[ab]\//, "");
        const absolutePath = join(getGitRepoRoot(), relativePath);
        renderer.suspend();
        try {
          const match = editor.match(/(?:[^\s"]+|"[^"]*")+/g);
          const parts = match ? match.map((s) => s.replace(/^"|"$/g, "")) : [editor];
          const editorName = parts[0]!.toLowerCase();
          // GUI editors don't need the TTY; launching without stdio avoids permission prompts
          const isGuiEditor =
            editorName === "code" ||
            editorName === "code-insiders" ||
            editorName === "cursor" ||
            editorName === "zed" ||
            editorName === "subl" ||
            editorName === "sublime_text" ||
            editorName === "fleet" ||
            editorName === "goland" ||
            editorName === "idea" ||
            editorName === "webstorm" ||
            editorName === "pycharm" ||
            editorName === "rider" ||
            editorName === "clion" ||
            editorName === "datagrip" ||
            editorName === "rubymine";
          if (isGuiEditor) {
            spawnSync(parts[0]!, parts.slice(1).concat(absolutePath));
          } else {
            spawnSync(parts[0]!, parts.slice(1).concat(absolutePath), { stdio: "inherit" });
          }
        } catch {
          // Editor may exit non-zero (e.g. vim :cq)
        }
        renderer.resume();
      }
      return;
    }

    if (key.name === "tab") {
      setFocusedPane((prev) => (prev === "diff" ? "sidebar" : "diff"));
      return;
    }

    if (key.name === "z" && key.ctrl) {
      renderer.console.toggle();
      return;
    }

    const scrollbox = scrollboxRef.current;

    // Sidebar navigation when sidebar focused
    if (showSidebar && focusedPane === "sidebar") {
      // j/k: navigate rows
      if (key.name === "j" || key.name === "k") {
        // Ignore key repeat events to prevent double jumps
        if ((key as { repeated?: boolean }).repeated) return;

        if (key.name === "j") {
          sidebarRef.current?.focusNext();
        } else {
          sidebarRef.current?.focusPrev();
        }
        key.preventDefault();
        return;
      }

      // l/h/Enter/Space: toggle folder collapse
      if (key.name === "l" || key.name === "h" || key.name === "return" || key.name === "space") {
        sidebarRef.current?.toggleCollapse();
        key.preventDefault();
        return;
      }
    }

    // Vim-style scroll navigation (diff pane)
    if (scrollbox) {
      // j - scroll down one line
      if (key.name === "j") {
        scrollbox.scrollBy(1, "step");
        key.preventDefault();
        return;
      }

      // k - scroll up one line
      if (key.name === "k") {
        scrollbox.scrollBy(-1, "step");
        key.preventDefault();
        return;
      }

      // G - go to bottom
      if (key.name === "g" && key.shift) {
        scrollbox.scrollBy(1, "content");
        return;
      }

      // gg - go to top (double-tap within 300ms)
      if (key.name === "g" && !key.shift && !key.ctrl) {
        const now = Date.now();
        if (lastKeyRef.current?.key === "g" && now - lastKeyRef.current.time < 300) {
          scrollbox.scrollTo(0);
          lastKeyRef.current = null;
        } else {
          lastKeyRef.current = { key: "g", time: now };
        }
        return;
      }

      // Ctrl+D - half page down
      if (key.ctrl && key.name === "d") {
        scrollbox.scrollBy(0.5, "viewport");
        return;
      }

      // Ctrl+U - half page up
      if (key.ctrl && key.name === "u") {
        scrollbox.scrollBy(-0.5, "viewport");
        return;
      }
    }

    if (key.option) {
      if (key.eventType === "release") {
        scrollAcceleration.multiplier = 1;
      } else {
        scrollAcceleration.multiplier = 10;
      }
    }
  });

  if (parsedFiles.length === 0) {
    return (
      <box
        onMouseUp={onMouseUp}
        style={{
          padding: 1,
          backgroundColor: getResolvedTheme(themeName).background,
        }}
      >
        <text>No files to display</text>
      </box>
    );
  }

  // Use preview theme if hovering, otherwise use selected theme
  const activeTheme = previewTheme ?? themeName;
  const resolvedTheme = getResolvedTheme(activeTheme);
  const bgColor = resolvedTheme.background;
  const sidebarBgColor = rgbaToHex(resolvedTheme.backgroundPanel);
  const textColor = rgbaToHex(resolvedTheme.text);
  const mutedColor = rgbaToHex(resolvedTheme.textMuted);
  const availableContentWidth = Math.max(20, width - APP_HORIZONTAL_PADDING);
  const diffPaneWidth = showSidebar
    ? Math.max(20, availableContentWidth - DEFAULT_SIDEBAR_WIDTH - SIDEBAR_GAP)
    : availableContentWidth;

  const dropdownOptions = parsedFiles.map((file, idx) => {
    const name = getFileName(file);
    return {
      title: name,
      value: String(idx),
      keywords: name.split("/"),
    };
  });

  // Build tree data for directory tree view
  const treeFiles: TreeFileInfo[] = parsedFiles.map((file, idx) => {
    const { additions, deletions } = countChanges(file.hunks);
    return {
      path: getFileName(file),
      status: getFileStatus(file),
      additions,
      deletions,
      fileIndex: idx,
    };
  });

  // Synchronous sidebar scroll handler — keeps focused row in viewport
  const handleSidebarFocusRowChange = React.useCallback((rowY: number) => {
    const sidebarScrollbox = sidebarScrollboxRef.current;
    if (!sidebarScrollbox) return;

    const viewportTop = sidebarScrollbox.scrollTop;
    const viewportHeight = Math.max(1, sidebarScrollbox.viewport.height);

    if (rowY < viewportTop) {
      sidebarScrollbox.scrollTo(rowY);
    } else if (rowY >= viewportTop + viewportHeight) {
      sidebarScrollbox.scrollTo(Math.max(0, rowY - viewportHeight + 1));
    }
  }, []);

  const handleFileSelect = (value: string) => {
    const index = parseInt(value, 10);
    setCurrentFileIndex(index);
    setCurrentFolderPath(undefined);
    setShowDropdown(false);
    // Reset scroll when switching files via picker
    const scrollbox = scrollboxRef.current;
    if (scrollbox) scrollbox.scrollTo(0);
  };

  const themeOptions = themeNames.map((name) => ({
    title: name,
    value: name,
  }));

  const handleThemeSelect = (value: string) => {
    useAppStore.setState({ themeName: value });
    setShowThemePicker(false);
    setPreviewTheme(null);
  };

  const handleThemeFocus = (value: string) => {
    setPreviewTheme(value);
  };

  const renderCurrentFile = () => {
    if (currentFolderPath) {
      const folderFiles = parsedFiles.filter((file) => {
        const name = getFileName(file);
        return name.startsWith(currentFolderPath + "/");
      });

      if (folderFiles.length === 0) {
        return (
          <box style={{ padding: 1 }}>
            <text fg={mutedColor}>No changes in this folder</text>
          </box>
        );
      }

      const totalAdditions = folderFiles.reduce((sum, f) => sum + countChanges(f.hunks).additions, 0);
      const totalDeletions = folderFiles.reduce((sum, f) => sum + countChanges(f.hunks).deletions, 0);

      return (
        <box style={{ flexDirection: "column" }}>
          <box
            style={{
              paddingBottom: 1,
              paddingLeft: 1,
              paddingRight: 1,
              flexShrink: 0,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <text fg={textColor}>{currentFolderPath}/</text>
            <text fg="#2d8a47"> +{totalAdditions}</text>
            <text fg="#c53b53"> -{totalDeletions}</text>
            <text fg={mutedColor}> ({folderFiles.length} files)</text>
          </box>
          {folderFiles.map((file, idx) => {
            const fileName = getFileName(file);
            const oldFileName = getOldFileName(file);
            const filetype = detectFiletype(fileName);
            const { additions, deletions } = countChanges(file.hunks);
            const viewMode = getViewMode(additions, deletions, diffPaneWidth);

            return (
              <box key={idx} style={{ flexDirection: "column" }}>
                <box
                  style={{
                    paddingTop: idx > 0 ? 1 : 0,
                    paddingBottom: 1,
                    paddingLeft: 1,
                    paddingRight: 1,
                    flexShrink: 0,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  {oldFileName ? (
                    <>
                      <text fg={mutedColor}>{oldFileName.trim()}</text>
                      <text fg={mutedColor}> → </text>
                      <text fg={textColor}>{fileName.trim()}</text>
                    </>
                  ) : (
                    <text fg={textColor}>{fileName.trim()}</text>
                  )}
                  <text fg="#2d8a47"> +{additions}</text>
                  <text fg="#c53b53"> -{deletions}</text>
                </box>
                <DiffView
                  diff={file.rawDiff || ""}
                  view={viewMode}
                  filetype={filetype}
                  themeName={activeTheme}
                  italicsEnabled={italicsEnabled}
                />
              </box>
            );
          })}
        </box>
      );
    }

    const file = parsedFiles[currentFileIndex ?? 0];
    if (!file) return null;

    const fileName = getFileName(file);
    const oldFileName = getOldFileName(file);
    const filetype = detectFiletype(fileName);
    const { additions, deletions } = countChanges(file.hunks);
    const viewMode = getViewMode(additions, deletions, diffPaneWidth);

    return (
      <box style={{ flexDirection: "column" }}>
        <box
          style={{
            paddingBottom: 1,
            paddingLeft: 1,
            paddingRight: 1,
            flexShrink: 0,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          {oldFileName ? (
            <>
              <text fg={mutedColor}>{oldFileName.trim()}</text>
              <text fg={mutedColor}> → </text>
              <text fg={textColor}>{fileName.trim()}</text>
            </>
          ) : (
            <text fg={textColor}>{fileName.trim()}</text>
          )}
          <text fg="#2d8a47"> +{additions}</text>
          <text fg="#c53b53">-{deletions}</text>
        </box>
        <DiffView
          diff={file.rawDiff || ""}
          view={viewMode}
          filetype={filetype}
          themeName={activeTheme}
          italicsEnabled={italicsEnabled}
        />
      </box>
    );
  };

  // Always render the same structure - scrollbox is never remounted
  return (
    <box
      style={{
        flexDirection: "column",
        height: "100%",
        padding: 1,
        backgroundColor: bgColor,
      }}
    >
      {/* Dropdown overlay - conditionally shown */}
      {showThemePicker && (
        <box style={{ flexShrink: 0, maxHeight: 15 }}>
          <Dropdown
            tooltip="Select theme"
            options={themeOptions}
            selectedValues={[themeName]}
            onChange={handleThemeSelect}
            onFocus={handleThemeFocus}
            onEscape={() => {
              setShowThemePicker(false);
              setPreviewTheme(null);
            }}
            placeholder="Search themes..."
            itemsPerPage={6}
            theme={resolvedTheme}
          />
        </box>
      )}
      {showDropdown && (
        <box style={{ flexShrink: 0, maxHeight: 15 }}>
          <Dropdown
            tooltip="Select file"
            options={dropdownOptions}
            selectedValues={[]}
            onChange={handleFileSelect}
            onEscape={() => {
              setShowDropdown(false);
            }}
            placeholder="Search files..."
            itemsPerPage={6}
            theme={resolvedTheme}
          />
        </box>
      )}

      <box
        style={{
          flexDirection: "row",
          flexGrow: 1,
          flexShrink: 1,
        }}
      >
        {showSidebar && (
          <box
            style={{
              width: DEFAULT_SIDEBAR_WIDTH,
              flexShrink: 0,
              marginRight: SIDEBAR_GAP,
              backgroundColor: sidebarBgColor,
              flexDirection: "column",
            }}
          >
            <scrollbox
              ref={sidebarScrollboxRef}
              scrollY
              style={{
                flexGrow: 1,
                flexShrink: 1,
                rootOptions: {
                  backgroundColor: sidebarBgColor,
                  border: false,
                },
                contentOptions: {
                  minHeight: 0,
                },
                scrollbarOptions: {
                  showArrows: false,
                  trackOptions: {
                    foregroundColor: mutedColor,
                    backgroundColor: sidebarBgColor,
                  },
                },
              }}
            >
              <DirectoryTreeView
                ref={sidebarRef}
                files={treeFiles}
                themeName={activeTheme}
                width={DEFAULT_SIDEBAR_WIDTH}
                activeFileIndex={currentFileIndex}
                activeFolderPath={currentFolderPath}
                onFocusRowChange={handleSidebarFocusRowChange}
                onFileSelect={(fileIndex) => {
                  setCurrentFileIndex(fileIndex);
                  setCurrentFolderPath(undefined);
                  scrollboxRef.current?.scrollTo(0);
                }}
                onFolderSelect={(folderPath) => {
                  setCurrentFolderPath(folderPath);
                  setCurrentFileIndex(undefined);
                  scrollboxRef.current?.scrollTo(0);
                }}
              />
            </scrollbox>
          </box>
        )}

        {/* Scrollbox - always mounted, preserves scroll position */}
        <box
          style={{
            flexGrow: 1,
            flexShrink: 1,
          }}
        >
          <scrollbox
            ref={scrollboxRef}
            scrollY
            scrollAcceleration={scrollAcceleration}
            style={{
              flexGrow: 1,
              flexShrink: 1,
              rootOptions: {
                backgroundColor: bgColor,
                border: false,
              },
              contentOptions: {
                minHeight: 0,
              },
              scrollbarOptions: {
                showArrows: false,
                trackOptions: {
                  foregroundColor: mutedColor,
                  backgroundColor: bgColor,
                },
              },
            }}
            focused={!showDropdown && !showThemePicker}
          >
            {renderCurrentFile()}
          </scrollbox>
        </box>
      </box>

      {/* Footer - hidden when dropdown is open */}
      {!showDropdown && !showThemePicker && (
        <box
          style={{
            paddingTop: 1,
            paddingLeft: 1,
            paddingRight: 1,
            flexShrink: 0,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <text fg={textColor}>p</text>
          <text fg={mutedColor}> files ({parsedFiles.length})  </text>
          <text fg={textColor}>t</text>
          <text fg={mutedColor}> theme  </text>
          <text fg={textColor}>b</text>
          <text fg={mutedColor}> sidebar  </text>
          <text fg={textColor}>i</text>
          <text fg={mutedColor}> {italicsEnabled ? "italic" : "no-italic"}  </text>
          <text fg={textColor}>o</text>
          <text fg={mutedColor}> edit  </text>
          <text fg={textColor}>tab</text>
          <text fg={mutedColor}> focus</text>
          <box flexGrow={1} />
        </box>
      )}
    </box>
  );
}

cli
  .command(
    "[base] [head]",
    "Show diff for git references (defaults to unstaged changes)",
  )
  .option("--staged", "Show staged changes")
  .option("--commit <ref>", "Show changes from a specific commit")
  .option("--watch", "Watch for file changes and refresh diff")
  .option("--context <lines>", "Number of context lines (default: 6)")
  .option("--filter <pattern>", wrapJsonSchema<string[]>({
    type: "array",
    items: { type: "string" },
    description: "Filter files by glob pattern (can be used multiple times)",
  }))
  .option("--theme <name>", "Theme to use for rendering")
  .option("--no-italics", "Disable italic text in syntax highlighting")
  .option("--cols <cols>", "Columns for scrollback output (default: terminal width)")
  .option("--stdin", "Read diff from stdin (for use as a pager)")
  .option("--no-stdin", "Ignore piped stdin, always read diff from git")
  .option("--scrollback", "Output to terminal scrollback instead of TUI (auto-enabled when non-TTY)")
  .action(async (base, head, options) => {
    // Auto-detect piped stdin (e.g. `git diff | critique`)
    // Explicit --stdin is for PTY pager integration (lazygit) where stdin IS a TTY
    // --no-stdin forces git diff mode even when stdin is a pipe
    const mightHaveStdin = (options.stdin || !process.stdin.isTTY) && !options.noStdin;

    // Ensure we're inside a git repository before doing anything
    if (!mightHaveStdin) {
      ensureGitRepo();
    }

    // Apply theme and italics if specified (zustand subscription auto-persists)
    if (options.theme && themeNames.includes(options.theme)) {
      useAppStore.setState({ themeName: options.theme });
    }
    if (options.noItalics) {
      useAppStore.setState({ italicsEnabled: false });
    }

    // Build git command once (used by all modes)
    const gitCommand = buildGitCommand({
      staged: options.staged,
      commit: options.commit,
      base,
      head,
      context: options.context,
      filter: options.filter,
      positionalFilters: options['--'],
    });

    // Get diff content - from stdin or git
    let diffContent = "";
    let isStdinMode = false;

    if (mightHaveStdin) {
      // Handle stdin mode (for lazygit pager integration or piped input)
      // Lazygit uses --color=always by default, so strip ANSI escape codes
      // before parsing the diff (parsePatch expects plain text)
      diffContent = "";
      for await (const chunk of process.stdin) {
        diffContent += chunk;
      }
      diffContent = stripAnsi(diffContent);
      isStdinMode = true;
    }

    if (!isStdinMode) {
      // Stdin was not requested — read diff from git
      ensureGitRepo();
      const { stdout: gitDiff } = await execAsync(gitCommand, {
        encoding: "utf-8",
      });
      diffContent = gitDiff;
    }

    // Detect default mode (no args): submodule diffs are handled separately
    const isDefaultMode = !options.staged && !options.commit && !base && !head && !isStdinMode;

    // In default mode, append diffs from dirty submodules only.
    // The main git diff uses --ignore-submodules=all, so we separately
    // fetch diffs for submodules that have uncommitted changes.
    // This avoids showing submodule ref changes where the submodule
    // itself has already committed everything.
    if (isDefaultMode) {
      const dirtySubmodules = getDirtySubmodulePaths();
      if (dirtySubmodules.length > 0) {
        const subCmd = buildSubmoduleDiffCommand(dirtySubmodules, {
          context: options.context,
        });
        try {
          const { stdout: subDiff } = await execAsync(subCmd, {
            encoding: "utf-8",
          });
          if (subDiff.trim()) {
            diffContent = diffContent + "\n" + subDiff;
          }
        } catch {
          // Submodule diff failed (e.g. submodule not initialized) — skip
        }
      }

      // Append synthetic diffs for untracked files without modifying the git index.
      const untrackedPaths = getUntrackedFilePaths();
      for (const untrackedPath of untrackedPaths) {
        const untrackedDiff = buildUntrackedFileDiff(untrackedPath);
        if (untrackedDiff) {
          diffContent = diffContent + "\n" + untrackedDiff;
        }
      }

      diffContent = await filterCombinedDiffByPatterns(diffContent, {
        filter: options.filter,
        positionalFilters: options['--'],
      });
    }

    // Clean submodule headers once
    const cleanedDiff = stripSubmoduleHeaders(diffContent);

    // Check for empty diff (except for --watch mode which may get content later)
    const shouldWatch = options.watch && !base && !head && !options.commit && !isStdinMode;
    if (!cleanedDiff.trim() && !shouldWatch) {
      console.log("No changes to display");
      process.exit(0);
    }

    // Explicit --stdin forces scrollback (pager mode). Auto-detected piped stdin
    // only forces scrollback when stdout is also non-TTY.
    if (options.scrollback || options.stdin || !process.stdout.isTTY) {
      // For scrollback, prefer terminal width over --cols default (240 is for web)
      const scrollbackCols = process.stdout.columns || parseInt(options.cols) || 120;
      await runScrollbackMode(cleanedDiff, {
        theme: options.theme,
        cols: scrollbackCols,
      });
      return;
    }

    // TUI mode
    try {
      // When diff came from a piped stdin, process.stdin is consumed and cannot
      // be used for keyboard input. Open /dev/tty (the controlling terminal) for
      // keyboard events instead.
      let rendererStdin: NodeJS.ReadStream | undefined;
      if (isStdinMode && !options.stdin) {
        try {
          const fs = await import("fs");
          const tty = await import("tty");
          const fd = fs.openSync("/dev/tty", "r");
          rendererStdin = new tty.ReadStream(fd) as NodeJS.ReadStream;
        } catch {
          // /dev/tty not available — fall back to scrollback
          const scrollbackCols = process.stdout.columns || parseInt(options.cols) || 120;
          await runScrollbackMode(cleanedDiff, {
            theme: options.theme,
            cols: scrollbackCols,
          });
          return;
        }
      }

      // Parallelize diff module loading with renderer creation
      const [diffModule, renderer] = await Promise.all([
        import("diff"),
        createCliRenderer({
          stdin: rendererStdin,
          onDestroy() {
            process.exit(0);
          },
          exitOnCtrlC: true,
          useMouse: true,
          enableMouseMovement: true,
        }),
      ]);
      const { parsePatch, formatPatch } = diffModule;

      // Parse initial diff (already have it, no need to fetch again)
      const initialParsedFiles = cleanedDiff.trim()
        ? processFiles(parseGitDiffFiles(cleanedDiff, parsePatch), formatPatch)
        : [];

      function AppWithWatch() {
        // Use initial parsed files, only re-fetch if watching
        const [parsedFiles, setParsedFiles] = React.useState<ParsedFile[] | null>(
          shouldWatch ? null : initialParsedFiles
        );
        const themeName = useAppStore((s) => s.themeName);

        const watchRenderer = useRenderer();

        // Copy selection to clipboard on mouse release
        const { onMouseUp } = useCopySelection();

        // Handle exit keys (Q, Escape) for loading and empty states
        useKeyboard((key) => {
          if (parsedFiles && parsedFiles.length > 0) {
            return;
          }

          if (key.name === "escape" || key.name === "q") {
            watchRenderer.destroy();
          }
        });

        React.useEffect(() => {
          // Skip initial fetch if not watching (we already have the data)
          if (!shouldWatch) {
            return;
          }

          const fetchDiff = async () => {
            try {
              const { stdout: gitDiff } = await execAsync(gitCommand, {
                encoding: "utf-8",
              });

              // In default mode (watch is only enabled in default mode),
              // append dirty submodule diffs
              let fullDiff = gitDiff;
              if (isDefaultMode) {
                const dirtySubmodules = getDirtySubmodulePaths();
                if (dirtySubmodules.length > 0) {
                  const subCmd = buildSubmoduleDiffCommand(dirtySubmodules, {
                    context: options.context,
                  });
                  try {
                    const { stdout: subDiff } = await execAsync(subCmd, {
                      encoding: "utf-8",
                    });
                    if (subDiff.trim()) {
                      fullDiff = fullDiff + "\n" + subDiff;
                    }
                  } catch {
                    // Submodule diff failed — skip
                  }
                }

                // Append synthetic diffs for untracked files without modifying the git index.
                const untrackedPaths = getUntrackedFilePaths();
                for (const untrackedPath of untrackedPaths) {
                  const untrackedDiff = buildUntrackedFileDiff(untrackedPath);
                  if (untrackedDiff) {
                    fullDiff = fullDiff + "\n" + untrackedDiff;
                  }
                }
              }

              if (!fullDiff.trim()) {
                setParsedFiles([]);
                return;
              }

              const files = parseGitDiffFiles(stripSubmoduleHeaders(fullDiff), parsePatch);
              const filteredFiles = isDefaultMode
                ? filterParsedFilesByPatterns(files, {
                    filter: options.filter,
                    positionalFilters: options['--'],
                  })
                : files;
              const processedFiles = processFiles(filteredFiles, formatPatch);
              setParsedFiles(processedFiles);
            } catch (error) {
              setParsedFiles([]);
            }
          };

          // Initial fetch for watch mode
          fetchDiff();

          const cwd = process.cwd();

          const debouncedFetch = debounce(() => {
            fetchDiff();
          }, 200);

          let subscription:
            | Awaited<ReturnType<typeof import("@parcel/watcher").subscribe>>
            | undefined;

          // Lazy-load watcher module only when watching
          getWatcher().then((watcher) => {
            watcher
              .subscribe(cwd, (err, events) => {
                if (err) {
                  return;
                }

                if (events.length > 0) {
                  debouncedFetch();
                }
              })
              .then((sub) => {
                subscription = sub;
              });
          });

          return () => {
            if (subscription) {
              subscription.unsubscribe();
            }
          };
        }, []);

        const defaultBg = getResolvedTheme(themeName).background;

        if (parsedFiles === null) {
          return (
            <box onMouseUp={onMouseUp} style={{ padding: 1, backgroundColor: defaultBg }}>
              <text>Loading...</text>
            </box>
          );
        }

        if (parsedFiles.length === 0) {
          return (
            <box onMouseUp={onMouseUp} style={{ padding: 1, backgroundColor: defaultBg }}>
              <text>No changes to display</text>
            </box>
          );
        }

        return <App parsedFiles={parsedFiles} />;
      }

      createRoot(renderer).render(
        // @ts-ignore - ErrorBoundary class is incompatible with @opentuah/react's ElementClass + React 19 types; works correctly at runtime
        <ErrorBoundary>
          <AppWithWatch />
        </ErrorBoundary>
      );
    } catch (error) {
      console.error("Error getting git diff:", error);
      process.exit(1);
    }
  });

if (import.meta.main) {
  cli.help();
  cli.version(packageJson.version);
  cli.parse();
}
