"use client"

import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react"
import { ConvexQueryClient } from "@convex-dev/react-query"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useConvexAuth, useMutation } from "convex/react"
import { useEffect, useMemo, useRef } from "react"
import { authClient } from "./auth-client"

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!

if (!CONVEX_URL) {
  console.error("missing envar NEXT_PUBLIC_CONVEX_URL")
}

const convexQueryClient = new ConvexQueryClient(CONVEX_URL)

export { convexQueryClient }

function AuthSync({
  children,
  ensureUserMutation,
}: {
  children: React.ReactNode
  ensureUserMutation: any
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
  ensureUserMutation: any
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
          },
        },
      }),
    []
  )

  useEffect(() => {
    try {
      convexQueryClient.connect(queryClient)
    } catch (e) {
      console.warn(
        "Convex query client connection error (likely strict mode double-invoke):",
        e
      )
    }
  }, [queryClient])

  return (
    <ConvexBetterAuthProvider
      client={convexQueryClient.convexClient}
      authClient={authClient}
    >
      <QueryClientProvider client={queryClient}>
        <AuthSync ensureUserMutation={ensureUserMutation}>{children}</AuthSync>
      </QueryClientProvider>
    </ConvexBetterAuthProvider>
  )
}
