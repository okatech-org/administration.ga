import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";
import { api } from "@convex/_generated/api";

/**
 * Hook scopé pour les citoyens (scope /my-space).
 * Charge uniquement l'utilisateur et son profil — pas de memberships.
 */
export function useCitizenData() {
	const {
		data: userData,
		isPending: userPending,
		error,
	} = useAuthenticatedConvexQuery(api.functions.users.getMe, {});

	const { data: profile, isPending: profilePending } =
		useAuthenticatedConvexQuery(api.functions.profiles.getMine, {});

	return {
		userData,
		profile,
		isPending: userPending || profilePending,
		error,
	};
}
