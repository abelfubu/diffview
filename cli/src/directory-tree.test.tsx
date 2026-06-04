// Tests for directory tree building and rendering
// Uses opentui test renderer with captureCharFrame() for visual testing

import { testRender } from "@opentuah/react/test-utils"
import { afterEach, describe, expect, it } from "bun:test"
import { DirectoryTreeView } from "./components/directory-tree-view.js"
import { buildDirectoryTree, buildHierarchicalTree, type TreeFileInfo, type TreeNode } from "./directory-tree.js"

/**
 * Simple component to render tree nodes as text for testing
 */
function TreeRenderer({ nodes }: { nodes: TreeNode[] }) {
	return (
		<box style={{ flexDirection: "column" }}>
			{nodes.map((node, idx) => {
				// Build the line: prefix + connector + path + optional stats
				const statsStr = node.isFile
					? ` (+${node.additions},-${node.deletions})`
					: ""

				return (
					<text key={idx}>
						{node.prefix}
						{node.connector}
						{node.displayPath}
						{statsStr}
					</text>
				)
			})}
		</box>
	)
}

describe("buildDirectoryTree", () => {
	it("should return empty array for no files", () => {
		const result = buildDirectoryTree([])
		expect(result).toEqual([])
	})

	it("should handle single file at root", () => {
		const files: TreeFileInfo[] = [
			{ path: "README.md", status: "modified", additions: 5, deletions: 2 },
		]
		const result = buildDirectoryTree(files)
		expect(result).toHaveLength(1)
		expect(result[0]!.displayPath).toBe("README.md")
		expect(result[0]!.isFile).toBe(true)
		expect(result[0]!.status).toBe("modified")
	})

	it("should collapse single-child directories", () => {
		const files: TreeFileInfo[] = [
			{ path: "src/components/Button.tsx", status: "added", additions: 50, deletions: 0 },
		]
		const result = buildDirectoryTree(files)
		// Should collapse src/components into one directory node
		expect(result).toHaveLength(2)
		expect(result[0]!.displayPath).toBe("src/components")
		expect(result[0]!.isFile).toBe(false)
		expect(result[1]!.displayPath).toBe("Button.tsx")
		expect(result[1]!.isFile).toBe(true)
	})

	it("should sort nodes alphabetically regardless of input order", () => {
		const files: TreeFileInfo[] = [
			{ path: "website/src/index.ts", status: "modified", additions: 1, deletions: 0 },
			{ path: "db/schema.prisma", status: "modified", additions: 1, deletions: 0 },
			{ path: "discord/src/utils.ts", status: "modified", additions: 1, deletions: 0 },
			{ path: "discord/src/cli.ts", status: "modified", additions: 1, deletions: 0 },
			{ path: "gateway-proxy/src/main.rs", status: "modified", additions: 1, deletions: 0 },
		]

		const result = buildDirectoryTree(files)

		const rendered = result.map((node) => `${node.prefix}${node.connector}${node.displayPath}`)
		expect(rendered).toEqual([
			"  db",
			"    schema.prisma",
			"  discord/src",
			"    cli.ts",
			"    utils.ts",
			"  gateway-proxy/src",
			"    main.rs",
			"  website/src",
			"    index.ts",
		])
	})
})

