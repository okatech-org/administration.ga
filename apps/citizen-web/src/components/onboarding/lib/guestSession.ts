"use client";

/**
 * Identifiant stable et anonyme pour la session d'inscription en cours.
 *
 * Stocké dans localStorage (clé `consulat_guest_session_id`) et survit aux
 * rafraîchissements de page. Sert de clé de partition pour :
 *   - L'IndexedDB des fichiers d'inscription (`useRegistrationStorage`)
 *   - Le rate-limit de l'extraction IA (`useAIPrefill`)
 *
 * Avant que l'utilisateur ait saisi son email (premières sous-phases du
 * wizard), c'est le seul identifiant disponible. Une fois la soumission
 * terminée, l'appelant peut effacer la session via `clearGuestSession()`.
 */

const GUEST_SESSION_KEY = "consulat_guest_session_id";

export function getOrCreateGuestSessionId(): string {
	if (typeof window === "undefined") return "";
	try {
		const existing = localStorage.getItem(GUEST_SESSION_KEY);
		if (existing) return existing;
		const fresh = (crypto.randomUUID?.() ?? `g_${Date.now()}_${Math.random()}`)
			.replace(/-/g, "")
			.slice(0, 32);
		localStorage.setItem(GUEST_SESSION_KEY, fresh);
		return fresh;
	} catch {
		return `g_${Date.now()}`;
	}
}

export function clearGuestSession() {
	if (typeof window === "undefined") return;
	try {
		localStorage.removeItem(GUEST_SESSION_KEY);
	} catch {
		// ignore
	}
}
