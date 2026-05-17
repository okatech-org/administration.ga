/**
 * Affaires Diplomatiques — Helpers de pipeline
 *
 * Helpers purs pour la state machine du pipeline diplomatique.
 * Extrait pour permettre les tests unitaires sans dépendance Convex.
 */

import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { error, ErrorCode } from "./errors";

// ═════════════════════════════════════════════════════════════════════════════
// PHASES DU PIPELINE
// ═════════════════════════════════════════════════════════════════════════════

export type PipelinePhase =
  | "targeting"
  | "strategy"
  | "outreach"
  | "reporting"
  | "project";

export const PIPELINE_PHASES: readonly PipelinePhase[] = [
  "targeting",
  "strategy",
  "outreach",
  "reporting",
  "project",
] as const;

// ═════════════════════════════════════════════════════════════════════════════
// MATRICE DE TRANSITIONS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Transitions autorisées entre phases du pipeline.
 * Clé = phase source, valeur = phases cibles autorisées.
 *
 * Règles métier :
 * - targeting → strategy : génération de plan stratégique IA
 * - strategy → outreach : rédaction de la première lettre
 * - strategy → targeting : retour pour ajuster le ciblage
 * - outreach → reporting : compilation rapport après réunion
 * - outreach → strategy : retour pour ajuster le plan
 * - reporting → project : structuration projet après validation
 * - reporting → outreach : reprise du contact
 * - project : phase finale, aucune transition autorisée
 */
export const PIPELINE_TRANSITIONS: Readonly<
  Record<PipelinePhase, readonly PipelinePhase[]>
> = {
  targeting: ["strategy"],
  strategy: ["outreach", "targeting"],
  outreach: ["reporting", "strategy"],
  reporting: ["project", "outreach"],
  project: [],
};

/**
 * Vérifie si une transition de phase est autorisée.
 */
export function isValidPipelineTransition(
  from: PipelinePhase | string | undefined,
  to: PipelinePhase | string,
): boolean {
  const fromPhase = (from ?? "targeting") as PipelinePhase;
  const allowed = PIPELINE_TRANSITIONS[fromPhase];
  if (!allowed) return false;
  return (allowed as readonly string[]).includes(to);
}

/**
 * Asserte qu'une transition est valide, lève une erreur sinon.
 */
export function assertValidPipelineTransition(
  from: PipelinePhase | string | undefined,
  to: PipelinePhase | string,
): void {
  if (!isValidPipelineTransition(from, to)) {
    const fromPhase = (from ?? "targeting") as PipelinePhase;
    const allowed = PIPELINE_TRANSITIONS[fromPhase] ?? [];
    throw error(
      ErrorCode.INVALID_STATE_TRANSITION,
      `Transition invalide : ${fromPhase} → ${to}. Transitions autorisées : ${allowed.join(", ") || "aucune (phase finale)"}`,
    );
  }
}

/**
 * Retourne la phase suivante "naturelle" dans le pipeline (avancement).
 * Utile pour les actions IA qui doivent avancer automatiquement.
 */
export function getNextPhase(
  current: PipelinePhase | string | undefined,
): PipelinePhase | null {
  const phase = (current ?? "targeting") as PipelinePhase;
  const allowed = PIPELINE_TRANSITIONS[phase];
  if (!allowed || allowed.length === 0) return null;
  // La première transition autorisée est l'avancement naturel
  // (les retours en arrière sont en deuxième position)
  return allowed[0] as PipelinePhase;
}

/**
 * Indique si une phase est terminale (aucune transition sortante).
 */
export function isTerminalPhase(phase: PipelinePhase | string): boolean {
  const transitions = PIPELINE_TRANSITIONS[phase as PipelinePhase];
  return !transitions || transitions.length === 0;
}

// ═════════════════════════════════════════════════════════════════════════════
// HELPERS DE DEDOUBLONNAGE
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Normalise un nom de cible pour comparaison de dedoublonnage.
 * Trim + lowercase + suppression espaces multiples.
 */
