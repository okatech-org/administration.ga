/**
 * Données seed — page Compétences & Métiers.
 * Reflète le mockup du designer (`ressources/project/src/skills-data.jsx`).
 * À remplacer par les vraies queries Convex (admin.listSkillsChunk) une
 * fois l'agrégation server-side prête.
 */

export type Tone =
	| "info"
	| "success"
	| "green"
	| "warning"
	| "danger"
	| "purple"
	| "cyan"
	| "teal"
	| "muted";

export const TONE_VAR: Record<Tone, { color: string; tint: string }> = {
	info: { color: "var(--gabon-blue-v2)", tint: "var(--gabon-blue-v2-tint)" },
	success: { color: "var(--success-v2)", tint: "var(--success-v2-tint)" },
	green: { color: "var(--gabon-green-v2)", tint: "var(--gabon-green-v2-tint)" },
	warning: { color: "var(--warning-v2)", tint: "var(--warning-v2-tint)" },
	danger: { color: "var(--danger-v2)", tint: "var(--danger-v2-tint)" },
	purple: { color: "var(--purple-v2)", tint: "var(--purple-v2-tint)" },
	cyan: { color: "var(--cyan-v2)", tint: "var(--cyan-v2-tint)" },
	teal: { color: "var(--teal-v2)", tint: "var(--teal-v2-tint)" },
	muted: { color: "var(--text-muted)", tint: "var(--surface-3)" },
};

export const SKILLS_KPIS = {
	totalProfiles: 4827,
	profilesWithProfession: 4218,
	uniqueProfessions: 612,
	uniqueSkills: 1834,
	totalSkillEntries: 18420,
	aiEnrichedCount: 3791,
	aiCoveragePct: 78,
	cvCompletePct: 64,
};

export type CategoryId =
	| "tech"
	| "health"
	| "education"
	| "agriculture"
	| "finance"
	| "trades"
	| "public_service"
	| "arts_culture"
	| "transport"
	| "tourism_hospitality"
	| "consulting_services"
	| "legal"
	| "industry"
	| "other";

export const CATEGORIES: Array<{
	id: CategoryId;
	label: string;
	icon: string; // lucide-react icon name
	tone: Tone;
	count: number;
	gabonShare: number;
}> = [
	{ id: "tech", label: "Tech", icon: "Code2", tone: "cyan", count: 612, gabonShare: 8 },
	{ id: "health", label: "Santé", icon: "Stethoscope", tone: "green", count: 489, gabonShare: 24 },
	{ id: "education", label: "Éducation", icon: "GraduationCap", tone: "info", count: 421, gabonShare: 18 },
	{ id: "public_service", label: "Service public", icon: "Landmark", tone: "purple", count: 387, gabonShare: 12 },
	{ id: "consulting_services", label: "Conseil & Services", icon: "Briefcase", tone: "muted", count: 354, gabonShare: 9 },
	{ id: "finance", label: "Finance", icon: "Banknote", tone: "teal", count: 298, gabonShare: 6 },
	{ id: "trades", label: "Métiers manuels", icon: "Hammer", tone: "warning", count: 276, gabonShare: 11 },
	{ id: "legal", label: "Juridique", icon: "Scale", tone: "purple", count: 214, gabonShare: 4 },
	{ id: "tourism_hospitality", label: "Tourisme & Hôtellerie", icon: "Hotel", tone: "cyan", count: 198, gabonShare: 7 },
	{ id: "arts_culture", label: "Arts & Culture", icon: "Palette", tone: "warning", count: 167, gabonShare: 5 },
	{ id: "transport", label: "Transport", icon: "Truck", tone: "info", count: 142, gabonShare: 3 },
	{ id: "industry", label: "Industrie", icon: "Factory", tone: "muted", count: 124, gabonShare: 2 },
	{ id: "agriculture", label: "Agriculture", icon: "Sprout", tone: "green", count: 89, gabonShare: 1 },
	{ id: "other", label: "Autre", icon: "MoreHorizontal", tone: "muted", count: 57, gabonShare: 0 },
];

