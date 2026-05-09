"use client";

/**
 * useRingtoneMutedPref — préférence "couper la sonnerie" partagée entre
 * IAstedPage (header iAppel), GlobalQueuePill (drawer flottant) et
 * GlobalCallAlert (gate de la sonnerie).
 *
 * Implémenté avec `useSyncExternalStore` pour éviter les warnings
 * "setState during render" qui apparaissent quand plusieurs composants
 * souscrivent à un événement synchrone (storage / customEvent).
 *
 * Persisté via localStorage + diffusé via un CustomEvent pour synchroniser
 * tous les consommateurs dans la même fenêtre (le storage event natif ne se
 * déclenche que pour les *autres* fenêtres).
 */

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "call-center-ringtone-muted";
const EVENT_NAME = "call-center-ringtone-muted-changed";

function readPref(): boolean {
	try {
		return localStorage.getItem(STORAGE_KEY) === "true";
	} catch {
		return false;
	}
}

function writePref(next: boolean) {
	try {
		localStorage.setItem(STORAGE_KEY, String(next));
		window.dispatchEvent(new Event(EVENT_NAME));
	} catch {
		/* SSR / quota / privacy mode */
	}
}

function subscribe(callback: () => void): () => void {
	if (typeof window === "undefined") return () => {};
	window.addEventListener("storage", callback);
	window.addEventListener(EVENT_NAME, callback);
	return () => {
		window.removeEventListener("storage", callback);
		window.removeEventListener(EVENT_NAME, callback);
	};
}

function getServerSnapshot(): boolean {
	return false;
}

export function useRingtoneMutedPref(): {
	muted: boolean;
	toggle: () => void;
	setMuted: (next: boolean) => void;
} {
	const muted = useSyncExternalStore(subscribe, readPref, getServerSnapshot);

	const setMuted = useCallback((next: boolean) => {
		writePref(next);
	}, []);

	const toggle = useCallback(() => {
		writePref(!readPref());
	}, []);

	return { muted, toggle, setMuted };
}
