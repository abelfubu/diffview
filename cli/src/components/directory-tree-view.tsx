// DirectoryTreeView - Renders a directory tree with file status colors and change counts.
// Shows added files in green, modified in default text, deleted in red, renamed in yellow.
// Change counts (+n,-n) use green/red for the numbers, brackets are muted.
// Supports fixed-width sidebar rendering with filename-preserving truncation.

import * as React from "react"
import { buildDirectoryTree, type TreeFileInfo, type TreeNode } from "../directory-tree.js"
import { getResolvedTheme, rgbaToHex } from "../themes.js"

export const DEFAULT_SIDEBAR_WIDTH = 60

export interface DirectoryTreeViewProps {
  /** Files to display in the tree */
  files: TreeFileInfo[]
  /** Callback when a file is clicked (receives fileIndex) */
  onFileSelect?: (fileIndex: number) => void
  /** Theme name for colors */
  themeName: string
  /** Fixed render width for sidebar layout */
  width?: number
  /** Index of the currently active file (for highlight) */
  activeFileIndex?: number
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
}

/**
 * Render a single tree node line with proper colors
 */
const TreeNodeLine: React.FC<TreeNodeLineProps> = ({
  node,
  theme,
  mutedColor,
  textColor,
  onSelect,
  width,
  isActive,
}) => {
  const [isHovered, setIsHovered] = React.useState(false)
  const treePrefix = `${node.prefix}${node.connector}`

  if (node.isFile) {
    // File node - colorize based on status
    const pathColor = node.status ? getStatusColor(node.status, theme) : textColor
    const addColor = rgbaToHex(theme.diffAdded) // green
    const delColor = rgbaToHex(theme.diffRemoved) // red
    const stats = getStatsParts(node)
    const availablePathWidth = Math.max(1, width - treePrefix.length - stats.text.length)
    const truncatedPath = truncateKeepingEnd(node.displayPath, availablePathWidth)

    const activeBg = isActive ? rgbaToHex(theme.primary.brighten(0.3)) : undefined
    const hoverBg = isHovered ? rgbaToHex(theme.backgroundPanel) : undefined
    const bgColor = activeBg ?? hoverBg

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
        <text fg={pathColor}>{truncatedPath}</text>
        <text fg={mutedColor}> (</text>
        {stats.hasAdditions && <text fg={addColor}>+{node.additions}</text>}
        {stats.hasAdditions && stats.hasDeletions && <text fg={mutedColor}>,</text>}
        {stats.hasDeletions && <text fg={delColor}>-{node.deletions}</text>}
        <text fg={mutedColor}>)</text>
      </box>
    )
  }

  const availablePathWidth = Math.max(1, width - treePrefix.length)
  const truncatedPath = truncateKeepingEnd(node.displayPath, availablePathWidth)

  // Directory node - use muted color for everything
  const dirActiveBg = isActive ? rgbaToHex(theme.primary.brighten(0.3)) : undefined
  return (
    <box style={{ flexDirection: "row", width, backgroundColor: dirActiveBg }}>
      <text fg={mutedColor}>{treePrefix}</text>
      <text fg={textColor}>{truncatedPath}</text>
    </box>
  )
}

/**
 * DirectoryTreeView component
 * Renders a directory tree with file status colors and fixed-width truncation for sidebar layout.
 */
export function DirectoryTreeView({
  files,
  onFileSelect,
  themeName,
  width = DEFAULT_SIDEBAR_WIDTH,
  activeFileIndex,
}: DirectoryTreeViewProps): React.ReactElement | null {
  const nodes = React.useMemo(() => buildDirectoryTree(files), [files])
  const resolvedTheme = getResolvedTheme(themeName)
  const mutedColor = rgbaToHex(resolvedTheme.textMuted)
  const textColor = rgbaToHex(resolvedTheme.text)

  if (nodes.length === 0) {
    return null
  }

  return (
    <box
      style={{
        flexDirection: "column",
        width,
      }}
    >
      {nodes.map((node, idx) => (
        <TreeNodeLine
          key={idx}
          node={node}
          theme={resolvedTheme}
          mutedColor={mutedColor}
          textColor={textColor}
          width={width}
          isActive={node.isFile && node.fileIndex === activeFileIndex}
          onSelect={
            node.isFile && node.fileIndex !== undefined && onFileSelect
              ? () => onFileSelect(node.fileIndex!)
              : undefined
          }
        />
      ))}
    </box>
  )
}
