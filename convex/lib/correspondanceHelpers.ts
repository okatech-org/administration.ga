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
import { assertCanDoTask, isSuperAdmin } from "./permissions";
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
// CHAMP DÉNORMALISÉ POUR LA RECHERCHE FULL-TEXT
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Construit le contenu textuel agrégé d'un dossier pour l'index de recherche.
 * À appeler à chaque insert et chaque patch qui touche un champ searchable.
 *
 * Champs concaténés :
 *   - title, reference (identifiants)
 *   - senderName, senderOrg, recipientName, recipientOrg (correspondants)
 *   - comment (corps), tags (mots-clés)
 *   - arrivalReference (numéro de registre destinataire, après réception)
 */
export function buildCorrespondanceSearchText(item: {
  title?: string | null;
  reference?: string | null;
  senderName?: string | null;
  senderOrg?: string | null;
  recipientName?: string | null;
  recipientOrg?: string | null;
  comment?: string | null;
  tags?: string[] | null;
  arrivalReference?: string | null;
}): string {
  const parts: string[] = [];
  if (item.title) parts.push(item.title);
  if (item.reference) parts.push(item.reference);
  if (item.senderName) parts.push(item.senderName);
  if (item.senderOrg) parts.push(item.senderOrg);
  if (item.recipientName) parts.push(item.recipientName);
  if (item.recipientOrg) parts.push(item.recipientOrg);
  if (item.comment) parts.push(item.comment);
  if (item.arrivalReference) parts.push(item.arrivalReference);
  if (item.tags && item.tags.length > 0) parts.push(...item.tags);
  // Convex search est en lower-case insensitive, mais on normalise pour
  // garantir un comportement homogène entre create/patch et types entrants.
  return parts.join(" ").trim();
}

// ═════════════════════════════════════════════════════════════════════════════
// HABILITATION PAR NIVEAU DE CONFIDENTIALITÉ
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Hiérarchie des grades du plus bas au plus haut.
 * Reproduite ici pour éviter une dépendance cyclique.
 */
export const GRADE_ORDER = [
  "external",
  "agent",
  "secretary",
  "counselor",
  "deputy_chief",
  "chief",
] as const;

export type Grade = (typeof GRADE_ORDER)[number];

/**
 * Grade minimum requis pour accéder à un dossier selon son niveau de confidentialité.
 * Les parties prenantes (créateur, destinataire principal, approbateur en cours)
 * conservent toujours leur accès indépendamment de leur grade.
 */
export const CONFIDENTIALITY_MIN_GRADE: Record<string, Grade> = {
  standard: "external",
  confidentiel: "secretary",
  secret: "deputy_chief",
};

/**
 * Vérifie si un grade donné est suffisant pour lire un niveau de confidentialité.
 * Fonction pure — testable sans contexte Convex.
 */
export function canGradeReadConfidentiality(
  grade: Grade,
  confidentialite: string | undefined,
): boolean {
  const level = confidentialite ?? "standard";
  const required = CONFIDENTIALITY_MIN_GRADE[level] ?? "deputy_chief";
  return GRADE_ORDER.indexOf(grade) >= GRADE_ORDER.indexOf(required);
}

/**
 * Récupère le grade de l'utilisateur dans une organisation, ou "external"
 * s'il n'a pas de membership ou pas de position attachée.
 */
async function getUserGradeInOrg(
  ctx: AuthContext,
  userId: Id<"users">,
  orgId: Id<"orgs">,
): Promise<Grade> {
  const membership = await ctx.db
    .query("memberships")
    .withIndex("by_user_org_deletedAt", (q: any) =>
      q.eq("userId", userId).eq("orgId", orgId).eq("deletedAt", undefined),
    )
    .first();
  if (!membership?.positionId) return "external";
  const position = (await ctx.db.get(membership.positionId)) as any;
  const grade = position?.grade ?? "agent";
  return (GRADE_ORDER as readonly string[]).includes(grade) ? grade : "agent";
}

/**
 * Détermine si un utilisateur peut accéder à un dossier compte tenu de son
 * niveau de confidentialité. Les parties prenantes (créateur, destinataire
 * principal, détenteur courant, approbateur) gardent toujours l'accès.
 */
export async function userCanReadConfidentiality(
  ctx: AuthContext,
  user: Doc<"users">,
  item: Pick<
    Doc<"correspondanceItems">,
    | "confidentialite"
    | "orgId"
    | "copyOwnerOrgId"
    | "createdBy"
    | "primaryRecipientId"
    | "currentHolderId"
    | "assignedToId"
  >,
): Promise<boolean> {
  const level = item.confidentialite ?? "standard";
  if (level === "standard") return true;
  if (isSuperAdmin(user)) return true;

  const stakeholder =
    item.createdBy === user._id ||
    item.primaryRecipientId === user._id ||
    item.currentHolderId === user._id ||
    item.assignedToId === user._id;
  if (stakeholder) return true;

  const orgId = item.copyOwnerOrgId ?? item.orgId;
  const userGrade = await getUserGradeInOrg(ctx, user._id, orgId);
  return canGradeReadConfidentiality(userGrade, level);
}

/**
 * Lève une erreur si l'utilisateur n'a pas l'habilitation pour le niveau
 * de confidentialité du dossier.
 */
export async function assertConfidentialityClearance(
  ctx: AuthContext,
  user: Doc<"users">,
  item: Parameters<typeof userCanReadConfidentiality>[2],
): Promise<void> {
  const ok = await userCanReadConfidentiality(ctx, user, item);
  if (!ok) {
    throw error(
      ErrorCode.INSUFFICIENT_PERMISSIONS,
      `Habilitation insuffisante pour ce dossier (${item.confidentialite ?? "standard"}).`,
    );
  }
}

/**
 * Filtre une liste de dossiers en ne gardant que ceux que l'utilisateur peut lire.
 * À utiliser dans toute query qui retourne plusieurs items.
 */
export async function filterByConfidentialityClearance<T extends Parameters<typeof userCanReadConfidentiality>[2]>(
  ctx: AuthContext,
  user: Doc<"users">,
  items: T[],
): Promise<T[]> {
  const allowed: T[] = [];
  for (const item of items) {
    if (await userCanReadConfidentiality(ctx, user, item)) {
      allowed.push(item);
    }
  }
  return allowed;
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