export const TOP_PROFESSIONS: Array<{ label: string; count: number; category: CategoryId }> = [
	{ label: "Infirmière / Infirmier", count: 312, category: "health" },
	{ label: "Enseignant.e du secondaire", count: 254, category: "education" },
	{ label: "Développeur web", count: 198, category: "tech" },
	{ label: "Médecin généraliste", count: 167, category: "health" },
	{ label: "Chauffeur (VTC / taxi)", count: 142, category: "transport" },
	{ label: "Comptable", count: 128, category: "finance" },
	{ label: "Coiffeur.se", count: 119, category: "trades" },
	{ label: "Sage-femme", count: 96, category: "health" },
	{ label: "Aide-soignant.e", count: 88, category: "health" },
	{ label: "Avocat.e", count: 71, category: "legal" },
];

export const TOP_SKILLS: Array<{
	label: string;
	beginner: number;
	intermediate: number;
	advanced: number;
	expert: number;
}> = [
	{ label: "Français (rédactionnel)", beginner: 4, intermediate: 28, advanced: 72, expert: 184 },
	{ label: "Soins infirmiers", beginner: 0, intermediate: 5, advanced: 18, expert: 87 },
	{ label: "Anglais professionnel", beginner: 12, intermediate: 38, advanced: 41, expert: 24 },
	{ label: "Comptabilité générale", beginner: 2, intermediate: 14, advanced: 39, expert: 31 },
	{ label: "Pédagogie", beginner: 1, intermediate: 9, advanced: 28, expert: 42 },
	{ label: "JavaScript", beginner: 5, intermediate: 15, advanced: 18, expert: 7 },
	{ label: "Gestion de projet", beginner: 3, intermediate: 12, advanced: 19, expert: 8 },
	{ label: "Suturage", beginner: 0, intermediate: 2, advanced: 11, expert: 28 },
	{ label: "Plaidoirie", beginner: 0, intermediate: 4, advanced: 9, expert: 22 },
	{ label: "Droit international", beginner: 1, intermediate: 6, advanced: 12, expert: 14 },
];

export const PRO_STATUS: Array<{ id: string; label: string; count: number; tone: Tone }> = [
	{ id: "employee", label: "Salarié.e", count: 2148, tone: "info" },
	{ id: "self_employed", label: "Indépendant.e", count: 614, tone: "cyan" },
	{ id: "entrepreneur", label: "Entrepreneur", count: 287, tone: "purple" },
	{ id: "student", label: "Étudiant.e", count: 482, tone: "teal" },
	{ id: "unemployed", label: "Sans emploi", count: 312, tone: "warning" },
	{ id: "retired", label: "Retraité.e", count: 198, tone: "green" },
	{ id: "other", label: "Autre", count: 177, tone: "muted" },
];

export const LEVEL_DISTRIBUTION: Array<{
	id: "beginner" | "intermediate" | "advanced" | "expert";
	label: string;
	count: number;
	tone: Tone;
}> = [
	{ id: "beginner", label: "Débutant", count: 1820, tone: "muted" },
	{ id: "intermediate", label: "Intermédiaire", count: 6240, tone: "info" },
	{ id: "advanced", label: "Avancé", count: 7124, tone: "success" },
	{ id: "expert", label: "Expert", count: 3236, tone: "purple" },
];

export const TOP_COUNTRIES: Array<{
	iso: string;
	flag: string;
	name: string;
	professions: number;
	skills: number;
}> = [
	{ iso: "FR", flag: "🇫🇷", name: "France", professions: 1842, skills: 5612 },
	{ iso: "GA", flag: "🇬🇦", name: "Gabon", professions: 612, skills: 1934 },
	{ iso: "US", flag: "🇺🇸", name: "États-Unis", professions: 388, skills: 1421 },
	{ iso: "CA", flag: "🇨🇦", name: "Canada", professions: 312, skills: 1187 },
	{ iso: "BE", flag: "🇧🇪", name: "Belgique", professions: 224, skills: 798 },
	{ iso: "CD", flag: "🇨🇩", name: "R. D. Congo", professions: 198, skills: 612 },
	{ iso: "CG", flag: "🇨🇬", name: "Congo-Brazza.", professions: 142, skills: 487 },
	{ iso: "DE", flag: "🇩🇪", name: "Allemagne", professions: 121, skills: 421 },
];

