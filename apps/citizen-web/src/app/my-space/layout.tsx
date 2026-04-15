"use client"

import { api } from "@convex/_generated/api"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useConvexAuth } from "convex/react"
import { AlertTriangle, Loader2, UserPlus } from "lucide-react"
import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import { MySpaceWrapper } from "@/components/my-space/my-space-wrapper"
import { MySpaceContentSkeleton } from "@/components/skeletons"
import { Button } from "@/components/ui/button"
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks"

export default function MySpaceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <MySpaceWrapper>
      <MySpaceAuthGate>{children}</MySpaceAuthGate>
    </MySpaceWrapper>
  )
}

function MySpaceAuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.push("/sign-in")
    }
  }, [isAuthLoading, isAuthenticated, router])

  if (isAuthLoading || !isAuthenticated) {
    return <MySpaceContentSkeleton />
  }

  return <MySpaceProfileGate>{children}</MySpaceProfileGate>
}

function MySpaceProfileGate({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()
  const { data, isPending } = useAuthenticatedConvexQuery(
    api.functions.profiles.getMyProfileSafe,
    {}
  )

  const hasNoProfile =
    !isPending && data?.status === "ready" && data.profile === null

  if (isPending) {
    return <MySpaceContentSkeleton />
  }

  if (data?.status === "unauthenticated") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 min-h-full">
        <h1 className="text-2xl font-bold">
          {t("errors.auth.noAuthentication")}
        </h1>
        <p className="text-muted-foreground">
          {t("errors.auth.pleaseSignIn")}
        </p>
      </div>
    )
  }

  if (data?.status === "user_not_synced") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 min-h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">{t("mySpace.syncing")}</p>
      </div>
    )
  }

  if (hasNoProfile) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="max-w-md w-full text-center space-y-6 p-8 rounded-2xl bg-secondary animate-in fade-in zoom-in-95">
          <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold">{t("mySpace.noProfile.title")}</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {t("mySpace.noProfile.message")}
            </p>
          </div>
          <Button asChild>
            <Link href="/register">
              <UserPlus className="mr-2 h-4 w-4" />
              {t("mySpace.noProfile.createProfile")}
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
