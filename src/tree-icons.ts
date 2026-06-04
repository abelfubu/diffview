// Tree icon utilities for sidebar file/folder nerd font icons
// Structured for easy future fallback to ASCII icons

export const FOLDER_ICON_CLOSED = "󰝰"
export const FOLDER_ICON_OPEN = "󰉋"

const extensionToIcon: Record<string, string> = {
  ts: "󰛦",
  tsx: "󰜈",
  js: "󰌠",
  jsx: "󰜈",
  json: "󰘦",
  md: "󰍔",
  css: "󰌜",
  html: "󰌝",
}

export function getFileIcon(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase()
  return ext ? (extensionToIcon[ext] ?? "󰈙") : "󰈙"
}