export const SKILL_CATALOG: Array<{
	rank: number;
	name: string;
	category: CategoryId;
	declared: number;
	ai: number;
	gap: number;
	levels: [number, number, number, number];
}> = [
	{ rank: 1, name: "Français (rédactionnel)", category: "education", declared: 288, ai: 134, gap: 0, levels: [4, 28, 72, 184] },
	{ rank: 2, name: "Soins infirmiers", category: "health", declared: 110, ai: 234, gap: 124, levels: [0, 5, 18, 87] },
	{ rank: 3, name: "Anglais professionnel", category: "consulting_services", declared: 115, ai: 198, gap: 83, levels: [12, 38, 41, 24] },
	{ rank: 4, name: "Pédagogie", category: "education", declared: 80, ai: 174, gap: 94, levels: [1, 9, 28, 42] },
	{ rank: 5, name: "Comptabilité générale", category: "finance", declared: 86, ai: 67, gap: 0, levels: [2, 14, 39, 31] },
	{ rank: 6, name: "JavaScript", category: "tech", declared: 45, ai: 142, gap: 97, levels: [5, 15, 18, 7] },
	{ rank: 7, name: "Suturage", category: "health", declared: 41, ai: 168, gap: 127, levels: [0, 2, 11, 28] },
	{ rank: 8, name: "Plaidoirie", category: "legal", declared: 35, ai: 36, gap: 1, levels: [0, 4, 9, 22] },
	{ rank: 9, name: "Gestion de projet", category: "consulting_services", declared: 42, ai: 51, gap: 9, levels: [3, 12, 19, 8] },
	{ rank: 10, name: "Triage médical", category: "health", declared: 18, ai: 218, gap: 200, levels: [0, 1, 4, 13] },
	{ rank: 11, name: "Pédiatrie", category: "health", declared: 22, ai: 184, gap: 162, levels: [0, 1, 6, 15] },
	{ rank: 12, name: "Droit OHADA", category: "legal", declared: 28, ai: 41, gap: 13, levels: [0, 3, 11, 14] },
	{ rank: 13, name: "Conduite poids lourd", category: "transport", declared: 32, ai: 68, gap: 36, levels: [1, 8, 14, 9] },
	{ rank: 14, name: "Coiffure africaine", category: "trades", declared: 41, ai: 92, gap: 51, levels: [2, 11, 16, 12] },
];

