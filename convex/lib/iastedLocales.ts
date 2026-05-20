/**
 * iastedLocales — Liste des langues iAsted côté Convex.
 *
 * MIROIR de la constante canonique `packages/iasted/src/locales/supported-locales.ts`.
 * La duplication est intentionnelle : le bundler Convex ne résout pas les
 * workspace packages qui transitent par des peer-deps React (`@workspace/iasted`
 * dépend de react/lucide-react/motion). Garder cette liste alignée avec la
 * version frontend lors de tout ajout/retrait de langue.
 *
 * Consommé par :
 *   - `convex/ai/realtimeToken.ts` (validation locale, hint Whisper)
 *   - `convex/ai/iastedRealtimePrompt.ts` (greetings multilingues, bloc langue)
 *   - `convex/ai/voicePreferences.ts` (DEFAULT_PREFS.preferredLocale)
 */

export type LocaleTier = "excellent" | "good" | "partial";
export type LocaleCategory = "un" | "international" | "african";

export interface IastedLocale {
	code: string;
	whisperCode: string;
	labelFr: string;
	labelNative: string;
	flag: string;
	tier: LocaleTier;
	category: LocaleCategory;
}

export const IASTED_SUPPORTED_LOCALES: readonly IastedLocale[] = [
	{ code: "fr-FR", whisperCode: "fr", labelFr: "Français",  labelNative: "Français",  flag: "🇫🇷", tier: "excellent", category: "un" },
	{ code: "en-US", whisperCode: "en", labelFr: "Anglais",   labelNative: "English",   flag: "🇺🇸", tier: "excellent", category: "un" },
	{ code: "es-ES", whisperCode: "es", labelFr: "Espagnol",  labelNative: "Español",   flag: "🇪🇸", tier: "excellent", category: "un" },
	{ code: "ar-SA", whisperCode: "ar", labelFr: "Arabe",     labelNative: "العربية",   flag: "🇸🇦", tier: "good",      category: "un" },
	{ code: "zh-CN", whisperCode: "zh", labelFr: "Chinois",   labelNative: "中文",      flag: "🇨🇳", tier: "good",      category: "un" },
	{ code: "ru-RU", whisperCode: "ru", labelFr: "Russe",     labelNative: "Русский",   flag: "🇷🇺", tier: "good",      category: "un" },
	{ code: "pt-BR", whisperCode: "pt", labelFr: "Portugais", labelNative: "Português", flag: "🇧🇷", tier: "excellent", category: "international" },
	{ code: "de-DE", whisperCode: "de", labelFr: "Allemand",  labelNative: "Deutsch",   flag: "🇩🇪", tier: "excellent", category: "international" },
	{ code: "it-IT", whisperCode: "it", labelFr: "Italien",   labelNative: "Italiano",  flag: "🇮🇹", tier: "excellent", category: "international" },
	{ code: "ja-JP", whisperCode: "ja", labelFr: "Japonais",  labelNative: "日本語",     flag: "🇯🇵", tier: "good",      category: "international" },
	{ code: "ko-KR", whisperCode: "ko", labelFr: "Coréen",    labelNative: "한국어",     flag: "🇰🇷", tier: "good",      category: "international" },
	{ code: "sw",    whisperCode: "sw", labelFr: "Swahili",   labelNative: "Kiswahili", flag: "🇰🇪", tier: "partial",   category: "african" },
	{ code: "ha",    whisperCode: "ha", labelFr: "Haoussa",   labelNative: "Hausa",     flag: "🇳🇬", tier: "partial",   category: "african" },
	{ code: "yo",    whisperCode: "yo", labelFr: "Yoruba",    labelNative: "Yorùbá",    flag: "🇳🇬", tier: "partial",   category: "african" },
	{ code: "ln",    whisperCode: "ln", labelFr: "Lingala",   labelNative: "Lingála",   flag: "🇨🇩", tier: "partial",   category: "african" },
];

export const DEFAULT_IASTED_LOCALE = "fr-FR";

const LOCALE_INDEX: ReadonlyMap<string, IastedLocale> = new Map(
	IASTED_SUPPORTED_LOCALES.map((l) => [l.code, l]),
);

export function isIastedLocaleSupported(code: string | null | undefined): boolean {
	if (!code) return false;
	return LOCALE_INDEX.has(code);
}

export function getIastedLocale(code: string | null | undefined): IastedLocale {
	if (code) {
		const found = LOCALE_INDEX.get(code);
		if (found) return found;
	}
	return LOCALE_INDEX.get(DEFAULT_IASTED_LOCALE)!;
}
