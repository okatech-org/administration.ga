/**
 * AppShell — layout chrome partagé entre agent-web et agent-desktop.
 *
 * Responsabilités :
 *  - Gère l'état authentifié / non-authentifié via `useConvexAuth`
 *  - Monte le provider org + thème consulaire + auth-client
 *  - Rend le chrome (OrgSidebar desktop, AgentMobileNav mobile, IAstedWindow,
 *    GlobalCallAlert) autour du children (= page active)
 *
 * DI slots (props obligatoires) :
 *  - `authClient` : instance authClient compatible `SharedAuthClient`
 *  - `renderSignedOut` : rendu complet quand l'utilisateur n'est pas connecté
 *    (HomeLandingSignIn côté web, LoginPage côté desktop)
 *  - `renderIAstedTab(tab)` : contenu de l'onglet iAsted (web injecte les tabs
 *    avec `useAdminAIChat` / `useAdminVoiceChat`)
 *  - `renderIAstedCallQueueSlot(tab)` : slot sticky (GlobalActiveCallsBar web)
 *
 * DI slots optionnels :
 *  - `wrapWithAIPresence(children)` : wrapper pour `<AIPresenceProvider>`
 *    (state graph IA proactive — stays agent-web).
 *  - `showIAstedWindow(pathname)` : true par défaut sauf sur /icom.
 *  - `beforeChildren` / `afterChildren` : extra overlays (desktop TitleBar…)
 */

"use client"

import { useStableConvexAuth } from "@workspace/api/hooks"
import { Loader2 } from "lucide-react"
import { type ReactNode, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import type { IAstedTabId, IAstedVoiceController } from "@workspace/iasted"
import { usePathname } from "@workspace/routing"
import { SidebarProvider } from "@workspace/ui/components/sidebar"
import { cn } from "@workspace/ui/lib/utils"
import {
  ConsularThemeContext,
  useConsularTheme,
  useConsularThemeState,
} from "../hooks/useConsularTheme"
import { useAgentPresence } from "../hooks/use-agent-presence"
import {
  AuthClientProvider,
  type SharedAuthClient,
} from "./auth-client-provider"
import { AgentMobileNav } from "./agent-mobile-nav"
import { FloatingMeetingWindow } from "./floating-meeting-window"
import { GlobalCallAlert } from "./global-call-alert"
import { GlobalOutgoingCallWindow } from "./global-outgoing-call-window"
import { GlobalCallPill } from "./global-call-pill"
import { GlobalCallRoomHost } from "./global-call-room-host"
import { GlobalQueuePill } from "./global-queue-pill"
import { IAstedWindow } from "./iasted-window"
import { IAstedSidePanel, useIAstedSidePanel } from "./iasted-side-panel"
import { OrgProvider, useOrg } from "./org-provider"
import { OrgSidebar, type NavSection } from "./org-sidebar"
import { ShellContextActions } from "./shell-context-actions"

const SIDEBAR_STORAGE_KEY = "admin-sidebar-expanded"

export interface AppShellProps {
  children: ReactNode
  /** `authClient` from the host app (better-auth instance). */
  authClient: SharedAuthClient
  /** Rendered when user is NOT authenticated. */
  renderSignedOut: () => ReactNode
  /** Returns the ReactNode for a given iAsted tab. */
  renderIAstedTab: (tab: IAstedTabId) => ReactNode
  /** Optional sticky slot in iAsted (e.g. GlobalActiveCallsBar). */
  renderIAstedCallQueueSlot?: (tab: IAstedTabId) => ReactNode
  /** Wrap `{children}` with extra providers (e.g. AIPresenceProvider). */
  wrapWithAIPresence?: (children: ReactNode) => ReactNode
  /** Determines whether to mount IAstedWindow. Defaults to `pathname !== /icom`. */
  showIAstedWindow?: (pathname: string | null | undefined) => boolean
  /** Client label sent to agent presence heartbeats. */
  clientType?: "agent-web" | "agent-desktop"
  /** Extra content rendered above (before) children. */
  beforeChildren?: ReactNode
  /** Extra content rendered below (after) children. */
  afterChildren?: ReactNode
  /**
   * Nav sections added by the host app to the shared sidebar. Used by
   * agent-desktop to inject desktop-only entries (e.g. Impression) without
   * polluting the web sidebar.
   */
  extraNavSections?: NavSection[]
  /**
   * Controller vocal injecté par l'app hôte. Quand fourni, le CircleMenu
   * adopte la variante 3D organique iAsted et le maintien long active la
   * conversation vocale OpenAI Realtime.
   *
   * L'app hôte construit ce controller via son hook `useIAstedHost()`
   * (cf. `apps/agent-web/src/components/iasted/use-iasted-host.ts`) qui
   * combine `useAction(api.ai.realtimeToken.create)` et `useRealtimeVoice`.
   */
  voiceController?: IAstedVoiceController
}

export function AppShell(props: AppShellProps) {
  const { isAuthenticated, isPending } = useStableConvexAuth()
  const consularThemeValue = useConsularThemeState()

  if (isPending) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <>{props.renderSignedOut()}</>
  }

  return (
    <AuthClientProvider value={props.authClient}>
      <ConsularThemeContext.Provider value={consularThemeValue}>
        <OrgProvider>
          <DashboardLayout {...props} />
        </OrgProvider>
      </ConsularThemeContext.Provider>
    </AuthClientProvider>
  )
}

