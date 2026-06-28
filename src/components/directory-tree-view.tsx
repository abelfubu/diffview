// DirectoryTreeView - Renders a directory tree with file status colors and change counts.
// Shows added files in green, modified in default text, deleted in red, renamed in yellow.
// Change counts (+n,-n) use green/red for the numbers, brackets are muted.
// Supports fixed-width sidebar rendering with filename-preserving truncation.

import * as React from "react"
import { RGBA } from "@opentuah/core"
import { buildHierarchicalTree, type HierarchicalTreeNode, type TreeFileInfo, type TreeNode } from "../directory-tree.js"
import { getResolvedTheme, rgbaToHex } from "../themes.js"
import { FOLDER_ICON_CLOSED, FOLDER_ICON_OPEN, getFileIcon } from "../tree-icons.js"

const ICON_WIDTH = 3 // 2-char nerd font icon + 1 space

export const DEFAULT_SIDEBAR_WIDTH = 60

export interface DirectoryTreeViewRef {
  focusNext(): void
  focusPrev(): void
  toggleCollapse(): void
  getActiveRowIndex(): number
}

export interface DirectoryTreeViewProps {
  /** Files to display in the tree */
  files: TreeFileInfo[]
  /** Callback when a file is clicked (receives fileIndex) */
  onFileSelect?: (fileIndex: number) => void
  /** Callback when a folder is focused (receives folder displayPath) */
  onFolderSelect?: (folderPath: string) => void
  /** Theme name for colors */
  themeName: string
  /** Fixed render width for sidebar layout */
  width?: number
  /** Index of the currently active file (for highlight) */
  activeFileIndex?: number
  /** Path of the currently active folder (for highlight) */
  activeFolderPath?: string
  /** Callback whenever the focused row index changes */
  onFocusRowChange?: (rowIndex: number) => void
  /** Paths of folders that should start collapsed */
  initialCollapsedPaths?: string[]
  /** Use the terminal's default background instead of theme panel backgrounds */
  transparentBackground?: boolean
}

/**
 * Get the color for a file based on its status
 * Uses diff colors from theme: green (added), red (deleted), yellow (renamed), default text (modified)
 */
function getStatusColor(status: "added" | "modified" | "deleted" | "renamed", theme: ReturnType<typeof getResolvedTheme>): string {
  switch (status) {
    case "added":
      return rgbaToHex(theme.diffAdded) // green
    case "deleted":
      return rgbaToHex(theme.diffRemoved) // red
    case "renamed":
      return rgbaToHex(theme.warning) // yellow - renamed/moved file
    case "modified":
      return rgbaToHex(theme.text) // default text color, same as folders
  }
}

function truncateKeepingEnd(text: string, maxWidth: number): string {
  if (maxWidth <= 0) {
    return ""
  }

  if (text.length <= maxWidth) {
    return text
  }

  if (maxWidth === 1) {
    return "…"
  }

  return `…${text.slice(-(maxWidth - 1))}`
}

function getStatsParts(node: TreeNode): {
  hasAdditions: boolean
  hasDeletions: boolean
  text: string
} {
  const additions = node.additions ?? 0
  const deletions = node.deletions ?? 0
  const hasAdditions = additions > 0
  const hasDeletions = deletions > 0

  let text = " ("
  if (hasAdditions) {
    text += `+${additions}`
  }
  if (hasAdditions && hasDeletions) {
    text += ","
  }
  if (hasDeletions) {
    text += `-${deletions}`
  }
  text += ")"

  return {
    hasAdditions,
    hasDeletions,
    text,
  }
}

interface TreeNodeLineProps {
  node: TreeNode
  theme: ReturnType<typeof getResolvedTheme>
  mutedColor: string
  textColor: string
  onSelect?: () => void
  width: number
  isActive?: boolean
  isFocused?: boolean
  isCollapsed?: boolean
  transparentBackground?: boolean
}

/**
 * Render a single tree node line with proper colors
 */
