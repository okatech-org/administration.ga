/**
 * Composant de garde RBAC pour les layouts PNPE.
 *
 * Utilise `usePnpeRoleGuard` pour vérifier que l'utilisateur :
 *   1. Est authentifié (sinon redirect `/?redirect=<pathname>`)
 *   2. A un profil PNPE (sinon redirect `/?redirect=<pathname>&missing=profile`)
 *   3. Possède un des rôles autorisés (sinon redirect vers la route par
 *      défaut de son rôle effectif)
 *
 * Affiche un skeleton pendant le chargement, et un toast d'information
 * pour expliquer la redirection au user.
 */
"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { PnpeRole, getRoleLabel } from "@/lib/pnpe/roles";
import { usePnpeRoleGuard } from "@/lib/pnpe/use-pnpe-role";

type Props = {
  allowedRoles: PnpeRole[];
  /**
   * Si true (défaut), les utilisateurs sans profil sont redirigés vers
   * l'inscription. Si false, ils voient un message d'info.
   */
  redirectMissingProfile?: boolean;
  children: React.ReactNode;
};

export function PnpeRoleGate({
  allowedRoles,
  redirectMissingProfile = true,
  children,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { status, role, isAllowed, defaultRoute } =
    usePnpeRoleGuard(allowedRoles);

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated") {
      router.replace(`/?redirect=${encodeURIComponent(pathname ?? "/")}`);
      return;
    }

    if (status === "no-profile") {
      if (redirectMissingProfile) {
        // Détermine l'inscription cible la plus probable selon le 1er rôle
        // attendu par la page (demandeur → /demandeur/inscription, etc.)
        const firstRole = allowedRoles[0];
        const target =
          firstRole === PnpeRole.Employeur
            ? "/employeur/inscription"
            : firstRole === PnpeRole.DemandeurEmploi
              ? "/demandeur/inscription"
              : "/";
        toast.info(
          "Inscription requise pour accéder à cette section.",
        );
        router.replace(target);
      }
      return;
    }

    // status === "ready"
    if (!isAllowed) {
      toast.warning(
        `Accès non autorisé pour le rôle ${role ? getRoleLabel(role) : "inconnu"}. Redirection vers votre espace.`,
      );
      router.replace(defaultRoute);
    }
  }, [
    status,
    isAllowed,
    role,
    defaultRoute,
    allowedRoles,
    redirectMissingProfile,
    pathname,
    router,
  ]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Pendant la redirection en cours, on évite de flasher le contenu
  // protégé.
  if (status === "unauthenticated" || status === "no-profile" || !isAllowed) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-sm text-muted-foreground">
        Redirection…
      </div>
    );
  }

  return <>{children}</>;
}
