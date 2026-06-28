// Clipboard helpers used by mouse and keyboard copy actions.

import childProcess from "child_process"
import type { CliRenderer } from "@opentuah/core"

async function spawnClipboard(cmd: string, args: string[], text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = childProcess.spawn(cmd, args, { stdio: ["pipe", "ignore", "ignore"] })

    proc.on("error", reject)
    proc.on("close", (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${cmd} exited with code ${code}`))
    })

    proc.stdin?.write(text)
    proc.stdin?.end()
  })
}

/**
 * Copy text to the system clipboard using native commands.
 * Falls back to the renderer's OSC52 escape sequence for terminal clipboard.
 */
export async function copyToClipboard(
  text: string,
  copyOsc52: (value: string) => boolean,
): Promise<void> {
  const platform = process.platform

  try {
    if (platform === "darwin") {
      await spawnClipboard("pbcopy", [], text)
      return
    }

    if (platform === "linux") {
      const isWayland = !!process.env.WAYLAND_DISPLAY

      if (isWayland) {
        try {
          await spawnClipboard("wl-copy", [], text)
          return
        } catch {
          // Fall through to X11 tools
        }
      }

      try {
        await spawnClipboard("xclip", ["-selection", "clipboard"], text)
        return
      } catch {
        // Try xsel
      }

      try {
        await spawnClipboard("xsel", ["--clipboard", "--input"], text)
        return
      } catch {
        // Fall through to OSC52
      }
    }

    if (platform === "win32") {
      await spawnClipboard("clip.exe", [], text)
      return
    }
  } catch {
    // Native clipboard failed, fall through to OSC52
  }

  copyOsc52(text)
}

/** Convenience wrapper that pulls the OSC52 helper from a CliRenderer. */
export function copyToClipboardWithRenderer(text: string, renderer: CliRenderer): Promise<void> {
  return copyToClipboard(text, (value) => renderer.copyToClipboardOSC52(value))
}

/**
 * Synchronously copy text to the system clipboard using native commands.
 * Falls back to the renderer's OSC52 escape sequence.
 */
export function copyToClipboardSync(
  text: string,
  copyOsc52: (value: string) => boolean,
): void {
  const platform = process.platform

  try {
    if (platform === "darwin") {
      spawnClipboardSync("pbcopy", [], text)
      return
    }

    if (platform === "linux") {
      const isWayland = !!process.env.WAYLAND_DISPLAY

      if (isWayland) {
        try {
          spawnClipboardSync("wl-copy", [], text)
          return
        } catch {
          // Fall through to X11 tools
        }
      }

      try {
        spawnClipboardSync("xclip", ["-selection", "clipboard"], text)
        return
      } catch {
        // Try xsel
      }

      try {
        spawnClipboardSync("xsel", ["--clipboard", "--input"], text)
        return
      } catch {
        // Fall through to OSC52
      }
    }

    if (platform === "win32") {
      spawnClipboardSync("clip.exe", [], text)
      return
    }
  } catch {
    // Native clipboard failed, fall through to OSC52
  }

  copyOsc52(text)
}

function spawnClipboardSync(cmd: string, args: string[], text: string): void {
  const result = childProcess.spawnSync(cmd, args, {
    input: text,
    encoding: "utf-8",
  })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`${cmd} exited with code ${result.status}`)
}

/** Convenience wrapper that pulls the OSC52 helper from a CliRenderer. */
export function copyToClipboardWithRendererSync(text: string, renderer: CliRenderer): void {
  copyToClipboardSync(text, (value) => renderer.copyToClipboardOSC52(value))
}
