"use client"

/**
 * AppLayout — thin shim that mounts the shared <AppShell> from
 * @workspace/agent-features and injects agent-web-specific slots (iAsted tabs
 * coupled to useAdminAIChat / useAdminVoiceChat, AIPresenceProvider,
 * HomeLandingSignIn sections).
 *
 * All the actual layout logic (sidebar, mobile nav, global call alert,
 * iAsted window frame, sign-in landing scaffold) lives in the shared package
 * so agent-desktop can mount the exact same chrome.
 */

import type { ReactNode } from "react"
import type { IAstedTabId } from "@workspace/iasted"
import { AppShell, type SharedAuthClient } from "@workspace/agent-features/shell"
import { useOrg } from "@workspace/agent-features/shell"
import { authClient } from "@/lib/auth-client"
import { AIPresenceProvider } from "@/components/ai/proactive/AIPresenceProvider"
import {
  useAdminAIChat,
  useAdminVoiceChat,
  IAstedInstantChatTab,
  IAstedContactTab,
  IAstedCallTab,
  IAstedMeetingTab,
  IAstedSettingsTab,
  GlobalActiveCallsBar,
} from "@workspace/agent-features/components/iasted-host"
import { VoicemailsList } from "@/components/call-center/VoicemailsList"
import { HomeLandingSignIn } from "@/components/auth/HomeLandingSignIn"
import { IAstedVoiceProvider } from "@/components/iasted/IAstedVoiceProvider"

/**
 * Injected into <IAstedWindow>. Hosts the hooks (`useAdminAIChat`,
 * `useAdminVoiceChat`) + ties the tabs together. Stays in agent-web because
 * these hooks pull a full Convex subscription + LiveKit session — packaging
 * them would drag the entire admin chat graph into every consumer.
 */
function IAstedTabHost({ tab }: { tab: IAstedTabId }) {
  const { activeOrgId } = useOrg()
  const chat = useAdminAIChat()
  const voice = useAdminVoiceChat()

  switch (tab) {
    case "ichat":
      return <IAstedInstantChatTab chat={chat} voice={voice} />
    case "icontact":
      return <IAstedContactTab />
    // `compact` : version dense du CallCenterShell (1 colonne, filtre ligne
    // inline, toggle messagerie en icône). Le legacy n'est plus utilisé.
    case "icall":
      return <IAstedCallTab compact VoicemailsList={VoicemailsList} />
    case "ivoicemail":
      // Cas legacy : on bascule sur iAppel (la messagerie est désormais un
      // sous-cas des appels, plus un onglet dédié).
      return <IAstedCallTab compact VoicemailsList={VoicemailsList} />

    case "imeeting":
      return <IAstedMeetingTab />
    case "isettings":
      return <IAstedSettingsTab />
    default:
      return null
  }
}

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell
      authClient={authClient as unknown as SharedAuthClient}
      clientType="agent-web"
      renderSignedOut={() => <HomeLandingSignIn />}
      renderIAstedTab={(tab) => <IAstedTabHost tab={tab} />}
      renderIAstedCallQueueSlot={(tab) =>
        // Slot sticky — actifs visibles sur tous les tabs sauf iAppel
        // (CallCenterShell dans iAppel rend déjà sa propre ActiveCallsBar).
        tab !== "icall" ? <GlobalActiveCallsBar /> : undefined
      }
      wrapWithAIPresence={(body) => (
        <AIPresenceProvider>
          <IAstedVoiceProvider>{body}</IAstedVoiceProvider>
        </AIPresenceProvider>
      )}
    >
      {children}
    </AppShell>
  )
}