describe("TreeRenderer visual tests", () => {
	let testSetup: Awaited<ReturnType<typeof testRender>>

	afterEach(() => {
		if (testSetup) {
			testSetup.renderer.destroy()
		}
	})

	it("should render single file", async () => {
		const files: TreeFileInfo[] = [
			{ path: "package.json", status: "modified", additions: 1, deletions: 1 },
		]
		const nodes = buildDirectoryTree(files)

		testSetup = await testRender(<TreeRenderer nodes={nodes} />, {
			width: 50,
			height: 5,
		})
		globalThis.IS_REACT_ACT_ENVIRONMENT = false

		await testSetup.renderOnce()
		const frame = testSetup.captureCharFrame()
		expect(frame).toMatchSnapshot()
	})

	it("should render multiple root files", async () => {
		const files: TreeFileInfo[] = [
			{ path: "package.json", status: "modified", additions: 1, deletions: 1 },
			{ path: "README.md", status: "added", additions: 20, deletions: 0 },
			{ path: "tsconfig.json", status: "deleted", additions: 0, deletions: 15 },
		]
		const nodes = buildDirectoryTree(files)

		testSetup = await testRender(<TreeRenderer nodes={nodes} />, {
			width: 50,
			height: 7,
		})
		globalThis.IS_REACT_ACT_ENVIRONMENT = false

		await testSetup.renderOnce()
		const frame = testSetup.captureCharFrame()
		expect(frame).toMatchSnapshot()
	})

	it("should render nested directories with indentation", async () => {
		const files: TreeFileInfo[] = [
			{ path: "src/index.ts", status: "modified", additions: 5, deletions: 2 },
			{ path: "src/utils.ts", status: "added", additions: 30, deletions: 0 },
		]
		const nodes = buildDirectoryTree(files)

		testSetup = await testRender(<TreeRenderer nodes={nodes} />, {
			width: 50,
			height: 7,
		})
		globalThis.IS_REACT_ACT_ENVIRONMENT = false

		await testSetup.renderOnce()
		const frame = testSetup.captureCharFrame()
		expect(frame).toMatchSnapshot()
	})

	it("should collapse single-child directories", async () => {
		const files: TreeFileInfo[] = [
			{ path: "src/components/Button.tsx", status: "added", additions: 50, deletions: 0 },
			{ path: "src/components/Input.tsx", status: "added", additions: 40, deletions: 0 },
		]
		const nodes = buildDirectoryTree(files)

		testSetup = await testRender(<TreeRenderer nodes={nodes} />, {
			width: 50,
			height: 7,
		})
		globalThis.IS_REACT_ACT_ENVIRONMENT = false

		await testSetup.renderOnce()
		const frame = testSetup.captureCharFrame()
		expect(frame).toMatchSnapshot()
	})

	it("should render complex nested structure", async () => {
		const files: TreeFileInfo[] = [
			{ path: "package.json", status: "modified", additions: 2, deletions: 1, fileIndex: 0 },
			{ path: "src/index.ts", status: "modified", additions: 10, deletions: 5, fileIndex: 1 },
			{ path: "src/components/Button.tsx", status: "added", additions: 50, deletions: 0, fileIndex: 2 },
			{ path: "src/components/Input.tsx", status: "modified", additions: 15, deletions: 8, fileIndex: 3 },
			{ path: "src/utils/helpers.ts", status: "deleted", additions: 0, deletions: 30, fileIndex: 4 },
			{ path: "tests/index.test.ts", status: "added", additions: 25, deletions: 0, fileIndex: 5 },
		]
		const nodes = buildDirectoryTree(files)

		testSetup = await testRender(<TreeRenderer nodes={nodes} />, {
			width: 60,
			height: 15,
		})
		globalThis.IS_REACT_ACT_ENVIRONMENT = false

		await testSetup.renderOnce()
		const frame = testSetup.captureCharFrame()
		expect(frame).toMatchSnapshot()
	})

	it("should handle deeply nested paths with collapse", async () => {
		const files: TreeFileInfo[] = [
			{ path: "packages/core/src/lib/utils/helpers.ts", status: "modified", additions: 5, deletions: 3 },
			{ path: "packages/core/src/lib/utils/format.ts", status: "added", additions: 20, deletions: 0 },
		]
		const nodes = buildDirectoryTree(files)

		testSetup = await testRender(<TreeRenderer nodes={nodes} />, {
			width: 60,
			height: 7,
		})
		globalThis.IS_REACT_ACT_ENVIRONMENT = false

		await testSetup.renderOnce()
		const frame = testSetup.captureCharFrame()
		expect(frame).toMatchSnapshot()
	})

	it("should handle sibling directories at different levels", async () => {
		const files: TreeFileInfo[] = [
			{ path: "src/api/routes.ts", status: "modified", additions: 10, deletions: 5 },
			{ path: "src/api/handlers.ts", status: "added", additions: 30, deletions: 0 },
			{ path: "src/db/models.ts", status: "modified", additions: 8, deletions: 2 },
			{ path: "lib/utils.ts", status: "added", additions: 15, deletions: 0 },
		]
		const nodes = buildDirectoryTree(files)

		testSetup = await testRender(<TreeRenderer nodes={nodes} />, {
			width: 60,
			height: 12,
		})
		globalThis.IS_REACT_ACT_ENVIRONMENT = false

		await testSetup.renderOnce()
		const frame = testSetup.captureCharFrame()
		expect(frame).toMatchSnapshot()
	})
})

