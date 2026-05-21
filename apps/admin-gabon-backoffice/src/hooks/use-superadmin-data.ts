import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";
import { api } from "@convex/_generated/api";

/**
 * Hook scopé pour le super-admin (scope /dashboard).
 * Charge uniquement l'utilisateur — pas de profil ni memberships.
 */
export function useSuperAdminData() {
	const {
		data: userData,
		isPending,
		error,
	} = useAuthenticatedConvexQuery(api.functions.users.getMe, {});

	const BACKOFFICE_ROLES = ["super_admin", "admin_system", "admin"];

	return {
		userData,
		isSuperAdmin: Boolean(userData?.isSuperadmin),
		isBackOffice: Boolean(
			userData?.isSuperadmin ||
				(userData?.role && BACKOFFICE_ROLES.includes(userData.role)),
		),
		isPending,
		error,
	};
}
