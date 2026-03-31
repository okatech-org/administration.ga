import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { ConvexQueryClient } from "@convex-dev/react-query";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useConvexAuth, useMutation } from "convex/react";
import { useEffect, useMemo, useRef } from "react";
import { authClient } from "./auth-client";

const CONVEX_URL = (import.meta as any).env.VITE_CONVEX_URL;

if (!CONVEX_URL) {
	console.error("missing envar VITE_CONVEX_URL");
}

// In SPA mode, expectAuth is not needed — there's no server-rendered HTML
// to cause hydration mismatches. Public queries load immediately while
// auth resolves in the background via ConvexBetterAuthProvider.
const convexQueryClient = new ConvexQueryClient(CONVEX_URL);

export { convexQueryClient };

/**
 * Auto-sync: when a user authenticates (via any flow),
 * ensure they have an entry in the custom `users` table.
 *
 * Note: The `ensureUser` mutation is passed as a prop because
 * `api` from convex/_generated cannot be imported from a shared package
 * (the relative path differs per app). Each app passes its own reference.
 */
function AuthSync({
	children,
	ensureUserMutation,
}: {
	children: React.ReactNode;
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
	initialToken,
	ensureUserMutation,
}: {
	children: React.ReactNode;
	initialToken?: string | null;
	ensureUserMutation: any;
}) {
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
		[],
	);

	useEffect(() => {
		try {
			convexQueryClient.connect(queryClient);
		} catch (e) {
			console.warn(
				"Convex query client connection error (likely strict mode double-invoke):",
				e,
			);
		}
	}, [queryClient]);

	return (
		<ConvexBetterAuthProvider
			client={convexQueryClient.convexClient}
			authClient={authClient}
			initialToken={initialToken}
		>
			<QueryClientProvider client={queryClient}>
				<AuthSync ensureUserMutation={ensureUserMutation}>
					{children}
				</AuthSync>
			</QueryClientProvider>
		</ConvexBetterAuthProvider>
	);
}
