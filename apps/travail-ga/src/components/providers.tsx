"use client";

import { api } from "@convex/_generated/api";
import { Toaster } from "@workspace/ui/components/sonner";
import AppConvexProvider from "@/lib/convex-provider";
import { TravailThemeProvider } from "@/components/design/theme-provider";
import { DevAccountSwitcher } from "@/components/auth/dev-account-switcher";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppConvexProvider ensureUserMutation={api.functions.users.ensureUser}>
      <TravailThemeProvider>
        {children}
        <Toaster richColors />
        <DevAccountSwitcher />
      </TravailThemeProvider>
    </AppConvexProvider>
  );
}
