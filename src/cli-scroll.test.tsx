// Tests mouse-wheel scrolling behavior in the main diff App scrollbox.

import * as React from "react"
import { afterEach, describe, expect, it } from "bun:test"
import { act } from "react"
import { testRender } from "@opentuah/react/test-utils"
import { App } from "./cli.js"
import type { ParsedFile } from "./diff-utils.js"

function createParsedFile(path: string, index: number, lineCount: number = 1): ParsedFile {
  const lines = Array.from({ length: lineCount }, (_, i) => `+line${i}`)
  return {
    oldFileName: path,
    newFileName: path,
    hunks: [{ lines }],
    rawDiff: [
      `diff --git a/${path} b/${path}`,
      `--- ${path}`,
      `+++ ${path}`,
      `@@ -0,0 +1,${lineCount} @@`,
      ...lines,
    ].join("\n"),
  }
}

describe("App scrollbox", () => {
  let testSetup: Awaited<ReturnType<typeof testRender>>

  afterEach(() => {
    if (testSetup) {
      act(() => {
        testSetup.renderer.destroy()
      })
    }
  })

  it("renders the sidebar navigator beside the diff document", async () => {
    const parsedFiles = [
      createParsedFile("README.md", 0),
      createParsedFile("src/file-01.ts", 1),
    ]

    testSetup = await testRender(<App parsedFiles={parsedFiles} />, {
      width: 120,
      height: 12,
    })

    await act(async () => {
      await testSetup.renderOnce()
    })

    const frame = testSetup.captureCharFrame()
    const lines = frame.split("\n")
    // Sidebar tree content should be visible
    expect(lines[1]).toContain("README.md (+1)")
    expect(lines[2]).toContain("src")
    expect(lines[3]).toContain("file-01.ts (+1)")
    // Diff content should be visible somewhere in the frame
    expect(frame).toContain("line0")
  })

  it("shows only the current file in diff pane", async () => {
    const parsedFiles = [
      createParsedFile("README.md", 0),
      createParsedFile("src/file-01.ts", 1),
      createParsedFile("src/file-02.ts", 2),
    ]

    testSetup = await testRender(<App parsedFiles={parsedFiles} />, {
      width: 120,
      height: 12,
    })

    await act(async () => {
      await testSetup.renderOnce()
    })

    const frame = testSetup.captureCharFrame()
    // Should show first file's content
    expect(frame).toContain("line0")
    // Should NOT show other files' content
    expect(frame).not.toContain("file-01.ts +1-0")
    expect(frame).not.toContain("file-02.ts +1-0")
  })

  it("toggles sidebar visibility with b key", async () => {
    const parsedFiles = [
      createParsedFile("README.md", 0),
      createParsedFile("src/file-01.ts", 1),
    ]

    testSetup = await testRender(<App parsedFiles={parsedFiles} />, {
      width: 120,
      height: 12,
    })

    await act(async () => {
      await testSetup.renderOnce()
    })

    // Sidebar is visible initially
    const before = testSetup.captureCharFrame()
    expect(before).toContain("README.md (+1)")

    // Press b to hide sidebar
    testSetup.mockInput.pressKey("b")
    await new Promise((r) => setTimeout(r, 10))
    await act(async () => {
      await testSetup.renderOnce()
    })

    const hidden = testSetup.captureCharFrame()
    // Sidebar content should no longer be visible in the frame
    expect(hidden).not.toContain("README.md (+1)")

    // Press b again to show sidebar
    testSetup.mockInput.pressKey("b")
    await new Promise((r) => setTimeout(r, 10))
    await act(async () => {
      await testSetup.renderOnce()
    })

    const shown = testSetup.captureCharFrame()
    expect(shown).toContain("README.md (+1)")
  })

  it("does not reopen sidebar when file picker selects a file", async () => {
    const parsedFiles = [
      createParsedFile("README.md", 0),
      createParsedFile("src/file-01.ts", 1),
    ]

    testSetup = await testRender(<App parsedFiles={parsedFiles} />, {
      width: 120,
      height: 12,
    })

    await act(async () => {
      await testSetup.renderOnce()
    })

    // Hide sidebar
    testSetup.mockInput.pressKey("b")
    await new Promise((r) => setTimeout(r, 10))
    await act(async () => {
      await testSetup.renderOnce()
    })

    const hidden = testSetup.captureCharFrame()
    expect(hidden).not.toContain("README.md (+1)")

    // Open file picker
    testSetup.mockInput.pressKey("p")
    await new Promise((r) => setTimeout(r, 10))
    await act(async () => {
      await testSetup.renderOnce()
    })

    // Dropdown should be visible
    const withDropdown = testSetup.captureCharFrame()
    expect(withDropdown).toContain("Search files...")

    // Select first option (README.md) with Enter
    testSetup.mockInput.pressEnter()
    await new Promise((r) => setTimeout(r, 10))
    await act(async () => {
      await testSetup.renderOnce()
    })

    // Dropdown should close and sidebar should remain hidden
    const afterSelect = testSetup.captureCharFrame()
    expect(afterSelect).not.toContain("Search files...")
    expect(afterSelect).not.toContain("README.md (+1)")
  })

  it("navigates files with j/k when sidebar is focused", async () => {
    const parsedFiles = [
      createParsedFile("README.md", 0),
      createParsedFile("src/file-01.ts", 1),
      createParsedFile("src/file-02.ts", 2),
    ]

    testSetup = await testRender(<App parsedFiles={parsedFiles} />, {
      width: 120,
      height: 12,
    })

    await act(async () => {
      await testSetup.renderOnce()
    })

    const initialFrame = testSetup.captureCharFrame()
    expect(initialFrame).toContain("line0")
    expect(initialFrame).not.toContain("Select theme")

    // Sidebar is focused by default, press j to move to next file
    testSetup.mockInput.pressKey("j")
    await new Promise((r) => setTimeout(r, 50))
    await act(async () => {
      await testSetup.renderOnce()
    })

    const afterJ = testSetup.captureCharFrame()
    // Should show file 1's header
    expect(afterJ).toContain("file-01.ts")

    // Press k to move back to previous file
    testSetup.mockInput.pressKey("k")
    await new Promise((r) => setTimeout(r, 50))
    await act(async () => {
      await testSetup.renderOnce()
    })

    const afterK = testSetup.captureCharFrame()
    // Should show file 0's header
    expect(afterK).toContain("README.md")
  })

  it("scrolls within single file with j/k when diff pane is focused", async () => {
    // Create a single file with many lines
    const parsedFiles = [
      createParsedFile("src/large-file.ts", 0, 20),
    ]

    testSetup = await testRender(<App parsedFiles={parsedFiles} />, {
      width: 120,
      height: 12,
    })

    await act(async () => {
      await testSetup.renderOnce()
    })

    const before = testSetup.captureCharFrame()
    expect(before).toContain("line0")

    // Switch to diff pane focus
    testSetup.mockInput.pressTab()
    await new Promise((r) => setTimeout(r, 10))

    // Press j several times to scroll down within the file
    for (let i = 0; i < 5; i++) {
      testSetup.mockInput.pressKey("j")
      await new Promise((r) => setTimeout(r, 5))
    }
    await act(async () => {
      await testSetup.renderOnce()
    })

    const afterJ = testSetup.captureCharFrame()
    // After scrolling, frame should have changed
    expect(afterJ).not.toBe(before)
  })

  it("file picker works after tab focus switch", async () => {
    const parsedFiles = [
      createParsedFile("README.md", 0),
      createParsedFile("src/file-01.ts", 1),
    ]

    testSetup = await testRender(<App parsedFiles={parsedFiles} />, {
      width: 120,
      height: 12,
    })

    await act(async () => {
      await testSetup.renderOnce()
    })

    // Press tab to switch focus, then p to open picker
    testSetup.mockInput.pressTab()
    await new Promise((r) => setTimeout(r, 10))
    testSetup.mockInput.pressKey("p")
    await new Promise((r) => setTimeout(r, 10))
    await act(async () => {
      await testSetup.renderOnce()
    })

    // Press escape to close
    testSetup.mockInput.pressEscape()
    await new Promise((r) => setTimeout(r, 10))
    await act(async () => {
      await testSetup.renderOnce()
    })

    // Should not crash; frame should be valid
    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("README.md")
  })

  it("toggles folder collapse with l/h when sidebar is focused", async () => {
    const parsedFiles = [
      createParsedFile("src/file-01.ts", 0),
      createParsedFile("src/file-02.ts", 1),
    ]

    testSetup = await testRender(<App parsedFiles={parsedFiles} />, {
      width: 120,
      height: 12,
    })

    await act(async () => {
      await testSetup.renderOnce()
    })

    const initialFrame = testSetup.captureCharFrame()
    expect(initialFrame).toContain("src")
    expect(initialFrame).toContain("file-01.ts")
    expect(initialFrame).toContain("file-02.ts")

    // Focus is on file-01.ts (row 1). Press k to move to src folder (row 0).
    testSetup.mockInput.pressKey("k")
    await new Promise((r) => setTimeout(r, 50))
    await act(async () => {
      await testSetup.renderOnce()
    })

    // Press l to collapse the folder
    testSetup.mockInput.pressKey("l")
    await new Promise((r) => setTimeout(r, 50))
    await act(async () => {
      await testSetup.renderOnce()
    })

    const afterCollapse = testSetup.captureCharFrame()
    // Sidebar shows closed folder icon, no TypeScript file icons
    expect(afterCollapse).toContain("󰉋")
    expect(afterCollapse).not.toContain("󰛦")

    // Press h to expand the folder
    testSetup.mockInput.pressKey("h")
    await new Promise((r) => setTimeout(r, 50))
    await act(async () => {
      await testSetup.renderOnce()
    })

    const afterExpand = testSetup.captureCharFrame()
    // Sidebar shows open folder icon and TypeScript file icons again
    expect(afterExpand).toContain("󰝰")
    expect(afterExpand).toContain("󰛦")
  })
})