export function normalizeTargetName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

// ═════════════════════════════════════════════════════════════════════════════
// VALIDATEURS PURS
// ═════════════════════════════════════════════════════════════════════════════

export const TARGET_TYPES = [
  "enterprise",
  "government",
  "ngo",
  "international_org",
  "academic",
  "media",
  "other",
] as const;

export const TARGET_PRIORITIES = ["low", "medium", "high", "critical"] as const;

export const PLAN_CATEGORIES = [
  "bilateral",
  "economic",
  "cultural",
  "security",
  "multilateral",
  "other",
] as const;

export function isValidTargetType(type: string): boolean {
  return (TARGET_TYPES as readonly string[]).includes(type);
}

export function isValidTargetPriority(priority: string): boolean {
  return (TARGET_PRIORITIES as readonly string[]).includes(priority);
}

export function isValidPlanCategory(category: string): boolean {
  return (PLAN_CATEGORIES as readonly string[]).includes(category);
}

// ═════════════════════════════════════════════════════════════════════════════
// AGRÉGATIONS PARTAGÉES
// ═════════════════════════════════════════════════════════════════════════════

export interface TargetStatsBreakdown {
  /** Total des cibles actives (non archivées, non supprimées) */
  total: number;
  /** Compteur par statut (identified, contacted, in_discussion, partnership, inactive) */
  byStatus: Record<string, number>;
  /** Compteur par priorité (low, medium, high, critical) */
  byPriority: Record<string, number>;
  /** Compteur par phase pipeline (les 5 phases + unassigned) */
  byPhase: Record<string, number>;
}

/**
 * Calcule le breakdown stats à partir d'un tableau de cibles actives.
 * Source unique de vérité pour getDashboardStats et getPipelineOverview.
 */
export function computeTargetStats(
  targets: ReadonlyArray<{
    status: string;
    priority: string;
    pipelinePhase?: string;
  }>,
): TargetStatsBreakdown {
  const byStatus: Record<string, number> = {};
  const byPriority: Record<string, number> = {};
  const byPhase: Record<string, number> = {
    targeting: 0,
    strategy: 0,
    outreach: 0,
    reporting: 0,
    project: 0,
    unassigned: 0,
  };

  for (const t of targets) {
    byStatus[t.status] = (byStatus[t.status] ?? 0) + 1;
    byPriority[t.priority] = (byPriority[t.priority] ?? 0) + 1;
    const phase = t.pipelinePhase;
    if (phase && phase in byPhase) {
      byPhase[phase] = (byPhase[phase] ?? 0) + 1;
    } else {
      byPhase.unassigned = (byPhase.unassigned ?? 0) + 1;
    }
  }

  return {
    total: targets.length,
    byStatus,
    byPriority,
    byPhase,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// AUDIT LOG — mutations destructives diplomatiques (P2/O14)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Enregistre une opération destructive dans `auditLog` pour traçabilité
 * et conformité. À appeler depuis toute mutation qui archive/supprime/purge
 * une entité diplomatique.
 *
 * `changes` peut contenir { reason, cascadedCount, scope } pour faciliter
 * les analyses post-incident sans charger l'ancien document complet.
 */
export async function logDiplomaticAudit(
  ctx: MutationCtx,
  args: {
    table:
      | "diplomaticTargets"
      | "diplomaticPlans"
      | "diplomaticLetters"
      | "diplomaticReports"
      | "diplomaticProjects"
      | "diplomaticDocuments";
    docId: string;
    operation: "delete" | "update";
    actorId: Id<"users">;
    changes?: Record<string, unknown>;
  },
): Promise<void> {
  await ctx.db.insert("auditLog", {
    table: args.table,
    docId: args.docId,
    operation: args.operation,
    actorId: args.actorId,
    changes: args.changes,
    timestamp: Date.now(),
  });
}
