// Floating toast notification used for transient copy feedback.

import { RGBA, TextAttributes } from "@opentuah/core"
import * as React from "react"
import { useRenderer } from "@opentuah/react"
import { type ResolvedTheme } from "../themes.js"

export interface ToastProps {
  /** Toast message body. */
  message: string
  /** Visual style — success (green) or error (red). */
  type: "success" | "error"
  /** Optional title shown above the message. */
  title?: string
  /** Current resolved theme for colors. */
  theme: ResolvedTheme
  /** Whether the app is using a transparent background. */
  transparentBackground?: boolean
}


/**
 * Render a floating toast notification directly onto the renderer's root
 * using a post-render callback. This lets the toast overlay all other content
 * without taking part in layout.
 */
export function Toast({ message, type, title, theme, transparentBackground }: ToastProps): React.ReactNode {
  const renderer = useRenderer()

  React.useEffect(() => {
    const borderColor = RGBA.fromHex(type === "success" ? "#2d8a47" : "#c53b53")
    const bgColor = transparentBackground ? RGBA.fromInts(0, 0, 0, 0) : theme.background
    const fgColor = theme.text
    const icon = type === "success" ? "✓" : "✗"
    const fullText = title ? `${icon} ${title} ${message}` : `${icon} ${message}`
    const toastWidth = Math.min(60, Math.max(20, fullText.length + 4))
    const toastHeight = 3
    const x = Math.max(0, Math.floor((renderer.width - toastWidth) / 2))
    const y = Math.max(0, Math.min(2, renderer.height - toastHeight))
    const postProcess = (buffer: import("@opentuah/core").OptimizedBuffer, _deltaTime: number) => {
      buffer.drawBox({
        x,
        y,
        width: toastWidth,
        height: toastHeight,
        border: true,
        borderStyle: "rounded",
        borderColor,
        backgroundColor: bgColor,
        shouldFill: true,
        title: undefined,
        titleAlignment: "left",
      })
      buffer.drawText(fullText, x + 2, y + 1, fgColor, bgColor, TextAttributes.BOLD)
    }

    renderer.addPostProcessFn(postProcess)
    renderer.requestRender()

    return () => {
      renderer.removePostProcessFn(postProcess)
      renderer.requestRender()
    }
  }, [message, type, title, theme, transparentBackground, renderer])

  return null
}
