import { describe, expect, it } from "bun:test"
import { buildUnifiedLogicalLines } from "./diff-cursor-utils.js"

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

