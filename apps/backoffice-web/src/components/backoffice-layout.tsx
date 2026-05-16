"use client"

import { BackofficeIAstedWindow } from "@/components/ai/BackofficeIAstedWindow"
import { SuperadminGuard } from "@/components/guards/SuperadminGuard"
import { SuperadminSidebarV2 } from "@/components/sidebars/superadmin-sidebar-v2"
import { GlobalCallAlert } from "@/components/meetings/global-call-alert"

/**
 * Backoffice shell — sidebar V2 (design warm-beige) + main scrollable.
 * Le sidebar est scopé sous `.dash-v2` pour utiliser ses tokens sans
 * polluer le reste des pages. Chaque page décide si son contenu adopte
 * aussi le design V2 (ex. /skills) ou conserve l'ancien (Slate v3).
 */
export function BackofficeLayout({ children }: { children: React.ReactNode }) {
  return (
    <SuperadminGuard>
      <div className="relative flex h-screen min-h-0 overflow-hidden bg-background">
        <div className="dash-v2 hidden md:block">
          <SuperadminSidebarV2 />
        </div>
        <main className="flex-1 min-h-full overflow-y-auto citizen-scrollbar">
          {children}
        </main>
        <BackofficeIAstedWindow />
        <GlobalCallAlert />
      </div>
    </SuperadminGuard>
  )
}
