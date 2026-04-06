"use client"

import { api } from "@convex/_generated/api"
import { useRouter } from "next/navigation"
import { useConvexAuth } from "convex/react"
import { useEffect } from "react"
import { useConvexQuery } from "@/integrations/convex/hooks"

export default function PostLoginRedirectPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth()

  const { data: profile } = useConvexQuery(
    api.functions.profiles.getMyProfileSafe,
    isAuthenticated ? {} : "skip",
  )

  useEffect(() => {
    if (isAuthLoading) return

    if (!isAuthenticated) {
      router.replace("/sign-in")
      return
    }

    if (profile !== undefined) {
      if (profile?.profile) {
        router.replace("/my-space")
      } else {
        router.replace("/register")
      }
    }
  }, [isAuthLoading, isAuthenticated, profile, router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Redirection...</p>
      </div>
    </div>
  )
}
