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
  VoiceFloatingTranscription,
  WindowShell,
  agentPreset,
  buildCircleMenuItems,
  defaultTriggerClassName,
  defaultTriggerIcon,
  useIAstedVoiceController,
  type IAstedTabId,
  type IAstedVoiceController,
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
  /**
   * Controller vocal injecté par l'app hôte (qui a accès à `useAction`
   * pour récupérer un token OpenAI Realtime éphémère). Quand fourni, le
   * trigger du CircleMenu adopte la variante 3D organique et le maintien
   * long active la conversation vocale.
   */
  voiceController?: IAstedVoiceController
}

export function IAstedWindow({
  renderTab,
  renderCallQueueSlot,
  sidePanelOpen = false,
  voiceController: voiceControllerProp,
}: IAstedWindowProps) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<IAstedTabId>("ichat")
  const { activeOrg } = useOrg()
  const router = useRouter()
  // Le voiceController peut venir de la prop (passée par AppShell) OU du
  // context publié par un wrapper consumer (`IAstedVoiceContext.Provider`).
  // Le context prime sur la prop pour permettre l'injection à un niveau
  // intermédiaire (typiquement via `wrapWithAIPresence`).
  const voiceControllerCtx = useIAstedVoiceController()
  const voiceController: IAstedVoiceController | undefined =
    voiceControllerCtx ?? voiceControllerProp

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
    "ivoice",
    "isettings",
  ]
  const tabContent = Object.fromEntries(
    tabs.map((tab) => [tab, renderTab(tab)])
  ) as Record<IAstedTabId, ReactNode>

  // Pendant une session vocale active, le FAB reste affiché même quand la
  // fenêtre est ouverte : c'est le geste canonique pour raccrocher (tap
  // court sur le FAB rouge avec icône PhoneOff).
  const isVoiceConnected = voiceController?.isConnected === true
  const showFab = !open || isVoiceConnected
  const rightOffsetPx = sidePanelOpen ? 420 + 62 : 62

  return (
    <>
      {/* CircleMenu FAB — desktop only (mobile trigger via mobile nav dispatch iasted:open) */}
      {showFab && (
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
            triggerVariant={voiceController ? "3d-organic" : "default"}
            voiceState={voiceController?.voiceState ?? "idle"}
            audioLevel={voiceController?.audioLevel ?? 0}
            voiceDisabled={voiceController ? !voiceController.available : false}
            onLongPress={voiceController?.activateVoice}
            isVoiceConnected={isVoiceConnected}
            onVoiceHangUp={voiceController?.deactivateVoice}
          />
        </div>
      )}

      {/* Overlay flottant — affiche les derniers tours de la conversation
          vocale + bouton raccrocher. Reste visible que la fenêtre soit
          ouverte ou fermée, pour que l'utilisateur puisse naviguer
          librement et voir la transcription en parallèle. */}
      {isVoiceConnected && voiceController && (
        <VoiceFloatingTranscription
          messages={voiceController.messages}
          voiceState={voiceController.voiceState}
          onHangUp={() => {
            void voiceController.deactivateVoice()
          }}
          rightOffsetPx={rightOffsetPx}
        />
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
