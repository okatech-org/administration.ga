/**
 * Technology Alert List (TAL) — secteurs stratégiques pour le module
 * Renseignement souverain.
 *
 * Permet de classer un profil de la diaspora en fonction du métier déclaré
 * (profile.profession.title) dans des secteurs sensibles : énergie, défense,
 * finance, IT, biotech, etc. Utilisé pour :
 *   - filtrer les cohortes "métiers stratégiques" par pays
 *   - alimenter les alertes (rule type `profile_sector`)
 *   - prioriser les cibles de surveillance
 *
 * Le mapping est heuristique (mots-clés). Une note manuelle / vérification
 * humaine reste indispensable avant action.
 */

export const StrategicSector = {
	energy: "energy",
	oil_gas: "oil_gas",
	mining: "mining",
	fintech: "fintech",
	banking: "banking",
	it_software: "it_software",
	cybersecurity: "cybersecurity",
	biotech: "biotech",
	health: "health",
	defense: "defense",
	aerospace: "aerospace",
	nuclear: "nuclear",
	telecom: "telecom",
	ai_ml: "ai_ml",
	research: "research",
} as const;

export type StrategicSectorValue =
	(typeof StrategicSector)[keyof typeof StrategicSector];

export const ALL_STRATEGIC_SECTORS: StrategicSectorValue[] =
	Object.values(StrategicSector);

export const SECTOR_LABELS: Record<StrategicSectorValue, { fr: string; en: string }> =
	{
		energy: { fr: "Énergie", en: "Energy" },
		oil_gas: { fr: "Pétrole & Gaz", en: "Oil & Gas" },
		mining: { fr: "Mines", en: "Mining" },
		fintech: { fr: "Fintech", en: "Fintech" },
		banking: { fr: "Banque", en: "Banking" },
		it_software: { fr: "Logiciel / IT", en: "IT / Software" },
		cybersecurity: { fr: "Cybersécurité", en: "Cybersecurity" },
		biotech: { fr: "Biotech", en: "Biotech" },
		health: { fr: "Santé", en: "Health" },
		defense: { fr: "Défense", en: "Defense" },
		aerospace: { fr: "Aérospatial", en: "Aerospace" },
		nuclear: { fr: "Nucléaire", en: "Nuclear" },
		telecom: { fr: "Télécoms", en: "Telecoms" },
		ai_ml: { fr: "IA / Machine Learning", en: "AI / ML" },
		research: { fr: "Recherche", en: "Research" },
	};

/**
 * Mapping heuristique mot-clé → secteurs (un mot-clé peut mapper vers
 * plusieurs secteurs). Maintenu côté code, enrichi par retours terrain.
 *
 * Les comparaisons sont case-insensitive et basées sur l'inclusion
 * (substring). Privilégier des termes précis pour limiter les faux positifs.
 */
const KEYWORD_MAP: Array<{
	keywords: string[];
	sectors: StrategicSectorValue[];
}> = [
	// Énergie / Hydrocarbures
	{
		keywords: ["pétrole", "petroleum", "oil", "gaz", "lng", "raffinerie", "upstream"],
		sectors: ["oil_gas", "energy"],
	},
	{ keywords: ["énergie", "energy", "edf", "total", "engie"], sectors: ["energy"] },
	{ keywords: ["solaire", "solar", "éolien", "wind", "renewable"], sectors: ["energy"] },
	{ keywords: ["nucléaire", "nuclear", "atomic"], sectors: ["nuclear"] },

	// Mines
	{
		keywords: ["mine", "mining", "manganèse", "manganese", "uranium", "or", "gold"],
		sectors: ["mining"],
	},

	// Finance
	{
		keywords: ["banque", "bank", "banking", "trader", "trading", "asset management"],
		sectors: ["banking"],
	},
	{
		keywords: ["fintech", "blockchain", "crypto", "defi", "paytech", "regtech"],
		sectors: ["fintech"],
	},

	// IT / Software
	{
		keywords: [
			"développeur",
			"developer",
			"software",
			"engineer",
			"ingénieur logiciel",
			"devops",
			"sre",
			"backend",
			"frontend",
			"fullstack",
		],
		sectors: ["it_software"],
	},
	{ keywords: ["télécom", "telecom", "5g", "fibre", "isp"], sectors: ["telecom"] },

	// Cyber
	{
		keywords: [
			"cyber",
			"cybersécurité",
			"cybersecurity",
			"security engineer",
			"sécurité informatique",
			"pentester",
			"red team",
		],
		sectors: ["cybersecurity"],
	},

	// IA / ML
	{
		keywords: ["data scientist", "machine learning", "ml engineer", "ia", "ai", "deep learning", "llm"],
		sectors: ["ai_ml", "it_software"],
	},

	// Biotech / Santé
	{
		keywords: ["biotech", "pharma", "vaccine", "clinical research", "génomique", "genomics"],
		sectors: ["biotech", "health"],
	},
	{
		keywords: ["médecin", "doctor", "infirmier", "nurse", "hôpital", "hospital", "santé", "health"],
		sectors: ["health"],
	},

	// Défense / Aérospatial
	{ keywords: ["défense", "defense", "militaire", "military", "armée"], sectors: ["defense"] },
	{
		keywords: ["aérospatial", "aerospace", "satellite", "espace", "spacex", "esa", "cnes", "airbus", "boeing"],
		sectors: ["aerospace"],
	},

	// Recherche
	{
		keywords: ["chercheur", "researcher", "phd", "doctorant", "cnrs", "lab", "université", "university"],
		sectors: ["research"],
	},
];

/**
 * Retourne les secteurs stratégiques inférés d'un titre de poste.
 * Comparaison case-insensitive sur substring. Retourne un tableau dédupliqué.
 */
export function inferSectorsFromProfession(
	profession: { title?: string; employer?: string } | undefined,
): StrategicSectorValue[] {
	if (!profession) return [];
	const haystack = `${profession.title ?? ""} ${profession.employer ?? ""}`
		.toLowerCase()
		.trim();
	if (!haystack) return [];

	const matched = new Set<StrategicSectorValue>();
	for (const entry of KEYWORD_MAP) {
		for (const kw of entry.keywords) {
			if (haystack.includes(kw.toLowerCase())) {
				for (const s of entry.sectors) matched.add(s);
				break;
			}
		}
	}
	return Array.from(matched);
}

export function isStrategicSector(value: string): value is StrategicSectorValue {
	return (ALL_STRATEGIC_SECTORS as string[]).includes(value);
}
