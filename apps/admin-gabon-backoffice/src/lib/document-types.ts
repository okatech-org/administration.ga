/**
 * Helpers pour les types de documents — ré-exporte les enums Convex
 * et fournit les fonctions utilitaires pour le picker.
 */
import {
  DetailedDocumentType,
  DocumentTypeCategory,
  DOCUMENT_TYPES_BY_CATEGORY,
} from "@convex/lib/constants";

export type { DetailedDocumentType };

interface DocumentTypeEntry {
  value: DetailedDocumentType;
  labelKey: string;
}

interface DocumentTypeGroup {
  category: DocumentTypeCategory;
  categoryLabelKey: string;
  types: DocumentTypeEntry[];
}

/**
 * Retourne les types de documents regroupés par catégorie,
 * avec les clés de traduction associées.
 */
export function getGroupedDocumentTypes(): DocumentTypeGroup[] {
  return (Object.entries(DOCUMENT_TYPES_BY_CATEGORY) as [DocumentTypeCategory, DetailedDocumentType[]][]).map(
    ([category, types]) => ({
      category,
      categoryLabelKey: `documentTypes.category.${category}`,
      types: types.map((type) => ({
        value: type,
        labelKey: `documentTypes.types.${type}`,
      })),
    }),
  );
}

/**
 * Retourne la clé de traduction i18n pour un type de document donné.
 */
export function getTypeTranslationKey(type: DetailedDocumentType): string {
  return `documentTypes.types.${type}`;
}
