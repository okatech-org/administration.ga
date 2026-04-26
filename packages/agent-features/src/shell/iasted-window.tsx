/**
 * IAstedWindow — Fenêtre flottante iAsted agent (version package).
 *
 * Coquille fine au-dessus de `@workspace/iasted` :
 * - CircleMenu FAB desktop-only (mobile utilise AgentMobileNav → event bus)
 * - Événement `iasted:open` (détail `{ tab }`) pour déclenchement depuis n'importe où
 * - Fenêtre COMPACTE (420×640 desktop, 85dvh mobile)
 * - Deep-link `/iasted` fullscreen via bouton Maximize (onExpand)
 *
 * Les onglets (iChat, iContact, iCall, iMeeting, iSettings) et la barre
 * d'appels actifs sont INJECTÉS via props pour rester découplés des hooks
 * LLM F2.3 (`useAdminAIChat`, `useAdminVoiceChat`) qui demeurent dans agent-web.
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
import { useOrg } from "./org-provider"
import { StreamingExplanationCard } from "../components/iasted-host/StreamingExplanationCard"

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
}

export function IAstedWindow({
  renderTab,
  renderCallQueueSlot,
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

  // Raccourci global Cmd/Ctrl + K → ouvre/ferme iAsted (cohérent web + desktop)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen((curr) => !curr)
        if (!open) setActiveTab("ichat")
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  // Side panel push : quand iAsted est ouvert ET qu'on est en desktop (sm+),
  // publie une CSS var `--iasted-side-panel-width` que le shell consomme
  // pour pousser le main. Sur mobile, le shell garde le bottom-sheet et la
  // var n'est pas settée (donc le main n'est pas poussé horizontalement).
  useEffect(() => {
    const root = document.documentElement
    const SM_BREAKPOINT = "(min-width: 640px)"

    const apply = () => {
      const isDesktop =
        typeof window !== "undefined" &&
        window.matchMedia(SM_BREAKPOINT).matches
      if (open && isDesktop) {
        root.style.setProperty("--iasted-side-panel-width", "420px")
        root.dataset.iastedSidePanel = "open"
      } else {
        root.style.removeProperty("--iasted-side-panel-width")
        delete root.dataset.iastedSidePanel
      }
    }

    apply()
    const mq = window.matchMedia(SM_BREAKPOINT)
    mq.addEventListener("change", apply)
    return () => {
      mq.removeEventListener("change", apply)
      root.style.removeProperty("--iasted-side-panel-width")
      delete root.dataset.iastedSidePanel
    }
  }, [open])

  const handleExpand = useCallback(() => {
    setOpen(false)
    // Passe l'onglet courant en query param : sans ça, la page fullscreen
    // restait figée sur "ichat" (valeur par défaut) même si l'utilisateur
    // cliquait Agrandir depuis iContact / iAppel / etc.
    router.push(`/iasted?tab=${activeTab}`)
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
    "ivoicemail",
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
          className="fixed right-[62px] bottom-[62px] z-40 hidden lg:block print:hidden"
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
        subHeaderSlot={
          activeTab === "ichat" ? <StreamingExplanationCard /> : undefined
        }
        tabContent={tabContent}
        layout="side-panel"
      />
    </>
  )
}
