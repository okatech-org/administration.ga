/**
 * Hook client pour récupérer le rôle PNPE de l'utilisateur courant.
 *
 * Utilise `authClient.useSession()` pour vérifier la session puis
 * appelle `api.functions.pnpe.session.getMyRole` qui résout le rôle
 * depuis les tables `pnpeStaffAssignments`, `employeurs` et
 * `demandeursEmploi`.
 *
 * Pattern d'usage dans les layouts :
 *   const { role, status, isAllowed } = usePnpeRoleGuard(["demandeur_emploi"]);
 *   if (status === "loading") return <Skeleton />;
 *   if (!isAllowed) return <Redirect />;
 */
"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { PnpeRole, getDefaultRouteForRole } from "./roles";

export type RoleStatus = "loading" | "unauthenticated" | "no-profile" | "ready";

export type UsePnpeRoleResult = {
  status: RoleStatus;
  role: PnpeRole | null;
  isActive: boolean;
  antenneId?: string;
  defaultRoute: string;
};

/**
 * Récupère le rôle PNPE de l'utilisateur courant.
 *
 * Renvoie un status :
 *   - `loading` tant que la session Better Auth ou la query Convex n'a
 *     pas répondu.
 *   - `unauthenticated` si aucune session Better Auth.
 *   - `no-profile` si la session existe mais l'utilisateur n'a pas de
 *     profil PNPE (demandeur, employeur, staff).
 *   - `ready` quand le rôle est connu.
 */
export function usePnpeRole(): UsePnpeRoleResult {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const isAuthenticated = !!session?.user;

  const roleData = useQuery(
    api.functions.pnpe.session.getMyRole,
    isAuthenticated ? {} : "skip",
  );

  if (sessionPending) {
    return {
      status: "loading",
      role: null,
      isActive: false,
      defaultRoute: "/",
    };
  }

  if (!isAuthenticated) {
    return {
      status: "unauthenticated",
      role: null,
      isActive: false,
      defaultRoute: "/",
    };
  }

  // Session OK mais query encore en cours
  if (roleData === undefined) {
    return {
      status: "loading",
      role: null,
      isActive: false,
      defaultRoute: "/",
    };
  }

  if (roleData === null) {
    return {
      status: "no-profile",
      role: null,
      isActive: false,
      defaultRoute: "/",
    };
  }

  const role = roleData.role as PnpeRole;
  return {
    status: "ready",
    role,
    isActive: roleData.isActive,
    antenneId: roleData.antenneId,
    defaultRoute: getDefaultRouteForRole(role),
  };
}

/**
 * Variante avec garde RBAC : passe les rôles autorisés, renvoie un flag
 * `isAllowed`. Pratique pour les layouts qui ne tolèrent qu'un rôle.
 */
export function usePnpeRoleGuard(allowedRoles: PnpeRole[]): UsePnpeRoleResult & {
  isAllowed: boolean;
} {
  const base = usePnpeRole();
  const isAllowed =
    base.status === "ready" && !!base.role && allowedRoles.includes(base.role);
  return { ...base, isAllowed };
}
