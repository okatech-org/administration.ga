import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";
import { api } from "@convex/_generated/api";

/**
 * Hook léger pour le routing uniquement (post-login-redirect, header).
 * Charge l'utilisateur courant.
 * N'appelle PAS getMine (profile) — utiliser useCitizenData pour ça.
 */
export function useUserData() {
	const {
		data: userData,
		isPending,
		error,
	} = useAuthenticatedConvexQuery(api.functions.users.getMe, {});

	return {
		userData,
		isSignedIn: Boolean(userData),
		isPending,
		error,
	};
}
