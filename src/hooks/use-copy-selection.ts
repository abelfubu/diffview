// Hook for copy-to-clipboard on mouse selection release.
// Automatically copies selected text to clipboard when user releases mouse button.
// Uses native clipboard commands (pbcopy, xclip, etc.) with OSC52 fallback.

import { useRenderer } from "@opentuah/react"
import { copyToClipboard } from "../clipboard.js"

/**
 * Props for the mouseup handler returned by useCopySelection
 */
export interface CopySelectionHandlers {
  /** Attach this to the root box's onMouseUp prop */
  onMouseUp: () => Promise<void>
}

/**
 * Hook that provides a mouseup handler for copy-on-selection behavior.
 * When the user releases the mouse button after selecting text,
 * the selected text is automatically copied to the clipboard.
 *
 * @returns Object with onMouseUp handler to attach to root component
 *
 * @example
 * ```tsx
 * function App() {
 *   const { onMouseUp } = useCopySelection()
 *
 *   return (
 *     <box onMouseUp={onMouseUp}>
 *       <text>Select this text and release to copy</text>
 *     </box>
 *   )
 * }
 * ```
 */
export function useCopySelection(): CopySelectionHandlers {
  const renderer = useRenderer()

  const onMouseUp = async () => {
    const selection = renderer.getSelection()
    if (!selection) return
    if (selection.isDragging) return

    const text = selection.getSelectedText()
    if (!text || text.length === 0) return

    try {
      await copyToClipboard(text, (value) => renderer.copyToClipboardOSC52(value))
    } catch {
      // Silent fail - user can manually copy if needed
    }

    renderer.clearSelection()
  }

  return { onMouseUp }
}
