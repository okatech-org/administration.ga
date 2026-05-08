/**
 * Country → Continent mapping and display utilities.
 * Used for segmenting diplomatic representations by region.
 */

export type Continent =
	| "africa"
	| "europe"
	| "americas"
	| "asia"
	| "middle_east"
	| "oceania";

// ── Continent metadata ─────────────────────────────────
export const CONTINENT_META: Record<
	Continent,
	{ label: string; emoji: string; order: number }
> = {
	africa: { label: "Afrique", emoji: "", order: 1 },
	europe: { label: "Europe", emoji: "", order: 2 },
	americas: { label: "Amériques", emoji: "", order: 3 },
	asia: { label: "Asie & Pacifique", emoji: "", order: 4 },
	middle_east: { label: "Moyen-Orient", emoji: "", order: 5 },
	oceania: { label: "Océanie", emoji: "", order: 6 },
};

// ── ISO 3166-1 alpha-2 → Continent ─────────────────────
const COUNTRY_CONTINENT: Record<string, Continent> = {
	// Afrique
	ZA: "africa", DZ: "africa", AO: "africa", BJ: "africa", BW: "africa",
	BF: "africa", BI: "africa", CV: "africa", CM: "africa", CF: "africa",
	TD: "africa", KM: "africa", CG: "africa", CD: "africa", CI: "africa",
	DJ: "africa", EG: "africa", GQ: "africa", ER: "africa", SZ: "africa",
	ET: "africa", GA: "africa", GM: "africa", GH: "africa", GN: "africa",
	GW: "africa", KE: "africa", LS: "africa", LR: "africa", LY: "africa",
	MG: "africa", MW: "africa", ML: "africa", MR: "africa", MU: "africa",
	MA: "africa", MZ: "africa", NA: "africa", NE: "africa", NG: "africa",
	RW: "africa", ST: "africa", SN: "africa", SC: "africa", SL: "africa",
	SO: "africa", SS: "africa", SD: "africa", TZ: "africa", TG: "africa",
	TN: "africa", UG: "africa", ZM: "africa", ZW: "africa",

	// Europe
	AL: "europe", AD: "europe", AT: "europe", BY: "europe", BE: "europe",
	BA: "europe", BG: "europe", HR: "europe", CY: "europe", CZ: "europe",
	DK: "europe", EE: "europe", FI: "europe", FR: "europe", DE: "europe",
	GR: "europe", HU: "europe", IS: "europe", IE: "europe", IT: "europe",
	XK: "europe", LV: "europe", LI: "europe", LT: "europe", LU: "europe",
	MT: "europe", MD: "europe", MC: "europe", ME: "europe", NL: "europe",
	MK: "europe", NO: "europe", PL: "europe", PT: "europe", RO: "europe",
	RU: "europe", SM: "europe", RS: "europe", SK: "europe", SI: "europe",
	ES: "europe", SE: "europe", CH: "europe", UA: "europe", GB: "europe",
	VA: "europe",

	// Amériques
	AG: "americas", AR: "americas", BS: "americas", BB: "americas", BZ: "americas",
	BO: "americas", BR: "americas", CA: "americas", CL: "americas", CO: "americas",
	CR: "americas", CU: "americas", DM: "americas", DO: "americas", EC: "americas",
	SV: "americas", GD: "americas", GT: "americas", GY: "americas", HT: "americas",
	HN: "americas", JM: "americas", MX: "americas", NI: "americas", PA: "americas",
	PY: "americas", PE: "americas", KN: "americas", LC: "americas", VC: "americas",
	SR: "americas", TT: "americas", US: "americas", UY: "americas", VE: "americas",

	// Asie & Pacifique
	AF: "asia", BD: "asia", BT: "asia", BN: "asia", KH: "asia",
	CN: "asia", FJ: "asia", IN: "asia", ID: "asia", JP: "asia",
	KZ: "asia", KG: "asia", LA: "asia", MY: "asia", MV: "asia",
	MN: "asia", MM: "asia", NP: "asia", NZ: "asia", PK: "asia",
	PH: "asia", SG: "asia", KR: "asia", LK: "asia", TW: "asia",
	TJ: "asia", TH: "asia", TL: "asia", TM: "asia", UZ: "asia",
	VN: "asia", AU: "asia",

	// Moyen-Orient
	BH: "middle_east", IR: "middle_east", IQ: "middle_east", IL: "middle_east",
	JO: "middle_east", KW: "middle_east", LB: "middle_east", OM: "middle_east",
	PS: "middle_east", QA: "middle_east", SA: "middle_east", SY: "middle_east",
	TR: "middle_east", AE: "middle_east", YE: "middle_east",
};