describe("buildHierarchicalTree", () => {
	it("should return empty array for no files", () => {
		const result = buildHierarchicalTree([])
		expect(result).toEqual([])
	})

	it("should handle single file at root", () => {
		const files: TreeFileInfo[] = [
			{ path: "README.md", status: "modified", additions: 5, deletions: 2 },
		]
		const result = buildHierarchicalTree(files)
		expect(result).toHaveLength(1)
		expect(result[0]!.displayPath).toBe("README.md")
		expect(result[0]!.isFile).toBe(true)
		expect(result[0]!.status).toBe("modified")
		expect(result[0]!.children).toEqual([])
	})

	it("should build nested directory hierarchy", () => {
		const files: TreeFileInfo[] = [
			{ path: "src/index.ts", status: "modified", additions: 5, deletions: 2 },
			{ path: "src/utils.ts", status: "added", additions: 30, deletions: 0 },
		]
		const result = buildHierarchicalTree(files)
		expect(result).toHaveLength(1)
		expect(result[0]!.displayPath).toBe("src")
		expect(result[0]!.isFile).toBe(false)
		expect(result[0]!.children).toHaveLength(2)
		expect(result[0]!.children[0]!.displayPath).toBe("index.ts")
		expect(result[0]!.children[0]!.isFile).toBe(true)
		expect(result[0]!.children[1]!.displayPath).toBe("utils.ts")
		expect(result[0]!.children[1]!.isFile).toBe(true)
	})

	it("should collapse single-child directories in hierarchy", () => {
		const files: TreeFileInfo[] = [
			{ path: "src/components/Button.tsx", status: "added", additions: 50, deletions: 0 },
		]
		const result = buildHierarchicalTree(files)
		expect(result).toHaveLength(1)
		expect(result[0]!.displayPath).toBe("src/components")
		expect(result[0]!.isFile).toBe(false)
		expect(result[0]!.children).toHaveLength(1)
		expect(result[0]!.children[0]!.displayPath).toBe("Button.tsx")
		expect(result[0]!.children[0]!.isFile).toBe(true)
	})

	it("should sort nodes alphabetically at every level", () => {
		const files: TreeFileInfo[] = [
			{ path: "b/file.ts", status: "modified", additions: 1, deletions: 0 },
			{ path: "a/file.ts", status: "modified", additions: 1, deletions: 0 },
		]
		const result = buildHierarchicalTree(files)
		expect(result).toHaveLength(2)
		expect(result[0]!.displayPath).toBe("a")
		expect(result[1]!.displayPath).toBe("b")
	})
})

