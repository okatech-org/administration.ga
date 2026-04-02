/**
 * IntentProcessor — Parsing local d'intention par regex.
 * Intercepte les commandes simples (navigation, contrôle) avant d'appeler le LLM.
 */

export interface ParsedIntent {
	category: "navigation" | "communication" | "administrative" | "information" | "control" | "contact_search" | "call_contact" | "meeting_create";
	action: string;
	target?: string;
	confidence: number;
}

const INTENT_PATTERNS: Array<{
	category: ParsedIntent["category"];
	patterns: RegExp[];
	action: string;
}> = [
	{
		category: "navigation",
		patterns: [
			/(?:va|aller|emmène|conduis)[\s-]*(moi\s+)?(?:à|vers|sur|au|aux)\s+(.+)/i,
			/ouvre?\s+(?:la\s+page\s+)?(.+)/i,
			/(?:montre|affiche)[\s-]*(moi\s+)?(.+)/i,
		],
		action: "navigate",
	},
	{
		category: "communication",
		patterns: [
			/(?:envoie?|expédie?)\s+(?:un\s+)?(?:mail|email|message|courrier)/i,
			/appelle?\s+(.+)/i,
			/(?:contacte?|joindre?)\s+(.+)/i,
		],
		action: "communicate",
	},
	{
		category: "administrative",
		patterns: [
			/(?:génère?|crée?|produis?)\s+(?:un\s+)?(?:acte|certificat|document|pdf|rapport)/i,
			/(?:prends?|fixe?|planifie?)\s+(?:un\s+)?(?:rdv|rendez-vous)/i,
			/(?:traite?|valide?|approuve?)\s+(?:la\s+)?(?:demande|requête)/i,
		],
		action: "administrative",
	},
	// Recherche de contact
	{
		category: "contact_search" as const,
		patterns: [
			/(?:cherche|trouve|qui est|où est)[\s]+(.+)/i,
			/(?:montre|affiche|liste)[\s-]*(moi\s+)?(?:les\s+)?(?:contacts?|membres?|agents?|personnel)[\s]+(?:de\s+|d['']|du\s+|en\s+)?(.+)/i,
		],
		action: "search_contact",
	},
	// Appel direct
	{
		category: "call_contact" as const,
		patterns: [
			/appelle?[\s-]*(moi\s+)?(.+)/i,
			/(?:lance|fais|passe)[\s]+(?:un\s+)?appel[\s]+(?:à|avec|vers)\s+(.+)/i,
			/appel[\s]+(?:vidéo|audio)[\s]+(?:à|avec|vers)\s+(.+)/i,
		],
		action: "call_contact",
	},
	// Création de réunion avec participants
	{
		category: "meeting_create" as const,
		patterns: [
			/(?:crée?|organise?|planifie?)[\s]+(?:une\s+)?réunion[\s]+(?:avec\s+)?(.*)/i,
			/(?:réunion|visio|visioconférence)[\s]+(?:avec\s+)?(.*)/i,
		],
		action: "create_meeting_with",
	},
	{
		category: "control" as const,
		patterns: [
			/(?:stop|arrête|tais[\s-]toi|annule?|cancel)/i,
			/(?:recommence|redémarre|reset)/i,
		],
		action: "control",
	},
];

// Mapping des cibles de navigation vers les routes
const NAVIGATION_MAP: Record<string, string> = {
	"dashboard": "/",
	"tableau de bord": "/",
	"demandes": "/requests",
	"registre": "/consular-registry",
	"registre consulaire": "/consular-registry",
	"rendez-vous": "/appointments",
	"rdv": "/appointments",
	"services": "/services",
	"iboîte": "/iboite",
	"iboite": "/iboite",
	"messagerie": "/iboite",
	"icorrespondance": "/icorrespondance",
	"correspondance": "/icorrespondance",
	"idocument": "/idocument",
	"documents": "/idocument",
	"iagenda": "/iagenda",
	"agenda": "/iagenda",
	"calendrier": "/iagenda",
	"paramètres": "/settings",
	"settings": "/settings",
	"équipe": "/team",
	"team": "/team",
	"statistiques": "/statistics",
	"stats": "/statistics",
	"paiements": "/payments",
	"appels": "/calls",
	"réunions": "/meetings",
	"actualités": "/posts",
	"publications": "/posts",
	"affaires diplomatiques": "/affaires-diplomatiques",
	"diplomatie": "/affaires-diplomatiques",
	"affaires consulaires": "/affaires-consulaires",
};

export function parseIntent(input: string): ParsedIntent | null {
	const trimmed = input.trim().toLowerCase();

	for (const rule of INTENT_PATTERNS) {
		for (const pattern of rule.patterns) {
			const match = trimmed.match(pattern);
			if (match) {
				const target = match[match.length - 1]?.trim();
				return {
					category: rule.category,
					action: rule.action,
					target,
					confidence: 0.85,
				};
			}
		}
	}
	return null;
}

export function resolveNavigationTarget(target?: string): string | null {
	if (!target) return null;
	const normalized = target.toLowerCase().replace(/^(la |le |les |l'|la page |page )/, "");
	return NAVIGATION_MAP[normalized] ?? null;
}
