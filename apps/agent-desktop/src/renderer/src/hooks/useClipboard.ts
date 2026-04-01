import { useCallback } from "react"
import { toast } from "sonner"

/**
 * Hook for native clipboard operations.
 * Falls back to navigator.clipboard in web context.
 */
export function useClipboard() {
  const copyText = useCallback(async (text: string, label?: string) => {
    try {
      if (window.desktopApi?.clipboard) {
        await window.desktopApi.clipboard.writeText(text)
      } else {
        await navigator.clipboard.writeText(text)
      }
      toast.success(label ? `${label} copie` : "Copie dans le presse-papiers")
    } catch {
      toast.error("Erreur lors de la copie")
    }
  }, [])

  const readText = useCallback(async (): Promise<string> => {
    if (window.desktopApi?.clipboard) {
      return window.desktopApi.clipboard.readText()
    }
    return navigator.clipboard.readText()
  }, [])

  return { copyText, readText }
}