export const PROFILES: Array<{
	id: string;
	initials: string;
	tone: "rose" | "purple" | "green" | "amber" | "cyan" | "slate";
	firstName: string;
	lastName: string;
	flag: string;
	country: string;
	status: string;
	profession: string;
	category: CategoryId;
	declared: Array<{ name: string; level: string }>;
	aiCount: number;
	lang: string[];
}> = [
	{
		id: "p1", initials: "MK", tone: "rose",
		firstName: "Marie", lastName: "KOMBILA",
		flag: "🇫🇷", country: "France · Paris", status: "Salariée",
		profession: "Infirmière de bloc opératoire", category: "health",
		declared: [
			{ name: "Soins infirmiers", level: "Expert" },
			{ name: "Suturage", level: "Avancé" },
			{ name: "Pédiatrie", level: "Intermédiaire" },
		],
		aiCount: 6, lang: ["Français", "Anglais"],
	},
	{
		id: "p2", initials: "JE", tone: "purple",
		firstName: "Joël", lastName: "EYI",
		flag: "🇨🇦", country: "Canada · Montréal", status: "Salarié",
		profession: "Développeur full-stack", category: "tech",
		declared: [
			{ name: "JavaScript", level: "Expert" },
			{ name: "TypeScript", level: "Expert" },
			{ name: "React", level: "Avancé" },
			{ name: "PostgreSQL", level: "Avancé" },
		],
		aiCount: 4, lang: ["Français", "Anglais"],
	},
	{
		id: "p3", initials: "AB", tone: "green",
		firstName: "Aline", lastName: "BOULINGUI",
		flag: "🇧🇪", country: "Belgique · Bruxelles", status: "Indépendante",
		profession: "Avocate en droit international", category: "legal",
		declared: [
			{ name: "Plaidoirie", level: "Expert" },
			{ name: "Droit international", level: "Expert" },
			{ name: "Droit OHADA", level: "Avancé" },
		],
		aiCount: 5, lang: ["Français", "Anglais", "Espagnol"],
	},
	{
		id: "p4", initials: "PB", tone: "amber",
		firstName: "Paul", lastName: "BIGNOUMBA",
		flag: "🇺🇸", country: "États-Unis · Houston", status: "Entrepreneur",
		profession: "Ingénieur pétrolier", category: "industry",
		declared: [
			{ name: "Forage offshore", level: "Expert" },
			{ name: "HSE", level: "Avancé" },
			{ name: "Gestion de projet", level: "Avancé" },
		],
		aiCount: 7, lang: ["Français", "Anglais"],
	},
	{
		id: "p5", initials: "SN", tone: "cyan",
		firstName: "Sylvia", lastName: "NTOUTOUME",
		flag: "🇩🇪", country: "Allemagne · Berlin", status: "Étudiante",
		profession: "Doctorante en biologie", category: "education",
		declared: [
			{ name: "Biologie cellulaire", level: "Avancé" },
			{ name: "Anglais professionnel", level: "Expert" },
			{ name: "Allemand", level: "Avancé" },
		],
		aiCount: 3, lang: ["Français", "Allemand", "Anglais"],
	},
	{
		id: "p6", initials: "LM", tone: "rose",
		firstName: "Lucie", lastName: "MOUSSOUNDA",
		flag: "🇫🇷", country: "France · Lyon", status: "Salariée",
		profession: "Sage-femme", category: "health",
		declared: [
			{ name: "Accouchement", level: "Expert" },
			{ name: "Échographie obstétricale", level: "Avancé" },
		],
		aiCount: 8, lang: ["Français"],
	},
	{
		id: "p7", initials: "FO", tone: "slate",
		firstName: "Franck", lastName: "OBAME",
		flag: "🇫🇷", country: "France · Marseille", status: "Sans emploi",
		profession: "Comptable", category: "finance",
		declared: [
			{ name: "Comptabilité générale", level: "Avancé" },
			{ name: "Sage", level: "Avancé" },
			{ name: "Fiscalité française", level: "Intermédiaire" },
		],
		aiCount: 5, lang: ["Français"],
	},
	{
		id: "p8", initials: "AN", tone: "green",
		firstName: "Aïcha", lastName: "NGUEMA",
		flag: "🇨🇩", country: "R.D. Congo · Kinshasa", status: "Salariée",
		profession: "Enseignante de mathématiques", category: "education",
		declared: [
			{ name: "Pédagogie", level: "Expert" },
			{ name: "Mathématiques", level: "Expert" },
		],
		aiCount: 6, lang: ["Français"],
	},
];

export const NON_ENRICHED = [
	{ name: "Jean-Pierre MOUNDOUNGA", profession: "Charpentier traditionnel", country: "🇬🇦 Libreville", registeredOn: "12 avr. 2026" },
	{ name: "Patricia OYONO", profession: "Tradi-praticienne", country: "🇨🇩 Kinshasa", registeredOn: "08 avr. 2026" },
	{ name: "Marc ESSONO", profession: "Pirogue de pêche", country: "🇬🇦 Port-Gentil", registeredOn: "02 avr. 2026" },
	{ name: "Mireille NDONG", profession: "Couturière ndombolo", country: "🇫🇷 Paris", registeredOn: "28 mars 2026" },
	{ name: "Henri BAKITA", profession: "Griot, conteur", country: "🇸🇳 Dakar", registeredOn: "24 mars 2026" },
	{ name: "Rachelle ITOUMBA", profession: "Maraîchère bio", country: "🇬🇦 Oyem", registeredOn: "18 mars 2026" },
];

export const AI_FAILURES = [
	{ profession: "Tradi-praticien", freeText: "guérisseur traditionnel ngombi", count: 14, reason: "Pas de catégorie correspondante" },
	{ profession: "Pêche traditionnelle", freeText: "pirogue de pêche", count: 9, reason: "Métier non normalisable" },
	{ profession: "Griot", freeText: "conteur, gardien de la parole", count: 6, reason: "Catégorie ambigüe (Arts ou Éducation)" },
	{ profession: "Sciage artisanal", freeText: "débiteur de bois en forêt", count: 4, reason: "Métier non normalisable" },
];

export const RUN_HISTORY = [
	{ date: "14 mai 2026 · 03:00", processed: 247, success: 231, failed: 16, durationSec: 142 },
	{ date: "07 mai 2026 · 03:00", processed: 184, success: 172, failed: 12, durationSec: 108 },
	{ date: "30 avr. 2026 · 03:00", processed: 312, success: 289, failed: 23, durationSec: 178 },
	{ date: "23 avr. 2026 · 03:00", processed: 156, success: 148, failed: 8, durationSec: 92 },
	{ date: "16 avr. 2026 · 03:00", processed: 421, success: 392, failed: 29, durationSec: 240 },
];

