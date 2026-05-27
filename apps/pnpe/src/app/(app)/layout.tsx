// Force dynamic rendering — all pages use client-side Convex hooks + auth
export const dynamic = "force-dynamic"

import { PnpeAppShellSwitch } from "@/components/pnpe-app-shell-switch"

export default function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return <PnpeAppShellSwitch>{children}</PnpeAppShellSwitch>
}
