import { useCallback, useState } from "react"
import type {
  SaveDialogOptions,
  SaveDialogResult,
  OpenDialogOptions,
  OpenDialogResult,
  FileFilter,
} from "@workspace/desktop-shared/file-dialog-types"

/**
 * Hook for native file save/open dialogs.
 * Falls back to web-based download if desktopApi is not available.
 */
export function useFileDialog() {
  const [isSaving, setIsSaving] = useState(false)
  const [isOpening, setIsOpening] = useState(false)

  const saveFile = useCallback(
    async (options: SaveDialogOptions): Promise<SaveDialogResult> => {
      // Native dialog available
      if (window.desktopApi?.fileDialog) {
        setIsSaving(true)
        try {
          return await window.desktopApi.fileDialog.save(options)
        } finally {
          setIsSaving(false)
        }
      }

      // Fallback: web-based download
      const blob = new Blob(
        [typeof options.data === "string" ? options.data : new Uint8Array(options.data)],
        { type: "application/octet-stream" }
      )
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = options.defaultPath ?? "download"
      a.click()
      URL.revokeObjectURL(url)
      return { canceled: false, filePath: options.defaultPath }
    },
    []
  )

  const openFile = useCallback(
    async (options: OpenDialogOptions): Promise<OpenDialogResult> => {
      if (window.desktopApi?.fileDialog) {
        setIsOpening(true)
        try {
          return await window.desktopApi.fileDialog.open(options)
        } finally {
          setIsOpening(false)
        }
      }

      // No fallback for open dialog in web context
      return { canceled: true, filePaths: [] }
    },
    []
  )

  return { saveFile, openFile, isSaving, isOpening }
}

/** Common file filter presets */
export const FILE_FILTERS = {
  json: [{ name: "JSON", extensions: ["json"] }] satisfies FileFilter[],
  csv: [{ name: "CSV", extensions: ["csv"] }] satisfies FileFilter[],
  pdf: [{ name: "PDF", extensions: ["pdf"] }] satisfies FileFilter[],
  excel: [{ name: "Excel", extensions: ["xlsx", "xls"] }] satisfies FileFilter[],
  images: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "bmp"] }] satisfies FileFilter[],
  all: [{ name: "Tous les fichiers", extensions: ["*"] }] satisfies FileFilter[],
}
