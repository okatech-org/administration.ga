/**
 * referenceHelpers — Generation sequentielle des matricules et references.
 *
 * Utilise la table `counters` pour les numeros atomiques.
 * Pattern identique a correspondanceHelpers.ts.
 */

import type { MutationCtx } from "../_generated/server";

// ═════════════════════════════════════════════════════════════════════════════
// COMPTEUR ATOMIQUE
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Incremente et retourne la valeur suivante d'un compteur nomme.
 * Les mutations Convex sont serialisees → pas de race condition.
 */
async function nextCounter(
  ctx: MutationCtx,
  counterName: string,
): Promise<number> {
  const counter = await ctx.db
    .query("counters")
    .withIndex("by_name", (q: any) => q.eq("name", counterName))
    .unique();

  const nextValue = (counter?.value ?? 0) + 1;

  if (counter) {
    await ctx.db.patch(counter._id, { value: nextValue });
  } else {
    await ctx.db.insert("counters", { name: counterName, value: nextValue });
  }

  return nextValue;
}

// ═════════════════════════════════════════════════════════════════════════════
// MATRICULE CONSULAIRE
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Genere un matricule consulaire permanent.
 *
 * Format : GAB-{CC}-{YYYY}-{NNNNN}
 * Exemple : GAB-FR-2025-00042
 *
 * - CC = code pays de residence (2 lettres)
 * - YYYY = annee de creation
 * - NNNNN = sequence annuelle (5 chiffres)
 *
 * Un citoyen ne recoit qu'un seul matricule, il ne change jamais.
 */
export async function generateMatricule(
  ctx: MutationCtx,
  countryCode: string,
): Promise<string> {
  const year = new Date().getFullYear();
  const cc = (countryCode || "XX").toUpperCase().slice(0, 2);
  const counterName = `matricule_${year}`;

  const seq = await nextCounter(ctx, counterName);
  const sequence = String(seq).padStart(5, "0");

  return `GAB-${cc}-${year}-${sequence}`;
}

// ═════════════════════════════════════════════════════════════════════════════
// REFERENCE DE DEMANDE
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Genere une reference de demande sequentielle.
 *
 * Format : DEM-{YYYY}-{NNNNN}
 * Exemple : DEM-2025-00153
 *
 * Compteur annuel partage entre toutes les demandes.
 */
export async function generateRequestReference(
  ctx: MutationCtx,
): Promise<string> {
  const year = new Date().getFullYear();
  const counterName = `request_${year}`;

  const seq = await nextCounter(ctx, counterName);
  const sequence = String(seq).padStart(5, "0");

  return `DEM-${year}-${sequence}`;
}

// ═════════════════════════════════════════════════════════════════════════════
// NOMMAGE DOCUMENTS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Map des types de document vers un nom lisible en kebab-case.
 */
const DOC_TYPE_NAMES: Record<string, string> = {
  identity_photo: "photo-identite",
  passport: "passeport",
  proof_of_address: "justificatif-domicile",
  birth_certificate: "acte-naissance",
  residence_permit: "titre-sejour",
};

/**
 * Genere un nom de fichier normalise pour un document.
 *
 * Format : {type-du-document}-{MATRICULE}.{ext}
 * Exemple : photo-d-identite-GAB-FR-2025-00042.jpg
 *
 * Si pas de matricule ou pas de type connu, retourne le nom original.
 */
export function formatDocumentFilename(
  originalFilename: string,
  documentType: string | undefined,
  matricule: string | undefined,
): string {
  if (!matricule || !documentType) return originalFilename;

  const docTypeName = DOC_TYPE_NAMES[documentType];
  if (!docTypeName) return originalFilename;

  const ext = originalFilename.split(".").pop()?.toLowerCase() ?? "pdf";
  return `${docTypeName}-${matricule.toLowerCase()}.${ext}`;
}
