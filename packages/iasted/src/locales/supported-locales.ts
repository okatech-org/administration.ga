/**
 * supported-locales — Liste partagée des langues supportées par iAsted.
 *
 * Source de vérité unique consommée par :
 *   - le backend Convex (`realtimeToken.create`, `iastedRealtimePrompt.buildPrompt`)
 *     pour valider la locale demandée et injecter les directives multilingues
 *     dans le system prompt.
 *   - les panneaux Réglages frontend (backoffice + citoyen) pour afficher
 *     le sélecteur de langue.
 *
 * Phase 1 (présent fichier) : 15 langues couvertes nativement ou partiellement
 * par OpenAI Realtime + Whisper.
 *
 * Phase 2 (à venir, non couverte ici) : Wolof, Bambara, Igbo, Kinyarwanda et
 * langues nationales gabonaises (Fang, Myènè, Punu, Nzébi, Téké, Kota, Obamba,
 * Vili) via cascade Meta MMS ou fournisseur africain spécialisé.
 *
 * Module pur — pas de dépendance React ni Convex.
 */

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

/**
 * Qualité attendue de la conversation vocale pour cette locale.
 * - `excellent` : voix native OpenAI Realtime, qualité maximale.
 * - `good` : Realtime supporté, accent parfois marqué.
 * - `partial` : Whisper STT fiable mais TTS variable — afficher un
 *   avertissement à l'utilisateur ; proposer fallback fr/en si nécessaire.
 */
export type LocaleTier = "excellent" | "good" | "partial";

/**
 * Groupement éditorial pour l'affichage dans le sélecteur.
 */
export type LocaleCategory = "un" | "international" | "african";

export interface IastedLocale {
	/** Code BCP-47 (ex. "fr-FR", "en-US", "sw"). Identifiant canonique. */
	code: string;
	/** Code ISO-639 court accepté par Whisper (ex. "fr", "en", "sw"). */
	whisperCode: string;
	/** Libellé en français (affichage côté UI francophone). */
	labelFr: string;
	/** Libellé dans la langue elle-même (UX native). */
	labelNative: string;
	/** Emoji drapeau représentatif (pays principal). */
	flag: string;
	/** Tier de qualité vocale attendue. */
	tier: LocaleTier;
	/** Catégorie éditoriale pour le regroupement UI. */
	category: LocaleCategory;
}

// ─────────────────────────────────────────────────────────────
// Liste des 15 langues — Phase 1
// ─────────────────────────────────────────────────────────────

export const IASTED_SUPPORTED_LOCALES: readonly IastedLocale[] = [
	// ── ONU & majeures (6) ──
	{ code: "fr-FR", whisperCode: "fr", labelFr: "Français",  labelNative: "Français",  flag: "🇫🇷", tier: "excellent", category: "un" },
	{ code: "en-US", whisperCode: "en", labelFr: "Anglais",   labelNative: "English",   flag: "🇺🇸", tier: "excellent", category: "un" },
	{ code: "es-ES", whisperCode: "es", labelFr: "Espagnol",  labelNative: "Español",   flag: "🇪🇸", tier: "excellent", category: "un" },
	{ code: "ar-SA", whisperCode: "ar", labelFr: "Arabe",     labelNative: "العربية",   flag: "🇸🇦", tier: "good",      category: "un" },
	{ code: "zh-CN", whisperCode: "zh", labelFr: "Chinois",   labelNative: "中文",      flag: "🇨🇳", tier: "good",      category: "un" },
	{ code: "ru-RU", whisperCode: "ru", labelFr: "Russe",     labelNative: "Русский",   flag: "🇷🇺", tier: "good",      category: "un" },
	// ── Internationales majeures (5) ──
	{ code: "pt-BR", whisperCode: "pt", labelFr: "Portugais", labelNative: "Português", flag: "🇧🇷", tier: "excellent", category: "international" },
	{ code: "de-DE", whisperCode: "de", labelFr: "Allemand",  labelNative: "Deutsch",   flag: "🇩🇪", tier: "excellent", category: "international" },
	{ code: "it-IT", whisperCode: "it", labelFr: "Italien",   labelNative: "Italiano",  flag: "🇮🇹", tier: "excellent", category: "international" },
	{ code: "ja-JP", whisperCode: "ja", labelFr: "Japonais",  labelNative: "日本語",     flag: "🇯🇵", tier: "good",      category: "international" },
	{ code: "ko-KR", whisperCode: "ko", labelFr: "Coréen",    labelNative: "한국어",     flag: "🇰🇷", tier: "good",      category: "international" },
	// ── Africaines transnationales (4) — qualité partielle ──
	{ code: "sw",    whisperCode: "sw", labelFr: "Swahili",   labelNative: "Kiswahili", flag: "🇰🇪", tier: "partial",   category: "african" },
	{ code: "ha",    whisperCode: "ha", labelFr: "Haoussa",   labelNative: "Hausa",     flag: "🇳🇬", tier: "partial",   category: "african" },
	{ code: "yo",    whisperCode: "yo", labelFr: "Yoruba",    labelNative: "Yorùbá",    flag: "🇳🇬", tier: "partial",   category: "african" },
	{ code: "ln",    whisperCode: "ln", labelFr: "Lingala",   labelNative: "Lingála",   flag: "🇨🇩", tier: "partial",   category: "african" },
];

// ─────────────────────────────────────────────────────────────
// Constantes & helpers
// ─────────────────────────────────────────────────────────────

export const DEFAULT_IASTED_LOCALE = "fr-FR";

const LOCALE_INDEX: ReadonlyMap<string, IastedLocale> = new Map(
	IASTED_SUPPORTED_LOCALES.map((l) => [l.code, l]),
);

export function isIastedLocaleSupported(code: string | null | undefined): boolean {
	if (!code) return false;
	return LOCALE_INDEX.has(code);
}

/**
 * Retourne la définition d'une locale supportée. Fallback silencieux vers
 * `fr-FR` si le code fourni n'est pas reconnu — la validation explicite
 * doit se faire en amont avec `isIastedLocaleSupported`.
 */
export function getIastedLocale(code: string | null | undefined): IastedLocale {
	if (code) {
		const found = LOCALE_INDEX.get(code);
		if (found) return found;
	}
	return LOCALE_INDEX.get(DEFAULT_IASTED_LOCALE)!;
}
