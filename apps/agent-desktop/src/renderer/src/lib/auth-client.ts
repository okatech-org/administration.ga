import { convexClient, crossDomainClient } from "@convex-dev/better-auth/client/plugins"
import { emailOTPClient } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"

// The desktop app talks directly to Convex Site URL for auth.
// crossDomainClient handles session transfer between Convex domain and Electron renderer.
const CONVEX_SITE_URL = (import.meta as any).env.VITE_CONVEX_SITE_URL

if (!CONVEX_SITE_URL) {
  console.error("[auth] Missing VITE_CONVEX_SITE_URL — auth won't work")
}

export const authClient = createAuthClient({
  baseURL: CONVEX_SITE_URL ? `${CONVEX_SITE_URL}/api/auth` : undefined,
  // Static header so the server-side clientSessionPlugin upgrades this client
  // to a 30-day session (7-day refresh). Web apps omit the header and keep
  // the global 7d/1d defaults.
  fetchOptions: {
    headers: {
      "x-client-type": "desktop",
    },
  },
  plugins: [
    convexClient(),
    crossDomainClient(),
    emailOTPClient(),
  ],
})
