/**
 * userIdentity — Utilitaires d'extraction de l'identité d'usage de
 * l'utilisateur pour les prompts IA (vocal et texte).
 *
 * Contexte : le schema `users` stocke `firstName` comme une chaîne unique
 * qui peut contenir plusieurs prénoms d'état-civil séparés par des espaces
 * (« Jean Pierre Marie Bongo »). De même `lastName` peut être composé
 * (« Bongo-Ondimba », « Bongo Ondimba », « N'Goma »).
 *
 * Pour s'adresser à l'utilisateur de façon humaine, on extrait :
 *  - le **prénom usuel** = premier token de `firstName`
 *  - le **nom court** = premier token de `lastName` (avant tiret, espace ou apostrophe)
 *
 * Pas de migration de schema : on travaille en mémoire à chaque prompt.
 */

/** Premier prénom d'usage (« Jean Pierre Bongo » → « Jean »). */
export function extractUsualFirstName(firstName: string | undefined | null): string {
	const trimmed = (firstName ?? "").trim();
	if (!trimmed) return "";
	return trimmed.split(/\s+/)[0] ?? "";
}

/** Premier nom de famille court (« Bongo-Ondimba » → « Bongo »). */
export function extractShortLastName(lastName: string | undefined | null): string {
	const trimmed = (lastName ?? "").trim();
	if (!trimmed) return "";
	return trimmed.split(/[\s\-']/)[0] ?? "";
}

/**
 * Compose une adresse formelle ouverte de session :
 *  - « Conseiller Bongo » si position courte connue
 *  - « Monsieur Bongo » / « Madame Bongo » si position absente mais nom connu
 *  - « Jean » fallback prénom usuel
 *  - « Excellence » fallback ultime
 */
export function buildFormalAddress(input: {
	positionTitle?: string | null;
	firstName?: string | null;
	lastName?: string | null;
	honorific?: "M." | "Mme" | string | null;
}): string {
	const shortLast = extractShortLastName(input.lastName);
	const usualFirst = extractUsualFirstName(input.firstName);
	if (input.positionTitle && shortLast) {
		return `${input.positionTitle} ${shortLast}`;
	}
	if (input.honorific && shortLast) {
		return `${input.honorific} ${shortLast}`;
	}
	if (shortLast) {
		return `Monsieur/Madame ${shortLast}`;
	}
	if (usualFirst) return usualFirst;
	return "Excellence";
}
