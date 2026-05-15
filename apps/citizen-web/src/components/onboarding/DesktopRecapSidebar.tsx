"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PublicUserType } from "@convex/lib/constants"
import { Check, Info } from "lucide-react"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { formatAddressDisplay, type OnboardingData } from "./types"
import type { RegistrationFiles } from "./steps/DocumentsStep"

function SidebarLine({
  label,
  value,
}: {
  label: string
  value?: React.ReactNode
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="shrink-0 text-sm text-muted-foreground" suppressHydrationWarning>
        {label}
      </span>
      <span className="truncate text-right font-medium">
        {value || <span className="text-muted-foreground/60">—</span>}
      </span>
    </div>
  )
}

export function DesktopRecapSidebar({
  data,
  userType,
  savedAtLabel,
  files,
}: {
  data: OnboardingData
  userType: PublicUserType | null
  savedAtLabel?: string
  files?: RegistrationFiles
}) {
  const { t } = useTranslation()
  const fullName = [data.firstName, data.lastName].filter(Boolean).join(" ")
  const addressFull = formatAddressDisplay(data.address)
  const docCount = files ? Object.keys(files).length : 0

  return (
    <aside className="sticky top-6 hidden flex-col gap-4 self-start lg:flex">
      <Card className="p-0">
        <CardContent className="flex flex-col gap-3 p-5">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-sm font-semibold" suppressHydrationWarning>
              {t("onboarding.recap.title")}
            </p>
            {savedAtLabel && (
              <span className="bg-gabon-green-tint text-gabon-green inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium">
                <Check className="size-2.5" strokeWidth={3} />
                {savedAtLabel}
              </span>
            )}
          </div>
          <dl className="flex flex-col gap-2.5">
            <SidebarLine
              label={t("onboarding.recap.labels.profile")}
              value={
                userType ? (
                  <span suppressHydrationWarning>
                    {t(`onboarding.profileLabels.${userType}`)}
                  </span>
                ) : undefined
              }
            />
            <SidebarLine label={t("onboarding.recap.labels.fullName")} value={fullName || undefined} />
            <SidebarLine label={t("onboarding.recap.labels.email")} value={data.email} />
            <SidebarLine label={t("onboarding.recap.labels.phone")} value={data.phone} />
            <SidebarLine label={t("onboarding.recap.labels.birthDate")} value={data.birthDate} />
            <SidebarLine label={t("onboarding.recap.labels.nationality")} value={data.nationality} />
            <SidebarLine label={t("onboarding.recap.labels.address")} value={addressFull || undefined} />
            <SidebarLine label={t("onboarding.recap.labels.passportNumber")} value={data.passportNumber} />
            <SidebarLine
              label={t("onboarding.recap.labels.documents")}
              value={t("onboarding.recap.docCount", { count: docCount })}
            />
          </dl>
        </CardContent>
      </Card>

      {data._authState === "verified" && (
        <Card className="p-0">
          <CardContent className="flex flex-col gap-3 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Info className="text-gabon-blue size-4" />
              <span suppressHydrationWarning>
                {t("onboarding.recap.help.title")}
              </span>
            </div>
            <p
              className="text-xs text-muted-foreground"
              suppressHydrationWarning
            >
              {t("onboarding.recap.help.description")}
            </p>
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href="/my-space/support/new" suppressHydrationWarning>
                {t("onboarding.recap.help.cta")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </aside>
  )
}
