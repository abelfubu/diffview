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
 * This mirrors opentuah's DiffRenderable.buildUnifiedView: consecutive removed
 * and added lines are grouped into one change block, with all removed lines
 * emitted before all added lines.
 *
 * Hunk headers are included as rows so cursor alignment stays correct, but they
 * are skipped when extracting code.
 */
export function buildUnifiedLogicalLines(rawDiff: string): DiffLogicalLine[] {
  const lines: DiffLogicalLine[] = []
  let oldLineNum = 0
  let newLineNum = 0

  const rawLines = rawDiff.split("\n")
  let i = 0
  while (i < rawLines.length) {
    const line = rawLines[i]
    if (line === undefined || line.length === 0) {
      i++
      continue
    }

    if (line.startsWith("@@")) {
      const match = HUNK_HEADER_RE.exec(line)
      if (match) {
        oldLineNum = parseInt(match[1]!, 10)
        newLineNum = parseInt(match[2]!, 10)
        const context = match[3]!.trimStart()
        lines.push({ type: "hunk-header", content: context })
      }
      i++
      continue
    }

    if (isFileMetaLine(line)) {
      i++
      continue
    }

    const firstChar = line[0]
    const content = line.slice(1)

    if (firstChar === " ") {
      lines.push({ type: "context", content, oldLineNum, newLineNum })
      oldLineNum++
      newLineNum++
      i++
    } else if (firstChar === "\\") {
      // "\ No newline at end of file" marker — skip
      i++
    } else if (firstChar === "-" || firstChar === "+") {
      // Collect a contiguous change block of removes and adds, then emit all
      // removes followed by all adds (matching DiffRenderable grouping).
      const removes: { content: string; oldLineNum: number }[] = []
      const adds: { content: string; newLineNum: number }[] = []
      while (i < rawLines.length) {
        const currentLine = rawLines[i]
        if (currentLine === undefined || currentLine.length === 0) break
        const currentChar = currentLine[0]
        if (currentChar === " " || currentChar === "\\") break
        const currentContent = currentLine.slice(1)
        if (currentChar === "-") {
          removes.push({ content: currentContent, oldLineNum })
          oldLineNum++
        } else if (currentChar === "+") {
          adds.push({ content: currentContent, newLineNum })
          newLineNum++
        }
        i++
      }
      for (const remove of removes) {
        lines.push({ type: "remove", content: remove.content, oldLineNum: remove.oldLineNum })
      }
      for (const add of adds) {
        lines.push({ type: "add", content: add.content, newLineNum: add.newLineNum })
      }
    } else {
      // Unknown line prefix — skip
      i++
    }
  }

  return lines
}


