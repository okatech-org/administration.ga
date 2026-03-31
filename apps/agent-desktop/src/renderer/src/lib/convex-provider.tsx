import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react"
import { ConvexQueryClient } from "@convex-dev/react-query"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useConvexAuth, useMutation } from "convex/react"
import { useEffect, useMemo, useRef } from "react"
import { api } from "@convex/_generated/api"
import { authClient } from "./auth-client"

const CONVEX_URL = (import.meta as any).env.VITE_CONVEX_URL

if (!CONVEX_URL) {
  console.error("[convex] Missing VITE_CONVEX_URL")
}

const convexQueryClient = new ConvexQueryClient(CONVEX_URL)

export { convexQueryClient }

function AuthSync({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useConvexAuth()
  const ensureUser = useMutation(api.functions.users.ensureUser)
  const hasSynced = useRef(false)

  useEffect(() => {
    if (isAuthenticated && !hasSynced.current) {
      hasSynced.current = true
      ensureUser().catch((err: unknown) =>
        console.warn("[auth] ensureUser failed:", err)
      )
    }
    if (!isAuthenticated) {
      hasSynced.current = false
    }
  }, [isAuthenticated, ensureUser])

  return <>{children}</>
}

export function DesktopConvexProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            queryKeyHashFn: convexQueryClient.hashFn(),
            queryFn: convexQueryClient.queryFn(),
          },
        },
      }),
    []
  )

  useEffect(() => {
    try {
      convexQueryClient.connect(queryClient)
    } catch (e) {
      console.warn("[convex] Connection error (likely strict mode):", e)
    }
  }, [queryClient])

  return (
    <ConvexBetterAuthProvider
      client={convexQueryClient.convexClient}
      authClient={authClient}
    >
      <QueryClientProvider client={queryClient}>
        <AuthSync>{children}</AuthSync>
      </QueryClientProvider>
    </ConvexBetterAuthProvider>
  )
}
