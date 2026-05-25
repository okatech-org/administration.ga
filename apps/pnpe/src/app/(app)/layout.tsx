// Force dynamic rendering — all pages use client-side Convex hooks + auth
export const dynamic = "force-dynamic"

import { AppLayout } from "@/components/app-layout"

export default function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AppLayout>{children}</AppLayout>
}
