"use client"

import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react"
import { ConvexQueryClient } from "@convex-dev/react-query"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useConvexAuth, useMutation } from "convex/react"
import type { FunctionReference } from "convex/server"
import { useEffect, useMemo, useRef } from "react"
import { authClient } from "./auth-client"

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!

if (!CONVEX_URL) {
  console.error("missing envar NEXT_PUBLIC_CONVEX_URL")
}

const convexQueryClient = new ConvexQueryClient(CONVEX_URL)

export { convexQueryClient }

// Référence à la mutation Convex `ensureUser` (mutation publique sans args,
// retour indifférent). Permet d'accepter `api.functions.users.ensureUser`
// sans fuiter `any` à travers les props du provider.
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
  // Garde contre la double connexion (React StrictMode double-invoke ou
  // renders multiples). Évite d'accéder à une propriété interne non typée
  // de `ConvexQueryClient` pour détecter un état déjà connecté.
  const hasConnectedRef = useRef(false)

  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            queryKeyHashFn: convexQueryClient.hashFn(),
            queryFn: convexQueryClient.queryFn(),
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            staleTime: 5 * 60 * 1000, // 5 min — Convex handles real-time updates via WebSocket
          },
        },
      }),
    []
  )

  useEffect(() => {
    try {
      if (!hasConnectedRef.current) {
        convexQueryClient.connect(queryClient)
        hasConnectedRef.current = true
      }
    } catch (e) {
      console.warn("Convex query client connection error:", e)
    }
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
