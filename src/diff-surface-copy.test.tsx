// Tests for captureSelectedDiffText — copying selected diff rows from the renderable surface.

import * as React from "react"
import { afterEach, describe, expect, it } from "bun:test"
import { testRender } from "@opentuah/react/test-utils"
import { getDataPaths } from "@opentuah/core"
import { DiffView, type DiffViewRef } from "./components/diff-view.js"
import { captureSelectedDiffText } from "./diff-surface-copy.js"

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

getDataPaths().setMaxListeners(50)

// Logical line order for this diff (matching DiffRenderable grouping):
// 0: context
// 1: remove "old"
// 2: remove "more"
// 3: add "new"
// 4: add "more-new"
// 5: context
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

async function setupTest(jsx: React.ReactNode, opts: { width: number; height: number }) {
  const setup = await testRender(jsx, opts)
  globalThis.IS_REACT_ACT_ENVIRONMENT = false
  return setup
}

async function renderUntilStable(
  testSetup: Awaited<ReturnType<typeof testRender>>,
  times: number = 5,
) {
  for (let index = 0; index < times; index++) {
    await new Promise((resolve) => setTimeout(resolve, 50))
    await testSetup.renderOnce()
  }
}

function renderDiffView(props: {
  diff: string
  view: "split" | "unified"
  filetype: string
  selection?: { start: number; end: number }
  focused?: boolean
}) {
  const ref = React.createRef<DiffViewRef>()
  const element = (
    <DiffView
      ref={ref}
      diff={props.diff}
      view={props.view}
      filetype={props.filetype}
      themeName="github"
      focused={props.focused ?? true}
      cursorLine={props.selection?.start ?? 0}
      selection={props.selection ?? null}
    />
  )
  return { element, ref }
}

describe("captureSelectedDiffText", () => {
  let testSetup: Awaited<ReturnType<typeof testRender>> | undefined

  afterEach(() => {
    if (testSetup) {
      testSetup.renderer.destroy()
      testSetup = undefined
    }
  })

  it("returns null when no renderable is provided", () => {
    const result = captureSelectedDiffText(undefined, { start: 0, end: 0 })
    expect(result.text).toBeNull()
  })

  it("copies unified view rendered rows", async () => {
    const { element, ref } = renderDiffView({
      diff: sampleDiff,
      view: "unified",
      filetype: "ts",
      selection: { start: 1, end: 3 },
    })

    testSetup = await setupTest(element, { width: 80, height: 12 })
    await renderUntilStable(testSetup)

    const diffRenderable = ref.current?.getDiffRenderable()
    expect(diffRenderable).toBeDefined()

    const result = captureSelectedDiffText(diffRenderable, { start: 1, end: 3 })
    expect(result.text).toBe("old\nmore\nnew")
  })

  it("copies new-side rows in split view", async () => {
    const { element, ref } = renderDiffView({
      diff: sampleDiff,
      view: "split",
      filetype: "ts",
      selection: { start: 1, end: 4 },
    })

    testSetup = await setupTest(element, { width: 160, height: 12 })
    await renderUntilStable(testSetup)

    const diffRenderable = ref.current?.getDiffRenderable()
    expect(diffRenderable).toBeDefined()

    const result = captureSelectedDiffText(diffRenderable, { start: 1, end: 4 })
    // In split view we copy the right side. Removed-only logical rows are empty
    // padding on the new side; added rows contain the new code.
    expect(result.text).toBeDefined()
    expect(result.text).toContain("new")
    expect(result.text).toContain("more-new")
    expect(result.text).not.toContain("old")
  })

  it("reports the first new line number in unified view", async () => {
    const { element, ref } = renderDiffView({
      diff: sampleDiff,
      view: "unified",
      filetype: "ts",
      selection: { start: 2, end: 3 },
    })

    testSetup = await setupTest(element, { width: 80, height: 12 })
    await renderUntilStable(testSetup)

    const diffRenderable = ref.current?.getDiffRenderable()
    const result = captureSelectedDiffText(diffRenderable, { start: 2, end: 3 })
    expect(result.startLineNum).toBe(3)
  })

  it("reports the first new line number in split view", async () => {
    const { element, ref } = renderDiffView({
      diff: sampleDiff,
      view: "split",
      filetype: "ts",
      selection: { start: 2, end: 4 },
    })

    testSetup = await setupTest(element, { width: 160, height: 12 })
    await renderUntilStable(testSetup)

    const diffRenderable = ref.current?.getDiffRenderable()
    const result = captureSelectedDiffText(diffRenderable, { start: 2, end: 4 })
    expect(result.startLineNum).toBe(3)
  })

  it("handles a single-line selection", async () => {
    const { element, ref } = renderDiffView({
      diff: sampleDiff,
      view: "unified",
      filetype: "ts",
      selection: { start: 3, end: 3 },
    })

    testSetup = await setupTest(element, { width: 80, height: 12 })
    await renderUntilStable(testSetup)

    const diffRenderable = ref.current?.getDiffRenderable()
    const result = captureSelectedDiffText(diffRenderable, { start: 3, end: 3 })
    expect(result.text).toBe("new")
  })

  it("ignores out-of-bounds indices", async () => {
    const { element, ref } = renderDiffView({
      diff: sampleDiff,
      view: "unified",
      filetype: "ts",
      selection: { start: 100, end: 105 },
    })

    testSetup = await setupTest(element, { width: 80, height: 12 })
    await renderUntilStable(testSetup)

    const diffRenderable = ref.current?.getDiffRenderable()
    const result = captureSelectedDiffText(diffRenderable, { start: 100, end: 105 })
    expect(result.text).toBe("")
  })
})