// ── Country names (French) ─────────────────────────────
const COUNTRY_NAMES_FR: Record<string, string> = {
	ZA: "Afrique du Sud", DZ: "Algérie", AO: "Angola", BJ: "Bénin",
	BW: "Botswana", CM: "Cameroun", CG: "Congo", CD: "RD Congo",
	CI: "Côte d'Ivoire", EG: "Égypte", ET: "Éthiopie", GA: "Gabon",
	GH: "Ghana", GQ: "Guinée Équatoriale", ML: "Mali", MA: "Maroc",
	MZ: "Mozambique", NA: "Namibie", NG: "Nigéria", RW: "Rwanda",
	ST: "São Tomé-et-Príncipe", SN: "Sénégal", TG: "Togo", TN: "Tunisie",
	ZM: "Zambie", ZW: "Zimbabwe",

	DE: "Allemagne", BE: "Belgique", ES: "Espagne", FR: "France",
	IT: "Italie", GB: "Royaume-Uni", RU: "Russie", VA: "Vatican",
	CH: "Suisse", TR: "Turquie",

	BR: "Brésil", CA: "Canada", CU: "Cuba", US: "États-Unis",

	SA: "Arabie Saoudite", CN: "Chine", KR: "Corée du Sud",
	IN: "Inde", JP: "Japon", LB: "Liban",
};

// ── Flag emoji from country code ───────────────────────
export function getCountryFlag(code: string): string {
	if (!code || code.length !== 2) return "";
	const upper = code.toUpperCase();
	return String.fromCodePoint(
		...upper.split("").map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
	);
}

// ── Public API ─────────────────────────────────────────
export function getContinent(countryCode: string): Continent | null {
	return COUNTRY_CONTINENT[countryCode?.toUpperCase()] ?? null;
}

export function getCountryName(countryCode: string): string {
	const upper = countryCode?.toUpperCase();
	return COUNTRY_NAMES_FR[upper] || upper || "—";
}

export function getContinentLabel(continent: Continent): string {
	return CONTINENT_META[continent]?.label ?? continent;
}

export function getContinentEmoji(continent: Continent): string {
	return CONTINENT_META[continent]?.emoji ?? "";
}

export function getActiveContinents(countryCodes: string[]): Continent[] {
	const continents = new Set<Continent>();
	for (const code of countryCodes) {
		const c = getContinent(code);
		if (c) continents.add(c);
	}
	return [...continents].sort(
		(a, b) => (CONTINENT_META[a]?.order ?? 99) - (CONTINENT_META[b]?.order ?? 99),
	);
}

/**
 * Liste complète des pays connus (ISO 2 lettres) triée par nom français.
 * Source : keys de COUNTRY_CONTINENT.
 */
export function getAllCountriesSorted(): Array<{
	code: string;
	name: string;
	flag: string;
	continent: Continent | null;
}> {
	return Object.keys(COUNTRY_CONTINENT)
		.map((code) => ({
			code,
			name: getCountryName(code),
			flag: getCountryFlag(code),
			continent: getContinent(code),
		}))
		.sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

// ── Organization type display helpers ──────────────────
const ORG_TYPE_META: Record<string, { label: string; emoji: string }> = {
	embassy: { label: "Ambassade", emoji: "" },
	high_representation: { label: "Haute Représentation", emoji: "" },
	general_consulate: { label: "Consulat Général", emoji: "" },
	high_commission: { label: "Haut-Commissariat", emoji: "" },
	permanent_mission: { label: "Mission Permanente", emoji: "" },
	third_party: { label: "Tiers de confiance", emoji: "" },
	consulate: { label: "Consulat", emoji: "" },
	honorary_consulate: { label: "Consulat Honoraire", emoji: "" },
	other: { label: "Autre", emoji: "" },
};

export function getOrgTypeLabel(type: string): string {
	return ORG_TYPE_META[type]?.label ?? type;
}

export function getOrgTypeEmoji(type: string): string {
	return ORG_TYPE_META[type]?.emoji ?? "";
}
