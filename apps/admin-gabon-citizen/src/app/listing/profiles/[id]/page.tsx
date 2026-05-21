"use client"

import { api } from "@convex/_generated/api"
import { useParams, useRouter } from "next/navigation"
import { useEffect } from "react"
import { useConvexQuery } from "@/integrations/convex/hooks"

export default function LegacyProfileRedirectPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const router = useRouter()

  const { data: newProfileId } = useConvexQuery(
    api.functions.profiles.getProfilIdFromPublicId,
    { publicId: id },
  )

  useEffect(() => {
    if (newProfileId !== undefined) {
      if (newProfileId) {
        router.replace(`/verify-profile/${newProfileId}`)
      } else {
        router.replace("/verify-profile/invalid")
      }
    }
  }, [newProfileId, router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="flex flex-col items-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-muted-foreground">Recherche du profil...</p>
      </div>
    </div>
  )
}
