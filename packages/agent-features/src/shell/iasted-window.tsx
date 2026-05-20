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
import {
  Contact,
  MessageSquare,
  Mic,
  Phone,
  Settings as SettingsIcon,
  ShieldCheck,
  Video,
} from "lucide-react"
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"
import { pageContextStore } from "../stores/page-context-store"
import {
  IAstedFanMenu,
  VoiceFloatingTranscription,
  WindowShell,
  agentPreset,
  useIAstedVoiceController,
  type IAstedFanMenuItem,
  type IAstedTabId,
  type IAstedVoiceController,
} from "@workspace/iasted"
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

  // Pendant de `iasted:open` : permet au tool vocal `close_chat`
  // (et à tout autre émetteur futur) de fermer la fenêtre flottante.
  // Sans ce listener, le dispatch CustomEvent("iasted:close") émis par
  // `use-iasted-host.ts` repartait dans le vide et le modèle annonçait
  // « fait » sans que l'UI bouge.
  useEffect(() => {
    const handler = () => setOpen(false)
    window.addEventListener("iasted:close", handler)
    return () => window.removeEventListener("iasted:close", handler)
  }, [])

  // Nettoyage du snapshot panel à la fermeture de la fenêtre — évite
  // qu'un onglet reste « ouvert » côté contexte iAsted alors que l'UI
  // est fermée. Les onglets internes s'enregistrent au mount via
  // `usePanelContext` et se cleanup au unmount ; cette garde couvre le
  // cas où l'utilisateur ferme la fenêtre sans changer d'onglet.
  useEffect(() => {
    if (!open) {
      pageContextStore.setPanelSnapshot(null)
    }
  }, [open])

  const handleExpand = useCallback(() => {
    setOpen(false)
    // Passe l'onglet courant en query param : sans ça, la page fullscreen
    // restait figée sur "ichat" (valeur par défaut) même si l'utilisateur
    // cliquait Agrandir depuis iContact / iAppel / etc.
    router.push(`/icom?tab=${activeTab}`)
  }, [router, activeTab])

  // Items de l'éventail iAsted — 6 fonctions agent qui rayonnent autour du
  // bouton central. Mêmes items que côté backoffice (cohérence visuelle entre
  // surfaces), avec la sphère 3D draggable de mairie.ga portée par
  // IAstedButtonFull.
  const fanMenuItems: IAstedFanMenuItem[] = useMemo(
    () => [
      {
        id: "ichat",
        label: "iChat",
        icon: <MessageSquare className="h-4 w-4" />,
        className: "bg-emerald-600",
      },
      {
        id: "icontact",
        label: "iContact",
        icon: <Contact className="h-4 w-4" />,
        className: "bg-primary",
      },
      {
        id: "icall",
        label: "iAppel",
        icon: <Phone className="h-4 w-4" />,
        className: "bg-blue-500",
      },
      {
        id: "imeeting",
        label: "iRéunion",
        icon: <Video className="h-4 w-4" />,
        className: "bg-rose-500",
      },
      {
        id: "ivoice",
        label: "iVocal",
        icon: <Mic className="h-4 w-4" />,
        className: "bg-violet-600",
      },
      {
        id: "isettings",
        label: "Réglages",
        icon: <SettingsIcon className="h-4 w-4" />,
        className: "bg-slate-600",
      },
    ],
    [],
  )

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
  // court sur le FAB).
  const isVoiceConnected = voiceController?.isConnected === true
  const showFab = !open || isVoiceConnected
  const rightOffsetPx = sidePanelOpen ? 420 + 62 : 62

  return (
    <>
      {/* IAstedFanMenu — sphère 3D draggable (port mairie.ga, identique au
          backoffice). Single click → active/raccroche la voix ; double click →
          déploie l'éventail des 6 fonctions ; drag → repositionne et persiste
          en localStorage. Le composant gère son propre position: fixed via
          IAstedButtonFull. */}
      {showFab && voiceController && (
        <IAstedFanMenu
          size="md"
          layout="corner"
          positionStorageKey="iasted-button-position-agent"
          voiceListening={voiceController.voiceState === "listening"}
          voiceSpeaking={voiceController.voiceState === "speaking"}
          voiceProcessing={
            voiceController.voiceState === "thinking" ||
            voiceController.voiceState === "processing" ||
            voiceController.voiceState === "connecting"
          }
          audioLevel={voiceController.audioLevel}
          isVoiceConnected={isVoiceConnected}
          items={fanMenuItems}
          onItemSelect={(item) => {
            openWithTab(item.id as IAstedTabId)
          }}
          onSingleClick={() => {
            // Mode conversationnel direct : active la voix (ou raccroche
            // si session en cours). Aligné sur la sémantique backoffice.
            if (voiceController.isConnected) {
              void voiceController.deactivateVoice()
            } else if (voiceController.available) {
              void voiceController.activateVoice()
            }
          }}
        />
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
