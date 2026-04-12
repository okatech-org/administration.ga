"use client"

import { api } from "@convex/_generated/api"
import { useRouter, useSearchParams } from "next/navigation"
import { useMutation, useQuery } from "convex/react"
import { FolderOpen, Save, Settings, Shield } from "lucide-react"
import { motion } from "motion/react"
import { Suspense } from "react"
import { useTranslation } from "react-i18next"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import { AccountTab } from "@/components/my-space/settings/account-tab"
import { DossierTab } from "@/components/my-space/settings/dossier-tab"
import { PageHeader } from "@/components/my-space/page-header"
import { captureEvent } from "@/lib/analytics"
import { cn } from "@/lib/utils"

// ─── 2 tabs uniquement ──────────────────────────────────────

const TAB_IDS = ["dossier", "account"] as const
type TabId = (typeof TAB_IDS)[number]

function resolveTab(urlTab: string | undefined): TabId {
  if (urlTab && (TAB_IDS as readonly string[]).includes(urlTab))
    return urlTab as TabId
  if (
    urlTab === "accountSecurity" ||
    urlTab === "dangerZone" ||
    urlTab === "appearance" ||
    urlTab === "notifications" ||
    urlTab === "preferences"
  )
    return "account"
  return "dossier"
}

const TAB_CONFIG: Record<TabId, { icon: typeof Settings; label: string }> = {
  dossier: { icon: FolderOpen, label: "settings.tabs.dossier" },
  account: { icon: Shield, label: "settings.security.accountInfo" },
}

// ─── Settings Page ───────────────────────────────────────────

function SettingsPageContent() {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = resolveTab(searchParams.get("tab") ?? undefined)

  const preferences = useQuery(api.functions.userPreferences.getMyPreferences)
  const updatePreferences = useMutation(
    api.functions.userPreferences.updateMyPreferences
  )

  const handleTabChange = (tabId: string) => {
    router.replace(`/my-space/settings?tab=${tabId}`)
  }

  const handlePrefToggle = (
    key:
      | "emailNotifications"
      | "pushNotifications"
      | "smsNotifications"
      | "whatsappNotifications"
      | "shareAnalytics",
    value: boolean
  ) => {
    updatePreferences({ [key]: value })
    captureEvent("myspace_preferences_updated")
  }

  const handleLanguageChange = (lang: "fr" | "en") => {
    updatePreferences({ language: lang })
    i18n.changeLanguage(lang)
    captureEvent("myspace_preferences_updated")
  }

  return (
    <Tabs
      value={activeTab}
      onValueChange={handleTabChange}
      className="flex h-full flex-col gap-0 overflow-hidden"
    >
      <div className="shrink-0 pb-3 md:pb-4">
        <div className="mb-2 md:mb-3">
          <PageHeader
            title={t("mySpace.screens.settings.heading")}
            icon={<Settings className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />}
            iconBgClass="bg-muted"
            actions={
              activeTab === "dossier" ? (
                <button
                  type="submit"
                  form="settings-dossier-form"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/80 active:scale-[0.97] md:px-4 md:py-2 md:text-base"
                >
                  <Save className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  {t("common.save")}
                </button>
              ) : undefined
            }
          />
        </div>

        {/* Row 2: Tabs — pill toggle with surface background */}
        <TabsList className="flex h-auto min-h-0 w-full flex-row gap-1.5 rounded-2xl bg-foreground/[0.06] p-1.5 dark:bg-foreground/[0.08] md:gap-2 md:rounded-2xl md:p-2">
          {TAB_IDS.map((id) => {
            const Icon = TAB_CONFIG[id].icon
            return (
              <TabsTrigger
                key={id}
                value={id}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all active:scale-[0.97] md:gap-2.5 md:px-5 md:py-2.5 md:text-base",
                  "text-muted-foreground hover:bg-background/60 hover:text-foreground",
                  "data-[state=active]:bg-primary data-[state=active]:font-bold data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
                )}
              >
                <Icon className="h-4 w-4 shrink-0 md:h-5 md:w-5" />
                {t(TAB_CONFIG[id].label)}
              </TabsTrigger>
            )
          })}
        </TabsList>
      </div>

      <TabsContent
        value="dossier"
        className="mt-0 min-h-0 flex-1 overflow-hidden p-0 outline-none"
      >
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="citizen-scrollbar h-full min-h-0 overflow-y-auto"
        >
          <DossierTab />
        </motion.div>
      </TabsContent>

      <TabsContent
        value="account"
        className="mt-0 min-h-0 flex-1 overflow-hidden p-0 outline-none"
      >
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="citizen-scrollbar h-full min-h-0 overflow-y-auto"
        >
          <AccountTab
            preferences={preferences}
            onPrefToggle={handlePrefToggle}
            currentLanguage={i18n.language}
            onLanguageChange={handleLanguageChange}
          />
        </motion.div>
      </TabsContent>
    </Tabs>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsPageContent />
    </Suspense>
  )
}
