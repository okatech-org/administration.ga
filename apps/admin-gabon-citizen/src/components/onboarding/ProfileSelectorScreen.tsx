"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { PublicUserType } from "@convex/lib/constants"
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Check,
  FileText,
  Globe,
  Home,
  Plane,
  User,
} from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import {
  FOREIGNER_VISA_TYPES,
  RECOMMENDED_PROFILE_TYPE,
} from "./lib/onboardingFlow"

type PrimaryChoice = "long_stay" | "short_stay" | "foreigner"

type PrimaryProfile = {
  code: PrimaryChoice
  icon: typeof User
  accent: "blue" | "yellow" | "green"
  benefitsCount: number
}

const PRIMARY_PROFILES: PrimaryProfile[] = [
  { code: "long_stay", icon: User, accent: "blue", benefitsCount: 4 },
  { code: "short_stay", icon: Plane, accent: "yellow", benefitsCount: 3 },
  { code: "foreigner", icon: Globe, accent: "green", benefitsCount: 4 },
]

const VISA_ICONS = {
  plane: Plane,
  briefcase: Briefcase,
  home: Home,
  "file-text": FileText,
} as const

const ACCENT_CLASSES = {
  blue: {
    recommended: "card-recommended-blue",
    iconBg: "bg-gabon-blue-tint text-gabon-blue",
    check: "text-gabon-blue",
  },
  yellow: {
    recommended: "card-recommended-yellow",
    iconBg: "bg-gabon-yellow-tint text-gabon-yellow",
    check: "text-gabon-yellow",
  },
  green: {
    recommended: "card-recommended-green",
    iconBg: "bg-gabon-green-tint text-gabon-green",
    check: "text-gabon-green",
  },
} as const

const PRIMARY_RECOMMENDED: PrimaryChoice = "long_stay"

export function ProfileSelectorScreen({
  onSelectPrimary,
  onSelectVisa,
}: {
  onSelectPrimary: (
    type: PublicUserType.LongStay | PublicUserType.ShortStay
  ) => void
  onSelectVisa: (type: PublicUserType) => void
}) {
  const { t } = useTranslation()
  const [foreignerOpen, setForeignerOpen] = useState(false)

  const handlePrimaryClick = (code: PrimaryChoice) => {
    if (code === "foreigner") {
      setForeignerOpen(true)
      return
    }
    if (code === "long_stay") onSelectPrimary(PublicUserType.LongStay)
    if (code === "short_stay") onSelectPrimary(PublicUserType.ShortStay)
  }

  return (
    <div className="mx-auto flex w-full max-w-[1340px] flex-col gap-9 px-6 py-12 md:px-8 md:py-16">
      <header className="flex flex-col items-start gap-3">
        <h1
          suppressHydrationWarning
          className="text-3xl font-semibold tracking-tight md:text-4xl"
        >
          {t("onboarding.welcome.title")}
        </h1>
        <p
          suppressHydrationWarning
          className="max-w-[640px] text-base text-muted-foreground md:text-[17px]"
        >
          {t("onboarding.welcome.subtitle")}
        </p>
      </header>

      {!foreignerOpen ? (
        <div className="grid gap-5 md:grid-cols-3">
          {PRIMARY_PROFILES.map((p) => {
            const recommended = p.code === PRIMARY_RECOMMENDED
            const Icon = p.icon
            const accent = ACCENT_CLASSES[p.accent]
            return (
              <Card
                key={p.code}
                className={cn(
                  "relative flex flex-col gap-3.5 p-6 transition-shadow",
                  recommended ? accent.recommended : "shadow-sm hover:shadow-md"
                )}
              >
                {recommended && (
                  <Badge
                    suppressHydrationWarning
                    className="bg-gabon-blue-tint text-gabon-blue hover:bg-gabon-blue-tint absolute top-3.5 right-3.5"
                  >
                    {t("onboarding.profileSelector.recommendedBadge")}
                  </Badge>
                )}
                <div
                  className={cn(
                    "flex size-11 items-center justify-center rounded-xl",
                    accent.iconBg
                  )}
                >
                  <Icon className="size-[22px]" />
                </div>
                <CardContent className="flex flex-1 flex-col gap-3 p-0">
                  <div>
                    <h3
                      suppressHydrationWarning
                      className="text-lg font-semibold"
                    >
                      {t(`onboarding.profileSelector.profiles.${p.code}.title`)}
                    </h3>
                    <p
                      suppressHydrationWarning
                      className="mt-2 text-sm text-muted-foreground"
                    >
                      {t(
                        `onboarding.profileSelector.profiles.${p.code}.subtitle`
                      )}
                    </p>
                  </div>
                  <ul className="flex flex-1 flex-col gap-1.5">
                    {Array.from({ length: p.benefitsCount }).map((_, idx) => (
                      <li
                        key={idx}
                        suppressHydrationWarning
                        className="flex items-center gap-2 text-[13px] text-muted-foreground"
                      >
                        <Check
                          className={cn("size-3.5 shrink-0", accent.check)}
                          strokeWidth={2.5}
                        />
                        {t(
                          `onboarding.profileSelector.profiles.${p.code}.benefits.${idx}`
                        )}
                      </li>
                    ))}
                  </ul>
                  {recommended ? (
                    <Button
                      className="bg-gabon-blue hover:bg-gabon-blue-deep mt-1 w-full text-white"
                      onClick={() => handlePrimaryClick(p.code)}
                    >
                      <span suppressHydrationWarning>
                        {t("onboarding.profileSelector.cta")}
                      </span>
                      <ArrowRight className="ml-1 size-4" />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      className="mt-1 w-full border border-border bg-transparent text-foreground hover:bg-secondary"
                      onClick={() => handlePrimaryClick(p.code)}
                    >
                      <span suppressHydrationWarning>
                        {t("onboarding.profileSelector.cta")}
                      </span>
                      <ArrowRight className="ml-1 size-4" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => setForeignerOpen(false)}
              className="-ml-2"
            >
              <ArrowLeft className="mr-1 size-4" />
              <span suppressHydrationWarning>
                {t("onboarding.profileSelector.foreigner.back")}
              </span>
            </Button>
            <h2 suppressHydrationWarning className="text-lg font-medium">
              {t("onboarding.profileSelector.foreigner.title")}
            </h2>
            <span className="w-20" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {FOREIGNER_VISA_TYPES.map((v) => {
              const Icon = VISA_ICONS[v.icon]
              return (
                <Card
                  key={v.code}
                  className="hover:border-gabon-green flex cursor-pointer items-start gap-4 p-5 transition-all hover:shadow-md"
                  onClick={() => onSelectVisa(v.code)}
                >
                  <div className="bg-gabon-green-tint text-gabon-green flex size-11 shrink-0 items-center justify-center rounded-lg">
                    <Icon className="size-5" />
                  </div>
                  <div className="flex-1">
                    <h3 suppressHydrationWarning className="font-semibold">
                      {t(
                        `onboarding.profileSelector.visaTypes.${v.code}.title`
                      )}
                    </h3>
                    <p
                      suppressHydrationWarning
                      className="mt-1 text-sm text-muted-foreground"
                    >
                      {t(
                        `onboarding.profileSelector.visaTypes.${v.code}.subtitle`
                      )}
                    </p>
                  </div>
                  <ArrowRight className="size-5 shrink-0 text-muted-foreground" />
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