function TreeNodeLine({
  node,
  theme,
  mutedColor,
  textColor,
  onSelect,
  width,
  isActive,
  isFocused,
  isCollapsed,
  transparentBackground,
}: TreeNodeLineProps): React.ReactNode {
  const [isHovered, setIsHovered] = React.useState(false)
  const treePrefix = `${node.prefix}${node.connector}`
  const icon = node.isFile
    ? getFileIcon(node.displayPath)
    : isCollapsed
      ? FOLDER_ICON_CLOSED
      : FOLDER_ICON_OPEN
  const iconFg = isFocused ? rgbaToHex(theme.primary) : mutedColor

  if (node.isFile) {
    // File node - colorize based on status
    const pathColor = node.status ? getStatusColor(node.status, theme) : textColor
    const addColor = rgbaToHex(theme.diffAdded) // green
    const delColor = rgbaToHex(theme.diffRemoved) // red
    const stats = getStatsParts(node)
    const availablePathWidth = Math.max(1, width - ICON_WIDTH - treePrefix.length - stats.text.length)
    const truncatedPath = truncateKeepingEnd(node.displayPath, availablePathWidth)

    const activeBg = isActive ? rgbaToHex(theme.primary.brighten(0.3)) : undefined
    const focusBg = isFocused ? rgbaToHex(theme.primary.brighten(0.15)) : undefined
    const hoverBg = isHovered && !transparentBackground ? rgbaToHex(theme.backgroundPanel) : RGBA.fromInts(0, 0, 0, 0)
    const bgColor = activeBg ?? focusBg ?? hoverBg

    return (
      <box
        style={{
          flexDirection: "row",
          width,
          backgroundColor: bgColor,
        }}
        onMouseMove={() => setIsHovered(true)}
        onMouseOut={() => setIsHovered(false)}
        // onMouseDown={onSelect} // disabled: conflicts with copy selection
      >
        <text fg={mutedColor}>{treePrefix}</text>
        <text fg={iconFg}>{icon} </text>
        <text fg={pathColor}>{truncatedPath}</text>
        <text fg={mutedColor}> (</text>
        {stats.hasAdditions && <text fg={addColor}>+{node.additions}</text>}
        {stats.hasAdditions && stats.hasDeletions && <text fg={mutedColor}>,</text>}
        {stats.hasDeletions && <text fg={delColor}>-{node.deletions}</text>}
        <text fg={mutedColor}>)</text>
      </box>
    )
  }

  const availablePathWidth = Math.max(1, width - ICON_WIDTH - treePrefix.length)
  const truncatedPath = truncateKeepingEnd(node.displayPath, availablePathWidth)

  // Directory node - use muted color for everything
  const dirActiveBg = isActive ? rgbaToHex(theme.primary.brighten(0.3)) : undefined
  const dirFocusBg = isFocused ? rgbaToHex(theme.primary.brighten(0.15)) : undefined
  return (
    <box style={{ flexDirection: "row", width, backgroundColor: dirActiveBg ?? dirFocusBg }}>
      <text fg={mutedColor}>{treePrefix}</text>
      <text fg={iconFg}>{icon} </text>
      <text fg={textColor}>{truncatedPath}</text>
    </box>
  )
}

/**
 * DirectoryTreeView component
 * Renders a directory tree with file status colors and fixed-width truncation for sidebar layout.
 */
function flattenVisible(
  nodes: HierarchicalTreeNode[],
  collapsedPaths: Set<string>,
  prefix: string = "",
): TreeNode[] {
  const result: TreeNode[] = []

  nodes.forEach((node) => {
    result.push({
      displayPath: node.displayPath,
      fullPath: node.fullPath,
      isFile: node.isFile,
      fileIndex: node.fileIndex,
      status: node.status,
      additions: node.additions,
      deletions: node.deletions,
      prefix,
      connector: "  ",
    })

    if (!node.isFile && !collapsedPaths.has(node.displayPath)) {
      result.push(...flattenVisible(node.children, collapsedPaths, prefix + "  "))
    }
  })

  return result
}

