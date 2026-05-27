/**
 * Page d'accueil PNPE — routeur d'aiguillage par rôle.
 *
 * Quand un utilisateur authentifié atterrit sur `/`, on le redirige vers
 * son espace métier :
 *   - Staff PNPE (DG, Admin Ministère, Chef d'antenne, Conseiller) → `/conseiller`
 *   - Formateur Auto-Emploi → `/auto-emploi/formation`
 *   - Employeur → `/employeur/tableau-de-bord`
 *   - Demandeur d'Emploi → `/demandeur`
 *
 * Pour les non-authentifiés ou sans profil PNPE, on bascule sur le shell
 * générique `@workspace/agent-features/features/dashboard` qui sert la
 * landing publique + le module sign-in.
 */
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import GenericDashboard from "@workspace/agent-features/features/dashboard";
import { usePnpeRole } from "@/lib/pnpe/use-pnpe-role";
import { isStaffRole } from "@/lib/pnpe/roles";

export default function PnpeRootPage() {
  const router = useRouter();
  const { status, role, defaultRoute } = usePnpeRole();

  useEffect(() => {
    if (status !== "ready" || !role) return;
    // Tous les staff PNPE atterrissent sur le dashboard /conseiller (qui
    // gère sa propre différenciation par rôle). `defaultRoute` du rôle
    // (file-d-attente pour les conseillers) n'est pas utilisé ici pour
    // garantir le passage par le tableau de bord en accueil.
    if (isStaffRole(role)) {
      router.replace("/conseiller");
      return;
    }
    // Demandeur / Employeur / Formateur : route par défaut du rôle
    router.replace(defaultRoute);
  }, [status, role, defaultRoute, router]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Authentifié + rôle connu → redirection en cours (afficher un loader)
  if (status === "ready" && role) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin mr-2" />
        Redirection vers votre espace…
      </div>
    );
  }

  // Non-authentifié OU pas de profil PNPE → landing générique
  return <GenericDashboard />;
}
