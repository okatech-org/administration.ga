/**
 * Document Types Utilities
 *
 * Translation keys:
 * - Categories: documentTypes.categories.[categoryValue]
 * - Types: documentTypes.types.[typeValue]
 */

import {
	DetailedDocumentType,
	DOCUMENT_TYPES_BY_CATEGORY,
	DocumentTypeCategory,
} from "@convex/lib/constants";

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export {
	DocumentTypeCategory,
	DetailedDocumentType,
	DOCUMENT_TYPES_BY_CATEGORY,
};

// ============================================================================
// TRANSLATION KEY HELPERS
// ============================================================================

/**
 * Get the i18n translation key for a document type category
 */
export function getCategoryTranslationKey(
	category: DocumentTypeCategory | string,
): string {
	return `documentTypes.categories.${category}`;
}

/**
 * Get the i18n translation key for a detailed document type
 */
export function getTypeTranslationKey(
	type: DetailedDocumentType | string,
): string {
	return `documentTypes.types.${type}`;
}

// ============================================================================
// CATEGORY UTILITIES
// ============================================================================

/**
 * Get all document type categories as an array
 */
export function getAllCategories(): DocumentTypeCategory[] {
	return Object.values(DocumentTypeCategory);
}

/**
 * Get document types for a specific category
 */
export function getTypesForCategory(
	category: DocumentTypeCategory,
): DetailedDocumentType[] {
	return DOCUMENT_TYPES_BY_CATEGORY[category] || [];
}

/**
 * Find which category a document type belongs to
 */
export function getCategoryForType(
	type: DetailedDocumentType | string,
): DocumentTypeCategory | null {
	for (const [category, types] of Object.entries(DOCUMENT_TYPES_BY_CATEGORY)) {
		if (types.includes(type as DetailedDocumentType)) {
			return category as DocumentTypeCategory;
		}
	}
	return null;
}

// ============================================================================
// GROUPED OPTIONS HELPER (for ComboBox)
// ============================================================================

export interface DocumentTypeOption {
	value: DetailedDocumentType;
	labelKey: string; // i18n key
	category: DocumentTypeCategory;
	categoryLabelKey: string; // i18n key
}

export interface GroupedDocumentTypes {
	category: DocumentTypeCategory;
	categoryLabelKey: string;
	types: {
		value: DetailedDocumentType;
		labelKey: string;
	}[];
}

/**
 * Get all document types grouped by category (for ComboBox rendering)
 */
export function getGroupedDocumentTypes(): GroupedDocumentTypes[] {
	return getAllCategories().map((category) => ({
		category,
		categoryLabelKey: getCategoryTranslationKey(category),
		types: getTypesForCategory(category).map((type) => ({
			value: type,
			labelKey: getTypeTranslationKey(type),
		})),
	}));
}

/**
 * Get all document types as flat options (for simpler use cases)
 */
export function getAllDocumentTypeOptions(): DocumentTypeOption[] {
	const options: DocumentTypeOption[] = [];

	for (const category of getAllCategories()) {
		for (const type of getTypesForCategory(category)) {
			options.push({
				value: type,
				labelKey: getTypeTranslationKey(type),
				category,
				categoryLabelKey: getCategoryTranslationKey(category),
			});
		}
	}

	return options;
}
