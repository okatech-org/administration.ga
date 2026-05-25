/**
 * Helper to get the localized string from a value that can be a string or a LocalizedString object.
 * @param value The string or localized object { fr: string, en?: string }
 * @param i18nLanguage The current language code from i18n
 * @returns The localized string or empty string
 */
export function getLocalizedValue(
	value: string | Record<string, string> | undefined | null,
	i18nLanguage: string,
): string {
	if (!value) return "";

	if (typeof value === "string") return value;

	// Normalized language code (e.g. 'en-US' -> 'en')
	const lang = i18nLanguage.split("-")[0].toLowerCase();

	if (lang === "en" && value.en) {
		return value.en;
	}

	// Fallback to FR
	return value.fr || "";
}
