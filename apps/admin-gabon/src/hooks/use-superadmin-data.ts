import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";
import { api } from "@convex/_generated/api";

/**
 * Hook pour les données superadmin — charge l'utilisateur courant.
 * Utilisé par useCurrentAdminRole pour dériver le rôle effectif.
 */
export function useSuperAdminData() {
  const {
    data: userData,
    isPending,
  } = useAuthenticatedConvexQuery(api.functions.users.getMe, {});

  return { userData, isPending };
}
