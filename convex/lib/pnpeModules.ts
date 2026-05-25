/**
 * Modules métier disponibles par rôle PNPE.
 *
 * Définit, pour chaque rôle PNPE (cf. enum MemberRole étendu en Phase 7),
 * la liste des modules opérationnels que le titulaire peut utiliser.
 * Sert à :
 *   - construire la sidebar dynamiquement
 *   - filtrer les actions disponibles
 *   - documenter le périmètre fonctionnel par rôle
 *
 * Source de vérité unique pour le mapping rôle → modules (utilisée côté
 * frontend et seeds staff).
 */
import { MemberRole } from "./constants";

export type PnpeModule = {
  /** Slug stable (référencé dans les routes et les seeds). */
  code: string;
  /** Libellé affiché dans l'UI. */
  label: string;
  /** Route principale du module dans apps/pnpe/. */
  route: string;
  /** Catégorie pour grouper dans la sidebar. */
  category:
    | "demandeurs"
    | "employeurs"
    | "offres"
    | "auto-emploi"
    | "formation"
    | "pilotage"
    | "reporting";
};

/** Catalogue des 14 modules métier PNPE. */
export const PNPE_MODULES: Record<string, PnpeModule> = {
  // ─── Gestion demandeurs ────────────────────────────────────
  validation_de: {
    code: "validation_de",
    label: "Validation des inscriptions D.E",
    route: "/conseiller/file-d-attente",
    category: "demandeurs",
  },
  portefeuille_de: {
    code: "portefeuille_de",
    label: "Portefeuille D.E",
    route: "/conseiller/mes-demandeurs",
    category: "demandeurs",
  },
  bilan_competences: {
    code: "bilan_competences",
    label: "Bilans de compétences",
    route: "/conseiller/bilans",
    category: "demandeurs",
  },

  // ─── Gestion employeurs ────────────────────────────────────
  verification_employeur: {
    code: "verification_employeur",
    label: "Vérification employeurs (DGI/CNSS)",
    route: "/conseiller/employeurs",
    category: "employeurs",
  },
  prospection_entreprises: {
    code: "prospection_entreprises",
    label: "Prospection entreprises",
    route: "/conseiller/prospection",
    category: "employeurs",
  },

  // ─── Offres et candidatures ────────────────────────────────
  moderation_offres: {
    code: "moderation_offres",
    label: "Modération des offres",
    route: "/conseiller/offres-a-valider",
    category: "offres",
  },
  matching_iaste: {
    code: "matching_iaste",
    label: "Matching D.E ↔ offres (iAsted)",
    route: "/conseiller/matching",
    category: "offres",
  },

  // ─── Auto-emploi ───────────────────────────────────────────
  sessions_bmc: {
    code: "sessions_bmc",
    label: "Sessions BMC (formateur)",
    route: "/auto-emploi/formation",
    category: "auto-emploi",
  },
  suivi_porteurs: {
    code: "suivi_porteurs",
    label: "Suivi porteurs de projet",
    route: "/auto-emploi/suivi",
    category: "auto-emploi",
  },

  // ─── Formation et apprentissage ────────────────────────────
  suivi_contrats: {
    code: "suivi_contrats",
    label: "Suivi contrats apprentissage / insertion",
    route: "/conseiller/contrats",
    category: "formation",
  },

  // ─── Pilotage antenne ──────────────────────────────────────
  pilotage_antenne: {
    code: "pilotage_antenne",
    label: "Pilotage de l'antenne",
    route: "/conseiller/pilotage-antenne",
    category: "pilotage",
  },

  // ─── Pilotage national ─────────────────────────────────────
  gestion_antennes: {
    code: "gestion_antennes",
    label: "Gestion du réseau d'antennes",
    route: "/pnpe/antennes",
    category: "pilotage",
  },
  gestion_personnel: {
    code: "gestion_personnel",
    label: "Gestion du personnel PNPE",
    route: "/pnpe/personnel",
    category: "pilotage",
  },

  // ─── Reporting ─────────────────────────────────────────────
  reporting_ministere: {
    code: "reporting_ministere",
    label: "Reporting Ministère du Travail",
    route: "/pnpe/reporting",
    category: "reporting",
  },
};

/**
 * Mapping rôle PNPE → modules accessibles.
 *
 * Hiérarchie : un rôle supérieur hérite des modules de tous les rôles
 * inférieurs (cumulatif). Codé en dur pour rester lisible.
 */
export const PNPE_MODULES_BY_ROLE: Record<string, readonly string[]> = {
  // Conseiller PNPE (base) : opérationnel quotidien
  [MemberRole.ConseillerPnpe]: [
    "validation_de",
    "portefeuille_de",
    "bilan_competences",
    "verification_employeur",
    "prospection_entreprises",
    "moderation_offres",
    "matching_iaste",
    "suivi_contrats",
  ],

  // Chef d'antenne : tous les modules conseiller + pilotage antenne
  [MemberRole.ChefAntennePnpe]: [
    "validation_de",
    "portefeuille_de",
    "bilan_competences",
    "verification_employeur",
    "prospection_entreprises",
    "moderation_offres",
    "matching_iaste",
    "suivi_contrats",
    "pilotage_antenne",
  ],

  // Formateur Auto-Emploi : sessions BMC et suivi porteurs uniquement
  [MemberRole.FormateurAutoEmploi]: ["sessions_bmc", "suivi_porteurs"],

  // Direction PNPE : tous les modules opérationnels + national
  [MemberRole.DirectionPnpe]: [
    "validation_de",
    "portefeuille_de",
    "bilan_competences",
    "verification_employeur",
    "prospection_entreprises",
    "moderation_offres",
    "matching_iaste",
    "suivi_contrats",
    "sessions_bmc",
    "suivi_porteurs",
    "pilotage_antenne",
    "gestion_antennes",
    "gestion_personnel",
    "reporting_ministere",
  ],

  // Admin Ministère du Travail : pilotage et reporting national
  [MemberRole.AdminMinistereTravail]: [
    "gestion_antennes",
    "gestion_personnel",
    "reporting_ministere",
  ],
};

/** Retourne les objets PnpeModule complets accessibles pour un rôle donné. */
export function getModulesForRole(role: string): PnpeModule[] {
  const codes = PNPE_MODULES_BY_ROLE[role] ?? [];
  return codes.map((c) => PNPE_MODULES[c]).filter(Boolean);
}

/** Regroupe les modules d'un rôle par catégorie pour rendu sidebar. */
export function getModulesByCategoryForRole(
  role: string,
): Record<PnpeModule["category"], PnpeModule[]> {
  const modules = getModulesForRole(role);
  return modules.reduce(
    (acc, m) => {
      if (!acc[m.category]) acc[m.category] = [];
      acc[m.category].push(m);
      return acc;
    },
    {} as Record<PnpeModule["category"], PnpeModule[]>,
  );
}
