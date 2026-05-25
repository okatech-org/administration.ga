import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";
import { api } from "@convex/_generated/api";

/**
 * Hook scopé pour les membres d'organisme (scope /admin).
 * Charge l'utilisateur et ses memberships — pas de profil citoyen.
 */
export function useOrgMemberData() {
	const {
		data: userData,
		isPending: userPending,
		error,
	} = useAuthenticatedConvexQuery(api.functions.users.getMe, {});

	const { data: memberships, isPending: membershipsPending } =
		useAuthenticatedConvexQuery(
			api.functions.memberships.listMyMemberships,
			{},
		);

	return {
		userData,
		memberships,
		isAgent: Boolean(memberships && memberships.length > 0),
		isPending: userPending || membershipsPending,
		error,
	};
}
