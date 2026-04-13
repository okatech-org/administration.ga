"use client"

import { api } from "@convex/_generated/api"
import { useRouter, useSearchParams } from "next/navigation"
import { useMutation, useQuery } from "convex/react"
import {
  Bell,
  KeyRound,
  Palette,
  Trash2,
  User,
} from "lucide-react"
import { Suspense } from "react"
import { useTranslation } from "react-i18next"
import { AccountSecurityTab } from "@/components/my-space/settings/account-security-tab"
import { AppearanceTab } from "@/components/my-space/settings/appearance-tab"
import { DangerZoneTab } from "@/components/my-space/settings/danger-zone-tab"
import { NotificationsTab } from "@/components/my-space/settings/notifications-tab"
import { ProfileTab } from "@/components/my-space/settings/profile-tab"
import {
  SettingsLayout,
  type SettingsTabGroup,
} from "@/components/shared/settings-layout"
import { captureEvent } from "@/lib/analytics"
import { cn } from "@/lib/utils"

const TAB_IDS = [
  "profile",
  "notifications",
  "appearance",
  "security",
  "dangerZone",
] as const
type TabId = (typeof TAB_IDS)[number]

function resolveTab(urlTab: string | undefined): TabId {
  if (urlTab && (TAB_IDS as readonly string[]).includes(urlTab))
    return urlTab as TabId
  if (urlTab === "dossier") return "profile"
  if (
    urlTab === "account" ||
    urlTab === "accountSecurity" ||
    urlTab === "preferences"
  )
    return "security"
  return "profile"
}

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

  const groups: SettingsTabGroup[] = [
    {
      label: t("settings.groups.myDossier", "Dossier consulaire"),
      tabs: [
        {
          id: "profile",
          label: t("settings.tabs.profile", "Profil & Identité"),
          icon: <User className="h-4 w-4" />,
        },
      ],
    },
    {
      label: t("settings.groups.mySpace", "Mon espace"),
      tabs: [
        {
          id: "notifications",
          label: t("settings.tabs.notifications", "Notifications"),
          icon: <Bell className="h-4 w-4" />,
        },
        {
          id: "appearance",
          label: t("settings.tabs.appearance", "Apparence"),
          icon: <Palette className="h-4 w-4" />,
        },
      ],
    },
    {
      label: t("settings.groups.account", "Compte"),
      tabs: [
        {
          id: "security",
          label: t("settings.tabs.security", "Sécurité"),
          icon: <KeyRound className="h-4 w-4" />,
        },
        {
          id: "dangerZone",
          label: t("settings.tabs.dangerZone", "Zone dangereuse"),
          icon: <Trash2 className="h-4 w-4" />,
          variant: "destructive" as const,
        },
      ],
    },
  ]

  return (
    <SettingsLayout
      title={t("mySpace.screens.settings.heading")}
      description={t(
        "settings.description",
        "Informations de votre dossier consulaire"
      )}
      groups={groups}
      activeTab={activeTab}
      onTabChange={handleTabChange}
    >
      {/* Tab contents */}
      <div
        className={cn(
          "animate-in fade-in duration-300",
          activeTab !== "profile" && "hidden"
        )}
      >
        <ProfileTab />
      </div>

      <div
        className={cn(
          "animate-in fade-in duration-300",
          activeTab !== "notifications" && "hidden"
        )}
      >
        <NotificationsTab
          preferences={preferences}
          onPrefToggle={handlePrefToggle}
        />
      </div>

      <div
        className={cn(
          "animate-in fade-in duration-300",
          activeTab !== "appearance" && "hidden"
        )}
      >
        <AppearanceTab
          preferences={preferences}
          currentLanguage={i18n.language}
          onLanguageChange={handleLanguageChange}
        />
      </div>

      <div
        className={cn(
          "animate-in fade-in duration-300",
          activeTab !== "security" && "hidden"
        )}
      >
        <AccountSecurityTab
          preferences={preferences}
          onPrefToggle={handlePrefToggle}
        />
      </div>

      <div
        className={cn(
          "animate-in fade-in duration-300",
          activeTab !== "dangerZone" && "hidden"
        )}
      >
        <DangerZoneTab />
      </div>
    </SettingsLayout>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsPageContent />
    </Suspense>
  )
}
