// Force dynamic rendering — all pages use client-side Convex hooks + auth
export const dynamic = "force-dynamic"

import { BackofficeLayout } from "@/components/backoffice-layout"

// Note : Providers (QueryClientProvider + ConvexBetterAuthProvider) est
// monté dans le root layout (cf. app/layout.tsx) pour couvrir toutes les
// routes, y compris /sign-in hors du groupe (backoffice).
export default function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return <BackofficeLayout>{children}</BackofficeLayout>
}
