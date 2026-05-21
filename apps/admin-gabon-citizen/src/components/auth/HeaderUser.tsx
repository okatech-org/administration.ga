"use client"

import Link from "next/link"
import { LogIn, User } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"

export default function HeaderUser() {
  const { t } = useTranslation()
  const { data: session, isPending } = authClient.useSession()

  if (isPending) return null

  if (!session) {
    return (
      <Button asChild variant="outline" size="sm" className="gap-2">
        <Link href="/sign-in">
          <LogIn className="size-4" />
          {t("header.nav.signIn")}
        </Link>
      </Button>
    )
  }

  return (
    <Button asChild variant="outline" size="sm" className="gap-2">
      <Link href="/my-space">
        <User className="size-4" />
        {t("header.nav.mySpace")}
      </Link>
    </Button>
  )
}
