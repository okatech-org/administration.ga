import { useEffect, useCallback } from "react"
import type { CardElement } from "../lib/card-types"
import { CARD_WIDTH, CARD_HEIGHT } from "../lib/card-types"

/**
 * Keyboard shortcuts for the Card Designer.
 *
 * Movement:
 *   Arrow keys        — move selected element by 1px
 *   Shift + Arrows    — move by 10px
 *   Alt + Arrows      — resize by 1px
 *   Shift+Alt + Arrows — resize by 10px
 *
 * Actions:
 *   Delete / Backspace — delete selected element
 *   Cmd/Ctrl + C       — copy selected element
 *   Cmd/Ctrl + V       — paste copied element
 *   Cmd/Ctrl + D       — duplicate selected element
 *   Cmd/Ctrl + Z       — undo
 *   Cmd/Ctrl + Shift+Z — redo
 *   Cmd/Ctrl + Y       — redo (alt)
 *   Cmd/Ctrl + S       — save design
 *   Cmd/Ctrl + A       — select all elements
 *   Escape             — deselect / close panel
 *   Tab                — cycle to next element
 *   Shift + Tab        — cycle to previous element
 *
 * Layers:
 *   Cmd/Ctrl + ]       — bring forward
 *   Cmd/Ctrl + [       — send backward
 *   Cmd/Ctrl + Shift+] — bring to front
 *   Cmd/Ctrl + Shift+[ — send to back
 *
 * View:
 *   Cmd/Ctrl + =       — zoom in
 *   Cmd/Ctrl + -       — zoom out
 *   Cmd/Ctrl + 0       — reset zoom to fit
 *
 * Lock:
 *   Cmd/Ctrl + L       — toggle lock on selected element
 *
 * Visibility:
 *   Cmd/Ctrl + H       — toggle visibility on selected element
 */

interface KeyboardShortcutsOptions {
  selectedElement: CardElement | null
  elements: CardElement[]
  onUpdateElement: (id: string, changes: Partial<CardElement>) => void
  onRemoveElement: (id: string) => void
  onDuplicateElement: (id: string) => void
  onSelectElement: (id: string | null) => void
  onMoveLayer: (id: string, direction: "up" | "down" | "top" | "bottom") => void
  onUndo: () => void
  onRedo: () => void
  onSave: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomReset: () => void
  onCopy: () => void
  onPaste: () => void
}

export function useKeyboardShortcuts({
  selectedElement,
  elements,
  onUpdateElement,
  onRemoveElement,
  onDuplicateElement,
  onSelectElement,
  onMoveLayer,
  onUndo,
  onRedo,
  onSave,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onCopy,
  onPaste,
}: KeyboardShortcutsOptions) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't capture keys when typing in input/textarea/select
      const target = e.target as HTMLElement
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        // Allow Escape to blur inputs
        if (e.key === "Escape") {
          target.blur()
          e.preventDefault()
        }
        return
      }

      const cmd = e.metaKey || e.ctrlKey
      const shift = e.shiftKey
      const alt = e.altKey
      const step = shift ? 10 : 1

      // --- Movement & Resize (Arrow keys) ---
      if (selectedElement && !selectedElement.isLocked) {
        if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "ArrowDown") {
          e.preventDefault()

          if (alt) {
            // Resize
            const dw = e.key === "ArrowRight" ? step : e.key === "ArrowLeft" ? -step : 0
            const dh = e.key === "ArrowDown" ? step : e.key === "ArrowUp" ? -step : 0
            onUpdateElement(selectedElement.id, {
              width: Math.max(10, selectedElement.width + dw),
              height: Math.max(10, selectedElement.height + dh),
            })
          } else {
            // Move
            const dx = e.key === "ArrowRight" ? step : e.key === "ArrowLeft" ? -step : 0
            const dy = e.key === "ArrowDown" ? step : e.key === "ArrowUp" ? -step : 0
            const newX = Math.max(0, Math.min(CARD_WIDTH - selectedElement.width, selectedElement.x + dx))
            const newY = Math.max(0, Math.min(CARD_HEIGHT - selectedElement.height, selectedElement.y + dy))
            onUpdateElement(selectedElement.id, { x: newX, y: newY })
          }
          return
        }
      }

      // --- Delete ---
      if (selectedElement && (e.key === "Delete" || e.key === "Backspace")) {
        e.preventDefault()
        onRemoveElement(selectedElement.id)
        return
      }

      // --- Escape: deselect ---
      if (e.key === "Escape") {
        e.preventDefault()
        onSelectElement(null)
        return
      }

      // --- Tab: cycle elements ---
      if (e.key === "Tab" && elements.length > 0) {
        e.preventDefault()
        const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex)
        if (!selectedElement) {
          onSelectElement(sorted[0].id)
        } else {
          const currentIdx = sorted.findIndex((el) => el.id === selectedElement.id)
          const nextIdx = shift
            ? (currentIdx - 1 + sorted.length) % sorted.length
            : (currentIdx + 1) % sorted.length
          onSelectElement(sorted[nextIdx].id)
        }
        return
      }

      // --- Cmd shortcuts ---
      if (cmd) {
        switch (e.key.toLowerCase()) {
          case "z":
            e.preventDefault()
            if (shift) {
              onRedo()
            } else {
              onUndo()
            }
            return
          case "y":
            e.preventDefault()
            onRedo()
            return
          case "s":
            e.preventDefault()
            onSave()
            return
          case "d":
            e.preventDefault()
            if (selectedElement) onDuplicateElement(selectedElement.id)
            return
          case "c":
            e.preventDefault()
            onCopy()
            return
          case "v":
            e.preventDefault()
            onPaste()
            return
          case "a":
            e.preventDefault()
            // Select all — select first element (multi-select is future work)
            if (elements.length > 0) {
              onSelectElement(elements[0].id)
            }
            return
          case "l":
            e.preventDefault()
            if (selectedElement) {
              onUpdateElement(selectedElement.id, { isLocked: !selectedElement.isLocked })
            }
            return
          case "h":
            e.preventDefault()
            if (selectedElement) {
              onUpdateElement(selectedElement.id, { isVisible: !selectedElement.isVisible })
            }
            return
          case "=":
          case "+":
            e.preventDefault()
            onZoomIn()
            return
          case "-":
            e.preventDefault()
            onZoomOut()
            return
          case "0":
            e.preventDefault()
            onZoomReset()
            return
          case "]":
            e.preventDefault()
            if (selectedElement) {
              onMoveLayer(selectedElement.id, shift ? "top" : "up")
            }
            return
          case "[":
            e.preventDefault()
            if (selectedElement) {
              onMoveLayer(selectedElement.id, shift ? "bottom" : "down")
            }
            return
        }
      }
    },
    [
      selectedElement,
      elements,
      onUpdateElement,
      onRemoveElement,
      onDuplicateElement,
      onSelectElement,
      onMoveLayer,
      onUndo,
      onRedo,
      onSave,
      onZoomIn,
      onZoomOut,
      onZoomReset,
      onCopy,
      onPaste,
    ]
  )

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])
}
