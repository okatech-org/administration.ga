/**
 * Archive helpers — constantes et utilitaires partages frontend/backend.
 */

// ── Categories d'archivage par defaut ──

export interface ArchiveCategoryDefault {
  slug: string;
  name: string;
  color: string;
  icon: string;
  retentionYears: number;
  isPerpetual?: boolean;
  description: string;
}

export const ARCHIVE_CATEGORY_DEFAULTS: ArchiveCategoryDefault[] = [
  { slug: "fiscal", name: "Fiscal", color: "amber", icon: "Landmark", retentionYears: 10, description: "Documents comptables et fiscaux" },
  { slug: "social", name: "Social", color: "blue", icon: "Users", retentionYears: 5, description: "Dossiers du personnel et social" },
  { slug: "juridique", name: "Juridique", color: "emerald", icon: "Scale", retentionYears: 30, description: "Contrats, litiges et actes juridiques" },
  { slug: "consulaire", name: "Consulaire", color: "violet", icon: "Building2", retentionYears: 50, description: "Documents consulaires et diplomatiques" },
  { slug: "coffre", name: "Coffre-fort", color: "rose", icon: "Lock", retentionYears: 99, isPerpetual: true, description: "Conservation permanente" },
];

export const ARCHIVE_CATEGORY_MAP = Object.fromEntries(
  ARCHIVE_CATEGORY_DEFAULTS.map((c) => [c.slug, c]),
) as Record<string, ArchiveCategoryDefault>;

// ── Niveaux de confidentialite ──

export const CONFIDENTIALITY_LEVELS = ["public", "internal", "confidential", "secret"] as const;
export type ConfidentialityLevel = (typeof CONFIDENTIALITY_LEVELS)[number];

// ── Evenements de debut de comptage ──

export const COUNTING_START_EVENTS = ["date_creation", "date_cloture", "date_tag", "date_gel", "date_manuelle"] as const;
export type CountingStartEvent = (typeof COUNTING_START_EVENTS)[number];

// ── Statuts d'archive ──

export type ArchiveStatus = "active" | "expiring" | "expired" | "perpetual";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Calcule la date d'expiration de retention.
 * Retourne undefined pour les archives perpetuelles.
 */
export function computeRetentionExpiry(
  archivedAt: number,
  retentionYears: number,
  isPerpetual?: boolean,
): number | undefined {
  if (isPerpetual) return undefined;
  const expiryDate = new Date(archivedAt);
  expiryDate.setFullYear(expiryDate.getFullYear() + retentionYears);
  return expiryDate.getTime();
}

/**
 * Determine le statut d'archive en fonction de la date d'expiration.
 */
export function getArchiveStatus(retentionExpiresAt: number | undefined): ArchiveStatus {
  if (retentionExpiresAt === undefined) return "perpetual";
  const now = Date.now();
  if (now >= retentionExpiresAt) return "expired";
  if (now >= retentionExpiresAt - THIRTY_DAYS_MS) return "expiring";
  return "active";
}

// ── Actions d'audit ──

export const ARCHIVE_AUDIT_ACTIONS = [
  "archive",
  "restore",
  "permanent_delete",
  "policy_update",
  "category_change",
  "retention_extend",
] as const;
export type ArchiveAuditAction = (typeof ARCHIVE_AUDIT_ACTIONS)[number];
