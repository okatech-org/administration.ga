import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useConvexAuth } from "convex/react"
import { AppSidebar, type Route } from "./components/sidebar/AppSidebar"
import { LoginPage } from "./components/auth/LoginPage"

// Desktop-only pages
import { ImpressionPage } from "./components/impression/ImpressionPage"

// Web-mirrored pages
import { DashboardPage } from "./components/dashboard/DashboardPage"
import { AffairesDiplomatiquesPage } from "./components/affaires-diplomatiques/AffairesDiplomatiquesPage"
import { AffairesConsulairesPage } from "./components/affaires-consulaires/AffairesConsulairesPage"
import { PostsPage } from "./components/posts/PostsPage"
import { IBoitePage } from "./components/iboite/IBoitePage"
import { ICorrespondancePage } from "./components/icorrespondance/ICorrespondancePage"
import { IDocumentPage } from "./components/idocument/IDocumentPage"
import { IAgendaPage } from "./components/iagenda/IAgendaPage"
import { StatisticsPage } from "./components/statistics/StatisticsPage"
import { PaymentsPage } from "./components/payments/PaymentsPage"
import { TeamPage } from "./components/team/TeamPage"
import { SettingsPage } from "./components/settings/SettingsPage"
import { AppointmentsPage } from "./components/appointments/AppointmentsPage"
import { RequestsPage } from "./components/requests/RequestsPage"
import { ServicesPage } from "./components/services/ServicesPage"
import { IArchivePage } from "./components/iarchive/IArchivePage"
import { IAstedPage } from "./components/iasted/IAstedPage"
import { CallsPage } from "./components/calls/CallsPage"
import { MeetingsPage } from "./components/meetings/MeetingsPage"

export function App() {
  const { t } = useTranslation()
  const { isAuthenticated, isLoading } = useConvexAuth()
  const [activeRoute, setActiveRoute] = useState<Route>({ page: "dashboard" })

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
    <div className="h-screen flex gap-4 bg-background p-4 overflow-hidden">
      <AppSidebar activeRoute={activeRoute} onNavigate={setActiveRoute} />
      <main className="flex-1 min-h-0 bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
        {activeRoute.page === "dashboard" && <DashboardPage onNavigate={setActiveRoute} />}
        {activeRoute.page === "affaires-diplomatiques" && <AffairesDiplomatiquesPage />}
        {activeRoute.page === "affaires-consulaires" && <AffairesConsulairesPage route={activeRoute} onNavigate={setActiveRoute} />}
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
  )
}
