"use client"

import { useEffect, useMemo, useState } from "react"
import { useConvexAuth } from "convex/react"
import { Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { OrgProvider, useOrg } from "@/components/org/org-provider"
import { OrgSidebar } from "@/components/org/org-sidebar"
import { AgentMobileNav } from "@/components/my-space/agent-mobile-nav"
import { IAstedWindow } from "@/components/ai/iasted/IAstedWindow"
import { GlobalCallAlert } from "@/components/meetings/global-call-alert"
import { HomeLandingSignIn } from "@/components/auth/HomeLandingSignIn"
import {
  ConsularThemeContext,
  useConsularTheme,
  useConsularThemeState,
} from "@/hooks/useConsularTheme"
import { useAgentPresence } from "@/hooks/use-agent-presence"
import { cn } from "@/lib/utils"

const SIDEBAR_STORAGE_KEY = "admin-sidebar-expanded"

export function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth()
  const consularThemeValue = useConsularThemeState()

  const [hasResolved, setHasResolved] = useState(false)
  useEffect(() => {
    if (!isAuthLoading && !hasResolved) {
      setHasResolved(true)
    }
  }, [isAuthLoading, hasResolved])

  if (isAuthLoading && !hasResolved) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <HomeLandingSignIn />
  }

  return (
    <ConsularThemeContext.Provider value={consularThemeValue}>
      <OrgProvider>
        <DashboardLayout>{children}</DashboardLayout>
      </OrgProvider>
    </ConsularThemeContext.Provider>
  )
}

function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isLoading, activeOrg, activeOrgId } = useOrg()
  const { t } = useTranslation()
  const { consularTheme } = useConsularTheme()

  const presenceOrgIds = useMemo(
    () => (activeOrgId ? [activeOrgId] : undefined),
    [activeOrgId],
  )
  useAgentPresence(presenceOrgIds, "agent-web")

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

  return (
    <div
      className={cn(
        "citizen-layout relative flex h-dvh flex-col overflow-hidden md:flex-row md:h-screen",
        consularTheme === "homeomorphism" && "theme-homeomorphism",
      )}
    >
      <div className="hidden md:block p-4 pr-0">
        <div className="h-full rounded-2xl bg-secondary overflow-hidden">
          <OrgSidebar
            isExpanded={isExpanded}
            onToggle={() => setIsExpanded((prev) => !prev)}
          />
        </div>
      </div>
      <main className="flex-1 overflow-hidden md:overflow-y-auto citizen-scrollbar px-3 min-[400px]:px-4 pt-3 pb-18 md:px-4 md:pt-4 md:pb-4">
        {children}
      </main>
      <AgentMobileNav />
      <IAstedWindow />
      <GlobalCallAlert />
    </div>
  )
}
