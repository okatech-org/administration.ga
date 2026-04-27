/**
 * IAstedWindow — Fenêtre flottante iAsted agent (version package).
 *
 * Coquille fine au-dessus de `@workspace/iasted` :
 * - CircleMenu FAB desktop-only (mobile utilise AgentMobileNav → event bus)
 * - Événement `iasted:open` (détail `{ tab }`) pour déclenchement depuis n'importe où
 * - Fenêtre COMPACTE flottante (420×640 desktop, 85dvh mobile)
 * - Toutes les fonctionnalités : iChat, iContact, iCall, iMeeting, iSettings…
 * - Deep-link `/icom` fullscreen via bouton Maximize (onExpand)
 *
 * À NE PAS CONFONDRE avec `IAstedSidePanel` (chat IA seul, ouvert via Cmd+K,
 * intégré comme la sidebar) qui vit dans `iasted-side-panel.tsx`.
 *
 * Les onglets et la barre d'appels actifs sont INJECTÉS via props pour rester
 * découplés des hooks LLM (`useAdminAIChat`, `useAdminVoiceChat`) qui demeurent
 * dans agent-web.
 */

"use client"

import { useRouter } from "@workspace/routing"
import { ShieldCheck } from "lucide-react"
import { type ReactNode, useCallback, useEffect, useState } from "react"
import {
  CircleMenu,
  WindowShell,
  agentPreset,
  buildCircleMenuItems,
  defaultTriggerClassName,
  defaultTriggerIcon,
  type IAstedTabId,
} from "@workspace/iasted"
import { cn } from "@workspace/ui/lib/utils"
import { useOrg } from "./org-provider"

export interface IAstedWindowProps {
  /**
   * Fonction rendering le contenu d'un onglet donné. Reçoit l'id du tab
   * actif et doit retourner le composant correspondant (tabs sont pilotés
   * par l'hôte qui a accès à `useAdminAIChat` / `useAdminVoiceChat` / etc.).
   */
  renderTab: (tab: IAstedTabId) => ReactNode
  /**
   * Slot sticky affiché en-tête de fenêtre (typiquement la barre d'appels
   * actifs). Reçoit le tab actif pour pouvoir masquer le slot sur
   * certains onglets (iAppel rend sa propre barre par exemple).
   */
  renderCallQueueSlot?: (tab: IAstedTabId) => ReactNode
  /**
   * Quand le side panel iAsted (Cmd+K, 420 px de large) est ouvert, on
   * décale le bouton flottant CircleMenu vers la gauche pour qu'il reste
   * dans la zone de contenu de la page au lieu de chevaucher le panneau.
   */
  sidePanelOpen?: boolean
}

export function IAstedWindow({
  renderTab,
  renderCallQueueSlot,
  sidePanelOpen = false,
}: IAstedWindowProps) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<IAstedTabId>("ichat")
  const { activeOrg } = useOrg()
  const router = useRouter()

  const openWithTab = useCallback((tab: IAstedTabId) => {
    setActiveTab(tab)
    setOpen(true)
  }, [])

  // Event bus (même pattern que citizen-web)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ tab?: IAstedTabId }>).detail
      openWithTab(detail?.tab ?? "ichat")
    }
    window.addEventListener("iasted:open", handler)
    return () => window.removeEventListener("iasted:open", handler)
  }, [openWithTab])

  const handleExpand = useCallback(() => {
    setOpen(false)
    // Passe l'onglet courant en query param : sans ça, la page fullscreen
    // restait figée sur "ichat" (valeur par défaut) même si l'utilisateur
    // cliquait Agrandir depuis iContact / iAppel / etc.
    router.push(`/icom?tab=${activeTab}`)
  }, [router, activeTab])

  // Items du CircleMenu construits par le package (DS v3, cohérents avec citizen).
  const menuItems = buildCircleMenuItems({
    surface: "agent",
    openWithTab,
    expand: handleExpand,
  })

  const tabs: IAstedTabId[] = [
    "ichat",
    "icontact",
    "icall",
    "imeeting",
    "isettings",
  ]
  const tabContent = Object.fromEntries(
    tabs.map((tab) => [tab, renderTab(tab)])
  ) as Record<IAstedTabId, ReactNode>

  return (
    <>
      {/* CircleMenu FAB — desktop only (mobile trigger via mobile nav dispatch iasted:open) */}
      {!open && (
        <div
          suppressHydrationWarning
          className={cn(
            "fixed bottom-[62px] z-40 hidden lg:block print:hidden transition-[right] duration-200 ease-out",
            sidePanelOpen ? "right-[calc(420px+62px)]" : "right-[62px]"
          )}
        >
          <CircleMenu
            items={menuItems}
            openIcon={defaultTriggerIcon("agent")}
            triggerClassName={defaultTriggerClassName("agent")}
          />
        </div>
      )}

      <WindowShell
        preset={agentPreset}
        title="iAsted"
        subtitle={activeOrg?.name ?? "Agent IA Diplomate"}
        headerIcon={<ShieldCheck />}
        open={open}
        onOpenChange={setOpen}
        activeTab={activeTab}
        onActiveTabChange={setActiveTab}
        onExpand={handleExpand}
        onClose={() => setOpen(false)}
        callQueueSlot={
          renderCallQueueSlot ? renderCallQueueSlot(activeTab) : undefined
        }
        tabContent={tabContent}
      />
    </>
  )
}