describe("DirectoryTreeView component", () => {
	let testSetup: Awaited<ReturnType<typeof testRender>>

	afterEach(() => {
		if (testSetup) {
			testSetup.renderer.destroy()
		}
	})

	it("renders folder icon on directory rows", async () => {
		const files: TreeFileInfo[] = [
			{ path: "src/index.ts", status: "modified", additions: 5, deletions: 2, fileIndex: 0 },
		]

		testSetup = await testRender(
			<DirectoryTreeView files={files} themeName="github" />,
			{ width: 60, height: 5 },
		)
		globalThis.IS_REACT_ACT_ENVIRONMENT = false

		await testSetup.renderOnce()
		const frame = testSetup.captureCharFrame()
		expect(frame).toContain("󰉋")
	})

	it("renders file-type icon on file rows", async () => {
		const files: TreeFileInfo[] = [
			{ path: "README.md", status: "modified", additions: 5, deletions: 2, fileIndex: 0 },
			{ path: "src/index.ts", status: "added", additions: 30, deletions: 0, fileIndex: 1 },
		]

		testSetup = await testRender(
			<DirectoryTreeView files={files} themeName="github" />,
			{ width: 60, height: 5 },
		)
		globalThis.IS_REACT_ACT_ENVIRONMENT = false

		await testSetup.renderOnce()
		const frame = testSetup.captureCharFrame()
		expect(frame).toContain("󰍔")
		expect(frame).toContain("󰛦")
	})

	it("renders generic file icon for unknown extensions", async () => {
		const files: TreeFileInfo[] = [
			{ path: "config.yaml", status: "modified", additions: 1, deletions: 0, fileIndex: 0 },
		]

		testSetup = await testRender(
			<DirectoryTreeView files={files} themeName="github" />,
			{ width: 60, height: 3 },
		)
		globalThis.IS_REACT_ACT_ENVIRONMENT = false

		await testSetup.renderOnce()
		const frame = testSetup.captureCharFrame()
		expect(frame).toContain("󰈙")
	})

	it("should render tree without border", async () => {
		const files: TreeFileInfo[] = [
			{ path: "src/index.ts", status: "modified", additions: 5, deletions: 2, fileIndex: 0 },
			{ path: "src/utils.ts", status: "added", additions: 30, deletions: 0, fileIndex: 1 },
			{ path: "README.md", status: "deleted", additions: 0, deletions: 15, fileIndex: 2 },
		]

		testSetup = await testRender(
			<DirectoryTreeView files={files} themeName="github" />,
			{ width: 60, height: 12 },
		)
		globalThis.IS_REACT_ACT_ENVIRONMENT = false

		await testSetup.renderOnce()
		const frame = testSetup.captureCharFrame()
		expect(frame).toMatchSnapshot()
	})

	it("truncates long file paths while preserving the filename", async () => {
		const files: TreeFileInfo[] = [
			{
				path: "packages/core/src/lib/really-long-file-name.ts",
				status: "modified",
				additions: 12,
				deletions: 3,
			},
		]

		testSetup = await testRender(
			<DirectoryTreeView files={files} themeName="github" width={28} />,
			{ width: 28, height: 4 },
		)
		globalThis.IS_REACT_ACT_ENVIRONMENT = false

		await testSetup.renderOnce()
		const frame = testSetup.captureCharFrame()
		expect(frame).toContain("…")
		expect(frame).toContain("name.ts")
		expect(frame).toContain("(+12,-3)")
	})

	it("should render empty when no files", async () => {
		testSetup = await testRender(
			<DirectoryTreeView files={[]} themeName="github" />,
			{ width: 40, height: 5 },
		)
		globalThis.IS_REACT_ACT_ENVIRONMENT = false

		await testSetup.renderOnce()
		const frame = testSetup.captureCharFrame()
		// Should render nothing (DirectoryTreeView returns null for empty)
		expect(frame).toMatchSnapshot()
	})

	it("should highlight the active file row", async () => {
		const files: TreeFileInfo[] = [
			{ path: "README.md", status: "modified", additions: 5, deletions: 2, fileIndex: 0 },
			{ path: "src/index.ts", status: "added", additions: 30, deletions: 0, fileIndex: 1 },
			{ path: "src/utils.ts", status: "deleted", additions: 0, deletions: 15, fileIndex: 2 },
		]

		testSetup = await testRender(
			<DirectoryTreeView files={files} themeName="github" activeFileIndex={1} />,
			{ width: 60, height: 12 },
		)
		globalThis.IS_REACT_ACT_ENVIRONMENT = false

		await testSetup.renderOnce()
		const frame = testSetup.captureCharFrame()
		// Should show the tree with the active file highlighted
		expect(frame).toContain("README.md")
		expect(frame).toContain("index.ts")
		expect(frame).toContain("utils.ts")
	})

	it("filters out children of collapsed folders", async () => {
		const files: TreeFileInfo[] = [
			{ path: "src/index.ts", status: "modified", additions: 5, deletions: 2, fileIndex: 0 },
			{ path: "src/utils.ts", status: "added", additions: 30, deletions: 0, fileIndex: 1 },
		]

		testSetup = await testRender(
			<DirectoryTreeView files={files} themeName="github" initialCollapsedPaths={["src"]} />,
			{ width: 60, height: 5 },
		)
		globalThis.IS_REACT_ACT_ENVIRONMENT = false

		await testSetup.renderOnce()
		const frame = testSetup.captureCharFrame()
		expect(frame).toContain("src")
		expect(frame).not.toContain("index.ts")
		expect(frame).not.toContain("utils.ts")
	})

	it("shows closed folder icon for collapsed folders", async () => {
		const files: TreeFileInfo[] = [
			{ path: "src/index.ts", status: "modified", additions: 5, deletions: 2, fileIndex: 0 },
		]

		testSetup = await testRender(
			<DirectoryTreeView files={files} themeName="github" initialCollapsedPaths={["src"]} />,
			{ width: 60, height: 3 },
		)
		globalThis.IS_REACT_ACT_ENVIRONMENT = false

		await testSetup.renderOnce()
		const frame = testSetup.captureCharFrame()
		expect(frame).toContain("󰝰")
		expect(frame).not.toContain("󰉋")
	})

	it("collapsing compressed tree path hides entire chain", async () => {
		const files: TreeFileInfo[] = [
			{ path: "src/components/Button.tsx", status: "added", additions: 50, deletions: 0, fileIndex: 0 },
			{ path: "src/components/Input.tsx", status: "modified", additions: 10, deletions: 5, fileIndex: 1 },
		]

		testSetup = await testRender(
			<DirectoryTreeView files={files} themeName="github" initialCollapsedPaths={["src/components"]} />,
			{ width: 60, height: 5 },
		)
		globalThis.IS_REACT_ACT_ENVIRONMENT = false

		await testSetup.renderOnce()
		const frame = testSetup.captureCharFrame()
		expect(frame).toContain("src/components")
		expect(frame).not.toContain("Button.tsx")
		expect(frame).not.toContain("Input.tsx")
	})

	it("renders with active file inside collapsed folder", async () => {
		const files: TreeFileInfo[] = [
			{ path: "src/index.ts", status: "modified", additions: 5, deletions: 2, fileIndex: 0 },
		]

		testSetup = await testRender(
			<DirectoryTreeView files={files} themeName="github" initialCollapsedPaths={["src"]} activeFileIndex={0} />,
			{ width: 60, height: 3 },
		)
		globalThis.IS_REACT_ACT_ENVIRONMENT = false

		await testSetup.renderOnce()
		const frame = testSetup.captureCharFrame()
		// Folder is visible, file is hidden
		expect(frame).toContain("src")
		expect(frame).not.toContain("index.ts")
	})
})
