/**
 * Helpers de rôles PNPE.
 *
 * Calque le pattern existant `src/lib/direction/roles.ts` (qui a été
 * supprimé en Phase 0). Hiérarchie ordonnée du plus haut au plus bas.
 */

export enum PnpeRole {
  /** Administration ministérielle. */
  AdminMinistereTravail = "admin_ministere_travail",
  /** Direction générale PNPE (Libreville). */
  DirectionPnpe = "direction_pnpe",
  /** Pilote d'une antenne provinciale. */
  ChefAntennePnpe = "chef_antenne_pnpe",
  /** Anime les sessions BMC (Auto-Emploi). */
  FormateurAutoEmploi = "formateur_auto_emploi",
  /** Conseiller PNPE en antenne. */
  ConseillerPnpe = "conseiller_pnpe",
  /** Représentant RH d'une entreprise (côté employeur). */
  Employeur = "employeur",
  /** D.E inscrit (côté usager). */
  DemandeurEmploi = "demandeur_emploi",
}

const HIERARCHY: Record<PnpeRole, number> = {
  [PnpeRole.AdminMinistereTravail]: 1,
  [PnpeRole.DirectionPnpe]: 2,
  [PnpeRole.ChefAntennePnpe]: 3,
  [PnpeRole.FormateurAutoEmploi]: 4,
  [PnpeRole.ConseillerPnpe]: 5,
  [PnpeRole.Employeur]: 6,
  [PnpeRole.DemandeurEmploi]: 7,
};

const STAFF_ROLES = new Set<PnpeRole>([
  PnpeRole.AdminMinistereTravail,
  PnpeRole.DirectionPnpe,
  PnpeRole.ChefAntennePnpe,
  PnpeRole.FormateurAutoEmploi,
  PnpeRole.ConseillerPnpe,
]);

const USER_ROLES = new Set<PnpeRole>([
  PnpeRole.Employeur,
  PnpeRole.DemandeurEmploi,
]);

/** True si le rôle correspond à un agent PNPE/Ministère du Travail. */
export function isStaffRole(role: PnpeRole | string | null | undefined): boolean {
  return !!role && STAFF_ROLES.has(role as PnpeRole);
}

/** True si le rôle correspond à un usager externe (D.E ou employeur). */
export function isUserRole(role: PnpeRole | string | null | undefined): boolean {
  return !!role && USER_ROLES.has(role as PnpeRole);
}

/** Niveau hiérarchique (plus petit = plus élevé). */
export function getHierarchyLevel(role: PnpeRole): number {
  return HIERARCHY[role] ?? 99;
}

/**
 * `manager` peut-il administrer `target` ? True si manager a un niveau
 * hiérarchique strictement supérieur (plus petit numérique).
 */
export function canManageMember(manager: PnpeRole, target: PnpeRole): boolean {
  return getHierarchyLevel(manager) < getHierarchyLevel(target);
}

const LABELS: Record<PnpeRole, string> = {
  [PnpeRole.AdminMinistereTravail]: "Admin Ministère du Travail",
  [PnpeRole.DirectionPnpe]: "Direction PNPE",
  [PnpeRole.ChefAntennePnpe]: "Chef d'antenne PNPE",
  [PnpeRole.FormateurAutoEmploi]: "Formateur Auto-Emploi",
  [PnpeRole.ConseillerPnpe]: "Conseiller PNPE",
  [PnpeRole.Employeur]: "Employeur",
  [PnpeRole.DemandeurEmploi]: "Demandeur d'Emploi",
};

export function getRoleLabel(role: PnpeRole): string {
  return LABELS[role] ?? role;
}

/** Route de destination par défaut après login selon le rôle. */
export function getDefaultRouteForRole(role: PnpeRole): string {
  switch (role) {
    case PnpeRole.DemandeurEmploi:
      return "/demandeur";
    case PnpeRole.Employeur:
      return "/employeur/tableau-de-bord";
    case PnpeRole.ConseillerPnpe:
    case PnpeRole.ChefAntennePnpe:
    case PnpeRole.DirectionPnpe:
      return "/conseiller/file-d-attente";
    case PnpeRole.FormateurAutoEmploi:
      return "/auto-emploi/formation";
    case PnpeRole.AdminMinistereTravail:
      return "/pnpe"; // Backoffice admin_administration_ga
    default:
      return "/";
  }
}
