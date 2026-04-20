/**
 * Affaires Consulaires — Page avec onglets embarqués
 *
 * Affiche directement le contenu des sous-sections (Demandes, Registre)
 * via des onglets. Par défaut = Demandes.
 */

import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { ClipboardList, IdCard, Users } from "lucide-react"
import { motion } from "motion/react"
import { cn } from "../../lib/utils"
import type { Route } from "../sidebar/AppSidebar"
import RequestsPage from "@workspace/agent-features/features/requests"
import { RegistryPage } from "../registry/RegistryPage"

type SubTab = "demandes" | "registre"

const TABS: { id: SubTab; labelKey: string; icon: React.ElementType }[] = [
  { id: "demandes", labelKey: "desktop.consularAffairs.tabs.requests", icon: ClipboardList },
  { id: "registre", labelKey: "desktop.consularAffairs.tabs.registry", icon: IdCard },
]

interface AffairesConsulairesPageProps {
  route: Extract<Route, { page: "affaires-consulaires" }>
  onNavigate: (route: Route) => void
}

export function AffairesConsulairesPage({ route, onNavigate }: AffairesConsulairesPageProps) {
  const { t } = useTranslation()

  // Default to "demandes" if no sub is set
  const activeTab: SubTab = useMemo(() => {
    if (route.sub === "registre") return "registre"
    return "demandes"
  }, [route.sub])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header + Tabs */}
      <div className="shrink-0 p-4 lg:p-6 pb-0 flex flex-col gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{t("desktop.consularAffairs.title")}</h1>
              <p className="text-sm text-muted-foreground">
                {t("desktop.consularAffairs.subtitle")}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border border-border/50 rounded-xl bg-card p-1 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onNavigate({ page: "affaires-consulaires", sub: tab.id })}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                )}
              >
                <Icon className="h-4 w-4" />
                {t(tab.labelKey)}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab content — embedded */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {activeTab === "demandes" && <RequestsPage />}
        {activeTab === "registre" && <RegistryPage />}
      </div>
    </div>
  )
}
