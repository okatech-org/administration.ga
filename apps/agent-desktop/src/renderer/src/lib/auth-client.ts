import { convexClient, crossDomainClient } from "@convex-dev/better-auth/client/plugins"
import {
  emailOTPClient,
  genericOAuthClient,
  phoneNumberClient,
} from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"

// The desktop app talks directly to Convex Site URL for auth
// — no need for the agent-web Vite proxy.
const CONVEX_SITE_URL = (import.meta as any).env.VITE_CONVEX_SITE_URL

if (!CONVEX_SITE_URL) {
  console.error("[auth] Missing VITE_CONVEX_SITE_URL — auth won't work")
}

export const authClient = createAuthClient({
  baseURL: CONVEX_SITE_URL ? `${CONVEX_SITE_URL}/api/auth` : undefined,
  plugins: [
    convexClient(),
    crossDomainClient(),
    genericOAuthClient(),
    emailOTPClient(),
    phoneNumberClient(),
  ],
})
