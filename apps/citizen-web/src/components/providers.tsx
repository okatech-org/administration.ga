"use client"

import { api } from "@convex/_generated/api"
import { I18nextProvider } from "react-i18next"
import i18n from "@workspace/i18n/config"
import { Toaster } from "@workspace/ui/components/sonner"
import AppConvexProvider from "@/lib/convex-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { PostHogProvider } from "@/integrations/posthog/provider"
import { DevAccountSwitcher } from "@/components/auth/DevAccountSwitcher"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <I18nextProvider i18n={i18n}>
      <AppConvexProvider ensureUserMutation={api.functions.users.ensureUser}>
        <PostHogProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            {children}
            <Toaster richColors />
            <DevAccountSwitcher />
          </ThemeProvider>
        </PostHogProvider>
      </AppConvexProvider>
    </I18nextProvider>
  )
}

