import { useCallback, useRef, useState, useEffect } from "react"

interface FileDropOptions {
  onFiles: (files: File[]) => void
  /** Accepted file extensions (e.g. [".pdf", ".jpg"]) */
  accept?: string[]
  disabled?: boolean
}

/**
 * Hook for drag-and-drop file upload.
 * Attach `dropRef` to the target container element.
 */
export function useFileDrop({ onFiles, accept, disabled }: FileDropOptions) {
  const [isDragOver, setIsDragOver] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)
  const dragCountRef = useRef(0)

  const handleDragEnter = useCallback(
    (e: DragEvent) => {
      if (disabled) return
      e.preventDefault()
      e.stopPropagation()
      dragCountRef.current++
      if (e.dataTransfer?.types.includes("Files")) {
        setIsDragOver(true)
      }
    },
    [disabled]
  )

  const handleDragLeave = useCallback(
    (e: DragEvent) => {
      if (disabled) return
      e.preventDefault()
      e.stopPropagation()
      dragCountRef.current--
      if (dragCountRef.current === 0) {
        setIsDragOver(false)
      }
    },
    [disabled]
  )

  const handleDragOver = useCallback(
    (e: DragEvent) => {
      if (disabled) return
      e.preventDefault()
      e.stopPropagation()
    },
    [disabled]
  )

  const handleDrop = useCallback(
    (e: DragEvent) => {
      if (disabled) return
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)
      dragCountRef.current = 0

      const files = Array.from(e.dataTransfer?.files ?? [])
      if (files.length === 0) return

      // Filter by accepted extensions
      const filtered = accept
        ? files.filter((f) => {
            const ext = "." + f.name.split(".").pop()?.toLowerCase()
            return accept.some((a) => a.toLowerCase() === ext)
          })
        : files

      if (filtered.length > 0) {
        onFiles(filtered)
      }
    },
    [disabled, accept, onFiles]
  )

  useEffect(() => {
    const el = dropRef.current
    if (!el) return

    el.addEventListener("dragenter", handleDragEnter)
    el.addEventListener("dragleave", handleDragLeave)
    el.addEventListener("dragover", handleDragOver)
    el.addEventListener("drop", handleDrop)

    return () => {
      el.removeEventListener("dragenter", handleDragEnter)
      el.removeEventListener("dragleave", handleDragLeave)
      el.removeEventListener("dragover", handleDragOver)
      el.removeEventListener("drop", handleDrop)
    }
  }, [handleDragEnter, handleDragLeave, handleDragOver, handleDrop])

  return { isDragOver, dropRef }
}
