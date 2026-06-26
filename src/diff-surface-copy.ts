// Capture selected diff text directly from the rendered DiffRenderable surface.
// This avoids reconstructing the patch from file.rawDiff and is immune to
// balanceDelimiters drift because it copies exactly what is on screen.

import type { DiffRenderable } from "@opentuah/core"

export interface CaptureSelectedDiffTextResult {
  /** The captured text, or null if the renderable could not be read. */
  text: string | null
  /** The first new line number in the selection, if available. */
  startLineNum?: number
}

interface PrivateCodeRenderable {
  plainText: string
}

interface PrivateLineNumberRenderable {
  view?: "unified" | "split"
  leftCodeRenderable?: PrivateCodeRenderable | null
  rightCodeRenderable?: PrivateCodeRenderable | null
  leftSide?: PrivateLineNumberSide | null
  rightSide?: PrivateLineNumberSide | null
}

interface PrivateLineNumberSide {
  _lineNumbers?: Map<number, number>
}

function getCodeRenderable(diff: DiffRenderable, view: "unified" | "split"): PrivateCodeRenderable | null | undefined {
  const d = diff as unknown as PrivateLineNumberRenderable
  if (view === "split") {
    return d.rightCodeRenderable
  }
  return d.leftCodeRenderable
}

function getLineNumbers(diff: DiffRenderable, view: "unified" | "split"): Map<number, number> | undefined {
  const d = diff as unknown as PrivateLineNumberRenderable
  const side = view === "split" ? d.rightSide : d.leftSide
  return side?._lineNumbers
}

/**
 * Read the text currently shown on the selected logical rows of a DiffRenderable.
 *
 * - Unified view: returns the rendered unified diff rows.
 * - Split view: returns the new (right-hand) side rows.
 *
 * The helper reaches into DiffRenderable private internals; callers should treat
 * it as tightly coupled to the current opentuah implementation.
 */
export function captureSelectedDiffText(
  diffRenderable: DiffRenderable | null | undefined,
  selection: { start: number; end: number },
): CaptureSelectedDiffTextResult {
  if (!diffRenderable) {
    return { text: null }
  }

  const view = (diffRenderable as unknown as PrivateLineNumberRenderable).view ?? "unified"
  const codeRenderable = getCodeRenderable(diffRenderable, view)
  if (!codeRenderable) {
    return { text: null }
  }

  const allLines = codeRenderable.plainText.split("\n")
  const startLogical = Math.min(selection.start, selection.end)
  const endLogical = Math.max(selection.start, selection.end)

  const selectedLines: string[] = []
  for (let i = startLogical; i <= endLogical; i++) {
    if (i >= 0 && i < allLines.length) {
      selectedLines.push(allLines[i]!)
    }
  }

  const lineNumbers = getLineNumbers(diffRenderable, view)
  let startLineNum: number | undefined
  for (let i = startLogical; i <= endLogical; i++) {
    const num = lineNumbers?.get(i)
    if (num !== undefined) {
      startLineNum = num
      break
    }
  }

  return { text: selectedLines.join("\n"), startLineNum }
}
