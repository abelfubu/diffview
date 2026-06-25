import { describe, expect, it } from "bun:test"
import { buildUnifiedLogicalLines, extractSelectedNewContent } from "./diff-cursor-utils.js"

const sampleDiff = `diff --git a/src/utils.ts b/src/utils.ts
index abc123..def456 100644
--- a/src/utils.ts
+++ b/src/utils.ts
@@ -1,4 +1,5 @@
 function helper() {
   const x = 1
-  return x
+  // validate
+  return x + 1
 }
`

describe("buildUnifiedLogicalLines", () => {
  it("builds logical lines in unified view order", () => {
    const lines = buildUnifiedLogicalLines(sampleDiff)
    expect(lines.map((l) => ({ type: l.type, content: l.content }))).toEqual([
      { type: "hunk-header", content: "" },
      { type: "context", content: "function helper() {" },
      { type: "context", content: "  const x = 1" },
      { type: "remove", content: "  return x" },
      { type: "add", content: "  // validate" },
      { type: "add", content: "  return x + 1" },
      { type: "context", content: "}" },
    ])
  })

  it("tracks new and old line numbers", () => {
    const lines = buildUnifiedLogicalLines(sampleDiff)
    expect(lines[2]!.newLineNum).toBe(2)
    expect(lines[3]!.oldLineNum).toBe(3)
    expect(lines[4]!.newLineNum).toBe(3)
    expect(lines[5]!.newLineNum).toBe(4)
  })

  it("ignores file metadata lines", () => {
    const lines = buildUnifiedLogicalLines(sampleDiff)
    expect(lines.some((l) => l.content.startsWith("diff --git"))).toBe(false)
    expect(lines.some((l) => l.content.startsWith("index "))).toBe(false)
  })
})

describe("extractSelectedNewContent", () => {
  const lines = buildUnifiedLogicalLines(sampleDiff)

  it("skips removed lines when extracting new content", () => {
    const { code } = extractSelectedNewContent(lines, 0, lines.length - 1)
    // The old removed line should not appear as a standalone line.
    const codeLines = code.split("\n")
    expect(codeLines).not.toContain("  return x")
    expect(code).toContain("  // validate")
    expect(code).toContain("  return x + 1")
    expect(code).toContain("function helper()")
  })

  it("reports the first new line number", () => {
    const { startLineNum } = extractSelectedNewContent(lines, 4, 5)
    expect(startLineNum).toBe(3)
  })

  it("returns empty code when nothing is selected", () => {
    const { code } = extractSelectedNewContent(lines, 3, 3)
    expect(code).toBe("")
  })

  it("includes the cursor line when selection anchor equals cursor", () => {
    const { code } = extractSelectedNewContent(lines, 5, 5)
    expect(code).toBe("  return x + 1")
  })
})
