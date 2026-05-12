/**
 * ShellContextActions — publie le contexte « shell » au store de page
 * et enregistre les handlers des actions globales accessibles à l'IA
 * (toggle thème, sidebar) peu importe la page courante.
 *
 * Monté à l'intérieur de `DashboardLayout` (cf. `app-shell.tsx`).
 * Le composant ne rend rien — il déclare des side-effects via les
 * hooks `useShellContext` + `useRegisterPageAction`.
 */

"use client"

import { useTheme } from "next-themes"
import { useMemo } from "react"
import { useShellContext, useRegisterPageAction } from "../hooks/use-page-context"
import type { PageAction } from "../stores/page-context-store"

export interface ShellContextActionsProps {
  /** État courant de la sidebar (étendue / réduite). */
  sidebarExpanded: boolean
  /** Setter pour ouvrir/fermer la sidebar. */
  setSidebarExpanded: (next: boolean) => void
}

export function ShellContextActions({
  sidebarExpanded,
  setSidebarExpanded,
}: ShellContextActionsProps) {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const currentTheme = (resolvedTheme ?? theme ?? "light") === "dark" ? "dark" : "light"

  const actions = useMemo<PageAction[]>(
    () => [
      {
        id: "shell.toggle_theme",
        label: "Basculer le thème clair/sombre",
        description:
          "Bascule entre le thème clair et le thème sombre de l'application. Aucun paramètre.",
      },
      {
        id: "shell.set_theme",
        label: "Choisir le thème",
        description:
          "Active explicitement le thème clair ou sombre. Paramètre `mode` requis : 'light' ou 'dark'.",
        params: { mode: { type: "string", enum: ["light", "dark"] } },
      },
      {
        id: "shell.toggle_sidebar",
        label: "Réduire/étendre la barre latérale",
        description:
          "Bascule l'état de la barre latérale principale (étendue ou réduite). Aucun paramètre.",
      },
      {
        id: "shell.set_sidebar",
        label: "Ouvrir ou fermer la barre latérale",
        description:
          "Met la barre latérale dans un état précis. Paramètre `expanded` requis : true (étendue) ou false (réduite).",
        params: { expanded: { type: "boolean" } },
      },
    ],
    [],
  )

  const summary = `Thème ${currentTheme === "dark" ? "sombre" : "clair"}, sidebar ${
    sidebarExpanded ? "étendue" : "réduite"
  }.`

  useShellContext({ summary, availableActions: actions })

  useRegisterPageAction("shell.toggle_theme", () => {
    setTheme(currentTheme === "dark" ? "light" : "dark")
    return { success: true, theme: currentTheme === "dark" ? "light" : "dark" }
  })

  useRegisterPageAction("shell.set_theme", (params) => {
    const mode = params?.mode
    if (mode !== "light" && mode !== "dark") {
      throw new Error("mode must be 'light' or 'dark'")
    }
    setTheme(mode)
    return { success: true, theme: mode }
  })

  useRegisterPageAction("shell.toggle_sidebar", () => {
    setSidebarExpanded(!sidebarExpanded)
    return { success: true, expanded: !sidebarExpanded }
  })

  useRegisterPageAction("shell.set_sidebar", (params) => {
    const expanded = params?.expanded
    if (typeof expanded !== "boolean") {
      throw new Error("expanded must be a boolean")
    }
    setSidebarExpanded(expanded)
    return { success: true, expanded }
  })

  return null
}
