// Utilities for keyboard-driven cursor/selection in the diff view.
// Maps between logical diff lines (as rendered by DiffRenderable in unified view)
// and user selections, so we can copy selected new content in markdown format.

export interface DiffLogicalLine {
  type: "hunk-header" | "context" | "add" | "remove" | "empty"
  content: string
  oldLineNum?: number
  newLineNum?: number
}

const HUNK_HEADER_RE = /^@@\s+-(\d+)(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@(.*)/

function isFileMetaLine(line: string): boolean {
  return (
    line.startsWith("diff --git") ||
    line.startsWith("index ") ||
    line.startsWith("--- ") ||
    line.startsWith("+++ ") ||
    line.startsWith("similarity index") ||
    line.startsWith("rename from") ||
    line.startsWith("rename to") ||
    line.startsWith("copy from") ||
    line.startsWith("copy to") ||
    line.startsWith("new file mode") ||
    line.startsWith("deleted file mode")
  )
}

/**
 * Rebuild the logical line order that DiffRenderable uses for its unified view.
 * Each returned item corresponds to one row in the internal CodeRenderable content,
 * so line indices match what DiffRenderable.highlightLines() expects.
 *
 * Hunk headers are included as rows so cursor alignment stays correct, but they
 * are skipped when extracting code.
 */
export function buildUnifiedLogicalLines(rawDiff: string): DiffLogicalLine[] {
  const lines: DiffLogicalLine[] = []
  let oldLineNum = 0
  let newLineNum = 0

  for (const line of rawDiff.split("\n")) {
    if (line.length === 0) continue

    if (line.startsWith("@@")) {
      const match = HUNK_HEADER_RE.exec(line)
      if (match) {
        oldLineNum = parseInt(match[1]!, 10)
        newLineNum = parseInt(match[2]!, 10)
        const context = match[3]!.trimStart()
        lines.push({ type: "hunk-header", content: context })
      }
      continue
    }

    if (isFileMetaLine(line)) continue

    const firstChar = line[0]
    const content = line.slice(1)

    if (firstChar === " ") {
      lines.push({ type: "context", content, oldLineNum, newLineNum })
      oldLineNum++
      newLineNum++
    } else if (firstChar === "-") {
      lines.push({ type: "remove", content, oldLineNum })
      oldLineNum++
    } else if (firstChar === "+") {
      lines.push({ type: "add", content, newLineNum })
      newLineNum++
    } else if (firstChar === "\\") {
      // "\ No newline at end of file" marker — skip
    }
  }

  return lines
}

/**
 * Extract the new-content code for the given logical line range.
 * Includes context and added lines; skips removed lines and hunk headers.
 * Returns the trimmed code block and the first new line number found (if any).
 *
 * When `startIndex === endIndex` the single cursor line is copied, so pressing `y`
 * without an active selection still copies the current line.
 */
export function extractSelectedNewContent(
  lines: DiffLogicalLine[],
  startIndex: number,
  endIndex: number,
): { code: string; startLineNum?: number } {
  const start = Math.max(0, Math.min(startIndex, endIndex))
  const end = Math.min(lines.length - 1, Math.max(startIndex, endIndex))

  const selected: string[] = []
  let startLineNum: number | undefined

  for (let i = start; i <= end; i++) {
    const line = lines[i]
    if (!line) continue
    if (line.type === "remove" || line.type === "hunk-header" || line.type === "empty") continue
    if (line.newLineNum !== undefined && startLineNum === undefined) {
      startLineNum = line.newLineNum
    }
    selected.push(line.content)
  }

  return { code: selected.join("\n"), startLineNum }
}
