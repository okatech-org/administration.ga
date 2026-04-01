import { useCallback } from "react"
import type { ContextMenuItem } from "@workspace/desktop-shared/context-menu-types"

/**
 * Hook for showing native OS context menus.
 * Returns the ID of the clicked item, or null if dismissed.
 */
export function useContextMenu() {
  const showContextMenu = useCallback(
    async (
      items: ContextMenuItem[],
      onAction?: (id: string) => void
    ) => {
      if (!window.desktopApi?.contextMenu) return null

      const clickedId = await window.desktopApi.contextMenu.show(items)
      if (clickedId && onAction) {
        onAction(clickedId)
      }
      return clickedId
    },
    []
  )

  /** Convenience: attach to onContextMenu event */
  const contextMenuHandler = useCallback(
    (
      e: React.MouseEvent,
      items: ContextMenuItem[],
      onAction: (id: string) => void
    ) => {
      e.preventDefault()
      showContextMenu(items, onAction)
    },
    [showContextMenu]
  )

  return { showContextMenu, contextMenuHandler }
}
