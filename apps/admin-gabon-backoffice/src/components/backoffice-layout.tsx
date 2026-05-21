"use client"

import { BackofficeIAstedWindow } from "@/components/ai/BackofficeIAstedWindow"
import { SuperadminGuard } from "@/components/guards/SuperadminGuard"
import { SuperadminSidebarV2 } from "@/components/sidebars/superadmin-sidebar-v2"
import { GlobalCallAlert } from "@/components/meetings/global-call-alert"
import {
  FloatingMeetingWindow,
  GlobalOutgoingCallWindow,
} from "@workspace/agent-features/shell"
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
        {/* Bug 9 (Ronde 2) : fenêtre d'appel sortant unifiée voix + manuel. */}
        <GlobalOutgoingCallWindow />
        {/* Bug 5 fix UX (Ronde 3) : modal plein écran pour les réunions
            LiveKit (visioconférence). Backoffice n'a pas de page hôte
            `/icom` comme agent-web, donc on force le mode plein écran dès
            qu'une réunion est connectée — même UI que celle d'agent-web
            (MeetingStageView avec contrôles Micro/Caméra/Partager/etc.). */}
        <FloatingMeetingWindow
          hostPathname="/__never_match__"
          activeParamName="active"
          alwaysFullscreenWhenConnected
        />
      </div>
    </SuperadminGuard>
  )
}
