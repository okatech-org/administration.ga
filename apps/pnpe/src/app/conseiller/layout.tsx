/**
 * Layout Espace Conseiller PNPE.
 *
 * Sous-arbre `/conseiller/*` réservé aux 4 rôles staff PNPE via
 * `PnpeRoleGate`. Le shell visuel (header + sidebar étendue avec section
 * iBureau) vit dans `PnpeStaffShell` pour être réutilisable depuis
 * `(app)/layout.tsx` (qui bascule dessus pour les staff).
 */
"use client";

import { PnpeRoleGate } from "@/components/auth/PnpeRoleGate";
import { PnpeStaffShell } from "@/components/pnpe-staff-shell";
import { PnpeRole } from "@/lib/pnpe/roles";

const ALLOWED_ROLES = [
  PnpeRole.ConseillerPnpe,
  PnpeRole.ChefAntennePnpe,
  PnpeRole.DirectionPnpe,
  PnpeRole.AdminMinistereTravail,
];

export default function ConseillerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PnpeStaffShell>
      <PnpeRoleGate
        allowedRoles={ALLOWED_ROLES}
        redirectMissingProfile={false}
      >
        {children}
      </PnpeRoleGate>
    </PnpeStaffShell>
  );
}
