"use client";

import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { ConvexQueryClient } from "@convex-dev/react-query";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useConvexAuth, useMutation } from "convex/react";
import { useEffect, useMemo, useRef } from "react";
import { authClient } from "./auth-client";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!;

if (!CONVEX_URL) {
  console.error("missing envar NEXT_PUBLIC_CONVEX_URL");
}

const convexQueryClient = new ConvexQueryClient(CONVEX_URL);

// Flag module-level : `convexQueryClient` est singleton, donc l'état "connecté"
// doit l'être aussi. Un ref de composant est reset à chaque remount StrictMode.
let hasConnected = false;

export { convexQueryClient };

function AuthSync({
  children,
  ensureUserMutation,
}: {
  children: React.ReactNode;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ensureUserMutation: any;
}) {
  const { isAuthenticated } = useConvexAuth();
  const ensureUser = useMutation(ensureUserMutation);
  const hasSynced = useRef(false);

  useEffect(() => {
    if (isAuthenticated && !hasSynced.current) {
      hasSynced.current = true;
      ensureUser().catch((err: unknown) =>
        console.warn("ensureUser failed:", err),
      );
    }
    if (!isAuthenticated) {
      hasSynced.current = false;
    }
  }, [isAuthenticated, ensureUser]);

  return <>{children}</>;
}

export default function AppConvexProvider({
  children,
  ensureUserMutation,
}: {
  children: React.ReactNode;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ensureUserMutation: any;
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
    [],
  );

  useEffect(() => {
    if (hasConnected) return;
    try {
      convexQueryClient.connect(queryClient);
    } catch {
      // déjà abonné
    }
    hasConnected = true;
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <ConvexBetterAuthProvider
        client={convexQueryClient.convexClient}
        authClient={authClient}
      >
        <AuthSync ensureUserMutation={ensureUserMutation}>{children}</AuthSync>
      </ConvexBetterAuthProvider>
    </QueryClientProvider>
  );
}
