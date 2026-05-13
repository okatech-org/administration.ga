/**
 * IAstedSidePanel — Panneau latéral "chat IA seulement".
 *
 * Différent du `IAstedWindow` (floating bubble) :
 *   - Floating window = toutes les fonctionnalités (iChat, iContact, iCall,
 *     iMeeting, etc.), ouverte via CircleMenu FAB ou event `iasted:open`.
 *   - Side panel = uniquement la conversation avec l'assistant IA. Ouvert
 *     via Cmd/Ctrl+K, intégré à la page comme la sidebar : pas une modale,
 *     mais un sibling flex de `<main>` qui le pousse naturellement.
 *
 * Design :
 *   - Pas de bordures extérieures agressives — fond `bg-secondary` cohérent
 *     avec la sidebar gauche, rounded interne, marge respiratoire.
 *   - Animation : `width 0 → 420px` avec transition CSS, pas de slide overlay.
 *   - Mobile : caché (md+ uniquement). Sur mobile, le bottom-sheet floating
 *     reste l'expérience par défaut.
 */

"use client"

import { Bot, X } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { useOrg } from "./org-provider"
import { IAstedAIChatPanel } from "../components/iasted-host/IAstedAIChatPanel"
import { StreamingExplanationCard } from "../components/iasted-host/StreamingExplanationCard"
import { VoiceButton } from "../components/iasted-host/VoiceButton"
import { useAdminAIChat } from "../components/iasted-host/useAdminAIChat"
import { useAdminVoiceChat } from "../components/iasted-host/useAdminVoiceChat"

const MD_BREAKPOINT = "(min-width: 768px)"

/**
 * Hook qui gère l'état d'ouverture du side panel + le raccourci Cmd/Ctrl+K.
 * Sur mobile (< md), le shortcut est ignoré : le CircleMenu / floating reste
 * l'expérience par défaut.
 */
export function useIAstedSidePanel() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")) return
      if (typeof window === "undefined") return
      if (!window.matchMedia(MD_BREAKPOINT).matches) return
      e.preventDefault()
      setIsOpen((curr) => !curr)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen((c) => !c), [])

  return { isOpen, open, close, toggle }
}

export interface IAstedSidePanelProps {
  isOpen: boolean
  onClose: () => void
}

export function IAstedSidePanel({
  isOpen,
  onClose,
}: IAstedSidePanelProps) {
  const { activeOrg } = useOrg()

  return (
    <aside
      className={cn(
        "hidden md:block shrink-0 overflow-hidden transition-[width] duration-200 ease-out print:hidden",
        isOpen ? "w-[420px]" : "w-0"
      )}
      aria-hidden={!isOpen}
      aria-label="Assistant IA"
    >
      {/*
       * Carde interne avec marge symétrique à la sidebar gauche : padding
       * 4 (= p-4 du container parent) sur top/right/bottom, pas à gauche
       * (collé au main).
       *
       * On ne monte le contenu que quand le panel est ouvert : ça évite
       * d'instancier useAdminAIChat / useAdminVoiceChat (et leur
       * subscriptions Convex / WebRTC) en arrière-plan inutilement.
       */}
      <div className="h-full p-4 pl-0">
        {isOpen ? <IAstedSidePanelContent activeOrgName={activeOrg?.name} onClose={onClose} /> : null}
      </div>
    </aside>
  )
}

interface IAstedSidePanelContentProps {
  activeOrgName: string | undefined
  onClose: () => void
}

function IAstedSidePanelContent({ activeOrgName, onClose }: IAstedSidePanelContentProps) {
  const chat = useAdminAIChat()
  const voice = useAdminVoiceChat()

  return (
    <div className="flex h-full flex-col rounded-2xl bg-secondary overflow-hidden">
      {/* Header minimal — titre + bouton micro (si voice dispo) + close */}
      <header className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 shrink-0">
            <Bot className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight truncate">
              iAsted
            </p>
            <p className="text-[10px] text-muted-foreground truncate">
              {activeOrgName ?? "Agent IA Diplomate"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {voice.isAvailable && (
            <VoiceButton
              isOpen={voice.isOpen}
              onClick={() =>
                voice.isOpen ? voice.closeOverlay() : voice.openOverlay()
              }
            />
          )}
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={onClose}
            aria-label="Fermer le panneau iAsted"
            title="Fermer (Cmd+K)"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Streaming explainer pédagogique (Phase 3) */}
      <div className="shrink-0 border-b border-border/30">
        <StreamingExplanationCard />
      </div>

      {/* Chat IA — directement la conversation avec iAsted IA, pas la
          liste de discussions P2P (qui reste accessible via le
          CircleMenu / fenêtre flottante). */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <IAstedAIChatPanel chat={chat} voice={voice} />
      </div>
    </div>
  )
}
