/**
 * App — Electron renderer root.
 *
 * Étape 4 : remplace l'ancien switch `activeRoute.page === "X" && <XPage />`
 * par le shell partagé `<AppShell>` (`@workspace/agent-features/shell`) et une
 * arborescence react-router complète calquée sur l'arborescence `(app)/` de
 * `agent-web`.
 *
 * Responsabilités locales (desktop-only) :
 *  - `<TitleBar />` rendu via le slot `beforeChildren` de l'AppShell.
 *  - Hooks natifs : `useNativeNotifications`, `useTraySync`, `useMenuActions`
 *    — pilotent `navigate(pathname)` au clic sur notification OS / tray / menu.
 *  - Page `/impression` (spécifique à l'atelier d'impression desktop).
 *  - Page `/iasted` : branchement de tabs placeholder via `DesktopIAstedTab`
 *    (le vrai host LLM + voice reste à porter — Étape 6).
 */

import { useCallback } from "react"
import {
  Navigate,
  Outlet,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom"

// Shell partagé
import { Printer } from "lucide-react"

import {
  AppShell,
  type SharedAuthClient,
  type NavSection,
} from "@workspace/agent-features/shell"

// Pages partagées (agent-features)
import DashboardPage from "@workspace/agent-features/features/dashboard"
import {
  PostsPage,
  NewPostPage,
  EditPostPage,
} from "@workspace/agent-features/features/posts"
import {
  ServicesPage,
  EditServicePage,
} from "@workspace/agent-features/features/services"
import { ProfileDetailPage as ProfileDetailStandalonePage } from "@workspace/agent-features/features/profiles"
import {
  RequestsPage,
  RequestDetailPage,
} from "@workspace/agent-features/features/requests"
import {
  AppointmentsPage,
  NewAppointmentPage,
  AppointmentDetailPage,
  RescheduleAppointmentPage,
  WaitlistPage as AppointmentsWaitlistPage,
  AgentSchedulesPage,
} from "@workspace/agent-features/features/appointments"
import {
  ConsularRegistryPage,
  PrintQueuePage,
} from "@workspace/agent-features/features/consular-registry"
import {
  AffairesConsulairesLayout,
  AffairesConsulairesPage,
  ProfilesPage as AffairesConsulairesProfilesPage,
  ProfileDetailPage as AffairesConsulairesProfileDetailPage,
} from "@workspace/agent-features/features/affaires-consulaires"
import {
  AffairesDiplomatiquesLayout,
  AffairesDiplomatiquesPage,
  CiblesPage,
  PlansPage,
  LettresPage,
  RapportsPage,
  ProjetsPage,
  TargetDetailPage,
} from "@workspace/agent-features/features/affaires-diplomatiques"
import ICorrespondancePage from "@workspace/agent-features/features/icorrespondance"
import IDocumentPage from "@workspace/agent-features/features/idocument"
import IAgendaPage from "@workspace/agent-features/features/iagenda"
import {
  ITemplatesPage,
  TemplateEditorPage,
} from "@workspace/agent-features/features/itemplates"
import IArchivePage from "@workspace/agent-features/features/iarchive"
import IProfilPage from "@workspace/agent-features/features/iprofil"
import IAstedPage from "@workspace/agent-features/features/iasted"
import CallsPage from "@workspace/agent-features/features/calls"
import MeetingsPage from "@workspace/agent-features/features/meetings"
import StatisticsPage from "@workspace/agent-features/features/statistics"
import TeamPage from "@workspace/agent-features/features/team"
import SettingsPage from "@workspace/agent-features/features/settings"

// Shared profile/request components (ported from agent-web)
import {
  ProfileViewSheet,
  ProfileDetailView,
  ProfileHeroCard,
  ProfileConsularCard,
  ProfileDocumentsCard,
  ProfileRequestsCard,
  ProfileChildrenCard,
  CitizenDossierSections,
  ProfileNotesPanel,
  UserProfilePreviewCard,
} from "@workspace/agent-features/components/profile"
import {
  OfficialDocumentsSection,
  RequestActionModal,
} from "@workspace/agent-features/components/requests"
import { DocumentPreviewModal } from "@workspace/agent-features/components/documents"
import {
  MeetingRoom,
  PreJoinScreen,
} from "@workspace/agent-features/components/meetings-livekit"
import { InlineAISuggestion } from "@workspace/agent-features/components/proactive-ai"
import { VoicemailsList } from "@workspace/agent-features/components/call-center"
import {
  IAstedChatColumns,
  IAstedContactTab,
  IAstedCallTab,
  IAstedMeetingTab,
  IAstedSettingsTab,
  IAstedInstantChatTab,
  useAdminAIChat,
  useAdminVoiceChat,
  GlobalActiveCallsBar,
} from "@workspace/agent-features/components/iasted-host"
import { AIPresenceProvider } from "@workspace/agent-features/components/proactive-ai"
import { useOrg } from "@workspace/agent-features/shell"
import type { IAstedTabId } from "@workspace/iasted"

// Desktop-only
import { LoginPage } from "./components/auth/LoginPage"
import { TitleBar } from "./components/titlebar/TitleBar"
import { ImpressionPage } from "./components/impression/ImpressionPage"
import { authClient } from "./lib/auth-client"
import { useNativeNotifications } from "./hooks/useNativeNotifications"
import { useTraySync } from "./hooks/useTraySync"
import { useMenuActions } from "./hooks/useMenuActions"

// ─── DI slots ──────────────────────────────────────────────────────────────
// v1.0.1: tous les composants (profile, requests, meetings LiveKit, proactive
// AI, iAsted chat/voice/tabs, voicemails) sont désormais portés dans
// @workspace/agent-features/components et branchés directement ci-dessous.
// Plus aucun placeholder "en cours d'intégration".

/**
 * IAstedTabHost — monte les hooks LLM (`useAdminAIChat`, `useAdminVoiceChat`)
 * et dispatche sur les tabs iAsted portés dans `iasted-host`. Miroir direct
 * de `apps/agent-web/src/components/app-layout.tsx` pour la fenêtre flottante.
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
    case "icall":
      return <IAstedCallTab compact />
    case "ivoicemail":
      return (
        <div className="h-full overflow-y-auto p-3">
          <VoicemailsList orgId={activeOrgId} />
        </div>
      )
    case "imeeting":
      return <IAstedMeetingTab />
    case "isettings":
      return <IAstedSettingsTab />
    default:
      return null
  }
}

// ─── react-router adapters for Next-style layouts ──────────────────────────
// Les layouts partagés attendent `children` (signature Next.js) ; on les rend
// ici autour d'un <Outlet /> pour qu'ils fonctionnent avec les routes imbriquées
// de react-router.

function AffairesConsulairesLayoutRoute() {
  return (
    <AffairesConsulairesLayout>
      <Outlet />
    </AffairesConsulairesLayout>
  )
}

function AffairesDiplomatiquesLayoutRoute() {
  return (
    <AffairesDiplomatiquesLayout>
      <Outlet />
    </AffairesDiplomatiquesLayout>
  )
}

// ─── Root ───────────────────────────────────────────────────────────────────

// Desktop-only nav entries injected into the shared sidebar.
const DESKTOP_NAV_SECTIONS: NavSection[] = [
  {
    label: "Poste local",
    items: [
      { title: "Impression", url: "/impression", icon: Printer },
    ],
  },
]

export function App() {
  const navigate = useNavigate()
  const handleNavigate = useCallback(
    (path: string) => navigate(path),
    [navigate],
  )

  // Native desktop integrations (notification click → navigate, tray sync, menu bar)
  useNativeNotifications(handleNavigate)
  useTraySync()
  useMenuActions(handleNavigate)

  return (
    <AppShell
      authClient={authClient as unknown as SharedAuthClient}
      clientType="agent-desktop"
      renderSignedOut={() => <LoginPage />}
      renderIAstedTab={(tab) => <IAstedTabHost tab={tab} />}
      renderIAstedCallQueueSlot={(tab) =>
        tab !== "icall" ? <GlobalActiveCallsBar /> : undefined
      }
      wrapWithAIPresence={(body) => (
        <AIPresenceProvider>{body}</AIPresenceProvider>
      )}
      beforeChildren={<TitleBar />}
      extraNavSections={DESKTOP_NAV_SECTIONS}
    >
      <Routes>
        {/* Dashboard */}
        <Route path="/" element={<DashboardPage />} />

        {/* Posts */}
        <Route path="/posts" element={<PostsPage />} />
        <Route path="/posts/new" element={<NewPostPage />} />
        <Route path="/posts/:postId/edit" element={<EditPostPage />} />

        {/* Services */}
        <Route path="/services" element={<ServicesPage />} />
        <Route
          path="/services/:serviceId/edit"
          element={<EditServicePage />}
        />

        {/* Profile (standalone) */}
        <Route
          path="/profiles/:profileId"
          element={
            <ProfileDetailStandalonePage
              ProfileDetailView={ProfileDetailView}
            />
          }
        />

        {/* Requests */}
        <Route path="/requests" element={<RequestsPage />} />
        <Route
          path="/requests/:reference"
          element={
            <RequestDetailPage
              InlineAISuggestion={InlineAISuggestion as never}
              RequestActionModal={RequestActionModal as never}
              OfficialDocumentsSection={OfficialDocumentsSection as never}
              UserProfilePreviewCard={UserProfilePreviewCard as never}
            />
          }
        />

        {/* Appointments */}
        <Route path="/appointments" element={<AppointmentsPage />} />
        <Route path="/appointments/new" element={<NewAppointmentPage />} />
        <Route
          path="/appointments/waitlist"
          element={<AppointmentsWaitlistPage />}
        />
        <Route
          path="/appointments/agent-schedules"
          element={<AgentSchedulesPage />}
        />
        <Route
          path="/appointments/:appointmentId"
          element={<AppointmentDetailPage />}
        />
        <Route
          path="/appointments/:appointmentId/reschedule"
          element={<RescheduleAppointmentPage />}
        />

        {/* Consular registry */}
        <Route
          path="/consular-registry"
          element={
            <ConsularRegistryPage
              ProfileViewSheet={ProfileViewSheet as never}
            />
          }
        />
        <Route
          path="/consular-registry/print-queue"
          element={<PrintQueuePage />}
        />

        {/* Affaires consulaires */}
        <Route
          path="/affaires-consulaires"
          element={<AffairesConsulairesLayoutRoute />}
        >
          <Route index element={<AffairesConsulairesPage />} />
          <Route
            path="profiles"
            element={<AffairesConsulairesProfilesPage />}
          />
          <Route
            path="profiles/:profileId"
            element={
              <AffairesConsulairesProfileDetailPage
                ProfileHeroCard={ProfileHeroCard as never}
                ProfileConsularCard={ProfileConsularCard as never}
                ProfileDocumentsCard={ProfileDocumentsCard as never}
                ProfileRequestsCard={ProfileRequestsCard as never}
                ProfileChildrenCard={ProfileChildrenCard as never}
                CitizenDossierSections={CitizenDossierSections as never}
                ProfileNotesPanel={ProfileNotesPanel as never}
                DocumentPreviewModal={DocumentPreviewModal as never}
              />
            }
          />
        </Route>

        {/* Affaires diplomatiques */}
        <Route
          path="/affaires-diplomatiques"
          element={<AffairesDiplomatiquesLayoutRoute />}
        >
          <Route index element={<AffairesDiplomatiquesPage />} />
          <Route path="cibles" element={<CiblesPage />} />
          <Route path="plans" element={<PlansPage />} />
          <Route path="lettres" element={<LettresPage />} />
          <Route path="rapports" element={<RapportsPage />} />
          <Route path="projets" element={<ProjetsPage />} />
          <Route
            path=":targetId"
            element={
              <TargetDetailPage InlineAISuggestion={InlineAISuggestion as never} />
            }
          />
        </Route>

        {/* iSuite */}
        <Route path="/icorrespondance" element={<ICorrespondancePage />} />
        <Route path="/idocument" element={<IDocumentPage />} />
        <Route path="/iagenda" element={<IAgendaPage />} />
        <Route path="/itemplates" element={<ITemplatesPage />} />
        <Route
          path="/itemplates/:templateId"
          element={<TemplateEditorPage />}
        />
        <Route path="/iarchive" element={<IArchivePage />} />
        <Route path="/iprofil" element={<IProfilPage />} />

        {/* iAsted fullscreen */}
        <Route
          path="/iasted"
          element={
            <IAstedPage
              IAstedChatColumns={IAstedChatColumns as never}
              IAstedContactTab={IAstedContactTab as never}
              IAstedCallTab={IAstedCallTab as never}
              IAstedMeetingTab={IAstedMeetingTab as never}
              IAstedSettingsTab={IAstedSettingsTab as never}
              VoicemailsList={VoicemailsList as never}
            />
          }
        />

        {/* Calls + Meetings */}
        <Route path="/calls" element={<CallsPage />} />
        <Route
          path="/meetings"
          element={
            <MeetingsPage
              MeetingRoom={MeetingRoom as never}
              PreJoinScreen={PreJoinScreen as never}
            />
          }
        />

        {/* Ops */}
        <Route path="/statistics" element={<StatisticsPage />} />
        <Route path="/team" element={<TeamPage />} />
        <Route path="/settings" element={<SettingsPage />} />

        {/* Desktop-only */}
        <Route path="/impression" element={<ImpressionPage />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  )
}
