import { useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useConvexAuth } from "convex/react"
import { useLocation, useNavigate } from "react-router-dom"
import { AppSidebar, type Route } from "./components/sidebar/AppSidebar"
import { LoginPage } from "./components/auth/LoginPage"
import {
  ConsularThemeContext,
  useConsularThemeState,
} from "@workspace/agent-features/hooks"
import { AuthClientProvider, type SharedAuthClient } from "@workspace/agent-features/shell"
import { authClient } from "./lib/auth-client"
import { cn } from "./lib/utils"
import { pathToRoute, routeToPath } from "./router"

// Desktop-only
import { ImpressionPage } from "./components/impression/ImpressionPage"
import { TitleBar } from "./components/titlebar/TitleBar"
import { useNativeNotifications } from "./hooks/useNativeNotifications"
import { useTraySync } from "./hooks/useTraySync"
import { useMenuActions } from "./hooks/useMenuActions"

// Shared pages (migration en cours — voir plan Étape 3)
import DashboardPage from "@workspace/agent-features/features/dashboard"

// Web-mirrored pages (desktop-local, à migrer vers @workspace/agent-features)
import { AffairesDiplomatiquesPage } from "./components/affaires-diplomatiques/AffairesDiplomatiquesPage"
import { AffairesConsulairesPage } from "./components/affaires-consulaires/AffairesConsulairesPage"
import PostsPage from "@workspace/agent-features/features/posts"
import { IBoitePage } from "./components/iboite/IBoitePage"
import { ICorrespondancePage } from "./components/icorrespondance/ICorrespondancePage"
import { IDocumentPage } from "./components/idocument/IDocumentPage"
import { IAgendaPage } from "./components/iagenda/IAgendaPage"
import StatisticsPage from "@workspace/agent-features/features/statistics"
import PaymentsPage from "@workspace/agent-features/features/payments"
import TeamPage from "@workspace/agent-features/features/team"
import SettingsPage from "@workspace/agent-features/features/settings"
import AppointmentsPage from "@workspace/agent-features/features/appointments"
import RequestsPage from "@workspace/agent-features/features/requests"
import ServicesPage from "@workspace/agent-features/features/services"
import { IArchivePage } from "./components/iarchive/IArchivePage"
import { IAstedPage } from "./components/iasted/IAstedPage"
import { CallsPage } from "./components/calls/CallsPage"
import { MeetingsPage } from "./components/meetings/MeetingsPage"

export function App() {
  const { t } = useTranslation()
  const { isAuthenticated, isLoading } = useConvexAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const consularThemeValue = useConsularThemeState()
  const { consularTheme } = consularThemeValue

  // activeRoute is derived from the URL (single source of truth).
  // Both AppSidebar clicks and <Link> clicks in shared pages converge here.
  const activeRoute = useMemo(() => pathToRoute(location.pathname), [location.pathname])

  const handleNavigate = useCallback(
    (route: Route) => {
      navigate(routeToPath(route))
    },
    [navigate],
  )

  // Native desktop integrations (notification click → navigate, tray sync, menu bar)
  useNativeNotifications(handleNavigate)
  useTraySync(handleNavigate)
  useMenuActions(handleNavigate)

  // Loading state
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-sm text-muted-foreground">{t("desktop.common.loading")}</span>
        </div>
      </div>
    )
  }

  // Login required
  if (!isAuthenticated) {
    return <LoginPage />
  }

  return (
    <AuthClientProvider value={authClient as unknown as SharedAuthClient}>
    <ConsularThemeContext.Provider value={consularThemeValue}>
      <div
        className={cn(
          "h-screen flex flex-col bg-background overflow-hidden",
          consularTheme === "homeomorphism" && "theme-homeomorphism",
        )}
      >
        <TitleBar />
        <div className="flex gap-4 flex-1 min-h-0 px-4 pb-4">
          <AppSidebar activeRoute={activeRoute} onNavigate={handleNavigate} />
          <main className="flex-1 min-h-0 bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
            {activeRoute.page === "dashboard" && <DashboardPage />}
            {activeRoute.page === "affaires-diplomatiques" && <AffairesDiplomatiquesPage />}
            {activeRoute.page === "affaires-consulaires" && (
              <AffairesConsulairesPage route={activeRoute} onNavigate={handleNavigate} />
            )}
            {activeRoute.page === "posts" && <PostsPage />}
            {activeRoute.page === "iboite" && <IBoitePage />}
            {activeRoute.page === "icorrespondance" && <ICorrespondancePage />}
            {activeRoute.page === "idocument" && <IDocumentPage />}
            {activeRoute.page === "iagenda" && <IAgendaPage />}
            {activeRoute.page === "statistics" && <StatisticsPage />}
            {activeRoute.page === "payments" && <PaymentsPage />}
            {activeRoute.page === "team" && <TeamPage />}
            {activeRoute.page === "settings" && <SettingsPage />}
            {activeRoute.page === "appointments" && <AppointmentsPage />}
            {activeRoute.page === "requests" && <RequestsPage />}
            {activeRoute.page === "services" && <ServicesPage />}
            {activeRoute.page === "iarchive" && <IArchivePage />}
            {activeRoute.page === "iasted" && <IAstedPage />}
            {activeRoute.page === "calls" && <CallsPage />}
            {activeRoute.page === "meetings" && <MeetingsPage />}
            {/* Desktop-only */}
            {activeRoute.page === "impression" && <ImpressionPage />}
          </main>
        </div>
      </div>
    </ConsularThemeContext.Provider>
    </AuthClientProvider>
  )
}