export const DirectoryTreeView = React.forwardRef<DirectoryTreeViewRef, DirectoryTreeViewProps>(
  function DirectoryTreeView(
    {
      files,
      onFileSelect,
      onFolderSelect,
      onFocusRowChange,
      themeName,
      width = DEFAULT_SIDEBAR_WIDTH,
      activeFileIndex,
      activeFolderPath,
      initialCollapsedPaths = [],
      transparentBackground,
    },
    ref,
  ): React.ReactNode {
    const [collapsedPaths, setCollapsedPaths] = React.useState<Set<string>>(
      () => new Set(initialCollapsedPaths),
    )
    const [focusedRowIndex, setFocusedRowIndex] = React.useState(0)

    const onFileSelectRef = React.useRef(onFileSelect)
    onFileSelectRef.current = onFileSelect
    const onFolderSelectRef = React.useRef(onFolderSelect)
    onFolderSelectRef.current = onFolderSelect

    const hierarchicalNodes = React.useMemo(() => buildHierarchicalTree(files), [files])
    const visibleNodes = React.useMemo(
      () => flattenVisible(hierarchicalNodes, collapsedPaths),
      [hierarchicalNodes, collapsedPaths],
    )

    React.useEffect(() => {
      setFocusedRowIndex((prev) => Math.min(prev, Math.max(0, visibleNodes.length - 1)))
    }, [visibleNodes.length])

    React.useEffect(() => {
      onFocusRowChange?.(focusedRowIndex)
    }, [focusedRowIndex, onFocusRowChange])

    const activeFileFolders = React.useMemo(() => {
      const result = new Set<string>()
      if (activeFileIndex === undefined) return result

      function walk(nodes: HierarchicalTreeNode[]): boolean {
        for (const node of nodes) {
          if (node.isFile && node.fileIndex === activeFileIndex) {
            return true
          }
          if (!node.isFile) {
            const hasActiveFile = walk(node.children)
            if (hasActiveFile) {
              result.add(node.displayPath)
            }
          }
        }
        return false
      }

      walk(hierarchicalNodes)
      return result
    }, [hierarchicalNodes, activeFileIndex])

    React.useEffect(() => {
      if (activeFolderPath) {
        const idx = visibleNodes.findIndex((n) => !n.isFile && n.fullPath === activeFolderPath)
        if (idx >= 0) {
          setFocusedRowIndex(idx)
          return
        }
      }
      if (activeFileIndex === undefined) return
      const idx = visibleNodes.findIndex((n) => n.isFile && n.fileIndex === activeFileIndex)
      if (idx >= 0) {
        setFocusedRowIndex(idx)
        return
      }
      // Active file is hidden in a collapsed folder — focus the containing folder
      for (let i = 0; i < visibleNodes.length; i++) {
        const node = visibleNodes[i]
        if (node && !node.isFile && collapsedPaths.has(node.displayPath) && activeFileFolders.has(node.displayPath)) {
          setFocusedRowIndex(i)
          return
        }
      }
    }, [activeFileIndex, activeFolderPath, visibleNodes, activeFileFolders, collapsedPaths])

    React.useImperativeHandle(ref, () => ({
      focusNext() {
        setFocusedRowIndex((prev) => {
          const next = Math.min(visibleNodes.length - 1, prev + 1)
          const node = visibleNodes[next]
          if (node?.isFile && node.fileIndex !== undefined) {
            onFileSelectRef.current?.(node.fileIndex)
          } else if (node && !node.isFile) {
            onFolderSelectRef.current?.(node.fullPath)
          }
          return next
        })
      },
      focusPrev() {
        setFocusedRowIndex((prev) => {
          const next = Math.max(0, prev - 1)
          const node = visibleNodes[next]
          if (node?.isFile && node.fileIndex !== undefined) {
            onFileSelectRef.current?.(node.fileIndex)
          } else if (node && !node.isFile) {
            onFolderSelectRef.current?.(node.fullPath)
          }
          return next
        })
      },
      toggleCollapse() {
        setFocusedRowIndex((prev) => {
          const node = visibleNodes[prev]
          if (!node || node.isFile) return prev

          const path = node.displayPath
          setCollapsedPaths((current) => {
            const next = new Set(current)
            if (next.has(path)) next.delete(path)
            else next.add(path)
            return next
          })
          return prev
        })
      },
      getActiveRowIndex() {
        if (activeFolderPath) {
          const idx = visibleNodes.findIndex((n) => !n.isFile && n.fullPath === activeFolderPath)
          if (idx >= 0) return idx
        }
        const idx = visibleNodes.findIndex((n) => n.isFile && n.fileIndex === activeFileIndex)
        if (idx >= 0) return idx
        for (let i = 0; i < visibleNodes.length; i++) {
          const node = visibleNodes[i]
          if (node && !node.isFile && collapsedPaths.has(node.displayPath) && activeFileFolders.has(node.displayPath)) {
            return i
          }
        }
        return 0
      },
    }), [visibleNodes, activeFileFolders, activeFileIndex, activeFolderPath, collapsedPaths])

    const resolvedTheme = getResolvedTheme(themeName)
    const mutedColor = rgbaToHex(resolvedTheme.textMuted)
    const textColor = rgbaToHex(resolvedTheme.text)

    if (visibleNodes.length === 0) {
      return null
    }

    return (
      <box
        style={{
          flexDirection: "column",
          width,
        }}
      >
        {visibleNodes.map((node, idx) => (
          <TreeNodeLine
            key={idx}
            node={node}
            theme={resolvedTheme}
            mutedColor={mutedColor}
            textColor={textColor}
            width={width}
            isActive={
              (node.isFile && node.fileIndex === activeFileIndex) ||
              (!node.isFile && (
                node.fullPath === activeFolderPath ||
                (collapsedPaths.has(node.displayPath) && activeFileFolders.has(node.displayPath))
              ))
            }
            isFocused={idx === focusedRowIndex}
            isCollapsed={!node.isFile && collapsedPaths.has(node.displayPath)}
            transparentBackground={transparentBackground}
            onSelect={
              node.isFile && node.fileIndex !== undefined && onFileSelect
                ? () => onFileSelect(node.fileIndex!)
                : !node.isFile && onFolderSelect
                  ? () => onFolderSelect(node.fullPath)
                  : undefined
            }
          />
        ))}
      </box>
    )
  },
)
