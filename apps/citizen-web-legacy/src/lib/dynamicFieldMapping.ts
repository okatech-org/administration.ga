import type { FormSchema } from "@/components/admin/FormBuilder";

/**
 * Common AI field names that can be extracted from documents
 * These are the keys the AI assistant sends when filling forms
 */
const AI_FIELD_KEYS = {
	// Identity
	firstName: ["firstName", "prenom", "given_name", "first_name"],
	lastName: ["lastName", "nom", "family_name", "last_name", "surname"],
	birthDate: [
		"birthDate",
		"date_naissance",
		"birth_date",
		"dateOfBirth",
		"dob",
	],
	birthPlace: ["birthPlace", "lieu_naissance", "birth_place", "placeOfBirth"],
	birthCountry: ["birthCountry", "pays_naissance", "birth_country"],
	gender: ["gender", "sexe", "sex"],
	nationality: ["nationality", "nationalite", "citizenship"],

	// Contact
	email: ["email", "courriel", "mail"],
	phone: ["phone", "telephone", "tel", "mobile"],

	// Address
	street: ["street", "rue", "address", "adresse"],
	city: ["city", "ville", "town"],
	postalCode: ["postalCode", "code_postal", "zip", "zipCode"],
	country: ["country", "pays"],

	// Passport
	passportNumber: [
		"passportNumber",
		"passport_number",
		"numero_passeport",
		"documentNumber",
	],
	passportIssueDate: ["passportIssueDate", "issue_date", "date_emission"],
	passportExpiryDate: [
		"passportExpiryDate",
		"expiry_date",
		"date_expiration",
		"expirationDate",
	],
	passportAuthority: [
		"passportAuthority",
		"issuing_authority",
		"autorite_emission",
	],

	// Family
	maritalStatus: ["maritalStatus", "situation_matrimoniale", "civil_status"],
	fatherFirstName: ["fatherFirstName", "prenom_pere", "father_first_name"],
	fatherLastName: ["fatherLastName", "nom_pere", "father_last_name"],
	motherFirstName: ["motherFirstName", "prenom_mere", "mother_first_name"],
	motherLastName: ["motherLastName", "nom_mere", "mother_last_name"],
} as const;

type AIFieldKey = keyof typeof AI_FIELD_KEYS;

/**
 * Generate a field mapping from a FormSchema to AI field keys
 * This allows the AI fill system to map extracted document data to dynamic form fields
 *
 * @param schema - The FormSchema to analyze
 * @returns A mapping from AI field keys to form field paths (e.g., "firstName" -> "identity.prenom")
 */
export function generateDynamicFieldMapping(
	schema: FormSchema,
): Record<string, string> {
	const mapping: Record<string, string> = {};

	const properties = schema.properties || {};

	// Iterate through each section
	for (const [sectionKey, sectionProp] of Object.entries(properties)) {
		if (typeof sectionProp !== "object" || sectionProp.type !== "object")
			continue;

		const sectionProperties = sectionProp.properties || {};

		// Iterate through each field in the section
		for (const [fieldKey, fieldProp] of Object.entries(sectionProperties)) {
			if (typeof fieldProp !== "object") continue;

			const fieldPath = `${sectionKey}.${fieldKey}`;
			const normalizedFieldKey = fieldKey.toLowerCase().replace(/[-_]/g, "");

			// Check if this field matches any known AI field
			for (const [aiKey, aliases] of Object.entries(AI_FIELD_KEYS)) {
				const normalizedAliases = aliases.map((a: string) =>
					a.toLowerCase().replace(/[-_]/g, ""),
				);

				if (normalizedAliases.includes(normalizedFieldKey)) {
					mapping[aiKey] = fieldPath;
					break;
				}

				// Also check against the field title if available
				const frTitle =
					fieldProp.title?.fr?.toLowerCase().replace(/[-_\s]/g, "") || "";
				if (
					normalizedAliases.some((alias: string) =>
						frTitle.includes(alias.replace(/[-_]/g, "")),
					)
				) {
					mapping[aiKey] = fieldPath;
					break;
				}
			}
		}
	}

	return mapping;
}

/**
 * Invert a mapping (AI key -> field path) to (field path -> AI key)
 * Useful for debugging and understanding what fields are mappable
 */
export function invertMapping(
	mapping: Record<string, string>,
): Record<string, string> {
	const inverted: Record<string, string> = {};
	for (const [aiKey, fieldPath] of Object.entries(mapping)) {
		inverted[fieldPath] = aiKey;
	}
	return inverted;
}

/**
 * Get a list of fields that could be auto-filled for a given schema
 */
export function getMappableFields(schema: FormSchema): string[] {
	const mapping = generateDynamicFieldMapping(schema);
	return Object.values(mapping);
}
