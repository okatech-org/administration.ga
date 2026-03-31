import { convexClient, crossDomainClient } from "@convex-dev/better-auth/client/plugins"
import {
  emailOTPClient,
  genericOAuthClient,
  phoneNumberClient,
} from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"

// In Electron, window.location.origin is file:// so we must use the explicit URL
const SITE_URL = (import.meta as any).env.VITE_SITE_URL

if (!SITE_URL) {
  console.error("[auth] Missing VITE_SITE_URL — auth won't work")
}

export const authClient = createAuthClient({
  baseURL: SITE_URL || undefined,
  plugins: [
    convexClient(),
    crossDomainClient(),
    genericOAuthClient(),
    emailOTPClient(),
    phoneNumberClient(),
  ],
})
