/**
 * Types for native context menus.
 */

export interface ContextMenuItem {
  id: string
  label: string
  type?: "normal" | "separator" | "checkbox"
  checked?: boolean
  enabled?: boolean
  accelerator?: string
  submenu?: ContextMenuItem[]
}
