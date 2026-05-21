"use client"

import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react"
import { ConvexQueryClient } from "@convex-dev/react-query"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useConvexAuth, useMutation } from "convex/react"
import type { FunctionReference } from "convex/server"
import { useEffect, useMemo, useRef } from "react"
import { authClient } from "./auth-client"

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL

if (!CONVEX_URL) {
  // Fail-fast plutôt que construire un ConvexQueryClient(undefined) qui
  // casserait useMutation plus loin avec un message trompeur.
  throw new Error(
    "NEXT_PUBLIC_CONVEX_URL est absent. " +
      "Ajoutez-le à apps/admin-gabon-backoffice/.env.local " +
      "(ex. NEXT_PUBLIC_CONVEX_URL=http://127.0.0.1:3210 pour le dev local) " +
      "puis redémarrez le serveur Next."
  )
}

const convexQueryClient = new ConvexQueryClient(CONVEX_URL)

// Flag module-level : `convexQueryClient` est singleton, donc l'état "connecté"
// doit l'être aussi. Un ref de composant est reset à chaque remount StrictMode,
// ce qui rappelle `connect()` sur un client déjà abonné et fait throw.
let hasConnected = false

export { convexQueryClient }

type EnsureUserMutation = FunctionReference<"mutation", "public">

function AuthSync({
  children,
  ensureUserMutation,
}: {
  children: React.ReactNode
  ensureUserMutation: EnsureUserMutation
}) {
  const { isAuthenticated } = useConvexAuth()
  const ensureUser = useMutation(ensureUserMutation)
  const hasSynced = useRef(false)

  useEffect(() => {
    if (isAuthenticated && !hasSynced.current) {
      hasSynced.current = true
      ensureUser().catch((err: unknown) =>
        console.warn("ensureUser failed:", err)
      )
    }
    if (!isAuthenticated) {
      hasSynced.current = false
    }
  }, [isAuthenticated, ensureUser])

  return <>{children}</>
}

export default function AppConvexProvider({
  children,
  ensureUserMutation,
}: {
  children: React.ReactNode
  ensureUserMutation: EnsureUserMutation
}) {
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            queryKeyHashFn: convexQueryClient.hashFn(),
            queryFn: convexQueryClient.queryFn(),
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            staleTime: 5 * 60 * 1000,
          },
        },
      }),
    []
  )

  useEffect(() => {
    if (hasConnected) return
    try {
      convexQueryClient.connect(queryClient)
    } catch {
      // Si throw "already subscribed", le client est de fait connecté.
    }
    hasConnected = true
  }, [queryClient])

  return (
    <QueryClientProvider client={queryClient}>
      <ConvexBetterAuthProvider
        client={convexQueryClient.convexClient}
        authClient={authClient}
      >
        <AuthSync ensureUserMutation={ensureUserMutation}>{children}</AuthSync>
      </ConvexBetterAuthProvider>
    </QueryClientProvider>
  )
}