function DashboardLayout({
  children,
  renderIAstedTab,
  renderIAstedCallQueueSlot,
  wrapWithAIPresence,
  showIAstedWindow,
  clientType = "agent-web",
  beforeChildren,
  afterChildren,
  extraNavSections,
  voiceController,
}: AppShellProps) {
  const { isLoading, activeOrg, activeOrgId } = useOrg()
  const { t } = useTranslation()
  const { consularTheme } = useConsularTheme()
  const pathname = usePathname()
  const { isOpen: isSidePanelOpen, close: closeSidePanel } =
    useIAstedSidePanel()
  // La page `/icom` monte son propre iChat via FullscreenShell ; monter
  // `IAstedWindow` en parallèle créerait deux instances concurrentes de
  // `useAdminAIChat` + `useAdminVoiceChat` (conflit de souscriptions Convex
  // et de session WebRTC). On masque la popup sur cette route.
  const defaultShow = !(!!pathname && pathname.startsWith("/icom"))
  const showIAsted = showIAstedWindow ? showIAstedWindow(pathname) : defaultShow

  const presenceOrgIds = useMemo(
    () => (activeOrgId ? [activeOrgId] : undefined),
    [activeOrgId]
  )
  useAgentPresence(presenceOrgIds, clientType)

  const [isExpanded, setIsExpanded] = useState(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY)
      return stored === null ? true : stored === "true"
    } catch {
      return true
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(isExpanded))
    } catch {
      // Ignore localStorage errors
    }
  }, [isExpanded])

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!activeOrg) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">{t("dashboard.noAccess.title")}</h1>
        <p className="text-muted-foreground">
          {t("dashboard.noAccess.description")}
        </p>
        <p className="text-sm">{t("dashboard.noAccess.contact")}</p>
      </div>
    )
  }

  const shellBody = (
    <SidebarProvider
      open={isExpanded}
      onOpenChange={setIsExpanded}
      className={cn(
        "citizen-layout relative flex h-dvh min-h-0 flex-col overflow-hidden md:h-screen md:flex-row",
        "print:block print:h-auto print:overflow-visible",
        consularTheme === "homeomorphism" && "theme-homeomorphism"
      )}
    >
      <ShellContextActions
        sidebarExpanded={isExpanded}
        setSidebarExpanded={setIsExpanded}
      />
      {beforeChildren}
      <div className="hidden md:block print:hidden">
        <OrgSidebar extraSections={extraNavSections} />
      </div>
      <main className="citizen-scrollbar flex-1 overflow-hidden px-3 pt-3 pb-18 min-[400px]:px-4 md:overflow-y-auto md:px-4 md:pt-4 md:pb-4 print:overflow-visible print:p-0">
        {children}
      </main>
      {/*
       * iAsted side panel — chat IA seul, ouvert via Cmd/Ctrl+K.
       * Sibling flex de <main> donc le pousse naturellement (pas une
       * modale, intégré comme la sidebar gauche).
       */}
      {showIAsted && (
        <IAstedSidePanel isOpen={isSidePanelOpen} onClose={closeSidePanel} />
      )}
      <AgentMobileNav />
      {/*
       * iAsted floating window — toutes les fonctionnalités (iChat,
       * iContact, iCall, iMeeting…). Ouvert via le CircleMenu FAB ou
       * l'event `iasted:open` (mobile nav, etc.).
       */}
      {showIAsted && (
        <IAstedWindow
          renderTab={renderIAstedTab}
          renderCallQueueSlot={renderIAstedCallQueueSlot}
          sidePanelOpen={isSidePanelOpen}
          voiceController={voiceController}
        />
      )}
      <GlobalCallAlert />
      <FloatingMeetingWindow
        hostPathname="/icom"
        activeParamName="active"
        hostTab={{ key: "tab", value: "imeeting" }}
      />
      {/* Bug 9 (Ronde 2) : fenêtre d'appel sortant unifiée. Voix et manuel
          la mountent via `callStore.openOutgoingCall(...)`. */}
      <GlobalOutgoingCallWindow />
      <GlobalCallPill />
      <GlobalQueuePill />
      {/* Pool LiveKit GLOBAL : maintient la connexion audio à travers les
          changements de route. Sans ça, quitter /icom pendant un appel
          couperait le son. La `Room` est publiée dans `callRoomRegistry`
          pour que CallCenterShell expose le contexte LiveKit à sa vue
          active (`<RoomContext.Provider>`). */}
      <GlobalCallRoomHost />
      {afterChildren}
    </SidebarProvider>
  )

  return wrapWithAIPresence ? wrapWithAIPresence(shellBody) : shellBody
}
