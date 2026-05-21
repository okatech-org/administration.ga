export const dynamic = "force-dynamic"

import { Providers } from "@/components/providers"

export default function SignInLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <Providers>{children}</Providers>
}
