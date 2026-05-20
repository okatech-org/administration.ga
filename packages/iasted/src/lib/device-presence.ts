/**
 * device-presence — Helpers de présence multi-device iAsted (Sprint 10 — A4).
 *
 * Génère/persiste un deviceId stable côté browser + compose un label humain
 * (« Chrome — MacOS », « Safari — iPhone »). Utilisé par les hosts iAsted
 * pour register le device au démarrage d'une session vocale et permettre
 * le handoff cross-device.
 *
 * Le deviceId est stocké en `localStorage` sous la clé `iasted.deviceId`
 * pour persister entre sessions du même browser (mais distinct entre
 * navigateurs/profils — c'est l'effet recherché).
 */

const DEVICE_ID_KEY = "iasted.deviceId";

/**
 * Récupère le deviceId courant ou en génère un nouveau (UUID v4 si
 * `crypto.randomUUID` est dispo, sinon timestamp + random fallback).
 * Idempotent : appels multiples retournent toujours la même valeur
 * dans le même browser/profil.
 */
export function getOrCreateDeviceId(): string {
	if (typeof window === "undefined" || !window.localStorage) {
		return `mem-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
	}
	try {
		const existing = window.localStorage.getItem(DEVICE_ID_KEY);
		if (existing && existing.length >= 8) return existing;
		const fresh =
			typeof crypto !== "undefined" && "randomUUID" in crypto
				? crypto.randomUUID()
				: `dev-${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;
		window.localStorage.setItem(DEVICE_ID_KEY, fresh);
		return fresh;
	} catch {
		return `fallback-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
	}
}

/**
 * Compose un label humain pour le device basé sur l'user agent.
 * Pas parfait (UA peut être trompé) mais suffit pour distinguer
 * « Chrome — MacBook » de « Safari — iPhone » dans l'UI.
 */
export function getDeviceLabel(): string {
	if (typeof navigator === "undefined") return "Device";
	const ua = navigator.userAgent ?? "";
	let browser = "Browser";
	if (/edg\//i.test(ua)) browser = "Edge";
	else if (/chrome\//i.test(ua) && !/edg\//i.test(ua)) browser = "Chrome";
	else if (/firefox\//i.test(ua)) browser = "Firefox";
	else if (/safari\//i.test(ua) && !/chrome\//i.test(ua)) browser = "Safari";
	let platform = "Desktop";
	if (/iPhone|iPod/i.test(ua)) platform = "iPhone";
	else if (/iPad/i.test(ua)) platform = "iPad";
	else if (/Android/i.test(ua)) platform = "Android";
	else if (/Macintosh|Mac OS X/i.test(ua)) platform = "macOS";
	else if (/Windows/i.test(ua)) platform = "Windows";
	else if (/Linux/i.test(ua)) platform = "Linux";
	return `${browser} — ${platform}`;
}
