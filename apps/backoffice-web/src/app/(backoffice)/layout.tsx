// Force dynamic rendering — all pages use client-side Convex hooks + auth
export const dynamic = "force-dynamic"

import { Providers } from "@/components/providers"
import { BackofficeLayout } from "@/components/backoffice-layout"

export default function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Providers>
      <BackofficeLayout>{children}</BackofficeLayout>
    </Providers>
  )
}
