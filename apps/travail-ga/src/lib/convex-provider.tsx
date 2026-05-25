"use client";

/**
 * Provider Convex + Better Auth pour TRAVAIL.GA.
 *
 * Branche TanStack Query (cache cote client), le client Better Auth et
 * Convex. Si NEXT_PUBLIC_CONVEX_URL est absent (mode preview statique),
 * on rend juste les enfants sans Convex/auth pour eviter un crash.
 */
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { ConvexQueryClient } from "@convex-dev/react-query";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { authClient } from "./auth-client";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;

let convexQueryClient: ConvexQueryClient | null = null;
if (CONVEX_URL) {
  convexQueryClient = new ConvexQueryClient(CONVEX_URL);
}

let hasConnected = false;

export function ConvexAuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            queryKeyHashFn: convexQueryClient?.hashFn(),
            queryFn: convexQueryClient?.queryFn(),
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            staleTime: 5 * 60 * 1000,
          },
        },
      }),
    [],
  );

  useEffect(() => {
    if (hasConnected || !convexQueryClient) return;
    try {
      convexQueryClient.connect(queryClient);
    } catch {
      // Si throw "already subscribed", le client est de fait connecte.
    }
    hasConnected = true;
  }, [queryClient]);

  if (!convexQueryClient) {
    return <>{children}</>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ConvexBetterAuthProvider
        client={convexQueryClient.convexClient}
        authClient={authClient}
      >
        {children}
      </ConvexBetterAuthProvider>
    </QueryClientProvider>
  );
}