export const CONTINENTS = ["Tous", "Europe", "Amérique du Nord", "Afrique", "Asie", "Océanie"];
export const COUNTRIES_LIST = ["Tous pays", "France", "Gabon", "États-Unis", "Canada", "Belgique", "R.D. Congo", "Allemagne", "Royaume-Uni"];
export const PRO_STATUS_LABELS = ["Tous statuts", "Salarié.e", "Indépendant.e", "Entrepreneur", "Étudiant.e", "Sans emploi", "Retraité.e", "Autre"];
export const LEVELS_LIST = ["Tout niveau", "Débutant", "Intermédiaire", "Avancé", "Expert"];

export const TITLES_BY_CAT: Partial<Record<CategoryId, Array<[string, number]>>> = {
	health: [["Infirmière", 312], ["Médecin", 167], ["Sage-femme", 96], ["Aide-soignant.e", 88]],
	education: [["Enseignant.e", 254], ["Formateur.rice", 88], ["Documentaliste", 41], ["Professeur·e univ.", 38]],
	tech: [["Développeur web", 198], ["Data analyst", 64], ["DevOps", 47], ["Designer produit", 28]],
	public_service: [["Fonctionnaire", 142], ["Cadre territorial", 88], ["Cheminot", 64], ["Pompier", 42]],
	consulting_services: [["Consultant.e", 121], ["Chef de projet", 88], ["Auditeur·rice", 54], ["Coach pro", 32]],
	finance: [["Comptable", 128], ["Auditeur·rice", 41], ["Banquier·ère", 48], ["Contrôleur de gestion", 38]],
	trades: [["Coiffeur·se", 119], ["Plombier·ère", 64], ["Électricien·ne", 47], ["Menuisier·ère", 32]],
	legal: [["Avocat·e", 71], ["Juriste", 48], ["Notaire", 18], ["Huissier·ère", 12]],
	tourism_hospitality: [["Restaurateur·rice", 64], ["Réception hôtel", 48], ["Guide touristique", 32], ["Chef cuisinier·ère", 28]],
	arts_culture: [["Musicien·ne", 47], ["Plasticien·ne", 28], ["Designer", 24], ["Photographe", 22]],
	transport: [["Chauffeur VTC", 142], ["Logisticien·ne", 32], ["Pilote", 8], ["Marin", 4]],
	industry: [["Ingénieur·e prod.", 41], ["Tech. maintenance", 28], ["Soudeur·se", 18], ["Opérateur·rice", 14]],
	agriculture: [["Agriculteur·rice", 41], ["Maraîcher·ère", 22], ["Vétérinaire", 12], ["Forestier·ère", 8]],
	other: [["Autre", 57]],
};

export const SKILLS_BY_CAT: Partial<Record<CategoryId, string[]>> = {
	health: ["Soins infirmiers", "Suturage", "Triage", "Pédiatrie", "+8 autres"],
	education: ["Pédagogie", "Didactique", "Évaluation", "Différenciation", "+6 autres"],
	tech: ["JavaScript", "Python", "React", "PostgreSQL", "+12 autres"],
	public_service: ["Droit public", "Comptabilité publique", "Marchés publics", "+5 autres"],
	consulting_services: ["Gestion de projet", "Anglais pro.", "Coaching", "+7 autres"],
	finance: ["Comptabilité générale", "Sage", "Fiscalité", "+4 autres"],
	trades: ["Coiffure africaine", "Pose carrelage", "Soudure", "+9 autres"],
	legal: ["Plaidoirie", "Droit OHADA", "Rédaction d'actes", "+5 autres"],
	tourism_hospitality: ["Service à table", "Réception", "Anglais conv.", "+6 autres"],
	arts_culture: ["Solfège", "Mise en scène", "Adobe Suite", "+7 autres"],
	transport: ["Conduite VL", "Conduite PL", "Mécanique", "+3 autres"],
	industry: ["Maintenance", "HSE", "Lecture de plans", "+5 autres"],
	agriculture: ["Maraîchage bio", "Élevage", "Apiculture", "+3 autres"],
	other: ["Compétences non normalisées"],
};
