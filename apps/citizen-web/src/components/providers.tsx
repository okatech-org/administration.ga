"use client"

import { api } from "@convex/_generated/api"
import I18nProvider from "@workspace/i18n/provider"
import { Toaster } from "@workspace/ui/components/sonner"
import AppConvexProvider from "@/lib/convex-provider"
import { ThemeProvider } from "@/components/theme-provider"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <AppConvexProvider ensureUserMutation={api.functions.users.ensureUser}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <Toaster richColors />
        </ThemeProvider>
      </AppConvexProvider>
    </I18nProvider>
  )
}
