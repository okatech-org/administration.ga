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
 * Format : gab-{cc}-{yyyy}-{nnnnn}  (tout en minuscules)
 * Exemple : gab-fr-2026-00042
 *
 * - gab = nationalite gabonaise (fixe)
 * - cc = code pays de residence (2 ou 3 lettres, ex: fr, es, usa)
 * - yyyy = annee d'inscription
 * - nnnnn = rang dans le pays de residence (compteur par pays+annee)
 *
 * Un citoyen ne recoit qu'un seul matricule, il ne change jamais.
 */
export async function generateMatricule(
  ctx: MutationCtx,
  countryCode: string,
): Promise<string> {
  const year = new Date().getFullYear();
  const cc = (countryCode || "xx").toLowerCase().slice(0, 3);
  // Compteur par pays + annee pour le rang dans le pays de residence
  const counterName = `matricule_${cc}_${year}`;

  const seq = await nextCounter(ctx, counterName);
  const sequence = String(seq).padStart(5, "0");

  return `gab-${cc}-${year}-${sequence}`;
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
 * Format strict : {type}-{matricule}.{ext}  (tout en minuscules)
 * Exemple : photo-identite-gab-fr-2026-00042.jpg
 *
 * Aucun texte supplementaire, aucune majuscule, aucun storageId.
 * Si pas de matricule ou pas de type connu, retourne le nom original.
 */
export function formatDocumentFilename(
  originalFilename: string,
  documentType: string | undefined,
  matricule: string | undefined,
  mimeType?: string,
): string {
  if (!matricule || !documentType) return originalFilename;

  const docTypeName = DOC_TYPE_NAMES[documentType];
  if (!docTypeName) return originalFilename;

  // Deduire l'extension proprement :
  // 1. Depuis le mimeType (source fiable)
  // 2. Depuis le nom original (si c'est une vraie extension courte)
  // 3. Fallback "pdf"
  let ext = "pdf";
  if (mimeType) {
    const mimeToExt: Record<string, string> = {
      "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png",
      "image/webp": "webp", "image/gif": "gif", "image/heic": "heic",
      "application/pdf": "pdf",
      "application/msword": "doc",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    };
    ext = mimeToExt[mimeType] ?? "pdf";
  } else {
    // Extraire l'extension uniquement si elle ressemble a une vraie extension (2-4 chars)
    const parts = originalFilename.split(".");
    const lastPart = parts.length > 1 ? parts.pop()?.toLowerCase() : undefined;
    if (lastPart && lastPart.length <= 5 && /^[a-z0-9]+$/.test(lastPart)) {
      ext = lastPart;
    }
  }

  // Format strict : tout en minuscules, pas d'info supplementaire
  return `${docTypeName}-${matricule.toLowerCase()}.${ext}`;
}
