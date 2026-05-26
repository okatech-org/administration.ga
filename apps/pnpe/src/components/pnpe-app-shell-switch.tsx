/**
 * Switch client `AppLayout` (générique) ↔ `PnpeStaffShell` (custom PNPE)
 * placé en racine du route group `(app)/*`.
 *
 * Pour les 4 rôles staff PNPE (Direction, Admin Min Travail, Chef
 * d'antenne, Conseiller), on rend le shell PNPE avec sa sidebar étendue
 * (Espace PNPE + iBureau) — ainsi les pages iProfil / iCorrespondance /
 * iDocument / iAgenda / iCom apparaissent dans le contexte agent PNPE
 * plutôt que dans le shell générique sans rapport avec l'emploi.
 *
 * Pour les autres rôles (demandeur, employeur, formateur) et les
 * non-authentifiés, on garde le shell générique `AppLayout` qui sert la
 * landing et les outils communs.
 */
"use client";

import { Loader2 } from "lucide-react";
import { AppLayout } from "@/components/app-layout";
import { PnpeStaffShell } from "@/components/pnpe-staff-shell";
import { usePnpeRole } from "@/lib/pnpe/use-pnpe-role";
import { isStaffRole } from "@/lib/pnpe/roles";

export function PnpeAppShellSwitch({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status, role } = usePnpeRole();

  // Pendant le chargement de la session/role, on évite de flasher un
  // shell générique pour ensuite basculer sur PnpeStaffShell.
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (status === "ready" && role && isStaffRole(role)) {
    return <PnpeStaffShell>{children}</PnpeStaffShell>;
  }

  return <AppLayout>{children}</AppLayout>;
}
