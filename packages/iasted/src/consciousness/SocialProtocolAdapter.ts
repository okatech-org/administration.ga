/**
 * SocialProtocolAdapter — Génère messages et formules de politesse selon
 * la persona courante.
 *
 * Port depuis `mairie.ga/src/Consciousness/SocialProtocolAdapter.ts` adapté
 * au contexte diplomatique gabonais.
 *
 * Note : ces messages sont des **fallbacks UI** quand l'agent n'est pas en
 * session vocale. En session vocale, le system prompt côté serveur
 * (`convex/ai/iastedRealtimePrompt.ts`) gère le ton via le LLM.
 */

import type { IAstedRole, Persona } from "./iAstedSoul";

// ─────────────────────────────────────────────────────────────
// Helpers temporels
// ─────────────────────────────────────────────────────────────

export function getTimeGreeting(date = new Date()): string {
	const h = date.getHours();
	if (h < 5) return "Bonsoir";
	if (h < 18) return "Bonjour";
	return "Bonsoir";
}

// ─────────────────────────────────────────────────────────────
// Messages prédéfinis par formalité
// ─────────────────────────────────────────────────────────────

const WELCOME_TEMPLATES: Record<1 | 2 | 3, string[]> = {
	1: [
		"Système iAsted opérationnel. En attente.",
		"iAsted prêt. Commandes acceptées.",
		"En ligne. À vos instructions.",
	],
	2: [
		"{greeting} ! Je suis iAsted, votre assistant. Comment puis-je vous aider ?",
		"{greeting} ! iAsted à votre service. Sur quoi travaillons-nous ?",
		"{greeting} ! Comment puis-je vous être utile aujourd'hui ?",
	],
	3: [
		"{greeting}, {prefix}. C'est un honneur de vous assister.",
		"{greeting}, {prefix}. Je suis à votre entière disposition.",
		"{greeting}, {prefix}. Comment puis-je vous servir ?",
	],
};

const CLOSING_TEMPLATES: Record<1 | 2 | 3, string[]> = {
	1: ["Déconnexion. Session terminée."],
	2: [
		"Au revoir ! N'hésitez pas à revenir si besoin.",
		"À bientôt. Bonne continuation.",
	],
	3: [
		"{prefix}, ce fut un honneur. Bonne continuation à vous.",
		"Très respectueusement, {prefix}.",
	],
};

const CONFIRM_TEMPLATES: Record<1 | 2 | 3, string[]> = {
	1: ["Action exécutée : {action}.", "OK : {action}.", "Fait : {action}."],
	2: [
		"Parfait ! {action}.",
		"C'est fait : {action}.",
		"Bien noté, {action}.",
	],
	3: [
		"C'est fait, {prefix}. {action}.",
		"À votre service, {prefix} : {action}.",
		"{action}, {prefix}.",
	],
};

const APOLOGIZE_TEMPLATES: Record<1 | 2 | 3, string[]> = {
	1: ["Erreur : {reason}."],
	2: [
		"Désolé, {reason}. Je peux essayer autrement.",
		"Une erreur s'est produite : {reason}.",
	],
	3: [
		"{prefix}, je vous prie de bien vouloir m'excuser : {reason}.",
		"Mes excuses, {prefix}. {reason}.",
	],
};

function pick<T>(arr: readonly T[], seed: number): T {
	return arr[seed % arr.length] as T;
}

function render(template: string, vars: Record<string, string>): string {
	return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? "");
}

// ─────────────────────────────────────────────────────────────
// API publique
// ─────────────────────────────────────────────────────────────

export const SocialProtocolAdapter = {
	generateWelcomeMessage(persona: Persona, customName?: string): string {
		const greeting = getTimeGreeting();
		const prefix = customName ?? persona.honorificPrefix;
		const tpl = pick(WELCOME_TEMPLATES[persona.formalityLevel], Date.now());
		return render(tpl, { greeting, prefix });
	},

	generateClosing(persona: Persona): string {
		const prefix = persona.honorificPrefix;
		const tpl = pick(CLOSING_TEMPLATES[persona.formalityLevel], Date.now());
		return render(tpl, { prefix });
	},

	generateConfirmation(persona: Persona, action: string): string {
		const prefix = persona.honorificPrefix;
		const tpl = pick(CONFIRM_TEMPLATES[persona.formalityLevel], Date.now());
		return render(tpl, { prefix, action });
	},

	generateApology(persona: Persona, reason: string): string {
		const prefix = persona.honorificPrefix;
		const tpl = pick(APOLOGIZE_TEMPLATES[persona.formalityLevel], Date.now());
		return render(tpl, { prefix, reason });
	},
};

// ─────────────────────────────────────────────────────────────
// Helper : prefix une réponse avec le ton approprié
// ─────────────────────────────────────────────────────────────

export function prefixWithProtocol(
	persona: Persona,
	message: string,
	turnIndex = 0,
): string {
	if (persona.formalityLevel === 3) {
		const prefixes = [
			`${persona.honorificPrefix}, `,
			"Avec tout le respect dû à votre fonction, ",
			"Permettez-moi de vous informer que ",
		];
		const idx = turnIndex % prefixes.length;
		return prefixes[idx] + message;
	}
	return message;
}

// ─────────────────────────────────────────────────────────────
// Mapping de rôle Convex → IAstedRole
// ─────────────────────────────────────────────────────────────

/**
 * Convertit un rôle utilisateur Convex (user, super_admin, admin, agent...)
 * en un IAstedRole adapté au contexte diplomatique gabonais.
 */
export function mapConvexRoleToIAsted(
	convexRole: string | null | undefined,
	positionTitle?: string | null,
): IAstedRole {
	const r = (convexRole ?? "").toLowerCase();

	// 1. Position diplomatique précise (priorité sur le rôle générique)
	if (positionTitle) {
		const t = positionTitle.toLowerCase();
		if (t.includes("ambassadeur")) return "ambassador";
		if (t.includes("consul général") || t.includes("consul general"))
			return "consul_general";
		if (t.includes("vice-consul") || t.includes("vice consul"))
			return "vice_consul";
		if (t.includes("consul")) return "consul";
	}

	// 2. Rôle système
	switch (r) {
		case "super_admin":
			return "super_admin";
		case "admin_system":
			return "admin_system";
		case "admin":
			return "admin";
		case "sous_admin":
			return "sous_admin";
		case "agent":
		case "agent_user":
			return "agent";
		case "citizen":
		case "user":
			return "citizen";
		default:
			return "anonymous";
	}
}
