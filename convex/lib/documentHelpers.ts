/**
 * Helpers iDocument — symétriques à `correspondanceHelpers.ts`.
 *
 * Source de vérité pour la construction du `searchText` indexable d'un
 * document, partagée entre les mutations create/update/origin-update.
 */

interface DocumentSearchTextInput {
  label?: string;
  category?: string;
  documentType?: string;
  files?: { filename: string }[];
  tags?: string[];
  origin?: {
    senderName?: string;
    recipientName?: string;
    correspondanceReference?: string;
    correspondanceArrivalRef?: string;
  };
}

/**
 * Construit la chaîne searchable d'un document. Préserve l'ordre :
 *   label · category · documentType · filenames · tags · origin.*
 *
 * Pure : aucune dépendance Convex, testable en vitest.
 * Tolère les champs absents.
 * Tronque à 8000 caractères (limite confortable du searchIndex Convex).
 */
export function buildDocumentSearchText(input: DocumentSearchTextInput): string {
  const parts: string[] = [];
  if (input.label) parts.push(input.label);
  if (input.category) parts.push(input.category);
  if (input.documentType) parts.push(input.documentType);
  if (input.files) {
    for (const f of input.files) {
      if (f.filename) parts.push(f.filename);
    }
  }
  if (input.tags) {
    for (const t of input.tags) {
      if (t) parts.push(t);
    }
  }
  if (input.origin) {
    const { senderName, recipientName, correspondanceReference, correspondanceArrivalRef } =
      input.origin;
    if (senderName) parts.push(senderName);
    if (recipientName) parts.push(recipientName);
    if (correspondanceReference) parts.push(correspondanceReference);
    if (correspondanceArrivalRef) parts.push(correspondanceArrivalRef);
  }
  return parts.filter(Boolean).join(" ").slice(0, 8000);
}
