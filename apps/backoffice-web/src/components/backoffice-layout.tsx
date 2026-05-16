"use client"

import { BackofficeIAstedWindow } from "@/components/ai/BackofficeIAstedWindow"
import { SuperadminGuard } from "@/components/guards/SuperadminGuard"
import { SuperadminSidebarV2 } from "@/components/sidebars/superadmin-sidebar-v2"
import { GlobalCallAlert } from "@/components/meetings/global-call-alert"
import { AutoBreadcrumb } from "@/components/dashboard-v2/auto-breadcrumb"

/**
 * Backoffice shell V2 — sidebar warm-beige + main wrappé sous `.dash-v2`
 * pour propager les tokens du design language à toutes les pages
 * (bridge `--background`/`--card`/`--border`/… vers les tokens V2).
 *
 * Le breadcrumb V2 est injecté en haut du `<main>` à partir du pathname,
 * ce qui couvre toutes les pages sans toucher leur code.
 */
export function BackofficeLayout({ children }: { children: React.ReactNode }) {
  return (
    <SuperadminGuard>
      <div className="dash-v2 relative flex h-screen min-h-0 overflow-hidden">
        <div className="hidden md:block">
          <SuperadminSidebarV2 />
        </div>
        <main className="flex-1 min-h-full overflow-y-auto citizen-scrollbar" style={{ background: "var(--bg)" }}>
          <AutoBreadcrumb />
          {children}
        </main>
        <BackofficeIAstedWindow />
        <GlobalCallAlert />
      </div>
    </SuperadminGuard>
  )
}
