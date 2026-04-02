/**
 * iCorrespondance — Helpers centralisés
 *
 * Ce fichier regroupe :
 * - Contrôle d'accès (requireCorrespondanceAccess)
 * - Génération de référence séquentielle atomique
 * - Matrice de transitions de statuts
 */

import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { getMembership } from "./auth";
import { assertCanDoTask } from "./permissions";
import { error, ErrorCode } from "./errors";
import { TaskCode } from "./taskCodes";

type AuthContext = QueryCtx | MutationCtx;

// ═════════════════════════════════════════════════════════════════════════════
// CONTRÔLE D'ACCÈS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Vérifie que l'utilisateur a accès à la correspondance dans l'organisation.
 * Retourne le membership pour les checks supplémentaires.
 */
export async function requireCorrespondanceAccess(
  ctx: AuthContext,
  user: Doc<"users">,
  orgId: Id<"orgs">,
  taskCode: keyof typeof TaskCode.correspondance = "view",
) {
  const membership = await getMembership(ctx, user._id, orgId);
  await assertCanDoTask(ctx, user, membership, TaskCode.correspondance[taskCode]);
  return membership;
}

// ═════════════════════════════════════════════════════════════════════════════
// GÉNÉRATION DE RÉFÉRENCE SÉQUENTIELLE
// ═════════════════════════════════════════════════════════════════════════════

/** Codes abrégés par type de correspondance */
const TYPE_CODES: Record<string, string> = {
  note_verbale: "NV",
  lettre_officielle: "LO",
  circulaire: "CIR",
  telegramme: "TEL",
  memorandum: "MEM",
  communique: "COM",
};

/**
 * Génère une référence séquentielle unique et atomique.
 *
 * Format : DIPL/{YYYY}/{TYPE_CODE}/{NNNNN}
 * Exemple : DIPL/2026/NV/00042
 *
 * Utilise la table `counters` avec un compteur nommé par type + année.
 * Les mutations Convex sont sérialisées, donc pas de race condition.
 */
export async function generateSequentialReference(
  ctx: MutationCtx,
  type: string,
): Promise<string> {
  const year = new Date().getFullYear();
  const typeCode = TYPE_CODES[type] ?? type.substring(0, 3).toUpperCase();
  const counterName = `correspondance_${type}_${year}`;

  // Lecture atomique du compteur
  const counter = await ctx.db
    .query("counters")
    .withIndex("by_name", (q) => q.eq("name", counterName))
    .unique();

  const nextValue = (counter?.value ?? 0) + 1;

  if (counter) {
    await ctx.db.patch(counter._id, { value: nextValue });
  } else {
    await ctx.db.insert("counters", { name: counterName, value: nextValue });
  }

  const sequence = String(nextValue).padStart(5, "0");
  return `DIPL/${year}/${typeCode}/${sequence}`;
}

// ═════════════════════════════════════════════════════════════════════════════
// REGISTRE COURRIER FORMEL
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Génère un numéro de registre d'arrivée séquentiel.
 *
 * Format : ARR/{YYYY}/{NNNNN}
 * Exemple : ARR/2026/00042
 *
 * Chaque organisation a son propre compteur annuel.
 */
export async function generateArrivalReference(
  ctx: MutationCtx,
  orgId: Id<"orgs">,
): Promise<string> {
  const year = new Date().getFullYear();
  const counterName = `correspondance_arrivee_${orgId}_${year}`;

  const counter = await ctx.db
    .query("counters")
    .withIndex("by_name", (q) => q.eq("name", counterName))
    .unique();

  const nextValue = (counter?.value ?? 0) + 1;

  if (counter) {
    await ctx.db.patch(counter._id, { value: nextValue });
  } else {
    await ctx.db.insert("counters", { name: counterName, value: nextValue });
  }

  const sequence = String(nextValue).padStart(5, "0");
  return `ARR/${year}/${sequence}`;
}

/**
 * Génère un numéro de registre de départ séquentiel.
 *
 * Format : DEP/{YYYY}/{NNNNN}
 * Exemple : DEP/2026/00042
 *
 * Chaque organisation a son propre compteur annuel.
 */
export async function generateDepartureReference(
  ctx: MutationCtx,
  orgId: Id<"orgs">,
): Promise<string> {
  const year = new Date().getFullYear();
  const counterName = `correspondance_depart_${orgId}_${year}`;

  const counter = await ctx.db
    .query("counters")
    .withIndex("by_name", (q) => q.eq("name", counterName))
    .unique();

  const nextValue = (counter?.value ?? 0) + 1;

  if (counter) {
    await ctx.db.patch(counter._id, { value: nextValue });
  } else {
    await ctx.db.insert("counters", { name: counterName, value: nextValue });
  }

  const sequence = String(nextValue).padStart(5, "0");
  return `DEP/${year}/${sequence}`;
}

// ═════════════════════════════════════════════════════════════════════════════
// MATRICE DE TRANSITIONS DE STATUTS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Transitions autorisées entre statuts de correspondance.
 * Clé = statut source, valeur = statuts cibles autorisés.
 */
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  draft: ["pending", "sent", "archived"],
  pending: ["draft", "approved", "rejected"],
  approved: ["sent", "draft"],
  rejected: ["draft"],
  sent: ["archived"],
  received: ["archived"],
  archived: [],
};

/**
 * Vérifie si une transition de statut est autorisée.
 */
export function isValidTransition(from: string, to: string): boolean {
  const allowed = ALLOWED_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

/**
 * Asserte qu'une transition est valide, lève une erreur sinon.
 */
export function assertValidTransition(from: string, to: string): void {
  if (!isValidTransition(from, to)) {
    throw error(
      ErrorCode.VALIDATION_ERROR,
      `Transition de statut invalide : "${from}" → "${to}". Transitions autorisées depuis "${from}" : ${ALLOWED_TRANSITIONS[from]?.join(", ") ?? "aucune"}.`,
    );
  }
}
