// Tests for the transient copy notification shown after pressing `y`.

import * as React from "react"
import { afterEach, describe, expect, it } from "bun:test"
import { act } from "react"
import { testRender } from "@opentuah/react/test-utils"
import { App } from "./cli.js"
import type { ParsedFile } from "./diff-utils.js"

const sampleDiff = `diff --git a/a.ts b/a.ts
index 1111111..2222222 100644
--- a/a.ts
+++ b/a.ts
@@ -1,4 +1,4 @@
 context
-old
+new
-more
+more-new
 keep
`

function createParsedFile(path: string): ParsedFile {
  return {
    oldFileName: `a/${path}`,
    newFileName: `b/${path}`,
    hunks: [{ lines: [" context", "-old", "+new", "-more", "+more-new", " keep"] }],
    rawDiff: sampleDiff,
  }
}

async function renderUntilStable(
  testSetup: Awaited<ReturnType<typeof testRender>>,
  times: number = 8,
) {
  for (let index = 0; index < times; index++) {
    await new Promise((resolve) => setTimeout(resolve, 50))
    await testSetup.renderOnce()
  }
}

describe("App copy notification", () => {
  let testSetup: Awaited<ReturnType<typeof testRender>> | undefined

  afterEach(() => {
    if (testSetup) {
      act(() => {
        testSetup!.renderer.destroy()
      })
      testSetup = undefined
    }
  })

  it("shows a transient success notification after copying selected lines", async () => {
    const parsedFiles = [createParsedFile("a.ts")]

    testSetup = await testRender(<App parsedFiles={parsedFiles} />, {
      width: 120,
      height: 16,
    })

    await renderUntilStable(testSetup)

    // Focus diff pane, start selection, extend by one line, then copy.
    await act(async () => {
      testSetup!.mockInput.pressTab()
      await testSetup!.renderOnce()
    })
    await act(async () => {
      testSetup!.mockInput.pressKey("v")
      await testSetup!.renderOnce()
    })
    await act(async () => {
      testSetup!.mockInput.pressKey("j")
      await testSetup!.renderOnce()
    })
    await act(async () => {
      testSetup!.mockInput.pressKey("y")
      await testSetup!.renderOnce()
    })

    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("Copied 2 lines")
    expect(frame).toContain("✓")

    // Wait for the auto-hide timeout to clear the notification.
    await new Promise((resolve) => setTimeout(resolve, 2500))
    await act(async () => {
      await testSetup!.renderOnce()
    })

    const clearedFrame = testSetup.captureCharFrame()
    expect(clearedFrame).not.toContain("Copied 2 lines")
    expect(clearedFrame).not.toContain("✓")
  })
})
